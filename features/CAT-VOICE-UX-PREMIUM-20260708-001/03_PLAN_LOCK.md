# CAT-VOICE-UX-PREMIUM-20260708-001 — Plan Lock

> Status: **ACTIVE — execution pre-authorized by Vikram 2026-07-08 via `/loop implement all actions until completed as per plan lock`** (scope approved in-session same day; premium-delta list approved verbatim).
> Any deviation from this lock → stop, log to 08_DRIFT_LOG.md, re-confirm.

## Feature Work ID
CAT-VOICE-UX-PREMIUM-20260708-001

## Objective
Rebuild CatyFlow dictation + translate to premium standard: composer-anchored morphing mic (key surfaces only), live words streaming into the composer, no silence auto-stop, translate as read-side links + write-side AR→EN mode with preview, plus the security repairs discovery surfaced.

## Business outcome
Dictation that survives thinking pauses and shows words as you speak; translate that never fires on empty fields or destroys text; silent-failure rate (baseline ~25%) driven toward zero.

## Timebox
10 slices × ≤2h each. Sequence: **S0 → S1 → S2a → S2b → S3a → S3b → S4a → S4b → S5 → S6a → S6b.** Stop-and-reassess after any slice that fails validation once.

## Non-scope
- No new ASR vendor. No mobile-native. No huddle/WebRTC changes.
- Fast-follow (NOT here): hands-free "send" voice command, WPM stat, dual-language send, org glossary, per-text-node ADF translation.
- No prod (lmqw) writes of any kind. All DB work staging cyij.
- BrdEditorView (static demo) untouched.

## Canonical components (locked)
IconButton (@atlaskit/button/new, subtle) · CatyPulseIcon (token-only, NO hex fallback in new code) · @atlaskit/lozenge (language badge) · SectionMessage wrapper appearance="discovery" (write-side banner) · @atlaskit/popup (preview) · @atlaskit/tag or promoted .ttw-translate-chip (mode chip) · catalystToast.undo · @atlaskit/onboarding Spotlight (coachmark) · @atlaskit/spinner / var(--ds-skeleton) (processing) · useTranslation lane / ai-translate-field fn · user_preferences table (scopes voice_flow, translate).

## UI/UX rules (locked, from Critic)
- Tokens only. Banned in new code: any hex/rgba/hsl, gradient shimmer, magenta glow (use 1px var(--ds-border-accent-magenta)), hardcoded font-size, hand-rolled badge/chip/button/tooltip/spinner, porting ANY ads-scanner:ignore-line from VoiceFloatingCapsule.
- Keyboard: Esc = cancel (stopPropagation, innermost only). Enter/click/⌘⇧V/double-space = stop-commit. **Single Space is NEVER a control.**
- Count-up timer; NO word count. No auto-send. Zero-assumption: render nothing until detection confident.
- One mic per surface (replace MessageComposer slot; no third mic). data-voice-status attr exposed for QA.
- aria-live="polite" single region announcing state transitions only. Sound ping OFF by default behind setting.

## Slices

### S0 — Security repair (NEW, from Data/Safety REDs) (~1h)
1. New migration `supabase/migrations/<new-ts>_voice_sessions_rls_repair.sql` (idempotent): `ALTER TABLE voice_dictation_sessions ENABLE ROW LEVEL SECURITY` + re-create the 4 policies from 20260620000003 (owner select/insert/update + admin select) with `DROP POLICY IF EXISTS` guards. Apply to cyij via Management API. NEVER reuse version 20260620000003. Do NOT create voice_dictation_settings (superseded — 09_DECISIONS D1).
2. `supabase/functions/ai-translate-field/index.ts`: add JWT verification (getUser pattern from catyflow-token); 401 on missing/invalid. Redeploy to cyij.
- Validation: RLS probe (policies live), translate call w/o JWT → 401, with JWT → 200. Log raw output.

