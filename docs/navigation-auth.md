# Navigation and required login — 2026-10-04

Worktree: `mobile-navigation-auth-20261004`; branch:
`feat/mobile-navigation-auth-20261004`; preview: http://localhost:5202.
No remote exists, so this isolated branch carries forward the last reviewed
local iPhone implementation at `4d14c09`. Existing checkouts/releases are preserved.

## Product contract

- Root header: original HHC icon + HHC aligned left; notification bell right,
  with unread count (99+ cap) and an accessible count label. Branding is not a
  button; its native glass background is hidden. The bell retains native chrome.
- Bottom navigation: 首頁 / 服事 / 我的. Notifications push a screen; selecting
  a notification marks it read and opens its assignment, with normal back navigation.
- 我的 → 外觀: direct native 深色模式 switch, persistent local preference.
  It and logout remain accessible when reminder data fails to load.
- Login: branded single-action entry screen; no member content or bottom tabs.
  Existing church account sign-in opens the system authentication browser using
  Authorization Code + PKCE. Account registration/recovery/social providers remain
  on the existing account service; the app does not duplicate credential forms.
- Pending authorization disables repeated login; browser cancellation leaves login
  available, failures show an inline error and allow retry. Successful login mounts
  private routes. Restoring credentials waits before resolving the initial route.
- Signed-out assignment links (cold/warm and legacy service URLs) retain only a
  validated assignment ID. Login returns to that assignment with a home back route.
  Protected routes remove private navigation history when the session is lost.
- Local preview: explicit login uses a network-free token adapter, isolated
  `demo-session` key (SecureStore / tab-scoped sessionStorage), and the same Sessions
  lifecycle. Actual OAuth is used only by the configured production build.
  A failed token-storage write must not authenticate the session.

## Validation

- TypeScript, 15 tests, production export for iOS/Android/web, and preview web export.
- `scripts/check-navigation-auth.mjs`: every private route blocked while signed
  out; login/deep-link return/back; exactly 3 tabs; notification read badge;
  appearance reload persistence; logout blocks browser back and reload.
- Updated existing initialization, appearance and pull-refresh scripts for the new
  login requirement and profile switch. Includes failed initialization/retry,
  opposite OS appearance, rapid taps, unavailable theme storage, refresh errors,
  settings draft preservation and cache expiry.
- Native iPhone 17 / iOS 26.5: independent arm64 Release app, local ad-hoc signed;
  explicit login, header placement, 3 tabs, native appearance switch, logout and
  restart persistence checked. Native warm-link test found an intercepted-link
  issue; incoming native URLs and push targets now retain the assignment before
  the route guard rejects it. Retest passed: signed-out legacy service link → login
  → correct assignment detail → native back to home.
- Actual account-server authorization, physical iPhone gestures/VoiceOver, APNs,
  backend integration and store distribution remain separate acceptance gates.
  No push, merge or release was performed.

## References and implementation basis

This layout follows the user's chosen navigation hierarchy; bell/profile placement
is a product choice, not a universal iOS rule. Apple treats tabs as peer destinations:
https://developer.apple.com/design/human-interface-guidelines/tab-bars

Route protection uses the installed Expo SDK 57 Stack.Protected API (not SDK 58's
redirectTo). It guards navigation; server authentication/authorization remains required:
https://docs.expo.dev/router/advanced/protected/

The native branding background uses the installed native-stack custom item API:
https://developer.apple.com/documentation/uikit/uibarbuttonitem/hidessharedbackground
