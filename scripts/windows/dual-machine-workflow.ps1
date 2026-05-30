$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

param(
    [Parameter(Position = 0)]
    [string]$Command = 'help',

    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Arguments
)

. (Join-Path $PSScriptRoot 'OfflineBundles.ps1')

function Show-Usage {
    @'
Usage: pwsh -File scripts/windows/dual-machine-workflow.ps1 <command> [args]

Commands:
  status [remote-name]
  setup-work [remote-name]
  export-main [branch-name] [output-path]
  import-main <bundle-path> [branch-name] [transfer-ref]
  export-branch <branch-name> [base-branch] [output-path]
  import-branch <bundle-path> <branch-name> [target-branch]
    review-import <target-branch> [base-branch]
'@ | Write-Host
}

function Write-NextStep {
    param(
        [Parameter(Mandatory = $true)][string]$CommandName,
        [string]$BranchName = '',
        [string]$TargetBranch = ''
    )

    switch ($CommandName) {
        'setup-work' {
            Write-Log 'Next: import the latest accepted main bundle before starting work'
        }
        'export-main' {
            Write-Log 'Next: transfer the bundle to the work machine, then run import-main there'
        }
        'import-main' {
            Write-Log 'Next: create a short-lived branch and make one bounded change slice'
        }
        'export-branch' {
            Write-Log 'Next: transfer the branch bundle to the main machine, then run import-branch there'
        }
        'import-branch' {
            Write-Log 'Next: run review-import for the imported branch'
            Write-Host "  pwsh -File scripts/windows/dual-machine-workflow.ps1 review-import $TargetBranch"
        }
    }
}

function Assert-LocalBranchExists {
    param([Parameter(Mandatory = $true)][string]$BranchName)

    Push-Location $script:RootDir
    try {
        & git show-ref --verify --quiet "refs/heads/$BranchName"
        if ($LASTEXITCODE -ne 0) {
            throw "Local branch not found: $BranchName"
        }
    }
    finally {
        Pop-Location
    }
}

function Invoke-StatusCommand {
    param([string]$RemoteName = 'origin')

    Assert-GitRepo

    Push-Location $script:RootDir
    try {
        $currentBranch = (& git branch --show-current | Out-String).Trim()
        $status = (& git status --short | Out-String).Trim()
        & git remote get-url $RemoteName *> $null
        $remoteConfigured = ($LASTEXITCODE -eq 0)
        $remoteUrl = ''
        if ($remoteConfigured) {
            $remoteUrl = (& git remote get-url $RemoteName | Out-String).Trim()
        }

        Write-Log "Repository: $script:RootDir"
        Write-Log "Current branch: $(if ([string]::IsNullOrWhiteSpace($currentBranch)) { 'detached' } else { $currentBranch })"
        Write-Log "Working tree: $(if ([string]::IsNullOrWhiteSpace($status)) { 'clean' } else { 'dirty' })"
        Write-Log "Role guess: $(if ($remoteConfigured) { 'main-machine' } else { 'work-machine' })"
        if ($remoteConfigured) {
            Write-Log "Remote $RemoteName: $remoteUrl"
        }
        else {
            Write-Log "Remote $RemoteName: not configured"
        }
    }
    finally {
        Pop-Location
    }
}

function Invoke-SetupWorkCommand {
    param([string]$RemoteName = 'origin')

    & (Join-Path $PSScriptRoot 'lock-offline-work-machine.ps1') -RemoteName $RemoteName
    if ($LASTEXITCODE -ne 0) {
        throw 'lock-offline-work-machine.ps1 failed'
    }

    Write-NextStep -CommandName 'setup-work'
}

function Invoke-ExportMainCommand {
    param(
        [string]$BranchName = 'main',
        [string]$OutputPath = ''
    )

    if ([string]::IsNullOrWhiteSpace($OutputPath)) {
        & (Join-Path $PSScriptRoot 'export-main-bundle.ps1') -BranchName $BranchName
    }
    else {
        & (Join-Path $PSScriptRoot 'export-main-bundle.ps1') -BranchName $BranchName -OutputPath $OutputPath
    }

    if ($LASTEXITCODE -ne 0) {
        throw 'export-main-bundle.ps1 failed'
    }

    Write-NextStep -CommandName 'export-main'
}

function Invoke-ImportMainCommand {
    param(
        [Parameter(Mandatory = $true)][string]$BundlePath,
        [string]$BranchName = 'main',
        [string]$TransferRef = ''
    )

    if ([string]::IsNullOrWhiteSpace($TransferRef)) {
        & (Join-Path $PSScriptRoot 'import-main-bundle.ps1') -BundlePath $BundlePath -BranchName $BranchName
    }
    else {
        & (Join-Path $PSScriptRoot 'import-main-bundle.ps1') -BundlePath $BundlePath -BranchName $BranchName -TransferRef $TransferRef
    }

    if ($LASTEXITCODE -ne 0) {
        throw 'import-main-bundle.ps1 failed'
    }

    Write-NextStep -CommandName 'import-main'
}

