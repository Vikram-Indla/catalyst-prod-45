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
