import uuid
import json
import subprocess
from datetime import datetime
from typing import Dict, Optional, Any
from pathlib import Path
import hashlib
from contextlib import contextmanager
from python_sandbox.utils.config import logger, DEFAULT_DOCKER_IMAGE, config
from python_sandbox.db.database import db
import docker
import requests

try:
    # Khusus Windows (pywin32). Gagal connect named pipe container melempar
    # pywintypes.error yang TIDAK mewarisi OSError, jadi harus didaftarkan
    # eksplisit agar kena retry sekaligus lazy start podman machine.
    import pywintypes  # type: ignore
except Exception:  # pragma: no cover - bukan Windows
    pywintypes = None

# Error yang berarti "container API tidak terjangkau / koneksi terputus"
RETRYABLE_ERRORS: tuple = (requests.exceptions.ConnectionError, OSError)
if pywintypes is not None:
    RETRYABLE_ERRORS += (pywintypes.error,)


class SandboxManager:
    """Manage Sandboxes with automatic creation"""

    def __init__(self, base_image: str = DEFAULT_DOCKER_IMAGE):
        self.base_image = base_image
        self.sandbox_last_used: Dict[str, datetime] = {}
        self.session_sandbox_map: Dict[str, str] = {}
        self.package_install_status: Dict[str, Dict[str, Any]] = {}
        try:
            try:
                self.sandbox_client = docker.from_env()
            except Exception as e:
                # Lazy start: podman machine sengaja masih mati sampai ada
                # tool yang benar-benar dipakai. docker.from_env() men-fetch
                # versi API server saat klien dibuat, jadi ikut gagal. Ulangi
                # dengan versi API tetap yang didukung Podman (min 1.24,
                # saat ini 1.44) agar klien bisa dibuat tanpa koneksi.
                logger.warning(
                    f"Docker API belum siap saat init ({e}); membuat klien "
                    "dengan versi API tetap 1.41, koneksi menyusul setelah "
                    "mesin dinyalakan"
                )
                self.sandbox_client = docker.from_env(version="1.41")
            self._install_connection_retry(self.sandbox_client)
            logger.info("Sandbox client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Sandbox client: {e}", exc_info=True)
            raise
        # Lazy start: selama inisialisasi, kegagalan koneksi TIDAK boleh
        # menyalakan podman machine. Mesin hanya menyusul setelah server siap
        # dan ada tool sandbox yang benar-benar dipanggil.
        self._lazy_start_enabled = False
        self._podman_ensure_running = False
        self._ensure_sandbox_image()
        self._load_sandbox_records()
        self._lazy_start_enabled = True
        logger.info(f"SandboxManager initialized, using base image: {self.base_image}")

    def _install_connection_retry(self, client, attempts: int = 4, delay: float = 0.4):
        """Retry otomatis untuk semua request API Docker.

        Pipe named Podman (docker_engine / podman-machine-default) kadang
        menutup koneksi yang sudah berada di pool sehingga muncul error
        "Remote end closed connection without response". urllib3 membuang
        koneksi rusak setelah error, jadi percobaan ulang otomatis memakai
        koneksi baru dan biasanya langsung sukses. Dipasang sekali di level
        sesi sehingga menutupi inspect, exec, build, dll tanpa mengubah kode
        pemakai di berbagai tempat.

        Percobaan pertama yang gagal juga dipakai sebagai sinyal lazy start:
        artinya podman machine kemungkinan masih mati, jadi nyalakan dulu.
        """
        import time

        # docker-py < 7 memisahkan sesi ke APIClient.session; docker-py >= 7
        # membuat APIClient mewarisi requests.Session secara langsung.
        target = getattr(client.api, "session", None) or client.api
        original_request = target.request

        def request_with_retry(*args, **kwargs):
            for attempt in range(1, attempts + 1):
                try:
                    return original_request(*args, **kwargs)
                # pywintypes.error saat pipe container belum ada, OSError
                # (FileNotFoundError) untuk kasus serupa, ConnectionError
                # untuk pipe yang menutup koneksi idle.
                except RETRYABLE_ERRORS:
                    if attempt == attempts:
                        raise
                    if attempt == 1:
                        self._ensure_podman_ready()
                    logger.warning(
                        f"Docker API connection terputus, percobaan "
                        f"{attempt}/{attempts} diulang..."
                    )
                    time.sleep(delay)

        target.request = request_with_retry

    def _podman_state(self) -> str:
        """Baca status mesin container lewat CLI, bukan lewat API Docker.

        Sengaja tidak memakai api.ping(): jalur itu melewati wrapper retry
        yang justru sedang memanggil kita, sehingga berujung pada rekursi
        "maximum recursion depth exceeded".
        """
        podman = Path(r"C:\Program Files\RedHat\Podman\podman.exe")
        if not podman.exists():
            return "unknown"
        try:
            result = subprocess.run(
                [str(podman), "machine", "inspect", "--format", "{{.State}}"],
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                timeout=30,
            )
            if result.returncode == 0:
                return (result.stdout or "").strip().lower()
        except Exception as e:
            logger.debug(f"Gagal membaca status podman machine: {e}")
        return "unknown"

    def _ensure_podman_ready(self) -> bool:
        """Nyalakan podman machine bila API container tidak bisa diakses.

        Inti dari lazy start: mesin container hanya dinyalakan ketika ada
        tool sandbox yang benar-benar dipanggil, bukan saat logon maupun saat
        OpenCode dibuka. Setelah mesin hidup, image sandbox ikut dicek ulang.

        Dua pengaman:
        - _lazy_start_enabled: selama inisialisasi server, kegagalan koneksi
          tidak boleh menyalakan mesin. Tanpa ini mesin justru nyala begitu
          OpenCode membuka koneksi.
        - _podman_ensure_running: cegah pemanggilan bertumpuk ketika klien
          Docker di dalamnya sendiri sedang mencoba koneksi.
        """
        if not self._lazy_start_enabled or self._podman_ensure_running:
            return False

        podman = Path(r"C:\Program Files\RedHat\Podman\podman.exe")
        if not podman.exists():
            return False

        self._podman_ensure_running = True
        try:
            state = self._podman_state()
            if state == "running":
                return True  # mesin sudah nyala, masalahnya bukan itu

            logger.info(f"Podman machine {state}, mencoba start (lazy)...")
            try:
                result = subprocess.run(
                    [str(podman), "machine", "start"],
                    capture_output=True,
                    text=True,
                    encoding="utf-8",
                    errors="replace",
                    timeout=90,
                )
            except Exception as e:
                logger.error(f"Gagal menjalankan podman machine start: {e}")
                return False

            if result.returncode != 0:
                detail = (result.stderr or result.stdout or "").strip()[-500:]
                if "already running" in detail:
                    return True
                logger.error(
                    f"podman machine start mengembalikan rc={result.returncode}: "
                    f"{detail}"
                )
                return False

            if self._podman_state() != "running":
                logger.error(
                    "podman machine start selesai tetapi mesin belum running"
                )
                return False

            logger.info("Podman machine siap, memastikan image sandbox tersedia...")
            try:
                self._ensure_sandbox_image()
            except Exception as e:
                logger.warning(f"Gagal memastikan image sandbox: {e}")
            return True
        finally:
            self._podman_ensure_running = False

    def _ensure_sandbox_image(self):
        """Ensure our custom Sandbox image exists, build it if needed"""
        # Lazy start: saat OpenCode baru dibuka, podman machine sengaja masih
        # mati supaya tidak memakan RAM. Karena itu API container belum bisa
        # diakses - jangan dianggap gagal. Image bersifat persisten di disk dan
        # dicek ulang lewat _ensure_podman_ready() saat benar-benar dipakai.
        try:
            self.sandbox_client.api.ping()
        except Exception as e:
            logger.warning(
                f"Docker API belum siap saat startup, pengecekan image ditunda: {e}"
            )
            return
        custom_image_name = DEFAULT_DOCKER_IMAGE
        sandboxfile_path = Path(
            config["docker"].get("dockerfile_path", "Dockerfile")
        ).resolve()
        build_info_file = Path(
            config["docker"].get("build_info_file", ".docker_build_info")
        ).resolve()
        check_changes = config["docker"].get("check_dockerfile_changes", True)
        image_exists = True
        try:
            self.sandbox_client.images.get(custom_image_name)
            logger.info(f"Sandbox image exists: {custom_image_name}")
        except docker.errors.ImageNotFound:
            image_exists = False
            logger.info(f"Sandbox image not found: {custom_image_name}")
        need_rebuild = not image_exists
        if image_exists and check_changes and sandboxfile_path.exists():
            current_hash = self._get_file_hash(sandboxfile_path)
            previous_hash = None
            if build_info_file.exists():
                try:
                    with open(build_info_file, "r") as f:
                        build_info = json.load(f)
                        previous_hash = build_info.get("dockerfile_hash")
                        logger.info(
                            f"Found previous build info with hash: {previous_hash}"
                        )
                except (json.JSONDecodeError, IOError) as e:
                    logger.warning(f"Could not read build info file: {e}")
            if previous_hash != current_hash:
                logger.info(
                    f"Sandboxfile has changed (Previous: {previous_hash}, Current: {current_hash})"
                )
                need_rebuild = True
        if need_rebuild:
            if not sandboxfile_path.exists():
                logger.error("Sandboxfile not found, falling back to base image")
                return
            try:
                logger.info(f"Building Sandbox image: {custom_image_name}")
                _, logs = self.sandbox_client.images.build(
                    path=str(sandboxfile_path.parent),
                    dockerfile=str(sandboxfile_path.name),
                    tag=custom_image_name,
                    rm=True,
                    forcerm=True,
                )
                for log in logs:
                    if "stream" in log:
                        logger.info(log["stream"].strip())
                if check_changes:
                    build_info = {
                        "dockerfile_hash": self._get_file_hash(sandboxfile_path),
                        "build_time": datetime.now().isoformat(),
                        "image_name": custom_image_name,
                    }
                    with open(build_info_file, "w") as f:
                        json.dump(build_info, f)
                        logger.info(f"Saved build info to {build_info_file}")
                self.base_image = custom_image_name
                logger.info(f"Successfully built Sandbox image: {custom_image_name}")
            except Exception as e:
                logger.error(f"Failed to build Sandbox image: {e}", exc_info=True)

    def _get_file_hash(self, file_path: Path) -> str:
        """Calculate SHA256 hash of a file to detect changes"""
        if not file_path.exists():
            return ""
        try:
            with open(file_path, "rb") as f:
                file_hash = hashlib.sha256(f.read()).hexdigest()
            return file_hash
        except IOError as e:
            logger.error(f"Error reading file for hashing: {e}")
            return ""

    def _load_sandbox_records(self) -> None:
        """Load existing sandbox usage records"""
        try:
            sandboxes = self.sandbox_client.containers.list(
                all=True, filters={"label": "python-sandbox"}
            )
            for sandbox in sandboxes:
                sandbox_id = sandbox.id
                self.sandbox_last_used[sandbox_id] = datetime.now()
                logger.info(f"Loaded existing sandbox: {sandbox_id}")
        except RETRYABLE_ERRORS as e:
            # Lazy start: podman machine sengaja belum dinyalakan, jadi wajar
            # terjadi di awal. Rekaman terakhir (last_used) hanya untuk
            # bookkeeping; data sandbox tetap ada di DB dan container.
            logger.info(
                f"Container API belum siap saat startup, pemuatan daftar "
                f"sandbox ditunda sampai pertama kali dipakai: {e}"
            )
        except Exception as e:
            logger.error(f"Failed to load existing sandboxes: {e}", exc_info=True)

    def create_sandbox(self) -> str:
        """Create a new Sandbox container and return its Docker container ID"""
        sandbox_name = f"python-sandbox-{str(uuid.uuid4())[:8]}"
        try:
            sandbox = self.sandbox_client.containers.create(
                image=self.base_image,
                name=sandbox_name,
                detach=True,
                working_dir="/app/results",
                labels={"python-sandbox": "true"},
                mem_limit="1g",
                memswap_limit="1g",
                network_mode="bridge",
                privileged=False,
                cap_drop=["ALL"],
                security_opt=["no-new-privileges"],
            )
            sandbox.start()
            docker_container_id = sandbox.id
            logger.info(
                f"Created new sandbox: {docker_container_id} (name: {sandbox_name})"
            )
            self.sandbox_last_used[docker_container_id] = datetime.now()
            return docker_container_id
        except Exception as e:
            logger.error(f"Failed to create sandbox: {e}", exc_info=True)
            raise

    def create_user_sandbox(
        self, user_id: Optional[str] = None, name: Optional[str] = None
    ) -> dict:
        """Create a new sandbox for a user, with database record and Docker container

        Args:
            user_id: The ID of the user who owns the sandbox. If None, uses first user in DB.
            name: Optional name for the sandbox.

        Returns:
            Dictionary with sandbox information
        """
        # Import here to avoid circular imports
        from python_sandbox.db.database import db
        from python_sandbox.utils.config import USER_SANDBOX_LIMIT

        # If no user ID provided, check if we're testing/debugging
        if not user_id:
            # Fallback for testing - use the first user in the database
            all_users = db.get_all_users()
            if all_users:
                user_id = all_users[0].get("id")
                logger.info(f"Fallback to first user: {user_id}")
            else:
                return {"error": True, "message": "User authentication required"}

        logger.info(f"Creating sandbox for user_id: {user_id}")

        # Check if user has reached their sandbox limit
        user_sandboxes = db.get_user_sandboxes(user_id)
        if len(user_sandboxes) >= USER_SANDBOX_LIMIT:
            logger.warning(
                f"User {user_id} has reached the sandbox limit of {USER_SANDBOX_LIMIT}"
            )
            return {
                "error": True,
                "message": f"You have reached the maximum limit of {USER_SANDBOX_LIMIT} sandboxes. Please delete an existing sandbox before creating a new one.",
            }

        # Create the sandbox and get container ID
        try:
            # 1. Create the Docker container (internal implementation detail)
            docker_container_id = self.create_sandbox()

            # 2. Create database record, linking container ID
            sandbox_id = db.create_sandbox(user_id, name, docker_container_id)
            logger.info(
                f"Created sandbox with ID: {sandbox_id} (container ID: {docker_container_id})"
            )

            # 3. Return only sandbox_id related info, don't expose container ID
            sandbox_name = name or f"Sandbox {len(db.get_user_sandboxes(user_id))}"
            return {
                "sandbox_id": sandbox_id,
                "user_id": user_id,
                "name": sandbox_name,
                "status": "active",
            }
        except Exception as e:
            logger.error(f"Error creating sandbox: {e}", exc_info=True)
            return {"error": True, "message": str(e)}

    def get_container_by_sandbox_id(self, sandbox_id: str):
        """Get the container associated with a sandbox ID"""
        # Get sandbox record from database
        sandbox_record = db.get_sandbox(sandbox_id)
        if not sandbox_record:
            logger.warning(
                f"[get_container_by_sandbox_id] Sandbox not found in database: {sandbox_id}"
            )
            return None, {"error": True, "message": f"Sandbox not found: {sandbox_id}"}

        # Get Docker container ID
        container_id = sandbox_record.get("docker_container_id")
        if not container_id:
            logger.warning(
                f"[get_container_by_sandbox_id] No container ID for sandbox: {sandbox_id}"
            )
            return None, {
                "error": True,
                "message": f"No container ID for sandbox: {sandbox_id}",
            }

        # Get Docker container
        try:
            logger.debug(
                f"[get_container_by_sandbox_id] Getting container {container_id} for sandbox {sandbox_id}"
            )
            container = self.sandbox_client.containers.get(container_id)
            # Update last used time
            self.sandbox_last_used[container_id] = datetime.now()
            return container, None
        except docker.errors.NotFound:
            logger.error(
                f"[get_container_by_sandbox_id] Container {container_id} not found for sandbox {sandbox_id}"
            )
            return None, {
                "error": True,
                "message": f"Container not found for sandbox: {sandbox_id}",
            }
        except Exception as e:
            logger.error(
                f"[get_container_by_sandbox_id] Error getting container for sandbox {sandbox_id}: {e}",
                exc_info=True,
            )
            return None, {"error": True, "message": str(e)}

    def verify_sandbox_exists(self, sandbox_id: str) -> Optional[Dict[str, Any]]:
        """Verify if sandbox exists, using sandbox_id instead of container ID"""
        container, error = self.get_container_by_sandbox_id(sandbox_id)
        if error:
            return error
        return None

    def delete_sandbox(self, sandbox_id: str) -> Dict[str, Any]:
        """Delete a sandbox container and cleanup resources"""
        try:
            # Find containers that might match this sandbox ID
            logger.info(f"Looking for containers matching sandbox ID: {sandbox_id}")

            # Get all containers including stopped ones
            all_containers = self.sandbox_client.containers.list(all=True)
            logger.info(f"Found {len(all_containers)} total containers")

            # Find containers by ID or name matching the sandbox ID
            containers_to_delete = []
            for container in all_containers:
                container_id = container.id
                container_name = container.name
                container_labels = container.labels

                # Check if this container matches our sandbox ID in any way
                if any(
                    [
                        # Exact ID match
                        container_id == sandbox_id,
                        # ID prefix match (Docker sometimes uses short IDs)
                        container_id.startswith(sandbox_id),
                        # Name contains the sandbox ID
                        sandbox_id in container_name,
                        # Sandbox ID in labels
                        container_labels.get("sandbox_id") == sandbox_id,
                        # The container name follows our naming convention
                        container_name.startswith("python-sandbox-")
                        and sandbox_id in container_name,
                    ]
                ):
                    containers_to_delete.append(container)
                    logger.info(
                        f"Found container to delete: ID={container_id}, Name={container_name}"
                    )

            # If no containers found, just clean up tracking data
            if not containers_to_delete:
                logger.warning(f"No containers found matching sandbox ID: {sandbox_id}")
                # Clean up tracking data anyway
                if sandbox_id in self.sandbox_last_used:
                    del self.sandbox_last_used[sandbox_id]
                    logger.info(f"Removed sandbox {sandbox_id} from tracking dict")

                # Remove from session mapping if present
                for session_id, sb_id in list(self.session_sandbox_map.items()):
                    if sb_id == sandbox_id:
                        del self.session_sandbox_map[session_id]
                        logger.info(
                            f"Removed sandbox {sandbox_id} from session mapping"
                        )

                return {
                    "success": True,
                    "message": f"No containers found for sandbox {sandbox_id}, but removed from tracking",
                }

            # Delete all matching containers
            for container in containers_to_delete:
                logger.info(
                    f"Processing container: ID={container.id}, Name={container.name}, Status={container.status}"
                )

                try:
                    # Stop the container if it's running
                    if container.status == "running":
                        logger.info(f"Stopping container {container.id}...")
                        container.stop(timeout=0)

                    # Remove the container
                    logger.info(f"Removing container {container.id}...")
                    container.remove(force=True)
                    logger.info(f"Successfully removed container {container.id}")
                except Exception as container_error:
                    logger.error(
                        f"Error removing container {container.id}: {str(container_error)}",
                        exc_info=True,
                    )

            # Clean up tracking data
            if sandbox_id in self.sandbox_last_used:
                del self.sandbox_last_used[sandbox_id]
                logger.info(f"Removed sandbox {sandbox_id} from tracking dict")

            # Remove from session mapping if present
            for session_id, sb_id in list(self.session_sandbox_map.items()):
                if sb_id == sandbox_id:
                    del self.session_sandbox_map[session_id]
                    logger.info(f"Removed sandbox {sandbox_id} from session mapping")

            return {
                "success": True,
                "message": f"Sandbox {sandbox_id} deleted successfully ({len(containers_to_delete)} containers removed)",
            }

        except Exception as e:
            error_msg = f"Failed to delete sandbox {sandbox_id}: {str(e)}"
            logger.error(error_msg, exc_info=True)

            # Even if there's an error, try to clean up tracking data
            try:
                if sandbox_id in self.sandbox_last_used:
                    del self.sandbox_last_used[sandbox_id]

                for session_id, sb_id in list(self.session_sandbox_map.items()):
                    if sb_id == sandbox_id:
                        del self.session_sandbox_map[session_id]
            except Exception as cleanup_error:
                logger.error(
                    f"Error during cleanup of tracking data: {str(cleanup_error)}",
                    exc_info=True,
                )

            return {"success": False, "message": error_msg, "error": str(e)}

    @contextmanager
    def _get_running_sandbox(self, sandbox_id: str):
        """Get running container by sandbox_id"""
        container, error = self.get_container_by_sandbox_id(sandbox_id)
        if error:
            logger.error(
                f"Failed to get container for sandbox {sandbox_id}: {error['message']}"
            )
            raise ValueError(error["message"])

        # Ensure container is running
        if container.status != "running":
            logger.info(
                f"Sandbox {sandbox_id} container is not running. Current status: {container.status}"
            )

            # If container has exited, try to get logs to understand why
            if container.status == "exited":
                try:
                    logs = container.logs(tail=50).decode("utf-8")
                    logger.info(
                        f"Logs from exited container for sandbox {sandbox_id}:\n{logs}"
                    )
                except Exception as log_err:
                    logger.error(
                        f"Failed to get logs for exited sandbox {sandbox_id}: {log_err}"
                    )

            # Try to start the container
            logger.info(f"Attempting to start container for sandbox {sandbox_id}...")
            container.start()
            container.reload()
            logger.info(f"Container for sandbox {sandbox_id} started successfully.")

        yield container
