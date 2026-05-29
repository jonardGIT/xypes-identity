$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

param(
    [Parameter(Mandatory = $true)][string]$BundlePath,
    [string]$BranchName = 'main',
    [string]$TransferRef = ''
)

. (Join-Path $PSScriptRoot 'OfflineBundles.ps1')

if (-not (Test-Path $BundlePath)) {
    throw "Bundle not found: $BundlePath"
}

Assert-GitRepo
Assert-CleanWorktree
Assert-BranchExists -BranchName $BranchName

if ([string]::IsNullOrWhiteSpace($TransferRef)) {
    $TransferRef = "transfer/$BranchName"
}

Push-Location $script:RootDir
try {
    & git fetch $BundlePath "$BranchName:refs/remotes/$TransferRef"
    if ($LASTEXITCODE -ne 0) {
        throw "git fetch failed for $BundlePath"
    }

    & git switch $BranchName
    if ($LASTEXITCODE -ne 0) {
        throw "git switch failed for $BranchName"
    }

    & git merge --ff-only "refs/remotes/$TransferRef"
    if ($LASTEXITCODE -ne 0) {
        throw "git merge --ff-only failed for refs/remotes/$TransferRef"
    }
}
finally {
    Pop-Location
}

Write-Log "Imported $BranchName from $BundlePath"
