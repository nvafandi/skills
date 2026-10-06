# powershell-sandbox-mcp

MCP server (stdio) untuk menjalankan script PowerShell di **sandbox ringan** — tanpa mencemari folder kerja utama.

## Isi

| Path | Fungsi |
|---|---|
| `src/server.js` | MCP stdio server, definisi 8 tool |
| `src/sandbox.js` | Core: penjaga path, run engine, timeout, log, guardrails |
| `src/config.js` | Semua limit + path + deny-list, bisa di-override via env |
| `test/smoke.js` | Smoke test end-to-end lewat MCP client (`npm test`) |

## Tool

| Tool | Fungsi |
|---|---|
| `sandbox_info` | Folder sandbox, versi PowerShell, limit, guardrails, env allowlist, jumlah file |
| `list_scripts` | Daftar `.ps1` di `scripts/` (terbaru dulu) |
| `write_script` | Buat/timpa `.ps1` (butuh `overwrite: true` kalau sudah ada) |
| `read_script` | Baca isi `.ps1` |
| `delete_script` | Hapus `.ps1` |
| `run_script` | Jalankan `.ps1` → exit code, durasi, stdout/stderr, path log |
| `run_code` | Jalankan kode PowerShell inline (ditulis ke file sementara dulu) |
| `read_log` | Ambil log `stdout`/`stderr` lengkap dari sebuah `run_id` |

## Isolasi (ringan)

- **Proses terpisah** — `powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File <script>`.
- **Working dir per run** — `work/<run_id>/`; `TEMP`/`TMP` juga diarahkan ke sana, jadi file sementara tidak jatuh ke `%TEMP%` user.
- **Env minimal** — hanya allowlist (`SystemRoot`, `PATH`, `USERPROFILE`, `PSModulePath`, ...) + `PS_SANDBOX*` marker + env tambahan per-run.
- **Timeout** — default 120s, maks 600s; saat kena timeout, `taskkill /T /F` untuk seluruh pohon proses.
- **Log** — `logs/<run_id>/stdout.log`, `stderr.log`, `result.json`; output ke pemanggil dipotong (default 200 KB).
- **Penjaga path** — script wajib path relatif, akhiran `.ps1`, dan realpath-nya harus tetap di dalam `scripts/` (anti `..` traversal & symlink escape).
- **Guardrails** — pola berbahaya dipindai sebelum eksekusi: `Format-Volume`, `Clear-Disk`, `Initialize-Disk`, `Remove-Partition`, `Remove-Item -Recurse` pada drive root, `rd /s`, `format`, `Remove-CimInstance`, `Stop/Restart-Computer`, `Set-ExecutionPolicy`, `reg delete`, `cipher /w`. Nonaktifkan dengan `PS_SANDBOX_DENY=0`.
- **Berjalan serial-max** — maks 2 run bersamaan; run lama dipangkas sesuai `PS_SANDBOX_KEEP_RUNS`.

> **Bukan security boundary.** Script tetap punya hak akses user yang menjalankan server (mis. `USERPROFILE`). Untuk script yang tidak dipercaya, gunakan AppContainer/WDAC, container, atau VM — bukan tool ini.

## Konfigurasi (env)

| Env | Default | Keterangan |
|---|---|---|
| `PS_SANDBOX_ROOT` | `%TEMP%\opencode\ps-sandbox` | Folder root sandbox |
| `PS_SANDBOX_SHELL` | `powershell.exe` | Binary PowerShell (bisa `pwsh.exe`) |
| `PS_SANDBOX_DEFAULT_TIMEOUT_MS` | `120000` | Timeout default |
| `PS_SANDBOX_MAX_TIMEOUT_MS` | `600000` | Batas atas timeout |
| `PS_SANDBOX_MAX_OUTPUT_BYTES` | `200000` | Batas output per stream yang dikembalikan |
| `PS_SANDBOX_MAX_CONCURRENT` | `2` | Run bersamaan maksimum |
| `PS_SANDBOX_KEEP_RUNS` | `50` | Jumlah run/log yang disimpan |
| `PS_SANDBOX_MAX_SCRIPT_BYTES` | `1000000` | Batas ukuran script |
| `PS_SANDBOX_DENY` | `1` | `0` = matikan guardrails |

Layout default:

```
%TEMP%\opencode\ps-sandbox\
├── scripts\            # tempat write_script / run_script
│   └── __inline\       # file sementara dari run_code
├── work\<run_id>\      # working dir + TEMP/TMP per run
└── logs\<run_id>\      # stdout.log, stderr.log, result.json
```

## Pakai

```bash
npm install
npm test          # smoke test end-to-end
npm start         # jalankan server (stdio)
```

## Pasang ke OpenCode

Tambahkan di `opencode.jsonc`:

```jsonc
"powershell-sandbox": {
  "type": "local",
  "command": ["node", "C:/Users/irvan/Documents/project/skills/mcp/powershell-sandbox/src/server.js"],
  "enabled": true,
  "environment": {
    "PS_SANDBOX_ROOT": "C:/Users/irvan/AppData/Local/Temp/opencode/ps-sandbox"
  }
}
```

> Pakai path absolut `node` dari `where node` (di Windows biasanya `C:/Program Files/nodejs/node.exe`) kalau `node` tidak ada di PATH proses OpenCode.

## Contoh alur pakai

1. `write_script` `{ "name": "check/env.ps1", "content": "..." }`
2. `run_script` `{ "script": "check/env.ps1", "timeout_ms": 30000 }`
3. Baca `stdout`/`stderr` dari hasil; kalau terpotong, ambil sisanya via `read_log` dengan `run_id` yang sama.