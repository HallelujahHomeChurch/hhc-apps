# HHC App — fellowship service MVP

React Native / Expo app for the existing HHC Account and Operations platform.
Team ids are fellowship OrgUnit ids. Scheduling stays in Admin; members can
view rosters, nominate or openly request a replacement, accept/decline/withdraw,
and ask their fellowship's responsible person for help.

## Local preview

```sh
npm ci
npm run demo:web
```

Open `http://localhost:5198` (stop any static preview already using that port first). The demo label means **synthetic data**:
no real accounts, server mutations or push delivery. The demo transport never
uses the network. Reload resets its sample state. This preview is for layout
and interaction review, not acceptance of authentication or native notifications.

For a real test environment, copy `.env.example` to `.env.local`, set the public
Account/API origins and the registered native client id, then run `npm start`.
Never place client secrets or provider tokens in `EXPO_PUBLIC_*` variables.
Use a development/internal native build for push testing, not a web preview.

## Architecture

The UI refinement branch is `feat/mobile-native-20261004`, in a separate worktree
from the original MVP. See [UI review](docs/ui-review.md) for design decisions,
verified interactions and the remaining native-device checks.

- `src/session.ts`: PKCE token exchange, SecureStore integration through an
  injected storage interface, serialized refresh, epoch fencing, and distinct
  invalid-grant versus transient 409/503 handling.
- `src/api.ts`: authenticated service transport, bounded request timeout,
  pagination, cache invalidation, assignment-version and idempotency propagation.
- `src/generated.ts` and `contracts/operations-api.yaml`: canonical generated
  Operations contract. Run `node scripts/sync-contract.mjs <operations-client>`
  after generating the shared package; never edit generated types by hand.
- `src/push.ts`: device-secret registration, Expo token refresh, permission
  handling and logout revocation. The server owns reminder scheduling.
- `src/app/`: Expo Router routes with platform-native tabs and a native detail
  stack. iOS uses system Liquid Glass on supported OS/build combinations; web
  uses JavaScript tabs for preview, not a simulation of Apple's glass rendering.
- `src/service-state.tsx`: one shared session/data controller across routes.
- `src/screens.tsx`, `src/service-ui.tsx`, `src/reminder-settings.tsx`: member
  screens, progressive replacement actions and native reminder controls.
- `src/navigation.ts`: preserves existing `hhc-app://service/:id` links. Native
  OAuth callbacks retain the requested detail destination after login.
- `src/theme.ts`: mobile-owned HHC color and typography tokens. Website DOM
  components are not imported into the native app.

Rosters and notices are memory-only, expire after five monotonic minutes, and
clear on logout, account change or denied authorization. Deep links/pushes carry
only an assignment id and always fetch current state before showing actions.
Mutations never optimistically succeed while offline. A server-accepted push
cannot be recalled: logout attempts device revocation before clearing the local
session, while offline logout may leave generic notifications queued until the
next successful unregister/account rebind. No personal content is in those pushes.

## Verification

```sh
npm run typecheck
npm test
npx expo-doctor
EXPO_PUBLIC_DEMO=false npx expo export --clear --platform all
```

The tests cover refresh-token recovery, stale responses after logout, denied
cache access, version/idempotency propagation, old deep links, timezone date
boundaries and reminder-control validation. Backend transactions, races,
IANA/DST reminders, membership revocation, device ownership and durable provider
receipts are tested in the corresponding Operations/Notification worktrees.
CI verifies source and bundles; native signing and physical device smoke are
separate steps. No application-store submission is automated.

## Internal device build prerequisites

1. Register an Account **public** OAuth client with `token_delivery=native_body`,
   PKCE S256 and exact redirect `hhc-app://auth/account`; grant the existing
   `openid profile` scopes. Do not reuse the Presenter client id.
2. Prepare a migrated test Operations environment with `SERVICE_DUTIES_ENABLED`.
   Configure native notification flags, encrypted device storage key, Dapr caller
   ACLs and notification caller allowlist as documented in the backend READMEs.
3. Supply the team's EAS project id through `EXPO_PUBLIC_EAS_PROJECT_ID`, and
   configure APNs/FCM credentials in EAS. None were created or uploaded here.
4. Sign in to the team's EAS account, set the preview environment values, and
   run `eas build --profile preview --platform all`. iOS internal distribution
   also needs registered devices/signing. `app.config.ts` rejects a signed build
   with missing configuration or synthetic demo mode.
5. On real iOS and Android devices verify login/re-login/logout, cold/warm push
   open, permission denial/re-enable, token rotation, account switch, airplane
   mode/cache expiry, DST preferences and a real replacement race. Test only
   designated test members; generic push receipts do not prove human receipt.

## Current limitations and delivery boundary

- This repository has no remote yet. Feature work is isolated on
  `feat/mobile-native-20261004`; earlier worktrees and website releases are untouched.
- This machine has no full Xcode or Android SDK. iOS/Android Hermes bundles build,
  but no signed IPA/APK or real-device acceptance has been produced.
- Installing the SDK-compatible Router dependencies reported 29 upstream npm
  advisories (19 high / 10 moderate), versus 23 in the preceding baseline.
  This iteration does not resolve that release gate or apply forced SDK changes.
  Expo Doctor compatibility success does not mean vulnerability remediation.
- Native reminders are configured but require the test infrastructure and
  provider credentials above before delivery can be exercised end to end.
