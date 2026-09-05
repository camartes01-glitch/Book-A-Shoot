# Camartes Customer — local run guide (Windows + Android)

This is the already-built **Expo SDK 57** app (`camartes-customer`). It is not a React Native CLI project. Do not recreate screens or replace the live vendor API.

All commands below are **PowerShell**. From the folder that contains this repo:

```powershell
cd Book-A-Shoot\customer-app
npm install
```

If you cloned `field-executive` instead, use `cd customer-app` from that repo root, then `npm install`. After that, stay inside `customer-app` for every later command.

## 1. Toolchain

| Tool | Required version | Why |
| --- | --- | --- |
| Node.js | **22.13.x or newer** (22.14 LTS is what this repo was verified with) | Expo SDK 57 minimum |
| npm | comes with Node 22 | dependency install |
| JDK | **17** (Microsoft OpenJDK 17) | official Expo SDK 57 Android host JDK |
| Android SDK | **Platform 36** + **Build-Tools 36.0.0** | Expo 57 `compileSdk` / `targetSdk` = 36 |
| minSdk | 24 (Android 7) | generated Android app |
| Gradle | **9.3.1** (wrapper, installed automatically) | Expo prebuild |

JDK 21 can also compile this project (it did in CI/this VM). Use JDK 17 on Windows unless you already have 21.

### Install on Windows

```powershell
# Node 22 LTS — https://nodejs.org/  (or:)
winget install OpenJS.NodeJS.LTS

# JDK 17
winget install Microsoft.OpenJDK.17
# or: choco install -y microsoft-openjdk17
```

Install [Android Studio](https://developer.android.com/studio). In **Settings → Languages & Frameworks → Android SDK**:

- SDK Platforms: **Android 16 (API 36)** + Sources
- SDK Tools: **Android SDK Build-Tools 36.0.0**, **Platform-Tools**, **Android Emulator**

Set user environment variables (default SDK path):

```powershell
setx ANDROID_HOME "$env:LOCALAPPDATA\Android\Sdk"
setx JAVA_HOME "C:\Program Files\Microsoft\jdk-17.0.x-hotspot"
```

Add these to your user **Path**, then open a **new** PowerShell:

```
%LOCALAPPDATA%\Android\Sdk\platform-tools
%LOCALAPPDATA%\Android\Sdk\emulator
%JAVA_HOME%\bin
```

Check:

```powershell
node -v          # v22.13.0 or newer
java -version    # 17.x
adb version
```

## 2. Environment variables

Copy the example file. **No secrets are required** to run the existing app.

```powershell
copy .env.example .env
```

| Variable | Required? | What it does |
| --- | --- | --- |
| `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY` | No | Google Places address search. Empty = Indian-cities fallback. |

Vendor catalog already uses the live Camartes Vendor Platform. Do not point it at a mock.

## 3. Install dependencies

```powershell
npm install
```

## 4. Start Metro / Expo

```powershell
npx expo start
```

- Install **Expo Go** for SDK 57 from the Play Store on your phone, then scan the QR code.
- Press `a` to open a running emulator.
- Press `w` for web.

## 5. Run the existing native Android app

This generates `android/` (gitignored), builds a debug binary, installs it, and starts Metro:

```powershell
npx expo run:android
```

Equivalent npm script:

```powershell
npm run android
```

## 6. Generate the debug APK

```powershell
npm run apk:debug
```

That script runs `expo prebuild` if `android/` is missing, then:

```powershell
cd android
.\gradlew.bat assembleDebug
cd ..
```

and copies the artifact to:

```
customer-app\build-output\camartes-customer-debug.apk
```

Clean rebuild:

```powershell
npm run apk:clean
```

Manual equivalent:

```powershell
npx expo prebuild --platform android
cd android
.\gradlew.bat assembleDebug
cd ..
mkdir build-output -Force
copy android\app\build\outputs\apk\debug\app-debug.apk build-output\camartes-customer-debug.apk
```

This debug APK is a **development build**. It expects Metro on your computer (`npx expo start`). For a standalone sideload that does not need Metro, build release instead:

```powershell
cd android
.\gradlew.bat assembleRelease
copy app\build\outputs\apk\release\app-release.apk ..\build-output\camartes-customer-release.apk
```

## 7. USB debugging (physical phone)

1. On the phone: **Settings → About phone → tap Build number 7 times**.
2. **Settings → Developer options → enable USB debugging**.
3. Plug in USB (File Transfer / MTP). Accept the RSA prompt on the phone.
4. Confirm:

```powershell
adb devices
```

You should see the device as `device` (not `unauthorized`).

### Wireless debugging (optional)

1. Phone and PC on the same Wi‑Fi.
2. **Developer options → Wireless debugging → Pair device with pairing code**.
3. On the PC:

```powershell
adb pair <phone-ip>:<pairing-port>
adb connect <phone-ip>:<wireless-port>
adb devices
```

## 8. Install the APK on a connected phone

```powershell
adb install -r .\build-output\camartes-customer-debug.apk
```

Then start Metro so the debug app can load JS:

```powershell
npx expo start --dev-client
```

If `adb` says more than one device:

```powershell
adb devices
adb -s <device-serial> install -r .\build-output\camartes-customer-debug.apk
```

## 9. Install / run on an Android emulator

```powershell
emulator -list-avds
emulator -avd <avd-name>
```

In a second PowerShell:

```powershell
npx expo run:android
```

Or install the already-built APK:

```powershell
adb install -r .\build-output\camartes-customer-debug.apk
npx expo start --dev-client --android
```

## 10. Sign in

Use a mobile number. The demo OTP is shown on screen (no SMS gateway). Email login also works.

## What was not changed

Screens, booking logic, vendor matching, and the live Camartes Vendor Platform API were not redesigned or replaced. This folder only documents and scripts the existing local Android build.
