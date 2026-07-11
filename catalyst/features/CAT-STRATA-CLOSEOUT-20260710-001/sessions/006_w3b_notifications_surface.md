# Session 006 — W3b: notifications surfaces (admin section + bell/inbox)

**Date:** 2026-07-10 · **App:** localhost:8080 → staging · **Slice:** W3b (UI over the W3a DB spine)

## Delivered

1. **Types** — `StrataNotification`, `StrataNotificationRule` (types.ts).
2. **Domain (governanceApi)** — `notifications()`, `markNotificationRead()`,
   `markAllNotificationsRead()`, `notificationRules()`, `setNotificationRule()`.
   (typedQuery/typedRpc take string names → no generated-types regen needed.)
3. **Hooks** — `useStrataNotifications`, `useStrataNotificationRules`.
4. **StrataNotificationBell.tsx** (new) — Atlaskit Popup + Badge bell mounted in
   `StrataPageShell` header (global to every STRATA page). Unread badge, inbox panel
   (unread dot, title, body, timestamp), mark-one-on-open + navigate, mark-all-read.
   Deep links resolve to the relevant AREA landing (entity ids are UUIDs — honest
   area-level nav, not a fabricated per-entity slug link; noted in file header).
5. **Admin "Notifications" section** — 13th governed tab (bell icon) in
   StrataAdminConfigPage: 6 rules with audience tag + description + enabled Toggle;
   toggle gated to admins (isStrataAdmin), writes via strata_set_notification_rule.

## Live screenshot pass (attached in chat)

- **Bell + badge**: Reviews page header shows the bell with a red **2** badge
  (2 unread seeded for the logged-in user Vikram — a decision assignment + a benefit
  validation request; triggers skip the actor, so these were reassigned via admin SQL).
- **Inbox panel**: opens on click — "Validate Realized value / Operations cost reduction…"
  and "You own decision DEC-1001 / Accelerate digital care deflection", each with unread
  dot + timestamp; "Mark all read" present. Badge persists across navigation (DB-backed).
- **Admin section**: /strata/admin/notifications renders the 13th tab (selected, bell icon),
  "Notifications 6", all six rules with Owner/Validator/Strategy office tags, descriptions,
  and enabled toggles; admin-only note shown.
- **Console**: one transient Vite-HMR `ReferenceError: StrataNotificationBell is not defined`
  during editing (import binding hot-swapped a tick after usage); a clean hard reload shows
  **zero** errors. Production typecheck rc=0 corroborates.

## Validation (raw)

- `npx tsc --noEmit` → No errors, rc=0
- `npx vitest run src/modules/strata` → 19/19 PASS
- `npm run lint:colors:gate` → 0 = baseline 0
- `npm run audit:ads:gate` → at baseline (5 net-new HARDCODED_PX in the new inline
  styles were converted to `var(--ds-space-*)` tokens to keep the ratchet flat).

## Notes / deferrals

- `action_overdue` fires on write only (no scheduler this slice) — Plan Lock scope.
- Multi-user "recipient sees it, non-recipient doesn't" leg is enforced by RLS
  (user_id = auth.uid()); verified at policy level, not dual-session.
- W3 complete. Next per Plan Lock: **W4** (Command Center "needs your attention" inbox)
  and **W5** (period-close readiness checklist).
