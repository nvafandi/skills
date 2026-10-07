#Requires -Version 5.1
<#
  start-sandbox.ps1 — menjalankan MCP Sandbox dengan Podman sebagai engine
  yang kompatibel Docker (tanpa Docker Desktop).

  Dipakai sebagai pengganti `uv run main.py` biasa, karena docker SDK perlu
  tahu lokasi pipe Podman lewat variabel DOCKER_HOST.
#>

$repo = 'C:\Users\irvan\python-sandbox'
$podman = 'C:\Program Files\RedHat\Podman\podman.exe'

# 1. Cari uv (bisa dari PATH atau lokasi instal winget)
$uv = (Get-Command uv -ErrorAction SilentlyContinue).Source
if (-not $uv) {
    $uv = Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" `
          -Recurse -Filter uv.exe -ErrorAction SilentlyContinue |
          Select-Object -First 1 -ExpandProperty FullName
}
if (-not $uv) { throw "uv tidak ditemukan di PATH maupun paket winget." }

# 2. Pastikan podman machine sudah dibuat dan berjalan
if (-not (Test-Path $podman)) { throw "podman.exe tidak ada di $podman" }

$started = & $podman machine list --format "{{.Name}}|{{.Status}}" 2>$null
if (-not $started) {
    Write-Host "[*] Belum ada podman machine, membuat..."
    & $podman machine init
}
& $podman machine start 2>$null

# 3. Arahkan docker SDK ke pipe Podman
$pipe = & $podman machine inspect --format '{{.ConnectionInfo.PodmanPipe.Path}}' 2>$null |
         Select-Object -First 1
if ($pipe) {
    $env:DOCKER_HOST = 'npipe://' + ($pipe -replace '\\', '/')
    Write-Host "[*] DOCKER_HOST = $env:DOCKER_HOST"
} else {
    Write-Warning "Pipe Podman tidak ditemukan; docker SDK akan memakai pipe default."
}

# 4. Jalankan server (SSE di http://127.0.0.1:8181/sse)
Set-Location $repo
Write-Host "[*] Menjalankan MCP Sandbox di http://127.0.0.1:8181 ..."
& $uv run main.py
