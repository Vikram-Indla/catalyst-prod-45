# Canonical Discovery — CAT-VOICE-FLOW-20260704-001

Six parallel agent lanes ran 2026-07-04 (repo lanes 1–4, web lanes 5–6). Full agent outputs in session transcript; distilled facts below.

## HEADLINE: the dictation engine already exists (flag OFF)

`src/features/voice-flow/` — global, mounted app-wide in `src/App.tsx:295`:
- `VoiceFlowProvider.tsx` — state machine idle→arming→listening→processing→ready/review→committing; raw fetch to `functions/v1/voice-transcribe` (SSE); logs to `voice_dictation_sessions`.
- `useVoiceHotkey.ts` — double-space (350ms) + Cmd/Ctrl+Shift+V; Space/Enter commit, Esc cancel.
- `useActiveTextTarget.ts` + `insertTextIntoTarget.ts` — focused input/textarea/contenteditable targeting; `setRangeText` + synthetic React events; contenteditable via saved Range + `execCommand('insertText')`; sensitive-field deny-list in `voiceFlow.config.ts`.
- `AudioCaptureService.ts` — MediaRecorder webm/opus, amplitude waveform, 1.8s silence auto-stop, 3-min cap.
- `VoiceFloatingCapsule.tsx` — floating capsule UI, portal to body.
- Gating: `VITE_VOICE_DICTATION_ENABLED === 'true'` AND `isModuleEnabled('voice_dictation')` (`VoiceFlowProvider.tsx:32-33`) — **currently OFF by default**.

Server: `supabase/functions/voice-transcribe/` — Groq Whisper `whisper-large-v3` with **task=translate (→English only)**, Gemini audio fallback, 10MB cap, 429 retry, writes `ai_governance_audit_log`. **No AI cleanup pass exists** despite `cleanupEnabled` (client config) and `cleanup_enabled` (per-user `voice_dictation_settings`) flags.

DB: `20260620000003_voice_dictation_tables.sql` — `voice_dictation_settings` (source_languages, auto_commit, cleanup_enabled, store_audio/transcript default false), `voice_dictation_sessions` (audit only), `voice_dictation` feature-flag row. RLS owner-scoped.

## Parallel voice systems to unify (3 today)
1. Global voice-flow (above).
2. `src/lib/voiceToText/useVoiceToText.ts` — Web Speech API Ctrl-hold, inserts into ProseMirror EditorView. Used by canonical Tiptap `Description/RichTextEditor.tsx:264` and Atlaskit `EpicDescriptionEditor.tsx:797`.
3. `Description/hooks/useMicVoiceRecorder.ts` + `MicRecordingBar` — buffered mic-button path (also chat-v2 Composer).

## AI plumbing available
- Providers (edge-secret only): Gemini (29 functions, `gemini-2.5-flash`), Groq (Whisper), Anthropic (2 functions). No Deepgram/OpenAI/AssemblyAI.
- Canonical AI CTAs: **`CatyIconCTA`** (`src/components/ui/CatyIconCTA.tsx`) + **`CatyButton`**; `CatyPulseIcon` (magenta, signature icon). `AIIntelligenceButton`/`CatyRainbowCTA` are deprecated wrappers.
- Improve-strap precedent (streamed rewrite UI inside editors): `catalyst-detail-views/improve/CatyImproveStrap.tsx` + `useCatyImproveStream.ts`; edge fns `ai-improve-story`, `ai-improve-comment`.
- SSE streaming client pattern exists (`voice-transcribe` fetch; orphaned `components/caty/useCatyAI.ts` reader).

## Editor landscape (insertion targets)
- Canonical Tiptap editor: `catalyst-detail-views/shared/sections/Description/RichTextEditor.tsx` (slash menu, mentions, emoji, images, mic already) — used by Description, CommentEditor, CreateStory/BR/Product modals, chat MessageComposer.
- Canonical Atlaskit ADF editor: `shared/rich-text/atlaskit/EpicDescriptionEditor.tsx`, `shared/AtlaskitEditor.tsx`, knowledge-hub `ConfluenceEditor.tsx`. Constraint: Tiptap and Atlaskit each bundle prosemirror — **must not load both eagerly on one page** (`AtlaskitEditor.tsx:1-14`); Atlaskit is lazy-loaded.
- Hand-rolled contentEditable composers: chat-v2 `ComposerEditor.tsx`, `RichTextCommentEditor.tsx`, business-requests/industry RichTextEditor duplicates.
- Plain fields: ~208 textareas, ~597 inputs.

