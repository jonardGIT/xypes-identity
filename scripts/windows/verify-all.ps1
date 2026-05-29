$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

. (Join-Path $PSScriptRoot 'Common.ps1')

Verify-SharedRepo
Verify-EngineRepo
Verify-SdkRepo
Verify-AdminRepo