# url-downloader (MCP)

Server MCP untuk mengunduh file dari URL ke filesystem lokal. Dipakai saat agent
butuh menarik artefak (zip, pdf, gambar, dataset) langsung ke disk.

Source tidak ada di disk — ini paket PyPI yang dijalankan sekali jalan oleh
`uvx`, jadi folder ini berisi **dokumentasi + run script** saja.

## Command yang aktif di config lokal

```jsonc
"url-downloader": {
  "type": "local",
  "command": [
    "uvx",
    "--with", "mcp<2",
    "--from", "mcp-url-downloader",
    "python",
    "-c", "from mcp_url_downloader.server import main; main()"
  ],
  "timeout": { "startup": 120000 }
}
```

`--with mcp<2` penting: paket ini belum kompatibel dengan MCP SDK v2, jadi
dipaksa memakai versi 1.x. `--from mcp-url-downloader` memberi nama paketnya.

## Jalankan manual

```powershell
pwsh -File C:\Users\irvan\Documents\project\skills\mcp\url-downloader\run.ps1
```

Dijalankan via stdio, jadi harus disambungkan lewat klien MCP — tidak bisa
dipakai langsung dari terminal biasa.

## Tool

| Tool | Fungsi |
|---|---|
| `download_single_file` | Unduh 1 URL → simpan ke folder (default 500 MB maks) |
| `download_files` | Unduh beberapa URL sekaligus (hasil per-URL) |

Parameter penting: `output_dir`, `filename`, `timeout` (1–300 detik),
`max_size_mb` (1–5000).

## Catatan perilaku

- **SSRF protection**: private IP dan localhost diblokir.
- **Anti path traversal**: nama file hasil disanitize; nama duplikat diberi
  suffix unik.
- Folder tujuan harus sudah ada, atau diisi lewat `output_dir`.

## Kalau `uvx` tidak ada

Pasang uv (misalnya `winget install astral-sh.uv`), atau ganti perintah di
config dengan path absolut `uv.exe`:

```
C:/Users/irvan/AppData/Local/Microsoft/WinGet/Packages/astral-sh.uv_Microsoft.Winget.Source_8wekyb3d8bbwe/uv.exe
```