# CAT-DICTATION-INTELLIGENCE-20260708-001 — Execution Log

> Running log of all actions, decisions, and changes made during implementation.
> Append entries — never delete.

---

## Log entries

[Entries will be appended during execution]

## S1 — prompt biasing + entity normalization (2026-07-08) ✅
- voice-transcribe v21: accepts vocabulary[] → Whisper `prompt` ("Glossary: …", cap 60 terms/800 chars) on /translations.
- Provider batch lane now sends getActiveTerms() (personal + workspace, same as live lane).
- normalizeEntities.ts: known-project-keys-only, "cat 1234"/"cat dash 1234"/"bau-42" → CAT-1234; word-bounded; cached pattern; applied in handleResult before polish (covers batch + shortcut + command paths). getProjectKeys() added to dictionary.ts (5-min cache).
- Proof (live, cyij): audio "Please ask Sikander to review cat 1234…" + vocabulary → groq 2.2s → "…Sikander to review CAT 1234…" → normalizer → "…CAT-1234…". Arabic regression: groq 0.8s, correct English. 8 unit tests; vitest 66/66; tsc 0; gates green.

## S5 — speculative translate + live-translate SPIKE (2026-07-08) ✅
- SpeculativeTranslator: fires AR→EN on the growing live transcript (throttle 5s / 24-char growth, one in flight), exact-match claim at stop → instant result; miss → normal call; disposed on reset. Wired in provider onLive + shortcut branch.
- catyflow-token v12: whitelisted body.model_override = gemini-3.5-live-translate-preview (JWT-gated).
- **SPIKE RESULT — CONFIRMED**: streamed Arabic PCM to the live-translate preview → `outputTranscription` returned LIVE ENGLISH ("You want to update the project ticket before the meeting on Thursday…") while inputTranscription stayed Arabic; model also emits translated English AUDIO (~1.1MB in test — simultaneous interpretation possible). Full integration = new consumption lane reading outputTranscription (client currently reads inputTranscription only) — flagged as the flagship fast-follow.
