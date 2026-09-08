# Camartes Customer — Windows local run

This is the existing **Expo SDK 57** app (`com.camartes.customer`). These scripts only install and launch it. They do not change booking logic, pricing, matching, or the live Vendor Platform API.

## One-command install and launch

1. Connect the Android phone with USB.
2. Enable **Developer Options** and **USB debugging**.
3. Unlock the phone and accept **Allow USB debugging**.
4. In PowerShell:

```powershell
cd path\to\field-executive\customer-app
Set-ExecutionPolicy -Scope Process Bypass
.\run-local-android.ps1
```

The script checks Node.js (22.13+), Java, `adb`, and `adb devices`. It **stops** if no phone has status `device`. If the phone is `unauthorized`, unlock it and accept the RSA prompt, then run the script again.

Expected `adb devices` output:

```
List of devices attached
XXXXXXXX    device
```

Only after that does it create `.env` if missing, install npm packages when needed, run `typecheck` and `npm test`, then `npx expo run:android`.

## One-command debug APK

```powershell
cd path\to\field-executive\customer-app
Set-ExecutionPolicy -Scope Process Bypass
.\build-local-apk.ps1
```

Output: `.\build-output\camartes-customer-debug.apk`

This debug APK needs Metro (`npx expo start --dev-client`) after sideload.

## Windows requirements

| Tool | Version / location |
| --- | --- |
| Node.js | 22.13.0 or newer |
| JDK | 17 (Microsoft OpenJDK 17) |
| Android SDK | Platform **36**, Build-Tools **36.0.0**, Platform-Tools |
| `ANDROID_HOME` | `%LOCALAPPDATA%\Android\Sdk` (used if the variable is unset) |

```powershell
winget install OpenJS.NodeJS.LTS
winget install Microsoft.OpenJDK.17
```

Install [Android Studio](https://developer.android.com/studio). In SDK Manager enable API 36, Build-Tools 36.0.0, and Platform-Tools. Add `%LOCALAPPDATA%\Android\Sdk\platform-tools` to PATH. Open a **new** PowerShell after changing environment variables.

```powershell
node -v
java -version
adb version
adb devices
```

## Sign in

Use a 10-digit mobile number. The demo OTP is shown on screen (no SMS).

## What these files do not change

Screens, booking validation, authentication, vendor matching, pricing, and `https://camartes-backend.onrender.com` are unchanged.