function Invoke-ExportBranchCommand {
    param(
        [Parameter(Mandatory = $true)][string]$BranchName,
        [string]$BaseBranch = 'main',
        [string]$OutputPath = ''
    )

    if ([string]::IsNullOrWhiteSpace($OutputPath)) {
        & (Join-Path $PSScriptRoot 'export-branch-bundle.ps1') -BranchName $BranchName -BaseBranch $BaseBranch
    }
    else {
        & (Join-Path $PSScriptRoot 'export-branch-bundle.ps1') -BranchName $BranchName -BaseBranch $BaseBranch -OutputPath $OutputPath
    }

    if ($LASTEXITCODE -ne 0) {
        throw 'export-branch-bundle.ps1 failed'
    }

    Write-NextStep -CommandName 'export-branch'
}

function Invoke-ImportBranchCommand {
    param(
        [Parameter(Mandatory = $true)][string]$BundlePath,
        [Parameter(Mandatory = $true)][string]$BranchName,
        [string]$TargetBranch = ''
    )

    if ([string]::IsNullOrWhiteSpace($TargetBranch)) {
        & (Join-Path $PSScriptRoot 'import-branch-bundle.ps1') -BundlePath $BundlePath -BranchName $BranchName
        $TargetBranch = "import/$BranchName"
    }
    else {
        & (Join-Path $PSScriptRoot 'import-branch-bundle.ps1') -BundlePath $BundlePath -BranchName $BranchName -TargetBranch $TargetBranch
    }

    if ($LASTEXITCODE -ne 0) {
        throw 'import-branch-bundle.ps1 failed'
    }

    Write-NextStep -CommandName 'import-branch' -BranchName $BranchName -TargetBranch $TargetBranch
}

function Invoke-ReviewImportCommand {
    param(
        [Parameter(Mandatory = $true)][string]$TargetBranch,
        [string]$BaseBranch = 'main'
    )

    Assert-GitRepo
    Assert-LocalBranchExists -BranchName $TargetBranch
    Assert-LocalBranchExists -BranchName $BaseBranch

    Write-Log "Review commands for imported branch $TargetBranch against $BaseBranch:"
    Write-Host "  git diff $BaseBranch...$TargetBranch"
    Write-Host "  git log --oneline $BaseBranch..$TargetBranch"
    Write-Host "  pwsh -File scripts/windows/verify-all.ps1  # or the narrowest verify script for the owned boundary"
    Write-Host "  git switch $BaseBranch && git merge --ff-only $TargetBranch"
}

switch ($Command) {
    'status' {
        Invoke-StatusCommand -RemoteName $(if ($Arguments.Count -ge 1) { $Arguments[0] } else { 'origin' })
    }
    'setup-work' {
        Invoke-SetupWorkCommand -RemoteName $(if ($Arguments.Count -ge 1) { $Arguments[0] } else { 'origin' })
    }
    'export-main' {
        Invoke-ExportMainCommand -BranchName $(if ($Arguments.Count -ge 1) { $Arguments[0] } else { 'main' }) -OutputPath $(if ($Arguments.Count -ge 2) { $Arguments[1] } else { '' })
    }
    'import-main' {
        if ($Arguments.Count -lt 1) {
            throw 'Usage: pwsh -File scripts/windows/dual-machine-workflow.ps1 import-main <bundle-path> [branch-name] [transfer-ref]'
        }
        Invoke-ImportMainCommand -BundlePath $Arguments[0] -BranchName $(if ($Arguments.Count -ge 2) { $Arguments[1] } else { 'main' }) -TransferRef $(if ($Arguments.Count -ge 3) { $Arguments[2] } else { '' })
    }
    'export-branch' {
        if ($Arguments.Count -lt 1) {
            throw 'Usage: pwsh -File scripts/windows/dual-machine-workflow.ps1 export-branch <branch-name> [base-branch] [output-path]'
        }
        Invoke-ExportBranchCommand -BranchName $Arguments[0] -BaseBranch $(if ($Arguments.Count -ge 2) { $Arguments[1] } else { 'main' }) -OutputPath $(if ($Arguments.Count -ge 3) { $Arguments[2] } else { '' })
    }
    'import-branch' {
        if ($Arguments.Count -lt 2) {
            throw 'Usage: pwsh -File scripts/windows/dual-machine-workflow.ps1 import-branch <bundle-path> <branch-name> [target-branch]'
        }
        Invoke-ImportBranchCommand -BundlePath $Arguments[0] -BranchName $Arguments[1] -TargetBranch $(if ($Arguments.Count -ge 3) { $Arguments[2] } else { '' })
    }
    'review-import' {
        if ($Arguments.Count -lt 1) {
            throw 'Usage: pwsh -File scripts/windows/dual-machine-workflow.ps1 review-import <target-branch> [base-branch]'
        }
        Invoke-ReviewImportCommand -TargetBranch $Arguments[0] -BaseBranch $(if ($Arguments.Count -ge 2) { $Arguments[1] } else { 'main' })
    }
    'help' {
        Show-Usage
    }
    default {
        throw "Unknown command: $Command"
    }
}