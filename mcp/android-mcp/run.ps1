<#
.SYNOPSIS
  Jalankan server MCP android-mcp secara manual (stdio) untuk dipakai uji.

.DESCRIPTION
  Paket PyPI yang dijalankan sekali jalan oleh uvx dengan Python 3.13.
  Transport-nya stdio, jadi hanya berguna bila sebuah klien MCP disambungkan
  ke proses ini (atau untuk memastikan server bisa start).

.EXAMPLE
  pwsh -File run.ps1
#>
$ErrorActionPreference = 'Stop'

# Pastikan perangkat terlihat sebelum server dijalankan.
$adb = (Get-Command adb -ErrorAction SilentlyContinue).Source
if ($adb) {
    Write-Host '[*] adb devices:' -ForegroundColor Cyan
    & $adb devices -l
} else {
    Write-Warning 'adb tidak ditemukan di PATH; server tetap dijalankan tapi tool device akan gagal.'
}

$uv = (Get-Command uv -ErrorAction SilentlyContinue).Source
if (-not $uv) {
    $uv = Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" `
        -Recurse -Filter uv.exe -ErrorAction SilentlyContinue |
        Select-Object -First 1 -ExpandProperty FullName
}
if (-not $uv) { throw 'uv tidak ditemukan di PATH maupun paket winget.' }

Write-Host "[*] uv: $uv" -ForegroundColor Cyan
Write-Host '[*] menjalankan android-mcp (stdio, Ctrl+C untuk berhenti)' -ForegroundColor Cyan

& $uv tool uvx --python 3.13 android-mcp