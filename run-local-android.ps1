#Requires -Version 5.1
<#
.SYNOPSIS
  Verify the Windows toolchain, require a connected Android device, then
  install and launch the existing Camartes Customer app (com.camartes.customer).

.USAGE
  cd path\to\field-executive\customer-app
  Set-ExecutionPolicy -Scope Process Bypass
  .\run-local-android.ps1

  Connect the phone with USB debugging enabled and accept the RSA prompt
  before running this script. adb devices must show: <serial>    device
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

function Test-NodeVersion {
  param([string]$VersionText)
  if ($VersionText -notmatch 'v?(\d+)\.(\d+)\.(\d+)') {
    return $false
  }
  $major = [int]$Matches[1]
  $minor = [int]$Matches[2]
  if ($major -gt 22) { return $true }
  if ($major -eq 22 -and $minor -ge 13) { return $true }
  return $false
}

$Root = $PSScriptRoot
Set-Location -LiteralPath $Root

Write-Host "Camartes Customer — Windows local Android launcher"
Write-Host "Package: com.camartes.customer  |  Expo SDK 57"
Write-Host "Working directory: $Root"

if (-not (Test-Path -LiteralPath (Join-Path $Root "package.json"))) {
  Stop-WithError "package.json not found. Run this script from customer-app."
}
$package = Get-Content -LiteralPath (Join-Path $Root "package.json") -Raw | ConvertFrom-Json
if ($package.name -ne "camartes-customer") {
  Stop-WithError "This folder is not the Camartes Customer app (expected package name camartes-customer)."
}

$defaultSdk = Join-Path $env:LOCALAPPDATA "Android\Sdk"
if (-not $env:ANDROID_HOME) {
  if (Test-Path -LiteralPath $defaultSdk) {
    $env:ANDROID_HOME = $defaultSdk
    Write-Host "ANDROID_HOME was not set. Using $env:ANDROID_HOME"
  }
}
if ($env:ANDROID_HOME -and -not $env:ANDROID_SDK_ROOT) {
  $env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
}
if ($env:ANDROID_HOME) {
  $platformTools = Join-Path $env:ANDROID_HOME "platform-tools"
  $emulatorDir = Join-Path $env:ANDROID_HOME "emulator"
  if (Test-Path -LiteralPath $platformTools) {
    $env:Path = "$platformTools;$env:Path"
  }
  if (Test-Path -LiteralPath $emulatorDir) {
    $env:Path = "$emulatorDir;$env:Path"
  }
}

Write-Step "Step 1 — Node.js version"
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
  Stop-WithError "Node.js was not found. Install Node.js 22.13.0 or newer (Expo SDK 57)."
}
$nodeVersion = (& node -v).Trim()
Write-Host "Node.js $nodeVersion"
if (-not (Test-NodeVersion $nodeVersion)) {
  Stop-WithError "Node.js 22.13.0 or newer is required for Expo SDK 57. Found $nodeVersion."
}

Write-Step "Step 2 — Java / JDK"
$javaCmd = Get-Command java -ErrorAction SilentlyContinue
if (-not $javaCmd) {
  Stop-WithError "Java was not found. Install JDK 17 (Microsoft OpenJDK 17) and open a new PowerShell."
}
$javaOutput = & java -version 2>&1 | ForEach-Object { "$_" }
$javaOutput | ForEach-Object { Write-Host $_ }
if ($javaOutput -notmatch 'version') {
  Stop-WithError "Could not read a Java version. Install JDK 17."
}
if ($javaOutput -notmatch '"17\.') {
  Write-Host "Expo SDK 57 documents JDK 17. If the Android build fails, install Microsoft OpenJDK 17 and set JAVA_HOME." -ForegroundColor Yellow
}
if (-not $env:JAVA_HOME) {
  Write-Host "JAVA_HOME is not set. The build may still work if java is on PATH."
}

Write-Step "Step 3 — Android SDK"
if (-not $env:ANDROID_HOME -or -not (Test-Path -LiteralPath $env:ANDROID_HOME)) {
  Stop-WithError @"
Android SDK was not found.
Install Android Studio and the Android SDK, then set:
  ANDROID_HOME=$defaultSdk
  ANDROID_SDK_ROOT=$defaultSdk
Add to PATH:
  $defaultSdk\platform-tools
  $defaultSdk\emulator
Open a new PowerShell after changing environment variables.
"@
}
Write-Host "ANDROID_HOME=$env:ANDROID_HOME"
Write-Host "ANDROID_SDK_ROOT=$env:ANDROID_SDK_ROOT"
$platform36 = Join-Path $env:ANDROID_HOME "platforms\android-36"
$buildTools36 = Join-Path $env:ANDROID_HOME "build-tools\36.0.0"
$platformTools = Join-Path $env:ANDROID_HOME "platform-tools"
if (-not (Test-Path -LiteralPath $platformTools)) {
  Stop-WithError "Android SDK Platform-Tools were not found at $platformTools."
}
if (-not (Test-Path -LiteralPath $platform36)) {
  Stop-WithError "Android SDK Platform 36 was not found at $platform36. Install it from Android Studio SDK Manager."
}
if (-not (Test-Path -LiteralPath $buildTools36)) {
  Stop-WithError "Android Build-Tools 36.0.0 were not found at $buildTools36. Install them from Android Studio SDK Manager."
}
Write-Host "SDK Platform 36 and Build-Tools 36.0.0 are present."

