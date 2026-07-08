# CAT-VOICE-UX-PREMIUM-20260708-001 — Karpathy Loop Log

> Hypothesis → Experiment → Measure → Keep/Discard → Log.

---

## Loop entries

### K1 — "Realtime caption lane is dead" (2026-07-08, discovery)
- Hypothesis: no live words because catyflow-token mint fails.
- Experiment: cyij edge-function logs + RealtimeTranscriber.ts code read.
- Measure: catyflow-token returns 200 (multiple in 24h). Code: `start()` resolves true on bare WS `open` (never awaits setupComplete); `onError` callback never passed by provider.
- Verdict: DISCARD mint hypothesis; KEEP root cause = missing setup gate + silent error path. → AD-3.

### K2 — "Transcription is slow" (2026-07-08)
- Hypothesis: batch lane latency dominates.
- Experiment: edge-function logs.
- Measure: voice-transcribe POST 200 at 10,436ms; one 422 at 5,599ms.
- Verdict: KEEP. Realtime-lane-primary + surface failures. Baseline recorded for S6a instrumentation.

### K3 — "422 is a payload/mime bug" (2026-07-08)
- Hypothesis: 422 from oversized/malformed audio.
- Experiment: read all 4xx branches of voice-transcribe.
- Measure: only 422 = no_speech; size errors are 400/413. Trigger chain: 1.8s silence fuse auto-stops pre-speech → silent >1KB webm → Groq empty → 422.
- Verdict: DISCARD payload hypothesis; KEEP: deleting silenceAutoStopMs removes the main 422 generator; client maps 422 to calm non-error.

### K4 — "Wispr premium = live streaming words" (2026-07-08, research)
- Hypothesis: gold standard streams live words.
- Experiment: two independent Wispr reviews + docs.
- Measure: Wispr is batch-commit; premium = state clarity + no silence auto-stop (20-min cap) + insertion reliability + visible AI-polish diff. Live inline words = Apple/Google/Otter lineage with stable-prefix.
- Verdict: KEEP hybrid: live inline words (stable prefix) + Wispr state model + polish diff.

### K5 — "Translate icon belongs in composer" (2026-07-08, research)
- Hypothesis: composer translate icon is a normal pattern.
- Experiment: Gmail/Chrome/Teams/Outlook/LinkedIn/WhatsApp/Telegram/Messenger/Zendesk survey.
- Measure: zero products show translate on empty input; write-side translate only as conversation-scoped mode w/ preview (Zendesk); ع/A glyph = transliteration convention, not translation.
- Verdict: DISCARD composer icon; KEEP read-side link + write-side mode chip + Always/Ask/Never.

### K6 — "Settings need voice_dictation_settings table" (2026-07-08)
- Hypothesis: migration 20260620000003's settings table is the prefs home.
- Experiment: live cyij probe (to_regclass) vs migration file vs ledger.
- Measure: table DOES NOT EXIST live; sessions table exists but RLS OFF with zero policies (drift — ledger row present). user_preferences (user_id, scope, value jsonb) exists with clean RLS.
- Verdict: DISCARD settings table (supersede); KEEP user_preferences scopes + RLS repair migration (new version). Overrides Implementation Planner's S4b ALTER (logged 08_DRIFT_LOG).

### K7 — "AskPanel uses voice-flow" (2026-07-08)
- Hypothesis (mine, from grep): AskPanel imports voice-flow.
- Experiment: screen-discovery agent read the file.
- Measure: only `data-voice-flow="off"` opt-out; zero imports.
- Verdict: DISCARD. AskPanel excluded by default under opt-in allowlist.

### K8 — "Allowlist needs a registry" (2026-07-08)
- Hypothesis: per-surface registration requires provider refactor to context tree.
- Experiment: trace CTA + hotkey code paths.
- Measure: everything routes through getActiveTextTarget (one function); provider is childless; hotkeys need no registration.
- Verdict: KEEP minimal design — marker-based opt-in for visible buttons only; hotkeys stay global per AD-1.
