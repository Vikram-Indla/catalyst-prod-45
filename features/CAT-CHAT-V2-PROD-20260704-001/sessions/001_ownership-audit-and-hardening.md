# Session 001 — ownership audit + hardening (2026-07-04)

Flow: baseline verification (5 parallel audit lanes: frontend, hooks/realtime, schema/RLS,
huddle, tests/RTL/a11y) → staging DB truth probes → defect register → phases A–G → implement →
validate live (Chrome, light mode) → tests/build → report.

Defects fixed: D1 (cron absent → scheduled send dead), D2 (publication drift + missing
ph_user_status table), D3 (no reaction subscription), D4 (typing indicator unwired), D5 (huddle
toast copy), D6 (silent no-op menu items), D7 (unread divider missing), D8 (RTL slice),
D9 (menu a11y), +new: self-send re-flags conversation unread.

Deferred with evidence: mobile, read receipts, slash commands, code blocks, notification prefs,
SFU >4, chat i18n, full RTL mirroring.

See 07_HANDOVER.md for full detail. Commit: feat(chat-v2) production hardening (this session).
