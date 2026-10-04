# iPhone design and appearance review — 2026-10-04

Branch: `feat/mobile-iphone-design-20261004`.
Worktree: `apps/.worktrees/mobile-iphone-design-20261004`.
Preview: http://localhost:5201.


## This revision

- Light mode uses a quiet white next-service surface; dark mode uses lifted slate.
  Date, task and time share the same left-to-right reading order as roster rows.
  Reduce task titles to 24pt and section headings to 18pt. Group roster rows with
  continuous first/last corners; date rails no longer add nested colored pills.
- Header sun/moon toggles directly between light and dark. First launch follows
  the system until the user chooses. Store the choice locally (SecureStore on
  native, localStorage on web), independently of account reminder preferences.
  Late native reads cannot overwrite a tap; native writes preserve tap order.
  Storage failure leaves the control usable for the current session.
- One palette drives navigation, status bar, sheets, Expo UI hosts and the native
  time picker. Override native window appearance; on web set both color-scheme
  and root data-theme so Expo UI controls override the OS preference too.
- Reuse hhc-web's original app-icon-512.png for the installed app icon; keep the
  original circular logo plus HHC in the header. No generated brand assets.
- Verification in this revision: typecheck, 13 tests, production all-platform
  export and synthetic web export pass. Appearance regression covers OS
  overrides in both directions, persistence, rapid taps, unavailable storage
  and navigation. Pull-refresh regression passes including draft preservation.
  Inspect home at 390px light/dark and 320px dark, detail at 320px dark,
  settings in light, dark timezone sheet and light replacement sheet.
- Repeatable appearance regression: `scripts/check-appearance.mjs` against the
  local synthetic preview in an existing Ego task space.

## Acceptance criteria

A component must identify location, present information needed for a decision,
perform an available action, or communicate a meaningful state. Routine work
should happen automatically. Use platform gestures for direct manipulation;
keep explicit controls where discovery, accessibility or responsibility requires
them. Do not make users interpret implementation details or read instructions
that repeat what the layout already communicates.

## Whole-screen review

| Surface / component | Decision and implementation |
| --- | --- |
| Home identity | Existing `hhc-web/public/assets/brand/logo.png` at 28pt + HHC; same identity on login. |
| Header refresh | Remove from all tabs. Native system pull-to-refresh on lists and detail; touch preview implements pull, release threshold, cancellation and pending state. |
| Automatic refresh | Retain foreground refresh; expire roster data and refresh automatically while active. Keep an editing preference draft mounted; logout/authorization clears still remove it. |
| Loading | Pull indicator belongs only to that pull, not other commands. Initial loading and contextual failures retain their own feedback. |
| Home next service | Keep event, date, time and fellowship as the immediate task. Card opens detail. |
| Home next tasks | Remove duplicate self identity and initial-letter avatars. Keep other assignees for invitations and team roster. |
| Home navigation | Remove permanent full-roster link duplicating the tab. Empty home alone has an actionable view-roster link. |
| Empty states | Remove generic success/check decoration and instructions to use adjacent date controls. Keep short state labels. |
| Roster filters | Keep mine/team distinction, actual date range and date controls; show team selector only when there is a choice. Keep timezone label when events differ from display zone. |
| Notifications | Keep unread state and event/date context; tapping opens detail and marks read. No extra action toolbar. |
| Detail | Keep task/date/location/timezone/responsibility and conditional conflicts or cancellation. One primary replacement entry for the owner. |
| Replacement actions | Move help and withdrawal into find/manage replacement. Keep accept/decline visible to the recipient; keep responsibility consequences where committing. |
| Sheets | Keep explicit back/close alongside native dismissal for discovery and keyboard/accessibility. Choices and confirmation can scroll; full-height person search retains its own virtualized list. Short web sheets fit content to avoid the library's half-detent clipping. |
| Reminder settings | Remove oversized summary card that duplicates editable fields. Keep enable toggle and conditional date/time/zone fields. |
| Saving settings | Save action and unsaved state only after edits. Explicit save is retained because reminders apply across devices; preserve drafts through refresh/failure. |
| Timezones | Keep display and reminder zones independent. Put travel/shared-setting explanation inside reminder-zone selection, where it informs the choice. Search accepts natural city spacing as well as IANA identifiers. |
| Phone notifications | Enabled is a static status, without an action chevron that merely repeats registration. Non-enabled states retain an activation/retry action. |
| Tabs | Keep four destinations, labels and unread badge. Labels prevent guessing unfamiliar icons. Native iOS navigation remains system-rendered. |
| Errors | Retain retry only in failure/offline feedback, plus conflict and ownership consequences. No permanent operational notice. |

## Previous interaction revision validation for this revision

- TypeScript and 13 tests, including Android refresh-wrapper child/layout propagation
  and city searches using spaces, underscores, Chinese names and IANA ids.
- Production iOS/Android/web and separate preview exports.
- Repeatable browser touch regression: `scripts/check-pull-refresh.mjs`.
  Uses an existing Ego task space, synthetic response fault injection and CDP
  touch events. See script header for invocation.
- Touch regression passed: short/cancelled/horizontal pulls, threshold, pending
  request deduplication, starting away from the top, no accidental card opening,
  failure/retry, preserving drafts through pull and automatic expiry refresh.
- Browser flows passed: public replacement request, withdrawal, responsible-person
  help, invitation acceptance/read state, team roster/future empty state, reminder
  save and New York city search with independent display timezone.
- Visual checks: 390px light, 320px dark home/roster, compact settings, and short
  replacement sheet with its final action completely inside the viewport.
- Native runtime/device acceptance is still outstanding; bundles and the Android
  wrapper contract check do not prove physical gesture or Liquid Glass fidelity.

## Design contract

HHC should have a distinctive, polished mobile identity and clear task hierarchy.
Keep slate surfaces, warm rose accents, system typography and the date-led next
service card. Shared brand language permits platform-specific navigation.
A task should be understandable without reading repeated explanatory paragraphs.
Keep decision consequences, responsibility, conflicts and offline limitations at
the point where they matter. Do not remove labels in pursuit of visual minimalism.

## Carried-forward native-navigation implementation

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

- https://reactnative.dev/docs/refreshcontrol
- Installed React Native ScrollView and React Native Web RefreshControl implementations.
- https://developer.apple.com/news/?id=970ncww4
- https://culturedcode.com/things/features/
- https://docs.expo.dev/versions/v57.0.0/sdk/router/native-tabs/
- https://docs.expo.dev/router/installation/
- Installed `@expo/ui` SDK 57 types and implementations for native controls/bridges.
