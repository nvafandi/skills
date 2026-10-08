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
| `scripts/setup-npm.js` | Setup instalasi via npm (`npm pack` / registry) + tulis config OpenCode |
| `LICENSE` | Lisensi MIT (berlaku untuk package npm) |
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
node test\config-check.mjs                       # pakai ~/.config/opencode/opencode.json
node test\config-check.mjs "D:/custom/opencode.json"   # config lain
```

Blok config untuk OpenCode (pakai launcher, lihat catatan di bawah):

```jsonc
"powershell-sandbox": {
  "type": "local",
  "command": ["node", "<folder-project>/scripts/launch-stdio.js"],
  "environment": { "PS_PODMAN_HOST_ROOT": "<folder-data>/opencode/ps-sandbox" },
  "timeout": { "startup": 180000 }
}
```

`<folder-project>` = lokasi repo ini di device kamu; `<folder-data>` =
`%LOCALAPPDATA%` (Windows) / `$XDG_DATA_HOME` atau `~/.local/share` (Linux) /
`~/Library/Application Support` (macOS). `node` sebaiknya ditulis absolut
(`where node` / `which node`) kalau PATH proses OpenCode tidak memuatnya.

Versi tanpa launcher (`podman run` langsung), kalau memang mau manual:

```jsonc
"powershell-sandbox": {
  "type": "local",
  "command": [
    "podman",                 // atau path absolut hasil `where podman`
    "run", "-i", "--rm",
    "--network", "none",
    "--memory", "2g",
    "--pids-limit", "512",
    "-v", "<folder-data>/opencode/ps-sandbox:/sandbox",
    "-e", "PS_SANDBOX_HOST_ROOT=<folder-data>/opencode/ps-sandbox",
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
> `PS_PODMAN_BIN` jarang perlu diisi: launcher mencari `podman` lewat `PATH` dulu,
> baru jatuh ke lokasi install umum, jadi tidak ada path install yang ditulis tetap.
> Cek hasil resolusi path di device tertentu tanpa menjalankan container:
> `node scripts/launch-stdio.js --resolve-only`

Catatan mode podman:

- `-i` wajib: stdio MCP butuh stdin container tetap terbuka.
- `-v ...:/sandbox` membuat script, work dir, dan log **tetap terlihat dari host** — OpenCode masih bisa membuka log dengan tool filesystem-nya. Berkat `PS_SANDBOX_HOST_ROOT`, path yang dilaporkan tool (`cwd`, `stdout_log`, ...) juga ditulis sebagai path host, bukan `/sandbox/...`.
- `--network none` = tanpa akses jaringan (loopback tetap jalan). Butuh internet? Ganti ke `--network bridge`.
- `--memory` / `--pids-limit` membatasi resource yang bisa dipakai script.
- Container jalan sebagai user non-root (`sandboxer`, uid 1000).
- **PowerShell di dalam container adalah pwsh 7 di Linux.** Cmdlet Windows-only (`Get-WinEvent`, `Get-CimInstance Win32_*`, registry provider, modul `-RSComputerSession`, ActiveDirectory, dsb.) tidak ada. Untuk script yang butuh itu, pakai mode native.
- **`.sh` di dalam container memakai bash 5.1 bawaan Ubuntu**, jadi utilitas POSIX standar (`grep`, `sed`, `awk`, `curl`, `find`, ...) tersedia tanpa install tambahan.
- **Di mode native, `.sh` memakai Git Bash.** `bash.exe` bawaan Windows (`WindowsApps`) cuma launcher
  interop WSL yang merusak path Windows, jadi dicari lewat `PATH` dulu (foldernya harus mengandung
  `Git`), baru lokasi install umum — tanpa asumsi lokasi install tertentu. Isi ke `PS_SANDBOX_SH_SHELL`
  untuk menimpanya. Perlu diingat Git Bash (cygwin)
  menimpa `TEMP`/`TMP` jadi `/tmp` — jadi di host Windows jangan,andalkan `TEMP` menunjuk ke run dir untuk `.sh`.

## Pakai via npm (mode native)

Cara ini meng-install package ini sendiri ke folder khusus, jadi config
OpenCode tidak menunjuk langsung ke folder project. Sumbernya dua pilihan:
**tarball lokal** (`npm pack`, default) atau **registry npm** (`--from-registry`).

```powershell
npm install            # sekali saja (dependency untuk test & setup)
npm run setup:npm      # pack + install + tulis config OpenCode
```

Hasilnya (semua path dihitung dari device yang menjalankan setup):

| Item | Nilai |
|---|---|
| Folder instalasi | `<data-dir>/mcp-servers/powershell-sandbox` — Windows `%LOCALAPPDATA%`, Linux `$XDG_DATA_HOME`/`~/.local/share`, macOS `~/Library/Application Support` |
| Sumber package | `tarball lokal` (`powershell-sandbox-mcp-<ver>.tgz`) atau `registry npm` (`powershell-sandbox-mcp@^<ver>`) |
| Blok server | `process.execPath` (node yang menjalankan setup) + `.../node_modules/powershell-sandbox-mcp/src/server.js` |
| `PS_SANDBOX_ROOT` | `os.tmpdir()/opencode/ps-sandbox` (`%TEMP%\opencode\ps-sandbox` di Windows) |
| Config OpenCode | `--opencode` > env `OPENCODE_CONFIG` > `~/.config/opencode/opencode.json` |
| Backup config | `opencode.json.bak.npm`, dibuat **sekali** berisi config sebelum setup |

Opsi (diteruskan lewat `--`):

```powershell
npm run setup:npm -- --enable              # sekalian nyalakan server (disabled=false)
npm run setup:npm -- --no-opencode         # jangan mengubah opencode.json
npm run setup:npm -- --target "D:/mcp/ps"  # ganti folder instalasi
npm run setup:npm -- --opencode "C:/path/opencode.json"
npm run setup:npm -- --sandbox-root "D:/ps-sandbox"
npm run setup:npm -- --from-registry       # install dari registry npm (butuh internet)
npm run setup:npm -- --from-registry --spec "^1.2.0"   # pilih versi di registry
npm run setup:npm -- --help
```

### Tanpa folder project (install dari registry npm)

Kalau package sudah dipublikasikan, device lain cukup mengambil script setup
dari package yang terpasang — tidak perlu membawa folder project:

```powershell
mkdir mcp-setup; cd mcp-setup
npm install powershell-sandbox-mcp --no-save
node node_modules/powershell-sandbox-mcp/scripts/setup-npm.js --from-registry --enable
node node_modules/powershell-sandbox-mcp/test/config-check.mjs   # verifikasi
```

Sama seperti flow di atas: semua path (folder instalasi, `opencode.json`,
`PS_SANDBOX_ROOT`) di-resolve dari device itu sendiri.

Verifikasi handshake + 1 run terhadap command yang tertulis di config:

```powershell
node test\config-check.mjs        # config default, tanpa argumen
```

Catatan:

- **Update**: jalankan ulang `npm run setup:npm` setelah mengubah `src/`;
  bump `version` di `package.json` supaya nama tarball berganti. Kalau versi
  tidak berubah, script tetap memaksa isi `node_modules` diperbarui dengan
  membuang package + `package-lock.json` dulu — `npm install` biasa **tidak**
  me-refresh isi `node_modules` selama nama tarball sama (sudah diuji).
- **`disabled` dipertahankan** seperti konfigurasi sebelumnya — server baru
  menyala setelah `--enable` (atau edit manual) **dan** restart OpenCode.
- **`command` memakai `node.exe` langsung ke `src/server.js`**, bukan shim
  `powershell-sandbox-mcp.cmd` hasil `npm link`: shim `.cmd`/`.ps1` Windows
  tidak selalu bisa di-spawn proses host OpenCode.
- **Instalasi terpisah dari folder project** — `node_modules` di folder project
  (untuk `npm test`) tidak mempengaruhi server yang terpasang, dan file project
  yang sedang diedit tidak ikut mempengaruhi server yang jalan.
- `--no-opencode` berguna kalau config OpenCode kamu berisi komentar (JSONC);
  script menolak mengubah file yang bukan JSON polos, dan kamu tinggal menyalin
  bloknya manual.

## Client lain (Claude, Cline, GitHub Copilot, Gemini, Cursor, ...)

Server ini memakai transport MCP stdio biasa, jadi client apa pun yang
mendukung MCP bisa memakainya — yang berbeda hanya lokasi file config dan
bentuk entry-nya. `scripts/setup-clients.js` menulis entry ke banyak client
sekaligus; semua path di-resolve dari environment device (tidak ada path
device yang ditulis tetap):

```powershell
npm run setup:clients                    # tulis ke semua client terdeteksi
npm run setup:clients -- --list          # client + status + path config device ini
npm run setup:clients -- --clients claude-desktop,cursor
npm run setup:clients -- --print gemini  # blok siap tempel, tanpa menulis
npm run setup:clients -- --dry-run --all # pratinjau semua client
```

Client yang didukung (`--list` menampilkan status di device kamu):

| id | Client | Key di config | Lokasi config (kandidat Win/mac/Linux) |
|---|---|---|---|
| `opencode` | OpenCode | `mcp.servers` | `~/.config/opencode/opencode.json` atau env `OPENCODE_CONFIG` |
| `claude-desktop` | Claude Desktop | `mcpServers` | `%APPDATA%/Claude/claude_desktop_config.json` · `~/Library/Application Support/Claude/...` · `~/.config/Claude/...` |
| `claude-code` | Claude Code (CLI) | `mcpServers` | `~/.claude.json` |
| `cline` | Cline (VS Code) | `mcpServers` | `%APPDATA%/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json` |
| `roo` | Roo Code (VS Code) | `mcpServers` | `%APPDATA%/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/mcp_settings.json` |
| `vscode` | VS Code user settings (GitHub Copilot / ekstensi MCP) | `mcp.servers` | `%APPDATA%/Code/User/settings.json` |
| `vscode-workspace` | VS Code workspace (opt-in) | `servers` | `<project>/.vscode/mcp.json` |
| `gemini` | Gemini CLI | `mcpServers` | `~/.gemini/settings.json` |
| `cursor` | Cursor | `mcpServers` | `~/.cursor/mcp.json` |
| `windsurf` | Windsurf (Codeium) | `mcpServers` | `~/.codeium/windsurf/mcp_config.json` |

Aturan keamanan menulis:

- **Hanya JSON polos** yang diubah. File berisi komentar (JSONC, umum di
  `settings.json` VS Code) tidak disentuh — script mencetak blok siap tempel
  di output, atau pakai `--print <id>` lebih dulu.
- **Backup sekali**: `<config>.bak.mcp`; run ulang tidak menimpa backup.
- Client yang **belum terpasang** dilewati; file baru tidak dibuat sembarangan
  di root HOME/`%APPDATA%` hanya karena foldernya kebetulan ada.
- **Idempoten + merge**: run ulang tidak menulis apa pun kalau sudah sama, dan
  field yang kamu tambahkan sendiri (`disabled`, `autoApprove`, ...) tetap
  dipertahankan saat entry diperbarui.
- Setelah mengubah config, **restart client** (Claude Desktop: quit penuh,
  bukan tutup jendela) lalu cek panel MCP-nya: `powershell-sandbox` dengan
  8 tool.

Catatan Windows: sebagian client men-spawn command tanpa shell sehingga shim
`npx`/`.cmd` sering gagal. Karena itu semua entry memakai `node.exe` absolut
ke `src/server.js` — bentuk paling kompatibel lintas client.

Untuk client yang tidak didukung otomatis, bentuk entry universalnya (hasil
`--print`):

```json
{
  "mcpServers": {
    "powershell-sandbox": {
      "command": "<path>/node",
      "args": ["<path>/node_modules/powershell-sandbox-mcp/src/server.js"],
      "env": { "PS_SANDBOX_ROOT": "<tmp>/opencode/ps-sandbox" }
    }
  }
}
```

VS Code memakai `type: "stdio"` + key `mcp.servers` (user) atau `servers`
(workspace); OpenCode memakai `type: "local"`, `command` array, dan
`environment` — ketiganya sudah ditangani shape masing-masing.

## Path per device (portabilitas)

Tidak ada path device yang ditulis tetap di kode — semuanya di-resolve saat
script berjalan, jadi folder project boleh ada di lokasi mana pun dan setup
bisa diulang di device lain tanpa mengedit apa pun:

| Yang dibutuhkan | Sumber resolusi |
|---|---|
| Lokasi `node` | `process.execPath` (node yang menjalankan `npm run setup:npm`) |
| Folder instalasi | userDataDir per platform — Windows `%LOCALAPPDATA%`, Linux `$XDG_DATA_HOME`/`~/.local/share`, macOS `~/Library/Application Support`; override `--target` |
| `opencode.json` | `--opencode` > env `OPENCODE_CONFIG` > `~/.config/opencode/opencode.json` (sama di Windows/macOS/Linux) |
| `PS_SANDBOX_ROOT` | `os.tmpdir()/opencode/ps-sandbox`; override `--sandbox-root` |
| `podman` (mode podman) | env `PS_PODMAN_BIN` > `PATH` > lokasi install umum |
| Git Bash untuk `.sh` | `PATH` (folder mengandung `Git`, bukan `WindowsApps`) > lokasi install umum |
| PowerShell `.ps1` | `powershell.exe` / `pwsh` dari `PATH` (`PS_SANDBOX_SHELL` untuk menimpa) |

Checklist device baru (pilih salah satu):

```powershell
# A. dengan folder project (git clone / salin repo ini)
npm install                          # dependency test + setup
npm run setup:npm -- --enable        # install tarball + tulis config device ini
node test\config-check.mjs           # harus "handshake ok" + "OK"

# B. tanpa folder project (package sudah di registry npm)
mkdir mcp-setup; cd mcp-setup
npm install powershell-sandbox-mcp --no-save
node node_modules/powershell-sandbox-mcp/scripts/setup-npm.js --from-registry --enable
node node_modules/powershell-sandbox-mcp/test/config-check.mjs
```

Lalu restart OpenCode.

> Config yang ditulis setup selalu berisi path absolut hasil resolusi device
> itu, jadi **jangan menyalin `opencode.json` antar device** — jalankan ulang
> `npm run setup:npm` di tiap device (aman, idempoten, backup dibuat sekali).

## Publikasi ke registry npm

Package terdaftar di npm sebagai [`powershell-sandbox-mcp`](https://www.npmjs.com/package/powershell-sandbox-mcp)
(lisensi MIT, `files` dibatasi `src` + `scripts` + `test/config-check.mjs` + `Dockerfile`,
`test/smoke.js` tidak ikut terbit).

Alur rilis:

```powershell
npm version patch                 # atau minor/major; ikut commit + tag
npm test                          # prepublishOnly juga menjalankan ini otomatis
npm login                         # kalau belum login (token: npmjs.com → Access Tokens)
npm publish
```

Catatan rilis:

- **`private: true` sudah dihapus** supaya bisa publish; jangan dikembalikan.
- `prepublishOnly: npm test` — publish diblokir kalau smoke test gagal.
- Versi di registry dipakai `--from-registry` (default `^<versi package.json>`);
  setelah rilis, jalankan ulang `npm run setup:npm -- --from-registry --enable`
  di device lain untuk mengambil versi baru.
- Package name bersifat global: kalau suatu saat pindah scope
  (`@user/powershell-sandbox-mcp`), perbarui `name`, `bin`, dan langkah
  `npm install` di README ini.

## Pakai mode native (langsung dari folder project)

```bash
npm install
npm test          # smoke test end-to-end (server di host)
npm start         # jalankan server (stdio)
```

```jsonc
"powershell-sandbox": {
  "type": "local",
  "command": ["node", "<folder-project>/src/server.js"],
  "environment": { "PS_SANDBOX_ROOT": "<folder-data>/opencode/ps-sandbox" }
}
```

> `<folder-project>` = lokasi folder `mcp/powershell-sandbox` di device kamu.
> `PS_SANDBOX_ROOT` opsional (default-nya sudah `os.tmpdir()/opencode/ps-sandbox`).
> Pakai path absolut `node` dari `where node`/`which node` kalau `node` tidak ada
> di PATH proses OpenCode — atau lewati langkah ini dan pakai `npm run setup:npm`
> yang menulis bloknya otomatis dengan path yang sudah di-resolve.

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
| `PS_SANDBOX_ROOT` | `/sandbox` (container) / `os.tmpdir()/opencode/ps-sandbox` (native; `%TEMP%` di Windows) | Folder root sandbox |
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

Layout di host (bind mount container ke `/sandbox`), `<tmp>` = `os.tmpdir()`
(`%TEMP%` di Windows):

```
<tmp>/opencode/ps-sandbox/
├── scripts/            # tempat write_script / run_script
│   └── __inline/       # file sementara dari run_code
├── work/<run_id>/      # working dir + TEMP/TMP per run
└── logs/<run_id>/      # stdout.log, stderr.log, result.json
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