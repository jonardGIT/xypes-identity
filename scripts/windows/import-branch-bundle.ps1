$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

param(
    [Parameter(Mandatory = $true)][string]$BundlePath,
    [Parameter(Mandatory = $true)][string]$BranchName,
    [string]$TargetBranch = ''
)

. (Join-Path $PSScriptRoot 'OfflineBundles.ps1')

if (-not (Test-Path $BundlePath)) {
    throw "Bundle not found: $BundlePath"
}

Assert-GitRepo
Assert-CleanWorktree

if ([string]::IsNullOrWhiteSpace($TargetBranch)) {
    $TargetBranch = "import/$BranchName"
}

Push-Location $script:RootDir
try {
    & git fetch $BundlePath "$BranchName:refs/heads/$TargetBranch"
    if ($LASTEXITCODE -ne 0) {
        throw "git fetch failed for $BundlePath"
    }
}
finally {
    Pop-Location
}

Write-Log "Imported $BranchName into local branch $TargetBranch"
