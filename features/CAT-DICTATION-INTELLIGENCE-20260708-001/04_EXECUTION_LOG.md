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

## S2 ✅ b7bc6a2 — spoken structure (commands/ordinal lists/snippet expansion; fn v22 auto-paragraphs on ≥1.5s gaps; PM-safe multiline insertion with no-double-insert guarantee)
## S3 ✅ b8278c9 — edit_ratio telemetry (migration applied) + scripts/voice-golden.mjs (caught real تذكرة word-sense issue on first run; ALL GREEN after glossary)
## S4 ✅ 937395e — /profile Voice tab (dictionary list/toggle/delete/add, snippets manager, sound toggle); deterministic misheard→term correction on every result
## S5 ✅ 7269bb992 — SpeculativeTranslator (translate-while-speaking, exact-match instant claim); SPIKE CONFIRMED: gemini-3.5-live-translate-preview outputTranscription = LIVE ENGLISH during Arabic speech (catyflow-token v12 whitelisted override)
## S6 ✅ — conversation-context injection (getConversationContext DOM util + data-msg-body on cv2 bubbles; context param on ai-translate-field v20, rides speculative + shortcut lanes; live-proved 4.6s w/ context accepted) + per-segment confidence (fn v23 returns lowSegments; capsule ready/review marks shaky spans warning-dotted). Ghost-level per-word marking physically unavailable on live lane (no confidences from Gemini Live) — drift-logged adaptation. Honest note: pronoun→name substitution from context is model-discretionary (kept "him" in probe); tone/reference context still flows.
## Post-S6 regression: golden corpus ALL GREEN on v23 (groq, 0.5-2.2s).

## GOAL CLOSE-OUT (2026-07-08 /goal): ALL SLICES S1-S6 DELIVERED + research loop 2 complete (TOP-10 in 12_AGENT_OUTPUTS.md). Premium-route verdict: the 2026 field (Wispr/Aqua/Typeless) converged on screen-context+tone+intent-collapse+command-mode; NONE handles Arabic seriously, none is work-item-native — our lane ("Wispr Flow for Arabic enterprise") is empty and we now hold: bilingual pipeline (proven), structure inference, entity normalization, visible learning dictionary, measurable accuracy flywheel, speculative translation, and a CONFIRMED live-translate capability nobody ships. NEXT WAVE (approved backlog, ranked): #1 bilingual self-correction/intent collapse, #2 screen-entity context biasing (own-DOM advantage), #3 structured work-item modes (bug-report/standup scaffolds), #8 in-dictation agentic actions, #6 admin bilingual glossary, live-translate lane integration (outputTranscription consumer), Scribe v2/Munsit A/B judged by edit_ratio.

## S7 — bilingual self-correction / intent collapse (2026-07-08) ✅
- catyflow-clean v8: full INTENT COLLAPSE ruleset (last decision wins; superseded values never appear; "scratch that"/"خلاص لا" cancels the clause; restarts collapse; markers in EITHER language apply cross-language; markers removed; keep-if-in-doubt). Also fixed audit to ai_usage_log (was ai_governance_audit_log — 2026-07-04 sweep escapee).
- Client shouldCleanup gate: more correction markers (EN+AR) + repeated-word restart detector.
- **TRANSLATION GUARANTEE (real gap found by the harness)**: Whisper /translations occasionally passes Arabic through untranslated; batch results now get a defensive re-translate when Arabic reaches handleResult (context rides along). Harness mirrors it.
- Golden suite +2 spoken-correction cases (EN + AR), chained through catyflow-clean. ALL GREEN:
  EN: "Send the report on Thursday. No wait, make that Wednesday." → "Send the report on Wednesday. Also tell the team." (Thursday + marker gone)
  AR: "أرسل التقرير يوم الخميس، لا انتظر، خليه يوم الأربعاء" → "Send the report on Wednesday… inform the team." (Thursday gone)
- Known residual: the AR marker occasionally survives as literal "Don't wait" (translation renders it before cleanup sees it) — prompt iteration candidate, superseded-value contract holds regardless.
