# powershell-sandbox-mcp

MCP server (stdio) untuk menjalankan script PowerShell di **sandbox**. Dua mode:

| Mode | Penjelasan | PowerShell | Isolasi |
|---|---|---|---|
| **podman (default)** | Server + script jalan di dalam container `localhost/powershell-sandbox-mcp` | pwsh 7.5 (Linux) | Namespace container + limit memori/pids + `--network none` |
| **native** | Server jalan di host, `spawn` langsung ke PowerShell host | powershell.exe 5.1 atau pwsh | Working dir + env minimal + timeout saja |

Keduanya punya 8 tool yang sama; yang bedanya cuma tempat prosesnya.

## Isi

| Path | Fungsi |
|---|---|
| `src/server.js` | MCP stdio server, definisi 8 tool |
| `src/sandbox.js` | Core: penjaga path, run engine, timeout, log, guardrails |
| `src/config.js` | Semua limit + path + deny-list, bisa di-override via env |
| `Dockerfile` | Image container (PowerShell 7.5 + Node 22) |
| `scripts/podman-build.ps1` | Build image (opsional `-Smoke` untuk langsung tes) |
| `scripts/podman-smoke.ps1` | Jalankan smoke test terhadap versi container |
| `test/smoke.js` | Smoke test end-to-end lewat MCP client (`npm test`) |
| `test/config-check.mjs` | Cek command yang terdaftar di config OpenCode benar-benar bisa start + jalan |

## Tool

| Tool | Fungsi |
|---|---|
| `sandbox_info` | Status runtime (native/container), folder sandbox, versi PowerShell, limit, guardrails, env allowlist |
| `list_scripts` | Daftar `.ps1` di `scripts/` (terbaru dulu) |
| `write_script` | Buat/timpa `.ps1` (butuh `overwrite: true` kalau sudah ada) |
| `read_script` | Baca isi `.ps1` |
| `delete_script` | Hapus `.ps1` |
| `run_script` | Jalankan `.ps1` → exit code, durasi, stdout/stderr, path log |
| `run_code` | Jalankan kode PowerShell inline (ditulis ke file sementara dulu) |
| `read_log` | Ambil log `stdout`/`stderr` lengkap dari sebuah `run_id` |

## Pakai mode podman

```powershell
pwsh -File scripts\podman-build.ps1 -Smoke      # build image + smoke test
```

Cek command yang dipakai OpenCode (harus dijalankan dari folder ini):

```powershell
node test\config-check.mjs "C:/Users/irvan/.config/opencode/opencode.json"
```

Blok config untuk OpenCode:

```jsonc
"powershell-sandbox": {
  "type": "local",
  "command": [
    "C:/Program Files/RedHat/Podman/podman.exe",
    "run", "-i", "--rm",
    "--network", "none",
    "--memory", "2g",
    "--pids-limit", "512",
    "-v", "C:/Users/irvan/AppData/Local/Temp/opencode/ps-sandbox:/sandbox",
    "-e", "PS_SANDBOX_HOST_ROOT=C:/Users/irvan/AppData/Local/Temp/opencode/ps-sandbox",
    "-e", "PS_SANDBOX_DEFAULT_TIMEOUT_MS=120000",
    "-e", "PS_SANDBOX_MAX_CONCURRENT=2",
    "-e", "PS_SANDBOX_DENY=1",
    "localhost/powershell-sandbox-mcp:latest"
  ],
  "timeout": { "startup": 180000 }
}
```

> **Kenapa launcher, bukan `podman run` langsung?** Spawn `podman.exe` langsung dari OpenCode
> pernah gagal handshake dengan `Connection closed` padahal image-nya sehat. Launcher
> menyisipkan satu proses Node di antaranya, dan itu yang membuatnya konsisten. Launcher juga
> menyiapkan folder bind mount (kalau belum ada, podman membuatnya root-owned dan container
> non-root gagal start), menyalakan podman machine kalau mati, dan mengecek image tersedia.
>
> Override lewat env: `PS_PODMAN_BIN`, `PS_PODMAN_IMAGE`, `PS_PODMAN_HOST_ROOT`,
> `PS_PODMAN_MACHINE`, `PS_PODMAN_NETWORK`, `PS_PODMAN_MEMORY`, `PS_PODMAN_PIDS_LIMIT`,
> `PS_PODMAN_DENY`, `PS_PODMAN_ATTEMPTS`, `PS_PODMAN_LOG` (tulis diagnostik ke file).

