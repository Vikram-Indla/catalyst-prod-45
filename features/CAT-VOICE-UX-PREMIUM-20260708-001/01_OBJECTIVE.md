# CAT-VOICE-UX-PREMIUM-20260708-001 — Objective

## Feature name
voice-ux-premium

## What we are building
Rebuild CatyFlow dictation + translate to premium standard: composer-anchored morphing mic (key surfaces only), live words streaming into the composer, no silence auto-stop, and translate rearchitected into read-side message links + write-side AR→EN mode with preview.

## Why
User-reported failures on /chat (2026-07-08), all code-verified:

1. Translate (`ع/A`) icon appears on EMPTY text boxes — no content/language gate (`DictationCTA.tsx:101`).
2. Magenta mic vanishes on click (`sessionActive → return null`, `DictationCTA.tsx:146`); capsule spawns elsewhere → no spatial continuity.
3. No indicator of purpose — bare glyphs, tooltip-only labeling (NN/g violation), invisible on touch.
4. No live transcript — Gemini Live realtime lane fails silently → `partialText` never set → "Listening…" with no words. Caption overlay never streams into composer.
5. Slow — batch lane measured 10.4s (voice-transcribe logs) + one 422 in 24h.
6. No thinking pause — `silenceAutoStopMs: 1800` force-stops after 1.8s silence; user needs ≥15s. Wispr benchmark: NO silence auto-stop, 20-min cap.
7. Icon noise — hover cluster attaches to every input app-wide.

Blind spots: ع/A is write-destructive (no preview/undo); auto-commit inserts unseen text; countdown timer reads as deadline; no Always/Ask/Never setting; RTL hygiene gaps (dir="auto", bdi, Arabic font stack).

## Acceptance criteria
- [ ] Dictation in /chat shows live words inline in the composer (grey provisional → solid), verified by screenshot.
- [ ] A 15-second silent thinking pause does NOT end the session; explicit stop (click/Space) and Esc cancel work; pause/resume available.
- [ ] Mic control never unmounts mid-session — one anchor morphs idle→listening→stop→processing.
- [ ] Translate affordance never renders on an empty field; write-side translate is a mode chip with preview-before-apply, not a blind overwrite.
- [ ] Read-side "See translation" link on foreign-language chat messages with "See original" reversal.
- [ ] Realtime-lane failure states surfaced ("live captions unavailable — will transcribe on stop"), never silent.
- [ ] Composer + message bubbles use dir="auto"; injected fragments wrapped in <bdi>; Arabic font stack applied.
- [ ] Premium delta: mic open/close sound ping, composer listening glow, count-up timer + word count, workspace vocabulary injection, visible polish diff/undo, never-lose-words retry, live language-detect chip.
- [ ] Zero new ADS color violations (lint:colors gate); tsc + build green; screenshot signoff per slice.

## Non-scope
- No new ASR vendor (keep Gemini Live + Groq/Gemini batch lanes).
- No mobile-native work; no huddle/WebRTC changes.
- Fast-follow (separate feature): hands-free "send" voice command, WPM delight stat, dual-language send, org glossary.

## Target surface
- Primary: /chat composer (`src/components/chat/ChatMainView.tsx` dock/main composer)
- Secondary: work-item description/comment editors, DocIntel AskPanel (`src/modules/docintel/components/AskPanel.tsx`)
- Engine: `src/features/voice-flow/*` (Provider, DictationCTA, VoiceFloatingCapsule, AudioCaptureService, RealtimeTranscriber, config)
- Edge fns: voice-transcribe, catyflow-token, catyflow-clean, ai-translate-field

## Stakeholders
- Vikram: Product Owner (approved scope 2026-07-08)
- Claude Code: Implementation
