<#
.SYNOPSIS
  Jalankan server MCP url-downloader secara manual (stdio) untuk dipakai uji.

.DESCRIPTION
  Paket PyPI yang dijalankan sekali jalan oleh uvx. Karena transport-nya stdio,
  server ini tidak mencetak apa pun yang berguna di terminal — jalankan hanya
  saat ingin memastikan koneksinya hidup, lalu sambungkan klien MCP ke stdio
  proses ini.

.EXAMPLE
  pwsh -File run.ps1
#>
$ErrorActionPreference = 'Stop'

$uv = (Get-Command uv -ErrorAction SilentlyContinue).Source
if (-not $uv) {
    $uv = Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" `
        -Recurse -Filter uv.exe -ErrorAction SilentlyContinue |
        Select-Object -First 1 -ExpandProperty FullName
}
if (-not $uv) { throw 'uv tidak ditemukan di PATH maupun paket winget.' }

Write-Host "[*] uv: $uv" -ForegroundColor Cyan
Write-Host '[*] menjalankan mcp-url-downloader (stdio, Ctrl+C untuk berhenti)' -ForegroundColor Cyan

& $uv tool uvx --with 'mcp<2' --from mcp-url-downloader `
    python -c 'from mcp_url_downloader.server import main; main()'