#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ -z "${JAVA_HOME:-}" ]]; then
  if [[ -x "$PWD/artifacts/jdk17/Contents/Home/bin/java" ]]; then
    export JAVA_HOME="$PWD/artifacts/jdk17/Contents/Home"
  else
    export JAVA_HOME="$(/usr/libexec/java_home -v 17)"
  fi
fi
if ! "$JAVA_HOME/bin/java" -version 2>&1 | head -n 1 | grep -q 'version "17\.'; then
  echo "Android demo requires JDK 17. Set JAVA_HOME to a JDK 17 installation." >&2
  exit 1
fi
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export EXPO_PUBLIC_DEMO=true
export EXPO_NO_TELEMETRY=1
export NODE_ENV=production
npx expo prebuild --platform android --no-install
./android/gradlew -p android :app:assembleRelease \
  -PreactNativeArchitectures=arm64-v8a --max-workers=3 --console=plain
mkdir -p artifacts
cp android/app/build/outputs/apk/release/app-release.apk artifacts/hhc-android-demo.apk
shasum -a 256 artifacts/hhc-android-demo.apk