Catatan mode podman:

- `-i` wajib: stdio MCP butuh stdin container tetap terbuka.
- `-v ...:/sandbox` membuat script, work dir, dan log **tetap terlihat dari host** — OpenCode masih bisa membuka log dengan tool filesystem-nya. Berkat `PS_SANDBOX_HOST_ROOT`, path yang dilaporkan tool (`cwd`, `stdout_log`, ...) juga ditulis sebagai path host, bukan `/sandbox/...`.
- `--network none` = tanpa akses jaringan (loopback tetap jalan). Butuh internet? Ganti ke `--network bridge`.
- `--memory` / `--pids-limit` membatasi resource yang bisa dipakai script.
- Container jalan sebagai user non-root (`sandboxer`, uid 1000).
- **PowerShell di dalam container adalah pwsh 7 di Linux.** Cmdlet Windows-only (`Get-WinEvent`, `Get-CimInstance Win32_*`, registry provider, modul `-RSComputerSession`, ActiveDirectory, dsb.) tidak ada. Untuk script yang butuh itu, pakai mode native.
- **`.sh` di dalam container memakai bash 5.1 bawaan Ubuntu**, jadi utilitas POSIX standar (`grep`, `sed`, `awk`, `curl`, `find`, ...) tersedia tanpa install tambahan.
- **Di mode native, `.sh` memakai Git Bash.** `bash.exe` bawaan Windows (`WindowsApps`) cuma launcher
  interop WSL yang merusak path Windows, jadi launcher Git (`C:\Program Files\Git\bin\bash.exe`)
  diprioritaskan; isi ke `PS_SANDBOX_SH_SHELL` untuk menimpanya. Perlu diingat Git Bash (cygwin)
  menimpa `TEMP`/`TMP` jadi `/tmp` — jadi di host Windows jangan,andalkan `TEMP` menunjuk ke run dir untuk `.sh`.

## Pakai mode native

```bash
npm install
npm test          # smoke test end-to-end (server di host)
npm start         # jalankan server (stdio)
```

```jsonc
"powershell-sandbox": {
  "type": "local",
  "command": ["C:/Program Files/nodejs/node.exe", "C:/Users/irvan/Documents/project/skills/mcp/powershell-sandbox/src/server.js"],
  "environment": { "PS_SANDBOX_ROOT": "C:/Users/irvan/AppData/Local/Temp/opencode/ps-sandbox" }
}
```

> Pakai path absolut `node` dari `where node` kalau `node` tidak ada di PATH proses OpenCode.

## Isolasi di dalam server (berlaku dua mode)

- **Proses terpisah** — `pwsh -NoProfile -NonInteractive -ExecutionPolicy Bypass -File <script>` untuk `.ps1`, `bash <script>` untuk `.sh`.
- **Working dir per run** — `work/<run_id>/`; `TEMP`/`TMP` juga diarahkan ke sana.
- **Env minimal** — hanya allowlist (`PATH`, `HOME`/`USERPROFILE`, `SystemRoot`, `PSModulePath`, ...) + marker `PS_SANDBOX*` + env tambahan per-run.
- **Timeout** — default 120s, maks 600s; saat kena timeout seluruh pohon proses dibunuh (`taskkill /T /F` di Windows, sinyal ke process group di Linux). Nilai `timeout_ms` yang dikirim pemanggil dipakai apa adanya.
- **Log** — `logs/<run_id>/stdout.log`, `stderr.log`, `result.json`; output ke pemanggil dipotong (default 200 KB).
- **Penjaga path** — script wajib path relatif, akhiran `.ps1`/`.sh`, dan realpath-nya harus tetap di dalam `scripts/` (anti `..` traversal, symlink escape, serta path absolut gaya Windows `C:/...`).
- **Guardrails** — pola berbahaya dipindai sebelum eksekusi, dan daftarnya dipisah per bahasa supaya tidak ada false positive:
  - PowerShell: `Format-Volume`, `Clear-Disk`, `Initialize-Disk`, `Remove-Partition`, `Remove-Item -Recurse` pada drive root, `rd /s`, `format`, `Remove-CimInstance`, `Stop/Restart-Computer`, `Set-ExecutionPolicy`, `Disable-WindowsOptionalFeature`, `reg delete`, `cipher /w`.
  - sh: `rm -rf /`, `rm --no-preserve-root`, `mkfs`, `wipefs`, `dd` ke device, tulis ke device blok (`> /dev/sd*`), fork bomb, `chmod` rekursif pada root, `shutdown`/`reboot`/`halt`/`poweroff`, `init 0/6`, `shred` device.
  - Baris komentar (`# ...`) tidak dipindai. Nonaktifkan dengan `PS_SANDBOX_DENY=0` (atau `PS_SANDBOX_DENY_SH=0` khusus sh).
