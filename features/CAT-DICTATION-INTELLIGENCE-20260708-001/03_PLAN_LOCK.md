# Plan Lock — CAT-DICTATION-INTELLIGENCE-20260708-001

> Status: ACTIVE — scope + slice order approved by Vikram in-session 2026-07-08
> ("go" on blueprint items #1+#3 as slice one). Discovery INHERITED from
> CAT-VOICE-UX-PREMIUM-20260708-001 (9 agents, same module, same files, this
> same day) — re-running discovery would be waste; drift-logged.

## S1 files
- Modify: supabase/functions/voice-transcribe/index.ts (vocabulary→prompt),
  src/features/voice-flow/VoiceFlowProvider.tsx (send vocabulary; apply normalization),
  src/features/voice-flow/dictionary.ts (expose project keys separately).
- New: src/features/voice-flow/normalizeEntities.ts + __tests__/normalizeEntities.test.ts.
- Forbidden: RealtimeTranscriber.ts, capsule/mic components, chat components, other edge fns.

## Rules
Whisper prompt ≤ ~200 tokens (cap terms); normalization is deterministic + known-keys-only (zero-assumption: never invent a key); staging cyij only; validation = vitest voice-flow + tsc + lint:colors:gate + build + live batch probe.

## Stop conditions
Any regression in the 4 fixed Arabic paths → stop. One correction loop per slice.

## FULL-DELIVERY DIRECTIVE (2026-07-08 /goal)
Vikram: deliver ALL slices S2-S6 + one more market-research loop + enhancement blueprint. Execution authorized end-to-end.

## S2 — spoken structure (design locked)
- fn: segment-gap paragraphs — insert \n\n between whisper segments when gap ≥1.5s (server-side, verbose_json already has timestamps).
- client structureText.ts (pure): spoken commands consumed post-cleanup ("new line","new paragraph","bullet point","next point" — Arabic speech arrives as these English phrases via /translations, so English-side parsing covers both languages); ordinal enumeration (First…Second…≥2) → numbered list; kind==='input' strips newlines.
- insertTextIntoTarget: CE multiline via insertText/insertParagraph line loop (Tiptap input rules may auto-listify "- " — bonus).
- Order in handleResult: normalize → cleanup → structure (commands survive cleanup; drift-log if cleanup mangles).
## S3 — quality flywheel
- Migration: voice_dictation_sessions ADD edit_ratio numeric.
- armCorrectionLearner: also compute editDistance ratio committed→final, update session row (sessionId param).
- scripts/voice-golden.mjs: say-synthesized corpus (AR+EN+mixed) → voice-transcribe → keyword assertions; manual/local (needs mac say + JWT); doc in feature folder.
## S4 — dictionary surface + deterministic correction
- getMisheardMap() in dictionary.ts; handleResult post-normalize: word-boundary replace known misheard→term.
- DictionaryPanel.tsx (ADS: DynamicTable-lite/list + Toggle + delete + add) mounted inside UserPreferencesPanel; snippets scope 'voice_snippets' in user_preferences ({trigger,expansion}[]), expansion applied in structure pass ("insert <trigger>").
## S5 — speculative translation + live-translate spike
- SpeculativeTranslator: while listening & Arabic partials, refresh full-transcript translation every ~4s (latest wins); at stop, exact-match → instant, else fresh call; parallelize with capture.stop().
- catyflow-token: whitelisted body.model_override ∈ {gemini-3.5-live-translate-preview} (JWT-gated); node spike test: Arabic PCM → expect ENGLISH inputTranscription. Report.
## S6 — context + confidence
- getConversationContext(targetEl): last 2 message texts from DOM (.cc-msg__text / cv2 bubbles); passed to ai-translate-field (new optional context param in prompt) + catyflow-clean.
- fn returns segments[{text, low}] (avg_logprob<-0.5); review/ready path marks low segments (ghost-level per-word confidence physically unavailable on live lane — drift-logged adaptation).
