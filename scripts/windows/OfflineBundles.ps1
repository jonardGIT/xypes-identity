$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

. (Join-Path $PSScriptRoot 'Common.ps1')

$script:OfflineTransferDir = Join-Path $script:RootDir '.git\offline-transfer'

function Assert-GitRepo {
    Assert-Command -Name 'git'

    Push-Location $script:RootDir
    try {
        & git rev-parse --git-dir *> $null
        if ($LASTEXITCODE -ne 0) {
            throw "$script:RootDir is not a Git repository"
        }
    }
    finally {
        Pop-Location
    }
}

function Assert-CleanWorktree {
    Push-Location $script:RootDir
    try {
        $status = & git status --short | Out-String
        if (-not [string]::IsNullOrWhiteSpace($status)) {
            throw 'Working tree must be clean before running offline transfer commands'
        }
    }
    finally {
        Pop-Location
    }
}

function Assert-BranchExists {
    param([Parameter(Mandatory = $true)][string]$BranchName)

    Push-Location $script:RootDir
    try {
        & git show-ref --verify --quiet "refs/heads/$BranchName"
        if ($LASTEXITCODE -ne 0) {
            throw "Branch not found: $BranchName"
        }
    }
    finally {
        Pop-Location
    }
}

function Assert-RemoteMissing {
    param([string]$RemoteName = 'origin')

    Push-Location $script:RootDir
    try {
        & git remote get-url $RemoteName *> $null
        if ($LASTEXITCODE -eq 0) {
            throw "Remote '$RemoteName' is configured. Remove it on the work machine before enabling offline-only mode"
        }
    }
    finally {
        Pop-Location
    }
}

function Ensure-OfflineTransferDir {
    if (-not (Test-Path $script:OfflineTransferDir)) {
        New-Item -ItemType Directory -Path $script:OfflineTransferDir | Out-Null
    }
}

function Get-UtcTimestamp {
    return [DateTimeOffset]::UtcNow.ToString('yyyyMMddTHHmmssZ')
}

function Get-DefaultMainBundlePath {
    $repoName = Split-Path $script:RootDir -Leaf
    return (Join-Path $script:OfflineTransferDir "$repoName-main-$(Get-UtcTimestamp).bundle")
}

function Get-DefaultBranchBundlePath {
    param([Parameter(Mandatory = $true)][string]$BranchName)

    $repoName = Split-Path $script:RootDir -Leaf
    $safeBranchName = $BranchName.Replace('/', '-')
    return (Join-Path $script:OfflineTransferDir "$repoName-$safeBranchName-$(Get-UtcTimestamp).bundle")
}