### S1 — Session control (~2h)
Delete `silenceAutoStopMs` (+ silence timer/poll-reset in AudioCaptureService); count-up `elapsedMs` (replace countdown at VoiceFlowProvider.tsx:441-451); `'paused'` VoiceStatus + MediaRecorder.pause/resume + pausedAccum excluded from duration + PCM frame gate in RealtimeTranscriber (`setPaused`); capsule: pause/resume button, ■ stop ≠ ✕ cancel, cap warning at 14:00; hotkey table: paused ∈ isVoiceActive, Esc stopPropagation; native-EN lane canPause=false.
- Files: voiceFlow.config.ts, AudioCaptureService.ts, voiceFlow.types.ts, VoiceFlowProvider.tsx, VoiceFloatingCapsule.tsx, RealtimeTranscriber.ts, __tests__/useVoiceHotkey.test.ts, new __tests__/audioCapturePause.test.ts.
- Forbidden: DictationCTA.tsx, MessageComposer.tsx, ChatMainView.tsx, insertTextIntoTarget.ts, edge fns.

### S2a — Morphing mic + surface API (~2h)
Context gains `activate(field)`, `pause`, `resume`, `partialText`, `liveLaneStatus`; new `VoiceMicButton.tsx` (feature-owned, IconButton-based, morphs idle→arming→listening→processing, never unmounts, `data-voice-status`); MessageComposer.tsx: replace dead onMic IconButton with VoiceMicButton (ActiveField from RichTextEditor onEditorReady → editor.view.dom) — lights up /chat main, ThreadPanel, dock CatyPanel, MessageFeed in one change.
- Files: voiceFlow.types.ts, VoiceFlowProvider.tsx, index.ts, MessageComposer.tsx. New: VoiceMicButton.tsx, __tests__/voiceMicButton.test.ts.
- Forbidden: MessageStream.tsx, RichTextEditor internals (use onEditorReady prop), useVoiceHotkey.ts, edge fns.

### S2b — Retire hover CTA + coachmark (~1.5h)
Remove DictationCTA mount; DELETE DictationCTA.tsx (move-not-copy: ع/A translate replaced in S4; gap logged 08_DRIFT). Hotkeys stay global. New VoiceCoachmark.tsx (@atlaskit/onboarding Spotlight, localStorage catalyst.voice.coachmark.v1). AskPanel: keep data-voice-flow="off"; optional explicit VoiceMicButton beside Ask.
- Files: VoiceFlowProvider.tsx, AskPanel.tsx. Delete: DictationCTA.tsx. New: VoiceCoachmark.tsx.

### S3a — Stable-prefix controller (pure logic) (~1.5h)
New `livePartials.ts`: successive partials → `{stable, provisional}` (LCP + 1-revision hysteresis). Provider threads onLive (Gemini) AND native-SR interims through it; expose livePartial + liveLaneStatus ('connecting'|'live'|'unavailable'); RealtimeTranscriber: 3s setupComplete gate, onError/onState propagation, 8s delta watchdog (RMS isSpeaking probe).
- Files: RealtimeTranscriber.ts, VoiceFlowProvider.tsx, voiceFlow.types.ts. New: livePartials.ts, __tests__/livePartials.test.ts (incl. Arabic strings).

### S3b — Composer ghost rendering + failure surfacing (~2h)
Stable text appended into editor (append-only at tracked offsets via insertTextIntoTarget variant); provisional tail = ghost overlay span (--ds-text-subtlest, <bdi>, NEVER written into PM document); cancel mid-stream deletes tracked inserted region (controller offsets, not snapshot) — cancelRestore.test.ts extensions are the gate; final result replaces tracked region with cleaned text; liveLaneStatus 'unavailable' → visible "live captions unavailable — will transcribe on stop"; DELETE .vf-caption panel from capsule.
- Files: VoiceFlowProvider.tsx, VoiceFloatingCapsule.tsx, VoiceMicButton.tsx, insertTextIntoTarget.ts, voiceFlow.types.ts. New: ComposerGhostText.tsx.
- Risk gate: if PM insert/delete proves unstable, fallback = ghost overlay for BOTH stable+provisional, single insert on commit (log 08_DRIFT, continue).

### S4a — Read-side "See translation" (~2h)
New `src/lib/i18n/detectScript.ts` (Arabic/Urdu Unicode ranges, pure); new `MessageTranslation.tsx` under .cc-msg__text (LinkUnfurl mount pattern, MessageStream.tsx:595-610): conditional "See translation" link, ai-translate-field read-only (NEVER writes message), react-query cache ['msg-translation', messageId, target] staleTime Infinity, "See original" reversal.
- Files: MessageStream.tsx. New: detectScript.ts + test, MessageTranslation.tsx.
- Depends: S0 (JWT on fn). Parallel-safe with S3.

