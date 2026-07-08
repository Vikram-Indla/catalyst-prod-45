# CAT-VOICE-UX-PREMIUM-20260708-001 — Drift Log

> All drift events, rebaseline decisions, superseded Plan Locks.
> Append — never delete.

---

## Drift entries

[Entries will be appended if drift is detected]

## 2026-07-08 — Lock-time drift entries
1. Implementation Planner proposed `ALTER TABLE voice_dictation_settings` (S4b) — table does NOT exist on cyij (migration 20260620000003 marked-applied-not-executed drift). Superseded: prefs → user_preferences scopes. No ALTER.
2. S2b deletes DictationCTA (incl. ع/A hover translate) before S4 ships replacement — approved gap (~2 slices); current ع/A is write-destructive with no empty-field gate, keeping it is worse.
3. voice_dictation_sessions RLS OFF live despite ledger row — repair migration in S0 with NEW version number.
4. S2b coachmark: @atlaskit/onboarding Spotlight (locked) substituted with @atlaskit/popup — Spotlight requires SpotlightManager at app root (invasive); Popup is canonical and equivalent for a single first-run tip.
5. S2a addition: RichTextEditor hideMicButton prop — chat composer had a SECOND mic (toolbar voiceToText, native-EN engine). One-mic-per-surface enforced by suppressing it there only.
6. AskPanel mic skipped (Plan Lock said optional): data-voice-flow="off" stands — Enter both commits dictation and submits Ask; conflict unresolved this slice.
7. Canonical Screen Discovery mapped /chat main to MessageComposer — live probe shows chat-v2 ChatV2Shell/Composer. Corrected in-flight (commit c7cc3aa); MessageComposer wiring still valid for ThreadPanel/CatyPanel/MessageFeed.
8. Gemini Live sessionResumption/goAway + catyflow-token uses:3 deferred (Q1) — long sessions (>~10min) may lose the realtime lane; segment-rotation batch fallback NOT yet implemented either (AD-4 rider) — 15-min single blob ≈2.4-4.8MB base64, under limits but untested at max.
9. Polish undo = Copy-raw toast, not in-place undo (needs tracked-offset replace, deferred with ghost-only D4 rendering).
