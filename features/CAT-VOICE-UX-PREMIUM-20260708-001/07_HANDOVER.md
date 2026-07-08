# CAT-VOICE-UX-PREMIUM-20260708-001 — Handover

## State: CODE COMPLETE (S0–S6b + chat-v2 completion), acceptance sweep partially blocked

Commits on origin/main (2026-07-08, in order):
a7c66b26d S0 security repair (RLS + translate-fn JWT) · 32440e0dc S1 session control · d65b5214c S2 anchored mic + CTA retirement · 941bf8cb0 S3a live partials + lane health · 0b5a4e905 S3b inline ghost transcript · b2aece4 S4a read-side translation · 5a7caffcb S4b write-side AR→EN · 47c68f2 S5 RTL hygiene · e5369c0 S6a reliability · 7256a4d S6b premium delta · c7cc3aa chat-v2 live-surface completion.

## What ships
No silence auto-stop (15-min cap, 14-min warning, pause/resume, count-up timer); one morphing mic anchor per composer (chat-v2 + MessageComposer surfaces), hover cluster + destructive ع/A deleted; live words inline in the composer as ghost text (stable/provisional, bidi-safe); realtime-lane health honest ("live captions unavailable…"); read-side See-translation links; write-side AR→EN mode w/ preview-before-send + Always/Ask/Never (user_preferences); RTL hygiene (dir=auto, bdi, Arabic font stack); calm no_speech, first_partial_ms metric, retry-without-re-recording; sound ping (off default), magenta listening ring, workspace vocabulary, polish transparency, live language chip. cyij: RLS repaired + verified, ai-translate-field v15 JWT-gated (401 probes logged), 2 migrations applied + committed.

## RED FLAG none. Open items
1. **Acceptance sweep blocked**: /chat conversation-open flaky in shared dev env — reproduces on pristine HEAD (bisect-verified, not this feature). Retry 10_SCREENSHOT_CHECKLIST when open works; voice items need a human mic.
2. ai-translate-field signed-in 200-path: verify live once signed-in browser session available (callers use invoke() which attaches JWT).
3. Deferred (fast-follow candidates): Gemini sessionResumption + uses:3 (Q1), 4-min segment rotation, in-place polish undo, hands-free send, WPM stat, dual-language send, org glossary, UserPreferencesPanel UI for the new prefs (currently banner-inline + jsonb only).
4. Concurrent session active in this checkout (foreign ChangeCockpitSections.tsx edit) — worktree law applies.
