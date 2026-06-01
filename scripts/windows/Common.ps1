$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$script:RootDir = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$script:SharedDir = Join-Path $script:RootDir 'shared'
$script:EngineDir = Join-Path $script:RootDir 'xypes-identity-engine'
$script:SdkDir = Join-Path $script:RootDir 'xypes-identity-sdk'
$script:AdminDir = Join-Path $script:RootDir 'xypes-identity-admin'
$script:EngineUrl = 'http://localhost:3000'
$script:AdminUrl = 'http://localhost:3001'
$script:LocalActiveTenantId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'
$script:LocalMissingTenantId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2'

function Write-Log {
    param([Parameter(Mandatory = $true)][string]$Message)

    Write-Host "[xypes] $Message"
}

function Assert-Command {
    param([Parameter(Mandatory = $true)][string]$Name)

    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Missing required command: $Name"
    }
}

function Get-RepoDir {
    param([Parameter(Mandatory = $true)][string]$RepoName)

    switch ($RepoName) {
        'shared' { return $script:SharedDir }
        'engine' { return $script:EngineDir }
        'sdk' { return $script:SdkDir }
        'admin' { return $script:AdminDir }
        default { throw "Unknown repo: $RepoName" }
    }
}

function Invoke-NpmInstall {
    param(
        [Parameter(Mandatory = $true)][string]$RepoName
    )

    $repoDir = Get-RepoDir -RepoName $RepoName
    $lockPath = Join-Path $repoDir 'package-lock.json'
    $command = if (Test-Path $lockPath) { 'ci' } else { 'install' }

    Write-Log "Installing dependencies for $RepoName"
    Push-Location $repoDir
    try {
        & npm $command
        if ($LASTEXITCODE -ne 0) {
            throw "npm $command failed for $RepoName"
        }
    }
    finally {
        Pop-Location
    }
}

function Invoke-NpmScript {
    param(
        [Parameter(Mandatory = $true)][string]$RepoName,
        [Parameter(Mandatory = $true)][string]$ScriptName
    )

    $repoDir = Get-RepoDir -RepoName $RepoName

    Write-Log "Running ${RepoName}:$ScriptName"
    Push-Location $repoDir
    try {
        & npm run $ScriptName
        if ($LASTEXITCODE -ne 0) {
            throw "npm run $ScriptName failed for $RepoName"
        }
    }
    finally {
        Pop-Location
    }
}

function Ensure-SharedBuilt {
    Invoke-NpmInstall -RepoName 'shared'
    Invoke-NpmScript -RepoName 'shared' -ScriptName 'build'
}

function Ensure-SdkBuilt {
    Ensure-SharedBuilt
    Invoke-NpmInstall -RepoName 'sdk'
    Invoke-NpmScript -RepoName 'sdk' -ScriptName 'build'
}

function Verify-SharedRepo {
    Assert-Command -Name 'npm'
    Invoke-NpmInstall -RepoName 'shared'
    Invoke-NpmScript -RepoName 'shared' -ScriptName 'build'
    Invoke-NpmScript -RepoName 'shared' -ScriptName 'typecheck'
}

function Verify-EngineRepo {
    Assert-Command -Name 'npm'
    Ensure-SharedBuilt
    Invoke-NpmInstall -RepoName 'engine'
    Invoke-NpmScript -RepoName 'engine' -ScriptName 'build'
    Invoke-NpmScript -RepoName 'engine' -ScriptName 'test'
}

function Verify-SdkRepo {
    Assert-Command -Name 'npm'
    Ensure-SharedBuilt
    Invoke-NpmInstall -RepoName 'sdk'
    Invoke-NpmScript -RepoName 'sdk' -ScriptName 'build'
    Invoke-NpmScript -RepoName 'sdk' -ScriptName 'typecheck'
    Invoke-NpmScript -RepoName 'sdk' -ScriptName 'test'
}

