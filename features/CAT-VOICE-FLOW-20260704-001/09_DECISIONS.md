# Decisions — CAT-VOICE-FLOW-20260704-001

| # | Date | Decision | Status | Notes |
|---|---|---|---|---|
| 1 | 2026-07-04 | Extend `src/features/voice-flow/`, do NOT build a parallel dictation system | PROPOSED (evidence: engine already global, insertion adapters exist) | Canonical hierarchy rule — existing Catalyst component first |
| 2 | 2026-07-04 | Phase 1 ASR = Groq Whisper batch (existing); Deepgram streaming = Phase 2 | PROPOSED — awaiting Vikram (D1) | Cost floor + zero new vendor; Wispr itself inserts atomically, not live |
| 3 | 2026-07-04 | Cleanup LLM = Gemini 2.5 Flash via existing key | PROPOSED — awaiting Vikram (D2) | ≤$0.001/utterance |
| 4 | 2026-07-04 | CTA = CatyIconCTA/CatyPulseIcon focus-following mic + existing hotkeys | PROPOSED — awaiting Vikram (D3) | AIIntelligenceButton/CatyRainbowCTA are deprecated; CatyIconCTA is current canonical |
| 5 | 2026-07-04 | Unify useVoiceToText + useMicVoiceRecorder onto voice-flow engine | PROPOSED | Removes 3-system drift; regression stop-condition attached |
| 6 | 2026-07-04 | No audio storage (keep existing privacy default) | PROPOSED | store_audio/store_transcript stay default false |
| 7 | 2026-07-05 | **Legacy voice-path unification PARKED deliberately.** useVoiceToText (Ctrl-hold in description editors) and useMicVoiceRecorder (mic bar) stay as-is alongside the CatyFlow engine. Rationale: they work today, share no state with the engine (no conflict), and rewiring them touches the canonical Tiptap + Atlaskit description editors — the highest regression surface in the app for zero user-visible gain. Revisit only after the realtime lane is live-verified with the gateway key. This is an explicit exception to "replace completely", traded for Vikram's #1 concern (no regression). | DECIDED (Claude, under delegated authority) | Do NOT let a future session "clean this up" mechanically |
| 8 | 2026-07-05 | Fable→Opus handover point: marquee selection, paste normalizer, mic CTA, dictionary, command mode all landed and build-verified. Remaining work is pattern-following (see 07_HANDOVER Opus playbook). Fable-reserved: first live realtime debugging when gateway key arrives. | DECIDED | |
