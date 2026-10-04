# Mobile compact-layout revision — 2026-10-04

Branch: `feat/mobile-layout-20261004`.
Worktree: `apps/.worktrees/mobile-layout-20261004`.
Preview: http://localhost:5199 (synthetic transport; reload resets data).

## Current layout revision

- Reference Flighty's prioritization of the next event and Things' clear task
  groups, rather than reproducing every element of either app. Their official
  screenshots and design explanations were reviewed.
- Replace the large page title with a compact 17pt navigation title. Home uses
  the church name once in navigation; the repeated brand line is removed.
  Other destinations retain a small location label and refresh action.
- Task titles use 26/34pt instead of 32/42pt. Keep the date prominent and the
  existing slate/rose palette, labeled native tabs and task grouping.
- Remove demo-only copy from every tab. Simulated notification activation uses
  the same enabled state as production. No preview labels or banners are rendered;
  the synthetic transport and build guards remain unchanged.
- Keep operational information such as offline state, conflicts, timezones and
  a reminder that would occur after its event. Those affect real decisions.

### Current validation

- TypeScript, all 11 tests and production iOS/Android/web exports pass; the
  separate preview export passes. No dependencies were changed.
- Browser checks: all four tabs, detail opening/back, simulated notification
  activation, 390px light/dark and 320px dark screenshots. The home header is
  17px, the 320px viewport has no horizontal overflow, and demo-only notices
  are absent. Long assignment names wrap instead of truncating.
- Earlier feature checks below describe the carried-forward native-navigation
  revision; device acceptance remains open.

## Design contract

HHC should have a distinctive, polished mobile identity and clear task hierarchy.
Keep slate surfaces, warm rose accents, system typography and the date-led next
service card. Shared brand language permits platform-specific navigation.
A task should be understandable without reading repeated explanatory paragraphs.
Keep decision consequences, responsibility, conflicts and offline limitations at
the point where they matter. Do not remove labels in pursuit of visual minimalism.

## Implemented

- Expo Router SDK 57 native tabs on iOS/Android; four labeled destinations and an
  unread notification badge. iOS delegates material and selection rendering to
  the system; uses SF Symbols and `minimizeBehavior="never"`. Web has a normal
  JavaScript tab bar, not a claim of native Liquid Glass fidelity.
- Real detail routes/native stack replace the hand-built modal/back handler.
  A single provider retains session, cache and command behavior across screens.
  Existing service links are rewritten to detail routes; OAuth return handling
  retains the requested assignment. Detail fetches are fenced against stale loads.
- Home removes duplicate counts and descriptions, hides absent invitation groups,
  compacts the next-service card and exposes pending replies above the remaining
  duties. Inactive web tabs are hidden from interaction/accessibility traversal.
- Roster shows the actual date window. Returning home resets the window and does
  not show duties from the previously selected future range during loading.
- Notifications show task/date context when the assignment is in the loaded
  roster. Out-of-window notices keep their event title/time; tapping always fetches
  authorized current detail. No actor attribution is fabricated from current data.
- Replacement status is consolidated. Help and withdrawal are quieter actions.
  Selection and public confirmation show the task/date and ownership consequence.
  Sheets use the explicit RNHostView bridge for embedded React Native content.
- Reminder day/time selection replaces numeric/HH:mm text entry. iOS/Android use
  Expo UI controls, with accessible HTML day/time controls in the web preview.
  Searchable cities cover Intl-enumerated zones and retain existing saved zones;
  runtimes without zone enumeration retain common, device and saved choices.
  Reminder timezone and display timezone remain independent. Save is explicit;
  drafts survive failures and refreshes. On a newer server preference version,
  retain the user's choices, update the version and request explicit re-save.
- Current responsibility stays prominent; obsolete withdrawn-request text and
  routine synchronization timestamps no longer compete with the primary task.

## Earlier native-navigation validation

- TypeScript and 11 tests pass. New checks cover clock round trips, invalid
  preferences, uncommon zones, cross-day display, year-boundary ranges and old
  notification/OAuth link mapping.
- Expo Doctor: 21/21. Router peers are pinned using the Expo SDK dependency map.
- Production-mode iOS, Android and web bundles export; synthetic web export also
  succeeds. Bundles are not signed installation packages.
- Browser exercised nomination, switching to public recruitment, withdrawal,
  accepting an invitation, unread badge/readback, returning from notification
  detail, an empty future roster then home, city search, independent display
  timezone and reminder save.
- Injected a lost synthetic preference response: day/time draft stayed visible,
  retry showed saved state. No real accounts, backend writes or pushes were used.
- Settings use a plain scroll container so the sheet's virtualized city list
  owns its scrolling; verified selecting London below the initial visible rows.
- Visual checks: 390px light, 320px dark, 320px public confirmation and 150% web
  text stress check. Native Dynamic Type/VoiceOver are separate acceptance checks.

## Device/release boundary

This machine has Command Line Tools, no full Xcode or available `simctl`.
No native runtime, iOS 26/27 glass rendering, native keyboard/sheet sizing, swipe
back, VoiceOver/TalkBack, physical push or real OAuth flow was exercised here.
Those remain required before calling the app device-accepted. See README for
OAuth/EAS/test-backend setup and outstanding dependency advisories.

No remote exists for this repo. The task branch starts at local main, then carries
forward the prior MVP/UI commits. No push, merge, website release or store release
was performed; earlier worktrees and previews remain available.

## References

- https://developer.apple.com/news/?id=970ncww4
- https://culturedcode.com/things/features/
- https://docs.expo.dev/versions/v57.0.0/sdk/router/native-tabs/
- https://docs.expo.dev/router/installation/
- Installed `@expo/ui` SDK 57 types and implementations for native controls/bridges.
