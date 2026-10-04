# Android demo — 2026-10-05

Branch: `feat/mobile-android-demo-20261005`, based on the validated iPhone member
experience at `bffb0c2`. The mobile repository has no remote, so there is no
`origin/main` to update. Existing worktrees and releases are preserved.

## Build and run

Requires Android Studio (Apple Silicon), JDK 17, Android SDK and accepted
SDK licenses. The generated Expo SDK57 native project uses compile/target SDK36,
Build Tools36.0.0, NDK27.1.12297006 and Gradle9.3.1. Android17/API37 is the device
runtime for this demo; targeting API37 is a separate SDK compatibility upgrade.

```sh
npm ci
npm run build:android:demo
# Output: artifacts/hhc-android-demo.apk (arm64-v8a)
~/Library/Android/sdk/platform-tools/adb install -r artifacts/hhc-android-demo.apk
~/Library/Android/sdk/platform-tools/adb shell am start \
  -n tw.org.alive.hhcapp.demo/.MainActivity
```

The local Release-variant APK embeds JavaScript and uses the generated development
signing key. It does not require Metro. This is a local test artifact, not a Play
Store release. Demo installs use `tw.org.alive.hhcapp.demo`; production keeps
`tw.org.alive.hhcapp`, and iOS identifiers are unchanged. EAS distribution still
rejects synthetic demo builds.

Use `npm run android:demo` for a Metro-backed development build with `JAVA_HOME`
set to JDK 17. The APK script uses `JAVA_HOME`, a task-local
`artifacts/jdk17/Contents/Home`, or the installed JDK 17 in that order. Android
Studio Rabbit 1 bundles JDK 25; its native-access warning breaks this React Native
CMake toolchain, so it is not the build JDK. SDK, JDK and PATH
are scoped to build commands; no global shell configuration is overwritten.
`android/`, generated signing files and `artifacts/` are ignored by Git.

## Android behavior

- Keep the HHC brand and three destinations: 首頁 / 服事 / 我的.
- Native Android Material navigation, Compose sheets, pickers and switches;
  no imitation iOS glass chrome. Existing HHC brand colors seed native controls.
- Enable predictive back and use the router's native stack. NativeTabs handles
  Android bottom insets; do not double-pad its screens.
- Add Android button ripple/pill shape and Expo system appearance support.
- Keep dismissal state in sync if a replacement sheet is swiped away during a
  request; any failure remains visible on the detail screen. Back/scrim dismissal
  is disabled during submission.
- Notification permission remains contextual. Demo data, login and notification
  toggles are local synthetic behavior; no real account or push delivery is claimed.

## References

- https://developer.android.com/about/versions/17
- https://developer.android.com/about/versions/16/behavior-changes-16
- https://developer.android.com/develop/ui/compose/designsystems/material3
- https://docs.expo.dev/versions/v57.0.0/sdk/ui/
- https://docs.expo.dev/router/advanced/native-tabs/

## Acceptance evidence

- TypeScript and 21 unit tests pass, including demo application-ID isolation and
  the EAS synthetic-build guard.
- Expo production exports pass for Android, iOS and web.
- Native Release APK builds successfully with Temurin 17.0.20.1, passes
  `apksigner verify`, and installs on Android 17 / API 37 (ARM64).
- Metro was stopped before APK launch. Login, home, service list, profile,
  light/dark switching, persisted appearance/session after reinstall, native
  dark time picker, timezone sheet/search, service detail, candidate selection,
  and the local replacement invitation/withdrawal state were visually checked.
- Fixed an observed Compose interop issue: React Native trailing icons squeezed
  native settings-row text. Android now uses native text for the chevron and
  explicit HHC row colors; iOS keeps its existing icon.
- Emulator uses 4 cores / 4 GB RAM. Its Android 17 image uses software rendering;
  initial system UI ANR recovered after startup. Pixel override is 720x1600 at
  280 dpi (same logical dimensions as 1080x2400 at 420 dpi). Restore with
  `adb shell wm size reset` and `adb shell wm density reset` if desired.
- Physical-device performance, TalkBack, largest accessibility font sizes,
  three-button navigation, production OAuth/API/push and Play distribution are
  not acceptance claims for this local demo.

The generated project can be opened in Android Studio to view Running Devices.
If IDE sync reports `Cannot run program node`, start Android Studio from a
terminal with Node on PATH; this Mac uses NVM. CLI builds are already validated
and do not depend on IDE sync. Set the project's Gradle JDK to JDK 17 as well.

Final APK SHA-256:
`ee74f3f93ff29aab607ef3e6cb63decede38a6505a539872b7a485c7de452ac2`.
