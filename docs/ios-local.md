# Local iPhone development

Use this feature worktree. The mobile repository currently has no Git remote;
no release or primary checkout is modified by these local builds.

Prerequisites: full Xcode, accepted Xcode/SDK license, installed iOS platform and
Simulator runtime in Xcode Settings > Components, and CocoaPods (`pod`).

If the global developer directory still selects Command Line Tools, scope Xcode
to the command instead of changing other projects' environment:

```sh
export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
npm ci
npm run ios:demo
```

`ios:demo` builds the native app with local synthetic data. No backend mutation
or push registration occurs in that mode. The screens and interactions are the
same components as production. The existing signed EAS build guard rejects a
synthetic build; do not use this command for distribution.

For the configured backend, set the values documented in `.env.example` and run
`npm run ios`. Login, real notifications and physical iPhone acceptance require
that integration environment and remain separate from simulator UI acceptance.

An installable, Metro-independent simulator build can be produced locally:

```sh
EXPO_PUBLIC_DEMO=true EXPO_NO_TELEMETRY=1 xcodebuild \
  -workspace ios/HHC.xcworkspace -scheme HHC -configuration Release \
  -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath ios/build-local CODE_SIGNING_ALLOWED=NO
```

Generated `ios/`, Pods and build output are ignored by Git. App configuration
and package scripts are the reproducible source; don't hand-edit generated iOS
files. The app icon comes directly from the website's HHC brand assets.
