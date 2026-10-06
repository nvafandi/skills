<#
.SYNOPSIS
  Smoke test server MCP yang jalan di dalam container podman.

.DESCRIPTION
  Menjalankan test/smoke.js dengan command podman run sehingga yang diuji adalah
  server di dalam container, bukan versi native.

.EXAMPLE
  pwsh -File scripts\podman-smoke.ps1
  pwsh -File scripts\podman-smoke.ps1 -Network bridge
#>
[CmdletBinding()]
param(
    [string] $Image = 'localhost/powershell-sandbox-mcp:latest',
    [string] $SandboxHostDir = (Join-Path $env:TEMP 'opencode\ps-sandbox'),
    [ValidateSet('none', 'bridge', 'slirp4netns', 'host')]
    [string] $Network = 'none',
    [string] $Memory = '2g',
    [int] $PidsLimit = 512
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

$containerDir = Join-Path $SandboxHostDir '.smoke'
if (Test-Path $containerDir) { Remove-Item -Recurse -Force $containerDir }
New-Item -ItemType Directory -Force -Path $containerDir | Out-Null

# Path host ditulis dengan forward slash supaya valid untuk -v podman maupun
# untuk PS_SANDBOX_HOST_ROOT yang dibaca di dalam container.
$hostPath = $containerDir -replace '\\', '/'

Write-Host "==> smoke test container: $Image" -ForegroundColor Cyan
Write-Host "    bind : $hostPath -> /sandbox"
Write-Host "    net  : $Network, mem: $Memory, pids: $PidsLimit"

$containerEnv = @{
    PS_SANDBOX_HOST_ROOT          = $hostPath
    PS_SANDBOX_DEFAULT_TIMEOUT_MS = '30000'
}

$runArgs = @(
    'podman', 'run', '-i', '--rm',
    '--network', $Network,
    '--memory', $Memory,
    '--pids-limit', "$PidsLimit",
    '-v', "${hostPath}:/sandbox"
)
foreach ($key in $containerEnv.Keys) { $runArgs += @('-e', "$key=$($containerEnv[$key])") }
$runArgs += $Image

$env:PS_SANDBOX_MCP_COMMAND = ($runArgs | ConvertTo-Json -Compress)

& node (Join-Path $root 'test\smoke.js')
$code = $LASTEXITCODE

Remove-Item Env:PS_SANDBOX_MCP_COMMAND -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force $containerDir -ErrorAction SilentlyContinue

exit $code