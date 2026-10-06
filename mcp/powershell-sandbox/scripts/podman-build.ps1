<#
.SYNOPSIS
  Build image powershell-sandbox-mcp (PowerShell 7 + Node 22) untuk podman.

.EXAMPLE
  pwsh -File scripts\podman-build.ps1
  pwsh -File scripts\podman-build.ps1 -Smoke
#>
[CmdletBinding()]
param(
    [string] $Image = 'localhost/powershell-sandbox-mcp:latest',
    [string] $BaseImage = 'mcr.microsoft.com/powershell:7.5-ubuntu-22.04',
    [switch] $NoCache,
    [switch] $Smoke
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

if (-not (Get-Command podman -ErrorAction SilentlyContinue)) {
    throw 'podman tidak ditemukan di PATH.'
}

Write-Host "==> build $Image (base: $BaseImage)" -ForegroundColor Cyan
$args = @('build', '-t', $Image, '-f', (Join-Path $root 'Dockerfile'))
if ($NoCache) { $args += '--no-cache' }
$args += $root

& podman @args
if ($LASTEXITCODE -ne 0) { throw "podman build gagal (exit $LASTEXITCODE)" }

Write-Host "==> selesai: $Image" -ForegroundColor Green

if ($Smoke) {
    & (Join-Path $PSScriptRoot 'podman-smoke.ps1') -Image $Image
}