function Verify-AdminRepo {
    Assert-Command -Name 'npm'
    Ensure-SdkBuilt
    Invoke-NpmInstall -RepoName 'admin'
    Invoke-NpmScript -RepoName 'admin' -ScriptName 'build'
    Invoke-NpmScript -RepoName 'admin' -ScriptName 'typecheck'
    Invoke-NpmScript -RepoName 'admin' -ScriptName 'test'
}

function Invoke-DockerCompose {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)

    Assert-Command -Name 'docker'
    Push-Location $script:RootDir
    try {
        & docker compose @Arguments
        if ($LASTEXITCODE -ne 0) {
            throw "docker compose $($Arguments -join ' ') failed"
        }
    }
    finally {
        Pop-Location
    }
}

function Wait-ForHttp {
    param(
        [Parameter(Mandatory = $true)][string]$ServiceName,
        [Parameter(Mandatory = $true)][string]$Url,
        [int]$Attempts = 60,
        [int]$DelaySeconds = 2
    )

    Write-Log "Waiting for $ServiceName at $Url"

    for ($attempt = 1; $attempt -le $Attempts; $attempt++) {
        try {
            $response = Invoke-WebRequest -Uri $Url -Method Get -SkipHttpErrorCheck -TimeoutSec 5
            if ($null -ne $response.StatusCode) {
                Write-Log "$ServiceName is responding with HTTP $($response.StatusCode)"
                return
            }
        }
        catch {
        }

        Start-Sleep -Seconds $DelaySeconds
    }

    throw "Timed out waiting for $ServiceName at $Url"
}

function New-LocalToken {
    param(
        [Parameter(Mandatory = $true)][string]$Subject,
        [Parameter(Mandatory = $true)][string]$Email
    )

    $previousSubject = $env:TOKEN_SUBJECT
    $previousEmail = $env:TOKEN_EMAIL

    try {
        $env:TOKEN_SUBJECT = $Subject
        $env:TOKEN_EMAIL = $Email
        $token = Invoke-DockerCompose --profile tools run --rm -T token-mint | Out-String
        return $token.Trim()
    }
    finally {
        $env:TOKEN_SUBJECT = $previousSubject
        $env:TOKEN_EMAIL = $previousEmail
    }
}

function Assert-JsonPost {
    param(
        [Parameter(Mandatory = $true)][string]$Description,
        [Parameter(Mandatory = $true)][string]$Url,
        [Parameter(Mandatory = $true)][string]$Payload,
        [Parameter(Mandatory = $true)][int]$ExpectedStatus,
        [string]$ExpectedSubstring = ''
    )

    $response = Invoke-WebRequest -Uri $Url -Method Post -ContentType 'application/json' -Body $Payload -SkipHttpErrorCheck -TimeoutSec 20

    if ($response.StatusCode -ne $ExpectedStatus) {
        throw "$Description expected HTTP $ExpectedStatus, got $($response.StatusCode). Body: $($response.Content)"
    }

    if ($ExpectedSubstring -and -not $response.Content.Contains($ExpectedSubstring)) {
        throw "$Description response body did not include '$ExpectedSubstring'. Body: $($response.Content)"
    }

    Write-Log "$Description passed"
}

function Assert-HttpGetContains {
    param(
        [Parameter(Mandatory = $true)][string]$Description,
        [Parameter(Mandatory = $true)][string]$Url,
        [Parameter(Mandatory = $true)][int]$ExpectedStatus,
        [Parameter(Mandatory = $true)][string]$ExpectedSubstring
    )

    $response = Invoke-WebRequest -Uri $Url -Method Get -SkipHttpErrorCheck -TimeoutSec 20

    if ($response.StatusCode -ne $ExpectedStatus) {
        throw "$Description expected HTTP $ExpectedStatus, got $($response.StatusCode). Body: $($response.Content)"
    }

    if (-not $response.Content.Contains($ExpectedSubstring)) {
        throw "$Description response body did not include '$ExpectedSubstring'. Body: $($response.Content)"
    }

    Write-Log "$Description passed"
}

