param(
    [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path,
    [int]$Sessions = 3,
    [string]$Goal = ''
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Get-RelativeToRoot {
    param(
        [Parameter(Mandatory = $true)][string]$PlatformRoot,
        [Parameter(Mandatory = $true)][string]$TargetPath
    )

    if ($TargetPath.StartsWith($PlatformRoot + [IO.Path]::DirectorySeparatorChar)) {
        return './' + $TargetPath.Substring($PlatformRoot.Length + 1).Replace('\\', '/')
    }

    return $TargetPath.Replace('\\', '/')
}

function Get-OwnedRoots {
    param([Parameter(Mandatory = $true)][string]$PlatformRoot)

    Get-ChildItem -Path $PlatformRoot -Directory |
        Where-Object {
            $_.Name -notin @('.git', '.github', 'docs', 'shared', 'scripts', 'docker', 'node_modules', 'dist')
        } |
        Sort-Object FullName
}

if (-not (Test-Path $Root -PathType Container)) {
    throw "Platform root does not exist: $Root"
}

if ($Sessions -lt 1) {
    throw '--Sessions must be a positive integer.'
}

$resolvedRoot = (Resolve-Path $Root).Path
$platformName = Split-Path $resolvedRoot -Leaf
$platformOrchestrator = Get-ChildItem -Path $resolvedRoot -File -Recurse -Depth 2 -Filter '*platform-orchestrator.agent.md' | Sort-Object FullName | Select-Object -First 1
$platformContext = Get-ChildItem -Path $resolvedRoot -File -Filter '*platform-context.json' | Sort-Object FullName | Select-Object -First 1
$repoOrchestrators = Get-ChildItem -Path $resolvedRoot -File -Recurse -Filter '*-orchestrator.agent.md' |
    Where-Object { $_.FullName -match '[\\/].github[\\/]agents[\\/]' -and $_.Name -notlike '*platform-orchestrator.agent.md' } |
    Sort-Object FullName
$ownedRoots = @(Get-OwnedRoots -PlatformRoot $resolvedRoot)
$linuxVerifyAll = Join-Path $resolvedRoot 'scripts/linux/verify-all.sh'
$windowsVerifyAll = Join-Path $resolvedRoot 'scripts/windows/verify-all.ps1'

if ([string]::IsNullOrWhiteSpace($Goal)) {
    $Goal = "Split the next roadmap work into $Sessions parallel, non-overlapping packets."
}

Write-Output "Use the platform orchestration prompt below for the platform rooted at `"$resolvedRoot`"."
Write-Output ''
Write-Output "Platform label: $platformName"
Write-Output ("Detected platform orchestrator: " + ($(if ($platformOrchestrator) { Get-RelativeToRoot -PlatformRoot $resolvedRoot -TargetPath $platformOrchestrator.FullName } else { 'none' })))
Write-Output ("Detected platform context: " + ($(if ($platformContext) { Get-RelativeToRoot -PlatformRoot $resolvedRoot -TargetPath $platformContext.FullName } else { 'none' })))
Write-Output ''
Write-Output 'Prompt:'
Write-Output ''
Write-Output "Use the platform orchestrator or fallback planning mode for the platform rooted at: $resolvedRoot"
Write-Output "Goal: $Goal"
Write-Output ''
Write-Output 'Detected platform assets:'
Write-Output ("- Platform orchestrator: " + ($(if ($platformOrchestrator) { Get-RelativeToRoot -PlatformRoot $resolvedRoot -TargetPath $platformOrchestrator.FullName } else { 'none detected; operate in fallback planning mode' })))
Write-Output ("- Platform context: " + ($(if ($platformContext) { Get-RelativeToRoot -PlatformRoot $resolvedRoot -TargetPath $platformContext.FullName } else { 'none detected' })))

if ($repoOrchestrators.Count -gt 0) {
    Write-Output '- Repo-local orchestrators:'
    foreach ($orchestrator in $repoOrchestrators) {
        $repoRoot = Split-Path (Split-Path (Split-Path $orchestrator.FullName -Parent) -Parent) -Parent
        $repoContext = Join-Path $repoRoot '.github/agent-context.json'
        Write-Output ("  - repo: " + (Get-RelativeToRoot -PlatformRoot $resolvedRoot -TargetPath $repoRoot))
        Write-Output ("    orchestrator: " + (Get-RelativeToRoot -PlatformRoot $resolvedRoot -TargetPath $orchestrator.FullName))
        Write-Output ("    agent context: " + ($(if (Test-Path $repoContext -PathType Leaf) { Get-RelativeToRoot -PlatformRoot $resolvedRoot -TargetPath $repoContext } else { 'none' })))
    }
}
else {
    Write-Output '- Repo-local orchestrators: none detected'
}

if ($ownedRoots.Count -gt 0) {
    Write-Output '- Candidate owned roots when falling back:'
    foreach ($ownedRoot in $ownedRoots) {
        Write-Output ("  - " + (Get-RelativeToRoot -PlatformRoot $resolvedRoot -TargetPath $ownedRoot.FullName))
    }
}

Write-Output ''
Write-Output 'Instructions:'
Write-Output "1. Produce $Sessions parallel work packets only when their allowed files do not overlap."
Write-Output '2. Prefer one owned boundary per packet.'
Write-Output '3. If shared contracts, platform context, roadmap, or architecture files must change, mark that packet as the sequential lead and make dependent packets wait for it.'
Write-Output '4. If a platform or repo-local orchestrator exists, use it as the planning source for that boundary. If not, fall back to the nearest owned root.'
Write-Output '5. Do not assign the same file or folder to more than one packet.'
Write-Output '6. Require every worker session to report back with exact changed files, validation run, blockers, and merge risk.'
Write-Output ''
Write-Output 'For each packet, return:'
Write-Output '- Packet id'
Write-Output '- Repo or root path'
Write-Output '- Owning orchestrator or fallback owner'
Write-Output '- Allowed files or folders'
Write-Output '- Explicit out-of-scope files or folders'
Write-Output '- Acceptance target'
Write-Output '- Validation commands'
Write-Output '- Dependency order or wait conditions'
Write-Output '- Report-back template:'
Write-Output '  - Scope'
Write-Output '  - Files changed'
Write-Output '  - Summary'
Write-Output '  - Validation run'
Write-Output '  - Blockers for other packets'
Write-Output '  - Merge risk'
Write-Output ''
Write-Output 'Finish with:'
Write-Output '- Execution order constraints'
Write-Output '- Cross-packet conflict risks'
if (Test-Path $linuxVerifyAll -PathType Leaf -or Test-Path $windowsVerifyAll -PathType Leaf) {
    Write-Output '- Final integration validation suggestion:'
    if (Test-Path $linuxVerifyAll -PathType Leaf) {
        Write-Output ("  - Linux: bash " + (Get-RelativeToRoot -PlatformRoot $resolvedRoot -TargetPath $linuxVerifyAll))
    }
    if (Test-Path $windowsVerifyAll -PathType Leaf) {
        Write-Output ("  - Windows: pwsh -File " + (Get-RelativeToRoot -PlatformRoot $resolvedRoot -TargetPath $windowsVerifyAll))
    }
}
else {
    Write-Output '- Final integration validation command or checklist'
}