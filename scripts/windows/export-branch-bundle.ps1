$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

param(
    [Parameter(Mandatory = $true)][string]$BranchName,
    [string]$BaseBranch = 'main',
    [string]$OutputPath = ''
)

. (Join-Path $PSScriptRoot 'OfflineBundles.ps1')

Assert-GitRepo
Assert-CleanWorktree
Assert-BranchExists -BranchName $BranchName
Assert-BranchExists -BranchName $BaseBranch
Ensure-OfflineTransferDir

if ([string]::IsNullOrWhiteSpace($OutputPath)) {
    $OutputPath = Get-DefaultBranchBundlePath -BranchName $BranchName
}

Push-Location $script:RootDir
try {
    & git bundle create $OutputPath "$BaseBranch..$BranchName"
    if ($LASTEXITCODE -ne 0) {
        throw "git bundle create failed for $BranchName"
    }
}
finally {
    Pop-Location
}

Write-Log "Created branch bundle at $OutputPath"
