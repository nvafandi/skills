"""Entry point MCP Sandbox dengan transport stdio.

Dijalankan langsung oleh OpenCode sebagai server MCP lokal, sehingga tidak
memerlukan server HTTP/SSE (port 8181) maupun jembatan supergateway.

Lazy start: podman machine TIDAK dinyalakan saat server ini start. Mesin
container baru dinyalakan oleh SandboxManager._ensure_podman_ready() begitu
ada tool sandbox yang dipanggil, sehingga RAM-nya hanya terpakai bila memang
sedang dipakai.

Penting: semua log HARUS ke stderr. stdout hanya untuk pesan JSON-RPC MCP,
karena menulis teks bebas ke stdout akan merusak protokol stdio.
"""

import os
from pathlib import Path

# python_sandbox.utils.config memuat config.toml (dan path Dockerfile) relatif
# terhadap CWD. OpenCode men-spawn server ini dengan CWD folder kerja, bukan
# folder proyek, sehingga config tidak ditemukan dan proses crash saat import.
# Kunci CWD ke folder proyek SEBELUM mengimpor paket proyek.
PROJECT_ROOT = Path(__file__).resolve().parent
os.chdir(PROJECT_ROOT)

from python_sandbox.core.mcp_tools import SandboxToolsPlugin  # noqa: E402
from python_sandbox.utils.config import DEFAULT_DOCKER_IMAGE, logger  # noqa: E402


def main() -> None:
    logger.info(f"Starting MCP Sandbox (stdio, lazy start), cwd={os.getcwd()}")
    plugin = SandboxToolsPlugin(base_image=DEFAULT_DOCKER_IMAGE)
    plugin.mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
