# Karpathy Loop Log — CAT-VOICE-FLOW-20260704-001

## Loop 1 — "Dictation must be greenfield"
- **Hypothesis:** No dictation exists in Catalyst; plan a new system.
- **Experiment:** Lane 2 + Lane 4 repo sweeps (voice/audio/speech greps, App.tsx mounts, edge functions).
- **Measure:** `src/features/voice-flow/` full engine found (provider, capsule, hotkey, targeting, insertion, config, DB tables, edge fn), mounted globally, flag OFF. Plus 2 editor-local voice paths.
- **Verdict:** DISCARD hypothesis. Plan = extend voice-flow. Prevents a fourth parallel voice system.

## Loop 2 — "Wispr-class requires streaming ASR"
- **Hypothesis:** Live word-level partials (Deepgram/OpenAI Realtime) are required for the Wispr feel.
- **Experiment:** Lane 5 teardown of Wispr Flow behavior + provider comparison.
- **Measure:** Wispr inserts the FINISHED cleaned utterance on key release (~0.5–2s); its magic is the cleanup (fillers/backtracks/tone), not live partials. Groq batch = <0.5s for 10s clip at 1/10th Deepgram cost, already integrated.
- **Verdict:** KEEP batch for Phase 1; streaming partials deferred to Phase 2 (Deepgram Nova-3 + token-minting edge fn). The differentiator to build NOW is the cleanup pass.

## Loop 3 — "The cleanup pass exists because flags exist"
- **Hypothesis:** `cleanupEnabled` config implies a cleanup implementation.
- **Experiment:** Lane 2 read of `voice-transcribe` + settings migration.
- **Measure:** Flags exist client- and DB-side; NO cleanup code anywhere; edge fn returns raw Whisper output; also translate-to-EN only.
- **Verdict:** KEEP as the core gap: Slices V1–V2 = transcribe mode + cleanup stage. This is the plan's center of gravity.

## Loop 4 — "Insert via DOM works for rich editors"
- **Hypothesis:** Existing execCommand insertion is sufficient for Tiptap/Atlaskit editors.
- **Experiment:** Lane 1 editor inventory + Lane 5 insertion-mechanics research.
- **Measure:** execCommand works but bypasses editor transactions (undo granularity, marks, atomic replace); ProseMirror best practice = editor API; repo has a documented Tiptap/Atlaskit prosemirror dual-load constraint requiring lazy-load discipline.
- **Verdict:** KEEP adapter approach (Slice V4): context-registered insertion via `editor.commands.insertContent` / Atlaskit actions; DOM path remains fallback for plain fields and foreign contentEditables.
