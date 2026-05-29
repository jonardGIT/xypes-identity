$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

param(
    [string]$BranchName = 'main',
    [string]$OutputPath = ''
)

. (Join-Path $PSScriptRoot 'OfflineBundles.ps1')

Assert-GitRepo
Assert-CleanWorktree
Assert-BranchExists -BranchName $BranchName
Ensure-OfflineTransferDir

if ([string]::IsNullOrWhiteSpace($OutputPath)) {
    $OutputPath = Get-DefaultMainBundlePath
}

Push-Location $script:RootDir
try {
    & git bundle create $OutputPath $BranchName
    if ($LASTEXITCODE -ne 0) {
        throw "git bundle create failed for $BranchName"
    }
}
finally {
    Pop-Location
}

Write-Log "Created main bundle at $OutputPath"
