# CAT-VOICE-UX-PREMIUM-20260708-001 — Agent Outputs

> 9 agents ran 2026-07-08 (2 research + 7 discovery). Condensed; full text lives in session transcript.

## Research Agent A — Premium voice dictation UX (Wispr Flow et al.)

- Wispr Flow: NO silence auto-stop; 20-min hard cap, warn at 19; push-to-talk or toggle; batch commit with <700ms p99 marketed / 1-2s felt; premium feel = state clarity (<100ms listening flip, audio ping, Flow Bar single anchor) + insertion reliability + AI polish w/ View Diff / Undo AI Edit. NOT live-words.
- Live inline words products: Apple Dictation (blue-underline ambiguity, pulsing cursor, type-while-dictating), Google Docs (red mic, correct-then-continue), Windows Win+H (pause verb; auto-close-on-silence is its #1 complaint), Otter (retroactive correction of provisional only).
- Naive VAD endpointing (2-5s) = most complained-about behavior in category (Windows, Gemini threads). Solutions: no auto-stop + manual stop (Wispr), push-to-talk, forced end-of-utterance. If grace kept: ≥30s and visible.
- Latency: <300ms first partial premium, >500ms broken; budget end-to-end. Stability: LocalAgreement stable-prefix (ufal/whisper_streaming) — committed text never mutates.
- Never auto-send / never commit unseen text (OpenAI regression thread). Toggle > hold on web. Esc=cancel ≠ stop=commit. Mic in composer right edge, always visible when empty, morphs to stop.

## Research Agent B — Translate + RTL UX

- NO studied product (Gmail, Chrome, Teams, Outlook, LinkedIn, WhatsApp, Telegram, Messenger) shows a translate affordance on empty input. All gate: content exists + detection ok + lang ≠ target + not suppressed. Teams refuses short strings.
- Read-side is the primary home: LinkedIn "See translation" text link (conditional, inline, reversible); Teams hover Translate + translated-state icon; WhatsApp long-press. Labels beat icons; NN/g: tooltip ≠ label.
- Write-side translate is rare: Skype Translator, Zendesk live conversation translation (banner on mismatch → conversation-level bidirectional mode + preview). Model as MODE with state chip, not per-send button.
- Settings triad everywhere: Always/Ask/Never + preferred target + per-language suppression offered at dismissal.
- ع/A glyph pair = transliteration keyboard-toggle convention (Yamli/Ta3reeb), wrong symbol for translate.
- RTL: dir="auto" on inputs/bubbles (never hardcode), <bdi> for injected fragments, WebKit caret bug 24278 with mixed runs, Arabic system font stack (SF Arabic/Segoe UI/Tahoma/Noto Sans Arabic UI), larger line-height for diacritics. W3C ALREQ.
- Slack WYSIWYG-toolbar backlash = evidence against persistent composer icon rows; ≤3 persistent icons.

## Agent 1 — Canonical Component Discovery
See 02_CANONICAL_DISCOVERY.md table. Highlights: MessageComposer dead onMic slot; useMicVoiceRecorder/MicRecordingBar second engine w/ pause; .ttw-translate-chip = existing AR→EN chip; useTranslation cache-first (skipped when issueKey=''); catalystToast.undo; @atlaskit/onboarding installed unused; ringtone.ts only tone precedent; VoiceResult.rawText = diff data; no text-diff visual exists (only genuinely new UI piece); UserPreferencesPanel is shadcn+localStorage (non-ADS).

## Agent 2 — Canonical Screen Discovery
See 02 surfaces table. Highlights: allowlist hinges on getActiveTextTarget alone (CTA + hotkeys); provider mounts childless at App.tsx:314 (no context tree — registration API greenfield); marker collision warning data-voice-zone vs data-voice-flow; AskPanel does NOT import voice-flow (opts out); 4 editor engines all PM-family covered by execCommand path; chat-v2 ComposerEditor has imperative insertText().

## Agent 3 — UI/UX Critic
Verdicts: A morphing mic CONDITIONAL PASS (kill glow/gradient-shimmer/hex; token-only magenta; dedupe 3 mics). B in-composer transcript CONDITIONAL PASS (controlled-input/undo mechanics; SR announce states only). C keyboard PARTIAL FAIL (Space-to-stop rejected; Esc stopPropagation). D diff chip PASS (Lozenge + subtle buttons + Popup). E translate CONDITIONAL PASS (SectionMessage not Banner; Tag/Toggle chip; reuse ai-translate-field). F sound+motion PASS (audio off-by-default w/ setting; reduced-motion port). G language chip CONDITIONAL PASS (Lozenge; render nothing until confident). Ratchet-failure list + net-positive ledger (~25 ignore-lines deleted → baselines DOWN).

## Agent 4 — Integration Architect
AD-1..AD-7 (full in 02). Root causes: silent captions = start() resolves on bare WS open + onError never passed; 422 = no_speech triggered by the 1.8s fuse. Gemini Live session limits need sessionResumption + goAway reconnect + uses:2-3 tokens. Segment rotation 4-min for batch. Pause = gate frames, no audioStreamEnd. 7 open questions logged in 09_DECISIONS.

## Agent 5 — Data/Safety Guard
RED: voice_dictation_sessions RLS OFF live (drift, migration 20260620000003 recorded but not executed), full anon/authenticated grants. RED: ai-translate-field verify_jwt=false, no auth/rate-limit/sensitive-guard. AMBER: read-side translate must cache per messageId; catyflow-clean logs to ai_governance_audit_log (missed 2026-07-04 fix). GREEN: user_preferences fits prefs; voice_dictation_settings doesn't exist live; no feature-schema migration needed for S1-S3. Silent-failure ~25% recent. Secrets mapped per fn. 422 taxonomy clean.

## Agent 6 — Implementation Planner
10-slice plan S1, S2a/b, S3a/b, S4a/b, S5, S6a/b with file lists, forbidden lists, tests, rollback, dependency graph. CORRECTION APPLIED (see 08_DRIFT_LOG): planner's S4b ALTER voice_dictation_settings is invalid — table doesn't exist live; superseded by user_preferences scope. Full slice text folded into 03_PLAN_LOCK.md.

## Agent 7 — QA/Screenshot Validator
35-item light/dark screenshot matrix, 18 DOM/console probes (B1-B18), 9 regression sweeps (R1-R9), 10-string bidi corpus, signoff gate. Written to 10_SCREENSHOT_CHECKLIST.md. Testability requirement: data-voice-status attribute.
