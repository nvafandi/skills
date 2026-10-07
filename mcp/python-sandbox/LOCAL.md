# Catatan lokal — python-sandbox

Salinan **source** dari project yang berjalan di
`C:\Users\irvan\python-sandbox` (path itu yang dipakai config OpenCode).
Folder ini tidak dipakai saat runtime; dipakai sebagai backup/vendor source
di repo `skills`.

## Asal

- Upstream: <https://github.com/JohanLi233/python-mcp-sandbox> (lihat `README.md`
  dan `README_zh.md` yang ikut disalin apa adanya, plus `LICENSE`).
- Yang tidak ikut disalin: `.venv` (93 MB), `.git`, `*.log`, `__pycache__`.

## Modifikasi lokal (harus dipertahankan kalau upstream di-update)

| File | Perubahan |
|---|---|
| `mcp_stdio.py` | Entry point transport stdio (dibuat lokal; upstream pakai SSE/HTTP) |
| `start-sandbox.ps1` | Menjalankan lewat Podman (bukan Docker Desktop) + set `DOCKER_HOST` |
| `start-podman.ps1` | Autostart `podman machine` saat login (dipanggil Task Scheduler) |
| `.python-version` | Pin interpreter untuk uv |
| `config.toml` | `host = 127.0.0.1`, `log_file = python_sandbox.log`, index PyPI resmi |
| `.docker_build_info` | Metadata build image `python-sandbox:latest` |
| `python_sandbox/core/sandbox_modules/manager.py` | Modifikasi lokal |
| `python_sandbox/core/sandbox_modules/package.py` | Modifikasi lokal |
| `python_sandbox/db/database.py` | Modifikasi lokal |

## Rename 2026-10-06

Project aslinya bernama `mcp-sandbox` (folder `mcp-sandbox`, package
`mcp_sandbox`). Sudah di-rename supaya tidak bentrok dengan
`powershell-sandbox`:

- package `mcp_sandbox/` → `python_sandbox/` (semua import ikut)
- `pyproject.toml`: `name = "python-sandbox"`, script `python-sandbox = "main:main"`
- `uv.lock`: nama paket `python-sandbox`
- log `mcp_sandbox.log` → `python_sandbox.log`
- logger `MCP_SANDBOX` → `PYTHON_SANDBOX`

Nama upstream di `README.md` (URL `git clone`) **sengaja tidak diubah** —
itu merujuk ke repo asli, bukan folder lokal.

## Menjalankan dari folder ini (opsional)

Butuh venv; paling gampang pakai milik folder aktif:

```powershell
cd C:\Users\irvan\Documents\project\skills\mcp\python-sandbox
uv sync                      # membuat .venv lokal
$env:DOCKER_HOST = 'npipe:///<pipe podman>'   # lihat start-sandbox.ps1
uv run python mcp_stdio.py
```

## Kalau config OpenCode diarahkan ke folder ini

Ganti `command` di `opencode.json`:

```jsonc
"python-sandbox": {
  "type": "local",
  "command": [
    "C:/Users/irvan/Documents/project/skills/mcp/python-sandbox/.venv/Scripts/python.exe",
    "-q", "-u", "-X", "utf8",
    "C:/Users/irvan/Documents/project/skills/mcp/python-sandbox/mcp_stdio.py"
  ]
}
```

`mcp_stdio.py` memaksa CWD ke folder project tempat dirinya berada, jadi
`config.toml` dan `sandbox_images/Dockerfile` selalu ditemukan.