- **Batas konkurensi** — maks 2 run bersamaan; run lama dipangkas sesuai `PS_SANDBOX_KEEP_RUNS`.

> Mode native **bukan security boundary**: script masih punya hak akses user yang menjalankan server. Isolasi sesungguhnya hanya datang dari mode podman.

## Konfigurasi (env `PS_SANDBOX_*`)

| Env | Default | Keterangan |
|---|---|---|
| `PS_SANDBOX_ROOT` | `/sandbox` (container) / `%TEMP%\opencode\ps-sandbox` (native) | Folder root sandbox |
| `PS_SANDBOX_HOST_ROOT` | — (native: sama dengan root) | Path host untuk `/sandbox` di container; dipakai agar path yang dilaporkan bisa dibuka dari host |
| `PS_SANDBOX_SHELL` | `pwsh` (container) / `powershell.exe` (native) | Binary PowerShell untuk `.ps1` |
| `PS_SANDBOX_SH_SHELL` | `bash` (container) / Git Bash (native) | Binary shell POSIX untuk `.sh` |
| `PS_SANDBOX_SH_ARGS` | — (kosong) | Argumen sebelum nama script untuk `.sh`, mis. `-e` |
| `PS_SANDBOX_SH_NORMALIZE_EOL` | `1` | `0` = jangan normalkan CRLF → LF saat menulis `.sh` |
| `PS_SANDBOX_EXTENSIONS` | `.ps1,.sh` | Ekstensi script yang diizinkan |
| `PS_SANDBOX_DEFAULT_TIMEOUT_MS` | `120000` | Timeout default |
| `PS_SANDBOX_MAX_TIMEOUT_MS` | `600000` | Batas atas timeout |
| `PS_SANDBOX_MAX_OUTPUT_BYTES` | `200000` | Batas output per stream yang dikembalikan |
| `PS_SANDBOX_MAX_CONCURRENT` | `2` | Run bersamaan maksimum |
| `PS_SANDBOX_KEEP_RUNS` | `50` | Jumlah run/log yang disimpan |
| `PS_SANDBOX_MAX_SCRIPT_BYTES` | `1000000` | Batas ukuran script |
| `PS_SANDBOX_DENY` | `1` | `0` = matikan guardrails PowerShell |
| `PS_SANDBOX_DENY_SH` | ikut `PS_SANDBOX_DENY` | `0` = matikan guardrails sh |

Layout di host (bind mount container ke `/sandbox`):

```
%TEMP%\opencode\ps-sandbox\
├── scripts\            # tempat write_script / run_script
│   └── __inline\       # file sementara dari run_code
├── work\<run_id>\      # working dir + TEMP/TMP per run
└── logs\<run_id>\      # stdout.log, stderr.log, result.json
```

## Contoh alur pakai

PowerShell:

1. `write_script` `{ "name": "check/env.ps1", "content": "..." }`
2. `run_script` `{ "script": "check/env.ps1", "timeout_ms": 30000 }`
3. Baca `stdout`/`stderr` dari hasil; kalau terpotong, ambil sisanya via `read_log` dengan `run_id` yang sama.

Bash:

1. `write_script` `{ "name": "check/env.sh", "content": "#!/usr/bin/env bash\necho \"$1\"\n" }`
2. `run_script` `{ "script": "check/env.sh", "args": ["nilai"], "timeout_ms": 30000 }`
3. Sama seperti di atas; `args` diterima sebagai array lalu jadi `$1`, `$2`, ... di dalam script.