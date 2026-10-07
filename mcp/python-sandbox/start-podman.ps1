# Autostart Podman machine saat login.
# MCP Sandbox butuh API container (pipe docker_engine) yang hanya tersedia
# setelah podman machine berjalan. Dijalankan oleh Task Scheduler saat logon.

$podman = "C:\Program Files\RedHat\Podman\podman.exe"
if (-not (Test-Path $podman)) {
    exit 0
}

try {
    $status = & $podman machine list --format "{{.Name}}|{{.Status}}" 2>$null
} catch {
    $status = $null
}

if ("$status" -match "Currently running") {
    exit 0
}

try {
    & $podman machine start 2>&1 | Out-Null
} catch {
    # biarkan gagal senyap; server MCP akan menunggu koneksi
}