Write-Step "Step 4 — adb"
$adbCmd = Get-Command adb -ErrorAction SilentlyContinue
if (-not $adbCmd) {
  Stop-WithError @"
adb was not found.
Install Android Studio SDK Platform-Tools and add this to PATH:
  `$env:LOCALAPPDATA\Android\Sdk\platform-tools
Default SDK location: $env:LOCALAPPDATA\Android\Sdk
"@
}
Invoke-Checked adb version

Write-Step "Step 5 — adb devices"
$adbDevices = & adb devices
$adbDevices | ForEach-Object { Write-Host $_ }

$ready = New-Object System.Collections.Generic.List[string]
$unauthorized = New-Object System.Collections.Generic.List[string]
$other = New-Object System.Collections.Generic.List[string]
foreach ($line in $adbDevices) {
  $trimmed = "$line".Trim()
  if (-not $trimmed -or $trimmed -match 'List of devices attached') { continue }
  if ($trimmed -match '^(\S+)\s+device$') {
    $ready.Add($Matches[1]) | Out-Null
  }
  elseif ($trimmed -match '^(\S+)\s+unauthorized') {
    $unauthorized.Add($Matches[1]) | Out-Null
  }
  elseif ($trimmed -match '^(\S+)\s+(\S+)') {
    $other.Add("$($Matches[1]) ($($Matches[2]))") | Out-Null
  }
}

Write-Step "Step 6 — Require a device with status 'device'"
if ($unauthorized.Count -gt 0 -and $ready.Count -eq 0) {
  Stop-WithError @"
The Android device is unauthorized.
Unlock the phone and accept the 'Allow USB debugging' RSA prompt.
Then run: adb devices
Expected:  <serial>    device
"@
}

if ($ready.Count -eq 0) {
  $extra = ""
  if ($other.Count -gt 0) { $extra = " Other adb rows: $($other -join ', ')." }
  Stop-WithError @"
No Android device with status 'device' is connected.$extra
Before continuing:
  1. Connect the phone with a USB cable
  2. Enable Developer Options and USB debugging
  3. Unlock the phone and accept the USB debugging RSA prompt
  4. Run: adb devices
Expected:  XXXXXXXX    device
Do not continue until adb shows status device.
"@
}

Write-Host "Using Android device(s): $($ready -join ', ')"

Write-Step "Step 7 — customer-app directory"
Write-Host "OK: $Root (camartes-customer)"

Write-Step "Step 8 — .env"
$envPath = Join-Path $Root ".env"
$examplePath = Join-Path $Root ".env.example"
if (-not (Test-Path -LiteralPath $envPath)) {
  if (Test-Path -LiteralPath $examplePath) {
    Copy-Item -LiteralPath $examplePath -Destination $envPath
    Write-Host "Created .env from .env.example (no secrets added)."
  }
  else {
    Write-Host "No .env.example found. Continuing with built-in app defaults."
  }
}
else {
  Write-Host ".env already exists."
}

Write-Step "Step 9 — npm dependencies"
$nodeModules = Join-Path $Root "node_modules"
$lockFile = Join-Path $Root "package-lock.json"
$needInstall = -not (Test-Path -LiteralPath $nodeModules)
if (-not $needInstall -and (Test-Path -LiteralPath $lockFile)) {
  if ((Get-Item -LiteralPath $lockFile).LastWriteTime -gt (Get-Item -LiteralPath $nodeModules).LastWriteTime) {
    $needInstall = $true
  }
}
if ($needInstall) {
  Write-Host "Running npm install..."
  Invoke-Checked npm install
}
else {
  Write-Host "node_modules is present; skipping npm install."
}

Write-Step "Step 10 — typecheck"
Invoke-Checked npm run typecheck

Write-Step "Step 11 — Jest tests"
Invoke-Checked npm test

Write-Step "Step 12 — npx expo run:android"
Write-Host "Building and installing com.camartes.customer. First run can take several minutes."
Invoke-Checked npx expo run:android

Write-Step "Step 13 — Launch result"
Write-Host "SUCCESS: Expo finished installing and launching com.camartes.customer on the connected Android device." -ForegroundColor Green
Write-Host "If the phone screen is locked, unlock it to see the Camartes login screen."
