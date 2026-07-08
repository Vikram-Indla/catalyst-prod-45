# CAT-VOICE-UX-PREMIUM-20260708-001 — Execution Log

> Running log of all actions, decisions, and changes made during implementation.
> Append entries — never delete.

---

## Log entries

[Entries will be appended during execution]

## S0 — Security repair (2026-07-08) ✅
- Migration 20260708200000_voice_sessions_rls_repair.sql written + applied to cyij via MCP apply_migration (project URL asserted cyijbdeuehohvhnsywig first).
- Verified live: relrowsecurity=true; 4 policies present (owner select/insert/update + admin select); anon grants revoked.
- ai-translate-field: JWT gate added (getUser pattern), deployed v15 to cyij.
- Probes: POST no-auth → 401; POST anon-key-as-bearer → 401. Signed-in 200 pending S4a browser sweep (invoke() attaches session JWT).

## S1 — Session control (2026-07-08) ✅
- silenceAutoStopMs DELETED (config + AudioCaptureService silence timer/amplitude poll removed). capWarningMs=840000 added.
- Pause/resume: MediaRecorder.pause/resume + pausedAccum accounting (durationMs + 15-min cap exclude paused time); RealtimeTranscriber.setPaused gates PCM frames (no audioStreamEnd); 'paused' VoiceStatus; capsule paused state (frozen bars, ▶ resume, ✓ finish, ✕ cancel); canPause=false on native-EN lane.
- Count-up timer (elapsedMs) replaces countdown; cap warning label at 14:00.
- Space removed from commit keys (Plan Lock D3); Enter commits; capsule label "(Enter to finish)"; explicit ✓ finish button in listening state.
- Validation: vitest 39/39 PASS; tsc 0 errors; lint:colors:gate 0=0; audit:ads:gate all categories at baseline; build passes.

## S2a+S2b — Composer-anchored mic + hover CTA retirement (2026-07-08) ✅
- Context API: activate/pause/resume/canPause/activeElement/enabled exposed via useVoiceFlow.
- New VoiceMicButton (feature-owned, IconButton-based): idle mic → arming spinner → listening stop (magenta token, data-voice-status attr) → processing spinner; never unmounts. First-run coachmark via @atlaskit/popup (localStorage catalyst.voice.coachmark.v1) — Spotlight substituted with Popup: SpotlightManager would need app-root mounting (drift-logged).
- MessageComposer: dead onMic prop removed; VoiceMicButton mounted in footer targeting Tiptap editor DOM (via onEditorReady) — lights up chat main, ThreadPanel, dock CatyPanel, MessageFeed.
- One-mic rule: RichTextEditor gains hideMicButton prop; chat composer suppresses the toolbar voiceToText mic (that engine is native-EN only; CatyFlow is the AR→EN premium lane). Toolbar mic untouched elsewhere (Description/comments).
- DictationCTA.tsx DELETED (hover cluster + destructive ع/A gone; hotkeys stay global). AskPanel left voice-off (Enter-submit conflict; decision logged).
- Validation: tsc 0; vitest 39/39; both ADS gates baseline; build passes.

## S3a — Live partials + lane health (2026-07-08) ✅ commit 941bf8c
- livePartials.ts stable/provisional splitter (LCP + word-boundary, monotonic stable) — 10 unit tests incl. Arabic + mixed bidi.
- RealtimeTranscriber health machine: 3s setupComplete gate (root-cause fix for silent lane: start() resolved on bare WS open), delta watchdog (speech-but-no-deltas 8s → degraded), onState/onError propagated; capsule shows "live captions unavailable — will transcribe on stop".
- gemini sessionResumption/goAway deferred (Q1) — batch fallback covers long sessions; drift-logged.

## S3b — Inline ghost transcript (2026-07-08) ✅
- ComposerGhostText overlay INSIDE the target field: stable = var(--ds-text-subtle), provisional = var(--ds-text-subtlest) italic, magenta caret, dir="auto" + <bdi> + unicode-bidi plaintext. Overlay-only (Plan Lock D4): nothing written into the field until commit — undo/PM/cancel-restore untouched.
- Detached vf-caption panel + cursor CSS deleted (~10 ignore-line hatches gone).
- Validation: tsc 0; vitest 49/49; lint:colors now reports repo color-pure.

## S4a — Read-side See translation (2026-07-08) ✅ commit b2aece4
- detectScript.ts shared gate (Arabic block incl. Urdu; min-length 4); MessageTranslation under .cc-msg__text; react-query cache per messageId; toggle Hide/See; never mutates message. 9 unit tests.

## S4b — Write-side AR→EN mode (2026-07-08) ✅
- ComposerTranslateBanner (conditional on live Arabic content + mode≠never), arm toggle, Always/Never inline; useTranslateSettings → user_preferences scope 'translate' upsert (D1 honored, no DDL).
- handleSave intercepts armed Arabic sends → ModalDialog preview (original + English, dir-auto/bdi-safe) → Send English / Send original / Keep editing; translate failure keeps Send original available.
- Validation: tsc 0, vitest 58/58, gates baseline, build green.

## S6b — Premium delta (2026-07-08) ✅ commit 7256a4d
- soundPing.ts (rising/falling, OFF-default, user_preferences voice_flow scope); static magenta listening ring; getWorkspaceTerms merge (resource_inventory names + project keys/names, personal-first, cap 80); polish transparency toast w/ Copy raw; language Lozenge incl live "AR → EN" on Arabic partials; vf-lang-badge hand-rolled CSS deleted. Ratchets DOWN: tokens 22475→22469, fallback-hex 4380→4379.

