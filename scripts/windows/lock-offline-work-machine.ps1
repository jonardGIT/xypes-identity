$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

param(
    [string]$RemoteName = 'origin'
)

. (Join-Path $PSScriptRoot 'OfflineBundles.ps1')

$hookPath = Join-Path $script:RootDir '.git\hooks\pre-push'

Assert-GitRepo

Push-Location $script:RootDir
try {
    & git remote get-url $RemoteName *> $null
    if ($LASTEXITCODE -eq 0) {
        & git remote remove $RemoteName
        if ($LASTEXITCODE -ne 0) {
            throw "git remote remove failed for $RemoteName"
        }
        Write-Log "Removed remote $RemoteName"
    }
    else {
        Write-Log "Remote $RemoteName is already absent"
    }
}
finally {
    Pop-Location
}

$hookDir = Split-Path $hookPath -Parent
if (-not (Test-Path $hookDir)) {
    New-Item -ItemType Directory -Path $hookDir | Out-Null
}

@'
#!/usr/bin/env bash
printf 'Push disabled on this machine. Use Git bundle transfer through the main machine.\n' >&2
exit 1
'@ | Set-Content -Path $hookPath -NoNewline

Assert-RemoteMissing -RemoteName $RemoteName
Write-Log "Offline-only push lock installed at $hookPath"
