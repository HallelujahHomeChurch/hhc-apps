# Core mobile UI review — 2026-10-04

This iteration implements the home, roster and replacement-detail experience.
It is an interactive React Native implementation, not a screenshot-only mockup.
Notification and profile screens inherit the shared palette and controls but
their full interaction redesign remains a separate iteration.

## Design decisions

- Keep HHC's rose identity, using the existing website's brand direction as the
  starting point. Use neutral surfaces, system fonts and one accent; no decorative
  gradient, illustration, promotional hero or separate downloaded display font.
- Put the next assignment first. Its date block is the visual anchor and carries
  useful information. Subsequent duties use compact date rows rather than copies
  of the prominent assignment card.
- Home shows pending invitations and the next duties. The roster separates
  personal duties and the full fellowship roster and keeps the date window visible.
- Keep existing auth, API and version/idempotency behavior. Replacement choice is
  progressive: choose a method, search/select a colleague, then explicitly send.
  Public recruitment also has a confirmation step. Selection remains on failure.
- Centralize light/dark colors and text scale in `src/theme.ts`; use SF Symbols on
  iOS and Material icons on Android/web. Expo UI supplies the replacement sheet
  and reminder switch. The existing tab navigation is retained in this iteration;
  migrating it to platform-native navigation is not claimed complete.
- Virtualize roster and colleague lists. Keep the primary action readable,
  touch targets at least 48 points, text scaling enabled, and no fixed-height rows.

## Validation performed

- TypeScript and the existing seven session/transport tests pass.
- Expo Doctor: 21/21 after adding the required `expo-font` peer and config plugin.
- Production-mode web, iOS and Android bundles export successfully. These are
  bundles, not signed installation packages or native runtime acceptance.
- Browser checks use explicitly synthetic transport and names. No real account,
  backend mutation, push, EAS project, credentials or release was touched.
- Checked 390px home and detail in light/dark; 320px roster has no horizontal
  overflow. 150% browser text-size stress check at 390px also has no horizontal
  overflow. This is not evidence of native Dynamic Type or TalkBack/VoiceOver.
- Exercised empty colleague search, nomination, simulated lost command response,
  preserved selection and retry, switching to public recruitment, withdrawal,
  accepting an incoming invitation, empty roster window and returning home.
- Fixed the web stacking conflict between React Native Modal and Expo UI's sheet
  portal by presenting web detail in-tree, hiding the underlying screen and
  focusing the detail surface. Native retains its Modal presentation.

## Remaining device checks

- iOS and Android keyboard/sheet interaction, back and swipe dismissal, native
  text scaling, screen-reader focus/announcements, system bars and safe areas.
- EAS/signing, real OAuth/test API, actual push and store readiness remain as
  documented in README. The previously recorded upstream npm advisories remain.
- Brand and visual acceptance belongs to the user; passing builds does not prove
  that the design meets their preference.

Preview: `http://localhost:5197`. Reload resets synthetic changes. Recreate with
`npm run demo:web`; do not run it while another server occupies that port.

## Modern mobile revision

The user explicitly relaxed shared web UI/style constraints. Mobile now owns
its palette, typography and component appearance, retaining rose as the brand
connection. A dark slate next-service surface anchors the home screen; lighter
neutral surfaces, date rails, colleague initials, compact status labels and
selected tab backgrounds distinguish the rest of the interface.

Incoming nominated requests now say that the viewer is invited, rather than
using the same waiting status shown to the requester. No API or permission
contract changed and no new dependencies were added in this revision.

This revision is isolated on feat/mobile-modern-20261004. The previous preview
remains at localhost:5196 for comparison. Typecheck, seven tests and all-platform
exports passed; browser checks cover 320px/390px, light/dark, nomination and
withdrawal. Native runtime acceptance is still pending.