## S2/S4 completion — chat-v2 live surface (2026-07-08) ✅ commit c7cc3aa
- LIVE-SURFACE GAP: /chat main = chat-v2 (cv2-composer-shell), not MessageComposer. Discovery agent's surface map was wrong for 1a (drift-logged).
- chat-v2 wired: ComposerFooter voiceSlot hosts VoiceMicButton (native-SR MicFooterBtn retired there); magenta ring on shell; write-side banner + shared TranslatePreviewDialog (extracted, MessageComposer refactored to use it); MessageTranslation in MessageBubble.
- BISECT: conversation-open flakiness on /chat reproduces with pristine HEAD chat-v2 (working-tree revert test) → pre-existing/environmental, NOT this feature. Shared checkout has a concurrent session (foreign edit to ChangeCockpitSections.tsx present).

## Validation status
- Automated: tsc 0 across all slices; vitest 58/58 (voice-flow 49 + i18n 9); lint:colors:gate + audit:ads:gate + fallback-hex gate green with baselines RATCHETED DOWN; build green; RLS + JWT probes on cyij raw-logged in this file (S0).
- Browser probes run on localhost:8080/chat: B1 hover-cluster kill confirmed (0 [data-catyflow-cta] nodes app-wide); NO translate affordance on empty state confirmed; old "Record voice" absent post-wiring pending conversation-open.
- BLOCKED: full 10_SCREENSHOT_CHECKLIST sweep — /chat conversation-open is flaky in the shared dev environment (fails on pristine HEAD too); voice-dependent items (live captions, 15s pause, AR dictation) additionally need a human mic. Sweep to be run by Vikram or a fresh session once conversation-open works.

## HOTFIX — Arabic recognition failure (2026-07-08 demo escalation)
Three root causes found, all live-probed with synthesized Arabic audio (macOS say -v Majed) through the REAL pipeline via a throwaway staging test user (created via pgcrypto, deleted after):

1. **Realtime shortcut skipped translation**: Gemini Live transcribes speech in its SPOKEN language; the shortcut inserted raw Arabic (or garbage) as the final "English" result and never hit the translating batch lane. FIXED: shortcut is language-aware — Latin transcript = fast path; Arabic transcript → ai-translate-field text→EN (proven 2.6s) → insert; failure → batch audio fallback (blob now always collected).
2. **'en' session pinning**: any English-detected result pinned the page session to native SpeechRecognition en-US — Arabic afterwards = phonetic garbage. FIXED: native-SR path + get/setPreferredLanguage DELETED; one language-agnostic engine.
3. **Live caption lane NEVER worked (3 stacked faults)**: (a) wrong WS endpoint — ephemeral tokens are only honoured by BidiGenerateContentConstrained; plain BidiGenerateContent → 1008 "unregistered callers" every time; (b) token name must be the FULL "auth_tokens/AQ.…" resource name (fn stripped the prefix); (c) locked model gemini-2.0-flash-live-001 is RETIRED ("not found for API version v1main"). Also: on Constrained, the client must send an EMPTY first setup message (locked config is server-applied). Client + fn source FIXED; fn v6 (endpoint+token-name fixes) deployed; the model-default redeploy is BLOCKED by the cyij function cap (PaymentRequired — vf-model-probe diagnostic consumed the last slot; both stored sbp_ PATs revoked, CLI/Management API 401).
   **UNBLOCK (1 min, Vikram): Supabase dashboard → cyij → Edge Functions → Secrets → add `CATYFLOW_LIVE_MODEL=gemini-2.5-flash-native-audio-latest`** — deployed v6 reads it; no redeploy needed. Also delete stale `vf-model-probe` to free the cap slot.

Verification evidence (raw): Arabic wav → voice-transcribe = 200, "I want to update the project ticket before Thursday's meeting. Please review the attached file." (provider=gemini, lang=ar, 6.0s). English wav → correct English (6.9s). Arabic text → ai-translate-field = same English, 2.6s, signed-JWT 200 (closes S0 open item).
**Groq has NEVER worked** — every voice_transcribe row in ai_usage_log history is provider=gemini (GROQ_API_KEY missing/invalid on cyij). Works via Gemini fallback; set a valid GROQ_API_KEY for faster whisper-translate.
Available Live models on this key (ListModels probe): gemini-2.5-flash-native-audio-latest, -preview-09/12-2025, gemini-3.1-flash-live-preview, gemini-3.5-live-translate-preview (candidate for future live-translate lane).

## HOTFIX #2 — Groq root cause + full pipeline proof (2026-07-08)
Fourth root cause found and fixed: Groq deprecated `task=translate` on `/audio/transcriptions` — every call for the project's history 400'd with "unknown param `task`" and fell silently to the Gemini fallback (visible now via a temporary groqError diagnostic field). Fix: switched to `/audio/translations` (always outputs English, no task param) — endpoint change only, form fields otherwise unchanged.

**Full pipeline proof, all fixes live on cyij:**
- Arabic audio → voice-transcribe: provider=groq, 1.9s (was gemini/6-7s) — correct English text.
- English audio → voice-transcribe: provider=groq, 1.8s — correct English text.
- catyflow-token: mints models/gemini-2.5-flash-native-audio-latest, full auth_tokens/ name.
- Gemini Live WS (Constrained endpoint, empty first setup): setupComplete → streamed Arabic PCM → live transcript returned correctly in Arabic (proves the language-aware shortcut path will translate it, already verified via ai-translate-field at 2.6s).

Deployed: catyflow-token v11, voice-transcribe v20 (task param removed, /translations endpoint, groqError diagnostic field kept — harmless, absent on success).
Function cap unblocked after Vikram deleted vf-model-probe via dashboard.
Test user + scratch artifacts cleaned up.
