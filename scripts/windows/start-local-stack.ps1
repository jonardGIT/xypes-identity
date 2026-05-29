param(
    [switch]$Fresh,
    [string[]]$Services = @('all')
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

. (Join-Path $PSScriptRoot 'Common.ps1')

$selectedServices = Resolve-ServiceSelection -Services $Services
$startAll = $false
$includeEngine = $false
$includeAdmin = $false

foreach ($selected in $selectedServices) {
    switch ($selected) {
        'all' {
            $startAll = $true
            $includeEngine = $true
            $includeAdmin = $true
        }
        'stack' {
            $startAll = $true
            $includeEngine = $true
            $includeAdmin = $true
        }
        'engine' {
            $includeEngine = $true
        }
        'admin' {
            $includeAdmin = $true
        }
    }
}

$composeTargets = New-Object System.Collections.Generic.List[string]
if ($startAll) {
    [void]$composeTargets.Add('engine')
    [void]$composeTargets.Add('admin')
}
else {
    if ($includeEngine) {
        [void]$composeTargets.Add('engine')
    }

    if ($includeAdmin) {
        [void]$composeTargets.Add('admin')
    }
}

if ($composeTargets.Count -eq 0) {
    throw 'No supported services selected.'
}

if ($Fresh) {
    Write-Log 'Running docker compose down -v before startup'
    Invoke-DockerCompose down -v
}

Write-Log ("Starting compose services: " + ($composeTargets -join ' '))
Invoke-DockerCompose up --build -d @($composeTargets.ToArray())

if ($includeEngine -or $includeAdmin) {
    Wait-ForHttp -ServiceName 'engine' -Url "$script:EngineUrl/"
    Invoke-ResolveSessionSmokeTests
}

if ($includeAdmin) {
    Wait-ForHttp -ServiceName 'admin' -Url "$script:AdminUrl/"
    Invoke-AdminSmokeTest
}

Write-Log 'Local stack startup and smoke tests completed successfully'