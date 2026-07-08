# CAT-DICTATION-INTELLIGENCE-20260708-001 — Objective

## What we are building
Premium dictation intelligence on top of the (now working) CatyFlow AR/EN pipeline: the 8-item blueprint Vikram approved 2026-07-08 — prompt-biased recognition, structure inference, entity normalization, visible dictionary, quality flywheel, speculative translate, context injection, per-word confidence.

## Why
Post-Arabic-fix, transcription is accurate but generic. Premium = output that knows OUR people (Sikander not "sick under"), OUR tickets (CAT-1234 not "cat twelve thirty four"), OUR structure (spoken lists → real lists), and improves itself from user corrections.

## Slice map (approved order)
- **S1 (this slice, "go" 2026-07-08): #1 Whisper prompt biasing on the batch lane + #3 ticket-key entity normalization.**
- S2: spoken-structure commands (AR+EN) + auto-paragraphing + target-aware templates
- S3: edit-ratio quality flywheel + golden-corpus regression harness
- S4: visible dictionary UI + snippets + deterministic misheard-map post-correction
- S5: speculative prefix translation; spike gemini-3.5-live-translate-preview
- S6: conversation-context injection; per-word confidence in ghost

## Acceptance (S1)
- [ ] voice-transcribe accepts `vocabulary[]`, feeds Whisper `prompt` (capped); live probe returns provider=groq 200 with vocabulary sent.
- [ ] "cat 1234"/"CAT 1234"/"cat dash 1234" in final text → "CAT-1234" for KNOWN project keys only ("meeting 2024" untouched); applies on both batch and translated-shortcut paths.
- [ ] Unit tests for normalization; vitest/tsc/gates green.

## Non-scope (S1)
Arabic spoken-numeral → digit conversion (S2/S3), @mention tokens, dates/times.

## Target
src/features/voice-flow/ (provider, dictionary), new normalizeEntities.ts, supabase/functions/voice-transcribe.
