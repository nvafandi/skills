# MCP — Backup Config + Source

Dua isi sekaligus:

1. **Snapshot konfigurasi** MCP server OpenCode (`opencode.jsonc`,
   `postgres-mcp-config.json`). Sumber sebenarnya tetap di mesin lokal — folder
   ini hanya backup yang versioned.
2. **Vendor source** MCP server yang dipakai di mesin ini, supaya bisa
   di-restore/di-audit tanpa andal pada cache atau path mesin.

## File Config

| File | Asal | Catatan |
|---|---|---|
| `opencode.jsonc` | `~/.config/opencode/opencode.json` (blok `mcp` saja) | Blok `provider` tidak disertakan karena berisi API keys |
| `postgres-mcp-config.json` | `~/.config/opencode/postgres-mcp-config.json` | **Password di-redact** (`<REDACTED>`) |

## Server Terdaftar

| Nama | Type | Fungsi | Source di repo |
|---|---|---|---|
| `context7` | remote | Dokumentasi library/framework terkini | — (remote) |
| `filesystem` | local | Akses filesystem (`C:/Users/irvan`) | `filesystem/` (manifest saja) |
| `sequential-thinking` | local | Problem solving bertahap | — |
| `memory` | local | Knowledge graph memori sesi | — |
| `postgres` | local | Introspection & monitoring PostgreSQL (multi-DB: aob, newods, nbwf) | — (paket npm) |
| `graphify` | local | Query knowledge graph kode (`query_graph`, `shortest_path`, dll.) — menunjuk ke `~/.config/opencode/graph.json` | — (CLI `uv tool`) |
| `python-sandbox` | local | Sandbox container Python (podman) | `python-sandbox/` (source lengkap) |
| `powershell-sandbox` | local | Sandbox script PowerShell (podman, pwsh 7) | `powershell-sandbox/` (source lengkap) |
| `url-downloader` | local | Unduh file dari URL ke disk | `url-downloader/` (dokumentasi) |
| `android-mcp` | local | Kendali perangkat Android via ADB | `android-mcp/` (dokumentasi) |

`url-downloader` dan `android-mcp` tidak punya source di disk: keduanya paket
PyPI yang dijalankan sekali jalan oleh `uvx`, jadi foldernya berisi README +
`run.ps1` dengan command yang sama persis seperti di config.

> `supergateway` (48 MB) ada di `AppData\Local/mcp-servers/` tapi **tidak**
> terdaftar di config — sengaja tidak di-vendor.

## Isi Vendor

```
mcp/
├── android-mcp/        README + run.ps1 (uvx --python 3.13 android-mcp)
├── filesystem/         package.json + lock (node_modules tidak ikut)
├── postgres-mcp-config.json
├── powershell-sandbox/ source MCP Node + Dockerfile (PowerShell 7 + Node 22)
├── python-sandbox/     source project Python (tanpa .venv/.git)
├── url-downloader/     README + run.ps1 (uvx --from mcp-url-downloader)
└── opencode.jsonc
```

Yang **tidak** masuk repo: `.venv` (93 MB), `node_modules` (23 MB), `*.log`,
`__pycache__`. Semua bisa dibangun ulang dari manifest yang tersedia.

## Restore

1. **opencode.jsonc** → merge blok `"mcp"` ke `~/.config/opencode/opencode.json`, lalu restart OpenCode.
2. **postgres-mcp-config.json** → salin ke `~/.config/opencode/postgres-mcp-config.json` dan isi ulang password asli (tidak pernah disimpan di repo ini).
3. **context7** membutuhkan env `CONTEXT7_API_KEY`.
4. **graphify** membutuhkan instalasi CLI: `uv tool install "graphifyy[mcp]"` dan graph sudah dibangun (`graphify extract . --code-only`).
5. **filesystem** → `cd mcp/filesystem && npm install`, lalu arahkan `command` ke `mcp/filesystem/node_modules/@modelcontextprotocol/server-filesystem/dist/index.js`.
6. **python-sandbox** → source ada di `mcp/python-sandbox`; tapi yang aktif memakai venv di `C:/Users/irvan/python-sandbox`. Detail modifikasi lokal + rename ada di `mcp/python-sandbox/LOCAL.md`.
7. **powershell-sandbox** → butuh image podman: `pwsh -File mcp/powershell-sandbox/scripts/podman-build.ps1 -Smoke` (build + smoke test). Ganti `--network none` ke `bridge` kalau script butuh internet. Semua limit/guardrail dikontrol env `PS_SANDBOX_*`.
8. **url-downloader** & **android-mcp** → tidak perlu install; cukup `uv` tersedia. Jalankan `mcp/<server>/run.ps1` untuk cek koneksinya.

## Keamanan

- Jangan pernah menghapus redaksi `<REDACTED>` di file repo ini.
- Kredensial asli hanya hidup di `~/.config/opencode/` (lokal).
- `mcp/python-sandbox/config.toml` memakai `require_auth = false` — jangan
  dibuka ke jaringan publik (host sudah `127.0.0.1`).