### S4b — Write-side AR→EN mode + Always/Ask/Never (~2h)
Setting in `user_preferences` scope 'translate' `{mode:'always'|'ask'|'never', suppressed_languages:[]}` via new `useVoiceSettings.ts` (NO DDL — supersedes planner's ALTER of nonexistent voice_dictation_settings, see 08_DRIFT). New `ComposerTranslateBanner.tsx`: Arabic detected + mode≠never → SectionMessage discovery banner + mode chip; Ask mode intercepts MessageComposer.handleSave → popup preview (original+translation, dir-correct) → Send translation / Send original; Always mode still previews inline; translate failure → send original + toast, never block send.
- Files: MessageComposer.tsx. New: ComposerTranslateBanner.tsx, useVoiceSettings.ts.

### S5 — RTL hygiene (~1.5h)
dir="auto" on .cc-msg__text (both branches), edit textarea, composer host; <bdi> around mixed fragments in renderBody; Arabic font stack + line-height 1.65 for :lang(ar)/RTL in chat.css + dock.css (no colors touched); ghost span unicode-bidi: plaintext.
- Files: MessageStream.tsx, MessageComposer.tsx, chat.css, dock.css, ComposerGhostText.tsx.

### S6a — Reliability (~2h)
422/no_speech → calm non-error ("Didn't catch that — try again", session status 'no_speech'); migration adds `first_partial_ms int` to voice_dictation_sessions (rides after S0 repair; cyij only); provider timestamps first delta; never-lose-words: retain last blob on failed batch fetch + Retry button, drop on success/cancel/new-session.
- Files: VoiceFlowProvider.tsx, VoiceFloatingCapsule.tsx. New: migration, __tests__/retryBlob.test.ts.

### S6b — Premium delta (~2h; vocabulary ejects to S6c if overrun)
soundPing.ts (WebAudio oscillator, OFF by default, setting in user_preferences scope 'voice_flow'); listening border class (1px accent-magenta token, reduced-motion static); getWorkspaceTerms() merge in dictionary.ts (resource_inventory names, project keys, issue keys; personal-first, cap 80); polish diff chip ("Polished · Undo" via Lozenge + subtle buttons + catalystToast.undo, rawText reinsert); live language chip (detectScript on partial → Lozenge, replaces vf-lang-badge). Ratchet baselines DOWN after capsule hatch deletions (`node scripts/ads-color-gate.cjs --update`).
- Files: VoiceFlowProvider.tsx, VoiceFloatingCapsule.tsx, VoiceMicButton.tsx, dictionary.ts, chat.css. New: soundPing.ts, tests.

## Data/backend rules
- Staging cyij ONLY (assert project-ref before any linked op; MCP points at cyij). Migrations: new version numbers, committed files, ledger 1:1.
- catyflow-token `uses` 1→3 + sessionResumption in locked setup (S3a rider, needs live probe first — 09_DECISIONS Q1).
- Read-side translate ALWAYS cache-keyed by messageId. No chat_messages writes from translate.

## Validation commands (every slice)
```
npx tsc --noEmit && npm run build && npm run lint:colors:gate && npm run audit:ads:gate && npx vitest run src/features/voice-flow
```
Plus slice-specific probes from 10_SCREENSHOT_CHECKLIST.md (B-probes + [L/D] screenshots into evidence/).

## Stop conditions
- Any RED FLAG regression (hotkeys break, chat send breaks, existing tests fail unexplained) → stop, log, raise.
- PM insert/delete instability in S3b beyond the documented fallback → stop, raise.
- Any prod-DB targeting detected → full stop.
- One correction loop per slice; then accept/split/rebuild/stop per contract.

## Screenshot checklist
See 10_SCREENSHOT_CHECKLIST.md (35 items [L/D], probes B1-B18, regressions R1-R9, bidi corpus D1-D10).

## Drift/rebaseline
Deviations → 08_DRIFT_LOG.md with reason + evidence. Two logged at lock time: (1) planner's voice_dictation_settings ALTER superseded by user_preferences (table absent live); (2) ع/A removal in S2b precedes S4 replacement — approved gap.