function Invoke-ResolveSessionSmokeTests {
    $activeToken = New-LocalToken -Subject 'local-active-member' -Email 'active.member@example.test'
    $suspendedToken = New-LocalToken -Subject 'local-suspended-member' -Email 'suspended.member@example.test'

    Assert-JsonPost -Description 'resolve-session success' -Url "$script:EngineUrl/v1/auth/resolve-session" -Payload "{\"token\":\"$activeToken\",\"tenant_id\":\"$script:LocalActiveTenantId\"}" -ExpectedStatus 200 -ExpectedSubstring '"membership_status":"active"'
    Assert-JsonPost -Description 'resolve-session missing membership' -Url "$script:EngineUrl/v1/auth/resolve-session" -Payload "{\"token\":\"$activeToken\",\"tenant_id\":\"$script:LocalMissingTenantId\"}" -ExpectedStatus 403 -ExpectedSubstring 'AUTH_TENANT_MEMBERSHIP_NOT_FOUND'
    Assert-JsonPost -Description 'resolve-session suspended membership' -Url "$script:EngineUrl/v1/auth/resolve-session" -Payload "{\"token\":\"$suspendedToken\",\"tenant_id\":\"$script:LocalMissingTenantId\"}" -ExpectedStatus 403 -ExpectedSubstring 'AUTH_TENANT_MEMBERSHIP_SUSPENDED'
}

function Invoke-AdminSmokeTest {
    $slug = 'admin-smoke-' + [DateTimeOffset]::UtcNow.ToString('yyyyMMddHHmmssfff') + '-' + (Get-Random -Minimum 1000 -Maximum 9999)
    $payload = "{\"tenant_id\":\"$script:LocalActiveTenantId\",\"slug\":\"$slug\",\"display_name\":\"Admin Smoke $slug\",\"actor_principal_id\":\"11111111-1111-1111-1111-111111111111\",\"actor_subject\":\"local-admin@example.test\",\"reason\":\"Local automation smoke test\"}"
    $workbenchPayload = "{\"tenant_id\":\"$script:LocalActiveTenantId\",\"stale_after_days\":30,\"limit\":25,\"finding_codes\":[\"PRIVILEGED_ROLE_BINDING\",\"STALE_ROLE_BINDING\"]}"

    Assert-HttpGetContains -Description 'admin access review console smoke test' -Url "$script:AdminUrl/admin/access-reviews/console" -ExpectedStatus 200 -ExpectedSubstring "value=\"$script:LocalActiveTenantId\""
    Assert-JsonPost -Description 'admin access review workbench smoke test' -Url "$script:AdminUrl/admin/access-reviews/workbench" -Payload $workbenchPayload -ExpectedStatus 200 -ExpectedSubstring '"summary":'

    Assert-JsonPost -Description 'admin create application smoke test' -Url "$script:AdminUrl/admin/applications" -Payload $payload -ExpectedStatus 201 -ExpectedSubstring '"audit_event_id":"'
}

function Resolve-ServiceSelection {
    param([string[]]$Services)

    if (-not $Services -or $Services.Count -eq 0) {
        return @('all')
    }

    $normalized = New-Object System.Collections.Generic.List[string]
    foreach ($service in $Services) {
        foreach ($item in ($service -split ',')) {
            if ([string]::IsNullOrWhiteSpace($item)) {
                continue
            }

            switch ($item) {
                'all' { [void]$normalized.Add('all') }
                'stack' { [void]$normalized.Add('stack') }
                'engine' { [void]$normalized.Add('engine') }
                'admin' { [void]$normalized.Add('admin') }
                default { throw "Unsupported service selection: $item" }
            }
        }
    }

    return $normalized.ToArray()
}