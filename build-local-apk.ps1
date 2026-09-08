#Requires -Version 5.1
<#
.SYNOPSIS
  Build the existing Camartes Customer debug APK on Windows.

.USAGE
  cd path\to\field-executive\customer-app
  Set-ExecutionPolicy -Scope Process Bypass
  .\build-local-apk.ps1

  Output: .\build-output\camartes-customer-debug.apk
#>
[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Stop-WithError {
  param([string]$Message)
  Write-Host ""
  Write-Host "ERROR: $Message" -ForegroundColor Red
  exit 1
}

function Invoke-Checked {
  param(
    [Parameter(Mandatory = $true)]
    [string]$FilePath,
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$ArgumentList
  )
  & $FilePath @ArgumentList
  if ($LASTEXITCODE -ne 0) {
    Stop-WithError "'$FilePath $($ArgumentList -join ' ')' failed with exit code $LASTEXITCODE."
  }
}

$Root = $PSScriptRoot
Set-Location -LiteralPath $Root

Write-Host "Camartes Customer — Windows debug APK build"
Write-Host "Expected output: $Root\build-output\camartes-customer-debug.apk"

if (-not (Test-Path -LiteralPath (Join-Path $Root "package.json"))) {
  Stop-WithError "package.json not found. Run this script from customer-app."
}

if (-not $env:ANDROID_HOME) {
  $defaultSdk = Join-Path $env:LOCALAPPDATA "Android\Sdk"
  if (Test-Path -LiteralPath $defaultSdk) {
    $env:ANDROID_HOME = $defaultSdk
    $env:ANDROID_SDK_ROOT = $defaultSdk
    Write-Host "ANDROID_HOME was not set. Using $env:ANDROID_HOME"
  }
}

$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
  Stop-WithError "Node.js was not found. Install Node.js 22.13.0 or newer."
}
Write-Host "Node.js $((& node -v).Trim())"

$javaCmd = Get-Command java -ErrorAction SilentlyContinue
if (-not $javaCmd) {
  Stop-WithError "Java was not found. Install JDK 17 (Microsoft OpenJDK 17)."
}

$envPath = Join-Path $Root ".env"
$examplePath = Join-Path $Root ".env.example"
if (-not (Test-Path -LiteralPath $envPath) -and (Test-Path -LiteralPath $examplePath)) {
  Copy-Item -LiteralPath $examplePath -Destination $envPath
  Write-Host "Created .env from .env.example (no secrets added)."
}

Write-Step "npm install"
Invoke-Checked npm install

Write-Step "npm run apk:debug"
Invoke-Checked npm run apk:debug

$apk = Join-Path $Root "build-output\camartes-customer-debug.apk"
if (-not (Test-Path -LiteralPath $apk)) {
  Stop-WithError "Build finished but $apk was not found."
}

Write-Host ""
Write-Host "SUCCESS: $apk" -ForegroundColor Green
Write-Host "This debug APK expects Metro. After sideloading, run: npx expo start --dev-client"
