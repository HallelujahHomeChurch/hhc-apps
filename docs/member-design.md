# Member app design — 2026-10-05

Worktree: `mobile-member-design-20261005`.
Branch: `feat/mobile-member-design-20261005`, based on the reviewed local
`0f82011` because this repository has no remote. Existing worktrees and releases
are untouched. Local preview: http://localhost:5203.

## Interaction contract

- Required login uses one original HHC logo, HHC wordmark and church name.
- Header retains left-aligned HHC branding and a notification bell. Bottom tabs
  remain 首頁 / 服事 / 我的; future capabilities do not get speculative tabs.
- Home contains pending replacement invitations and one next service within the
  next 60 days. It no longer duplicates the roster or resets its selected month.
- Service uses whole calendar months and date-grouped rows, with personal/team
  filtering. The selected month and mounted list position survive tab switching.
  The picker offers two past months through three future months, subject to the
  existing API's 90-day lookback. Previous/next controls stop at those bounds.
- Month queries cover UTC+14 through UTC-12; client filtering/grouping follows
  the selected display zone. Home's 60-day range loads independently from the
  selected calendar month. Results are deduplicated by assignment ID.
- My page shows the existing Account API `/api/account/v1/me` identity and the
  Operations API's actual fellowship memberships, then appearance and reminders.
  No organization/unit is invented: the current profile response has no such field.
  Profile errors are independently retryable and do not hide a loaded roster.
- Existing pull-to-refresh, light/dark preference, notification links and service
  commands remain. No explanatory demo banners or decorative action buttons.

## Verification

See `scripts/check-member-design.mjs` for local synthetic regression covering
month retention, same-day grouping, profile failure/retry and no-fellowship states.
Existing navigation/auth, appearance and refresh checks remain in `scripts/`.

Real OAuth/account integration, actual push delivery, physical-device accessibility
and App Store distribution are separate acceptance gates. Local demo login is
synthetic; the production build still requires configured existing services.

Validated in this worktree:
- TypeScript and 19 unit tests pass; production iOS/Android/web export and web
  preview export pass.
- Browser member-design, navigation/auth, appearance, initialization recovery,
  and pull-refresh/cache-expiry regression scripts pass. The scroll-away test
  now targets the visible profile scroll view because the shorter home fits
  entirely on screen.
- iPhone 17 Pro / iOS 26.5: local login, minimal home, native month menu,
  November selection, member identity/fellowship and native dark-mode switch
  visually verified in Expo Go.
- Independent arm64 iOS Release build passes with local ad-hoc signing; installed
  and launched as `tw.org.alive.hhcapp` on the iPhone 17 Pro simulator. Explicit
  login, native month menu and selection, member profile and appearance verified
  without Metro. No merge, remote push or release was performed.
- Terminate/relaunch smoke passes: the local session and chosen dark appearance
  persist, and the app returns to the member home without Metro running.
