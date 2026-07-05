# Objective — CAT-VOICE-FLOW-20260704-001

## What
A global dictation layer for Catalyst:
- A canonical **dictation CTA** (and global hotkey) that can activate on ANY text input — plain inputs, textareas, and rich text editors.
- Live streaming transcript into the focused field, followed by an **AI cleanup pass** (filler removal, punctuation, self-correction handling, register/tone matching to the target field — comment vs BRD paragraph).
- Coverage inventory: all major rich-text/long-form boxes in **Project** and **Product** menus identified and wired.
- Feel: "better than Wispr Flow" — low latency partials, one-keystroke activation, zero manual cleanup.

## Why
PO dictates most content; typing long-form BRD/story/comment content is the bottleneck. Wispr Flow works at OS level but is not integrated with Catalyst context (field type, work item, project vocabulary).

## Done means
1. Plan Lock approved defining: ASR provider + relay architecture, canonical CTA component, insertion adapters (input/textarea/rich editor), AI cleanup contract, surface rollout list, cost model.
2. (Later slices) Dictation works on the top-15 surfaces with screenshot + DOM-probe acceptance.

## Non-scope (planning phase)
- No code, no migrations, no new packages installed.
- OS-level (outside-browser) dictation is out of scope — this is in-app only.
