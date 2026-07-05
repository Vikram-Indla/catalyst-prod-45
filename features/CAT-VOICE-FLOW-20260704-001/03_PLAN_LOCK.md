# PLAN LOCK — CAT-VOICE-FLOW-20260704-001 "CatyFlow" (v2 FINAL DRAFT, awaiting approval)

> Vikram directives 2026-07-04 (binding): FULL Wispr-grade, no deferrals. REPLACE the existing voice AI completely. Live on-screen transcript while speaking (non-negotiable), Arabic + English, formal enterprise look, ≥15-minute dictation sessions, magenta Catalyst AI color, hooks through the OpenAI/Gemini AI gateway, Catalyst-native name, match Wispr's published performance metrics, scale 500 users.

## Name
**CatyFlow** (recommended — Caty brand + speech flow). Alternatives: CatyVoice, Catalyst Dictate.

## What replaces what
ONE engine replaces all three existing systems (hard requirement):
- `src/features/voice-flow/*` → rebuilt as `src/features/catyflow/` (engine, capsule, hotkeys, targeting retained where sound; capture + provider + UX replaced)
- `src/lib/voiceToText/useVoiceToText.ts` (Web Speech Ctrl-hold) → thin wrapper over CatyFlow, then removed
- `Description/hooks/useMicVoiceRecorder.ts` + `MicRecordingBar` → CatyFlow-powered, same UX affordance
- `supabase/functions/voice-transcribe` → retained ONLY as batch fallback tier

## Architecture (from adversarial blueprint research, citations in session)
1. **Capture**: AudioWorklet → linear16 PCM 16kHz (NOT MediaRecorder — Safari container roulette, reconnect poison, 100–250ms latency floor). 10s ring buffer for reconnect replay. Mic pre-warm: AudioContext + worklet loaded at idle; getUserMedia + provider connect in parallel on hotkey (~100–300ms).
2. **ASR (via AI gateway)**: **OpenAI Realtime transcription (`gpt-4o-transcribe` / `-mini`) over WebRTC**, ephemeral client secret minted by new edge fn `catyflow-token` (JWT-verified, points at the gateway). Streaming partial deltas → live transcript. **Arabic + English with auto language detection** (Whisper-family Arabic strength; Deepgram Nova-3 rejected — no Arabic streaming). Fallbacks: Groq `whisper-large-v3` batch (existing fn; Arabic-strong) → Web Speech (flagged, EN only).
3. **Live transcript UX (the non-negotiable)**: two synchronized renderings —
   a. **Live caption panel**: the capsule expands to a formal transcript card showing every word as spoken (auto **RTL layout + Arabic typography** when Arabic detected; `--ds-*` styling; no toy visuals).
   b. **Ghost text at caret**: interim words in `--ds-text-subtlest`; ProseMirror widget decorations for rich editors; mirror-div overlay for textarea/input; Range-rect overlay for foreign contenteditable. User types mid-utterance → commit raw finals, never fight the caret.
4. **Cleanup pass (via AI gateway)**: on `speech_final`/utterance-end → `catyflow-clean` edge fn → Gemini 2.5 Flash-Lite or GPT-4.1-mini-class through the gateway. Single-shot, temp 0.2. Rules: fillers, backtracks ("three… no wait five" → five), punctuation, lists, register profile, dictionary, preceding-200-chars context. **Race a 700ms deadline — late result discarded, raw committed.** Skip-cleanup heuristics (<4 words, no filler regex hits). Arabic cleanup stays Arabic; optional translate action reuses `ai-translate-field`.
5. **Session length**: ≥15 min continuous — provider session rotation (re-mint token, overlap-connect, splice on utterance boundary), ring-buffer bridging; config `maxDurationMs` 180_000 → 900_000+; KeepAlive handling.
6. **Register profiles**: `data-dictation-style` attr on canonical inputs + route fallback: `comment | description | brd-page | title | chat | formal`. User formality setting (casual/default/formal) in `dictation_settings`.
7. **Personal dictionary**: `dictation_dictionary` (term, misheard_as[], source manual|learned, occurrences). Learn from type-over corrections (word-diff on blur, edit-distance ≤40%, proper-noun/camelCase filter, promote after 2 occurrences). Fed to ASR prompt bias + cleanup prompt.
8. **Command mode**: selection non-empty at hotkey = command (Wispr model); capsule shows instruction state; `catyflow-clean` mode:'command' rewrites selection in one undo step; ~1.5s budget.
9. **CTA**: focus-following mic built on `CatyIconCTA`/`CatyPulseIcon` magenta + double-space hands-free + `⌥Space` hold PTT; sensitive-field deny-list retained.

## Performance targets (Wispr-published parity — acceptance criteria)
- Partial word on screen: **<300ms** from speech
- Cleaned text committed: **<700ms p99** after utterance end (Wispr's Baseten-published bar)
- Session start (hotkey → listening): **<400ms** (pre-warm path)
- 15-min session: zero transcript loss across ≥1 provider rotation
- 500-user scale: ASR is WebRTC direct-to-provider (zero relay load); edge fns stateless token/clean only; audio never transits Supabase.

## Data
`dictation_settings` (extend `voice_dictation_settings`), `dictation_dictionary` (new, RLS owner), sessions audit retained. No audio stored. Staging first.

## Slices (≤2h each)
| # | Slice |
|---|---|
| V0 | **Spike gate**: WebRTC realtime session via gateway; Arabic live partials verified on-screen incl. RTL; rotation across 2 sessions; worklet on Safari/Firefox (48k downsample). Fail → Gemini Live API lane review |
| V1 | `catyflow-token` + `catyflow-clean` edge fns (gateway-pointed, register prompts, audit rows) |
| V2 | AudioWorklet capture + ring buffer + pre-warm (replaces AudioCaptureService) |
| V3 | Provider abstraction (realtime / groq-batch / web-speech) + circuit breaker |
| V4 | Live caption panel (formal, RTL-aware) + capsule states |
| V5 | Ghost renderers: textarea mirror + ProseMirror decorations + contenteditable overlay |
| V6 | Cleanup pipeline client-side (race, skip heuristics, show-original/undo) |
| V7 | 15-min session rotation + reconnect replay |
| V8 | Register profiles + `data-dictation-style` tagging of canonical inputs |
| V9 | Dictionary (schema, learn-from-edits, prompt feeding, settings UI) |
| V10 | Command mode |
| V11 | Replace-and-delete legacy: voice-flow → catyflow cutover, useVoiceToText/useMicVoiceRecorder rewired, flags flipped |
| V12 | Rollout to top-15 surfaces + BlockNote Pages editor adapter + validation evidence + screenshots |

## Cost (500-user org, ~20 heavy dictators × 60 min/day)
ASR ~$0.006–0.017/min via gateway (model-dependent) + cleanup ≈$6–15/mo total → ~$150–450/mo depending on realtime tier; Groq batch fallback pennies. Well under Wispr retail ($15/user/mo).

## Stop conditions
- V0 spike fails Arabic live-partial quality → stop, evaluate Gemini Live lane before any build.
- Any transcript loss in 15-min soak → stop.
- Cleanup p99 >700ms on staging → model/gateway review, no silent degrade.
- Regression to any existing dictation surface during cutover → RED FLAG.

## Validation
tsc baseline, lint:colors:gate, audit:ads:gate, Chrome MCP DOM probes (ghost text in textarea/Tiptap/BlockNote/Atlaskit targets, Arabic RTL captions, commit/cancel, sensitive-field block), latency measurements logged to `06_VALIDATION_EVIDENCE.md`, screenshot checklist incl. dark mode.
