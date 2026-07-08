# CAT-VOICE-UX-PREMIUM-20260708-001 — Canonical Discovery

Consolidated from 7 parallel discovery agents, 2026-07-08. Condensed verdicts in 12_AGENT_OUTPUTS.md.

## Headline: consolidate, don't build

**THREE voice systems already exist:**
1. `src/features/voice-flow/` — global CatyFlow (hover CTA + hotkeys + capsule). The one being rebuilt.
2. `useMicVoiceRecorder` + `MicRecordingBar` (Description editor toolbar) — separate voiceToText engine with pause/resume. Marker `data-voice-zone` (~12 surfaces) — do NOT reuse for voice-flow allowlist.
3. chat-v2 dock `ComposerEditor` — custom markdown contenteditable, imperative `insertText()` API.

**Chat composer mic slot pre-built and dead**: `MessageComposer.tsx:167-174` renders MicrophoneIcon IconButton behind `onMic` prop; `ChatMainView.tsx:526` never passes it. MessageComposer reused by ThreadPanel, dock CatyPanel, MessageFeed, ThreadPane — one integration covers all chat surfaces.

## Canonical components selected

| Need | Choice | Path |
|---|---|---|
| Mic/stop/pause buttons | `IconButton` @atlaskit/button/new, appearance="subtle" | convention: MessageComposer, ChatDock |
| AI mark | `CatyPulseIcon` (token color.icon.accent.magenta — NO hex fallback in new code) | src/components/ui/CatyPulseIcon.tsx |
| AR→EN mode chip | promote `.ttw-translate-chip` (exact visual exists) | shared/title-translate/ |
| Language badge | `@atlaskit/lozenge` (replaces hand-rolled .vf-lang-badge) | — |
| Preview banner | `SectionMessage` appearance="discovery" | src/components/ads/SectionMessage.tsx |
| Preview popup | `@atlaskit/popup` | — |
| Undo | `catalystToast.undo(title, onUndo, 5)` | src/lib/catalystToast.ts:106 |
| Polish diff data | `VoiceResult.rawText` vs `.englishText` (exists; only visual new) | voiceFlow.types.ts:30 |
| Translate hook | `useTranslation` (cache skipped when issueKey='' → chat needs messageId react-query cache) | src/hooks/useTranslation.ts |
| Coachmark | `@atlaskit/onboarding` Spotlight (installed, unused) | — |
| Sound ping | mirror `ringtone.ts` AudioContext pattern | src/lib/chat/huddle/ringtone.ts |
| Settings | `user_preferences (user_id, scope, value jsonb)` scopes voice_flow/translate — NOT voice_dictation_settings (doesn't exist live, see 08_DRIFT) | DB |

## Key surfaces (allowlist)

| Surface | File | Kind |
|---|---|---|
| /chat composer (main+thread+dock CatyPanel) | chat/main/MessageComposer.tsx (Tiptap CE) | PM contenteditable |
| /chat dock composer | chat-v2 ComposerEditor (imperative insertText) | custom CE |
| Message bubbles (read-side translate) | chat/main/MessageStream.tsx :595-614 | render-only |
| Work-item description | AdfDescriptionField → @atlaskit/editor-core | PM CE |
| Comment composers | catalyst-ds/comments/CommentEditor.tsx (Tiptap) | PM CE |
| Create modals | CreateStoryModal.tsx:50 (Tiptap — import authoritative over stale header comment) | PM CE |
| Wiki | WikiEditor.tsx (BlockNote) | PM CE |
| DocIntel AskPanel | opts OUT (data-voice-flow="off", Enter submits); explicit mic button optional S2b | input |

**One-function allowlist**: `getActiveTextTarget` (useActiveTextTarget.ts) gates CTA + both hotkeys. New marker `[data-voice-flow-surface]` for button-bearing composers; hotkeys stay global per AD-1.

## Architecture decisions (AD-1..7, Integration Architect — full text 12_AGENT_OUTPUTS.md)

- AD-1 `useCatyFlowSurface(ref)` + `<CatyFlowMicButton/VoiceMicButton targetRef>`; context gains `activate()`; DictationCTA deleted.
- AD-2 `LiveInsertionController`/livePartials — committed stable prefix appended into real field; provisional tail in ghost overlay; NEVER styled spans inside ProseMirror; CE cancel-delete = highest-risk, tracked-offset delete not snapshot.
- AD-3 RealtimeTranscriber health machine + 3s setupComplete gate (root cause of silent captions: start() resolved on bare WS open, onError never passed) + 8s delta watchdog + goAway/sessionResumption; catyflow-token `uses:1` → 2-3.
- AD-4 delete silenceAutoStopMs; 15-min cap + 14-min warning; 4-min segment rotation for batch fallback; FileReader base64. 422 = no_speech, mostly caused by the 1.8s fuse itself.
- AD-5 `'paused'` status; MediaRecorder.pause/resume; gate PCM frames (no audioStreamEnd); freeze waveform; elapsed excludes pause; native-EN lane canPause=false.
- AD-6 write-side: client ARABIC_RE detect (zero edge calls) + preview + apply-on-send in MessageComposer.handleSave; read-side: MessageActionsToolbar/under-bubble link + react-query ['msg-translation', messageId, target].
- AD-7 `getWorkspaceTerms()` in dictionary.ts (resource_inventory names, project keys, issue keys), personal-first merge, cap 80.

## Data/Safety verdicts

- **RED**: `voice_dictation_sessions` RLS OFF live + full anon/authenticated grants (migration 20260620000003 marked-applied, not executed). Repair migration with NEW version required.
- **RED**: `ai-translate-field` verify_jwt=false + no in-code auth + no rate limit + no sensitive-field guard = open Gemini proxy. JWT required before translate expansion.
- **AMBER**: read-side translate must cache by messageId. catyflow-clean logs to wrong governance table.
- **GREEN**: prefs → user_preferences; no feature-schema migration for S1-S3. `voice_dictation_settings` DOES NOT EXIST live — supersede, never ALTER it.
- Baseline: ~25% recent sessions silent-fail (19% error + 6% stuck-started). 422 taxonomy = no_speech only.

## UI/UX Critic hard rulings

- Space-to-stop REJECTED (composer owns focus; Space is a character) → Enter/click/chords.
- Magenta glow REJECTED → 1px `var(--ds-border-accent-magenta)`.
- Shimmer → @atlaskit/spinner or var(--ds-skeleton). Word count CUT; count-up timer stays.
- Zero porting of the ~25 ads-scanner:ignore-line hatches from VoiceFloatingCapsule; deletion ratchets baselines DOWN.
- Dedupe mics (new anchored mic replaces MessageComposer slot; no third mic).
- Esc needs stopPropagation (innermost action only). Testability: expose `data-voice-status` attr.
