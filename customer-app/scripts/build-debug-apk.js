#!/usr/bin/env node
/**
 * Generate the local debug APK and copy it to:
 *   customer-app/build-output/camartes-customer-debug.apk
 *
 * Usage (from customer-app/):
 *   npm run apk:debug
 *   npm run apk:clean
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const androidDir = path.join(root, "android");
const isWin = process.platform === "win32";
const clean = process.argv.includes("--clean");

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    shell: isWin,
    env: process.env,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const gradlewExists =
  fs.existsSync(path.join(androidDir, "gradlew")) ||
  fs.existsSync(path.join(androidDir, "gradlew.bat"));

if (!gradlewExists) {
  run("npx", ["expo", "prebuild", "--platform", "android", "--non-interactive"], root);
}

const gradleCmd = isWin ? "gradlew.bat" : "./gradlew";
if (clean) {
  run(gradleCmd, ["clean"], androidDir);
}

run(gradleCmd, ["assembleDebug"], androidDir);

const src = path.join(androidDir, "app", "build", "outputs", "apk", "debug", "app-debug.apk");
if (!fs.existsSync(src)) {
  console.error(`Gradle finished but APK was not found at ${src}`);
  process.exit(1);
}

const destDir = path.join(root, "build-output");
const dest = path.join(destDir, "camartes-customer-debug.apk");
fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);

const sizeMb = (fs.statSync(dest).size / (1024 * 1024)).toFixed(1);
console.log(`Verified debug APK: ${dest} (${sizeMb} MB)`);