## Top-15 dictation target surfaces (Lane 1)
1. Risks module (RiskFormV2, RiskDetailPanel, CreateEditRiskDialog, mitigation forms) — all plain textareas
2. `incidents/detail/IncidentWorkArea.tsx`
3. `forms/FeatureDialog.tsx`
4. Defect modals (`ReportDefectModal`, `EditDefectModal`, `DefectDetailPage`)
5. Test Hub (`StepEditor.tsx:84,88`, `CaseDrawer`, `ExecutionPage`)
6. `caty-ai-chat/CatyAIInput.tsx`
7. `chat/main/MessageComposer.tsx` (canonical RTE, has mic)
8. chat-v2 `ComposerEditor.tsx` (has mic)
9. `dependencies/DependencyDetailsDrawer.tsx`
10. `epic-backlog/tabs/BenefitsTab.tsx`
11. OKR dialogs (`CreateObjectiveDialogV2`, `ObjectiveOverviewTabV2`, `ObjectiveForm`)
12. `work-items/WorkItemCommentsSection.tsx`
13. work-manager (`TaskDrawer`, `ManagerFollowUpNotes`)
14. `workhub/issue-view/IssueActionDialogs.tsx`
15. Release pages (`IncidentViewPage`, `QualityGatesPage`)
Plus all canonical Description/Comment editors (already partially covered by useVoiceToText).

## Wispr Flow teardown (Lane 5, cited in transcript)
Defining behaviors: hold-key push-to-talk; **atomic insert of cleaned prose** (not raw transcript) — filler removal, backtrack handling ("2… actually 3" → 3), auto-punctuation, list formatting; per-app tone ("Styles"); personal dictionary that learns from corrections; snippets; Command Mode (select text + speak an instruction → in-place rewrite); 100+ languages; whisper-tolerant. Insert lands ~0.5–2s after release. Known weakness: mic cold-start → **pre-warm getUserMedia on CTA hover/focus**.

## ASR provider comparison (Lane 5)
| Option | Streaming partials | Cost | Verdict |
|---|---|---|---|
| Groq whisper-large-v3-turbo (batch) | No | $0.00067/min, <0.5s for 10s clip | **v1 primary — already integrated** |
| Deepgram Nova-3 (browser WS + 30s temp token from edge fn) | Yes ~300ms | $0.0077/min, idle socket free | **v2 upgrade for live partials + keyterm dictionary** |
| AssemblyAI Universal-Streaming | Yes | $0.0025/min but wall-clock billed | Alternative |
| OpenAI Realtime (WebRTC + ephemeral secret) | Yes | ~$0.017/min | Heavier, 2× Deepgram |
| ElevenLabs Scribe v2 RT | Yes ~150ms | $0.0065/min | Token-minting story less mature |
| Web Speech API | Yes | Free | Fallback tier only (already used) |
Cleanup pass: ≤$0.001/utterance on Gemini Flash class. Supabase pattern: edge function as **token-minter, not audio relay**.

## Reference implementation patterns (Lane 5)
- `dictate-button` (Apache-2.0): MutationObserver auto-inject mic button on every textarea/input/contenteditable — steal injection pattern.
- ProseMirror insertion must use editor API (`editor.commands.insertContent` / `view.dispatch(tr.insertText)`), never DOM.
- React controlled inputs need native value-setter trick + synthetic input event (voice-flow already does this).

## Gaps (voice-flow today vs Wispr-class target)
1. Translate-to-EN only — no same-language transcribe mode.
2. No AI cleanup pass (fillers/backtracks/register) — the flag exists, the function doesn't.
3. No visible per-field CTA — hotkey-only discoverability.
4. contenteditable insertion bypasses editor APIs (works, but atomic replace + rich formatting need Tiptap/Atlaskit adapters).
5. Three voice systems unowned by one engine.
6. No personal dictionary, no command mode, no live partials, no register/tone matching.
7. Client hooks invoke non-existent edge fns (`caty-generate` etc.) — verify deployed state before reuse (separate hygiene item).
