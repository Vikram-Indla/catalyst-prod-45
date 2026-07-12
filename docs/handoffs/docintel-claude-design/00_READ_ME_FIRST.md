# DocIntel Claude Design → Codex Build Handoff

Feature Work ID: `CAT-DOCINTEL-V2-20260709-001`

This kit is deliberately limited to design and build activity. It does not cover rollout,
commercialization, migration, or operating-model work.

## Files Vikram must attach to Claude Design

Attach all six files in the same Claude conversation before pasting Prompt 1:

1. `current-docintel-evidence.png` — current Evidence screen.
2. `current-docintel-document.png` — current translated Document screen.
3. `rovo-home.png` — Rovo composer and Recent work reference.
4. `rovo-agent-selector.png` — Rovo specialist/agent selector reference.
5. `raw-materials-brd-arabic.pdf` — the real Arabic Raw Materials BRD.
6. `catalyst-docintel-code-context.zip` — current DocIntel, Catalyst canonical UI, CRE, route and Admin code context.

Do not paste local filesystem paths into Claude and assume Claude can open them. Upload the actual
files. If Claude reports that any attachment is missing or unreadable, stop and reattach it before
accepting design output.

## Six-step SOP

1. Start a fresh Claude Design conversation and attach all six files above.
2. Paste `01_CLAUDE_DESIGN_PROMPT.md` without editing it.
3. Download Claude's complete design/code export. Do not ask Codex to build from screenshots alone.
4. In the same Claude conversation, attach its export if necessary and paste
   `02_CLAUDE_CORRECTION_AND_EXTRACTION_PROMPT.md`.
5. Download the corrected export and attach it to the existing Codex DocIntel task with
   `03_CODEX_BUILD_PROMPT.md`.
6. Codex performs repository reconciliation, Plan Lock correction, implementation, tests and
   screenshot proof. A Claude file is never copied over the repository wholesale.

## Stop conditions

- Claude did not receive all six attachments.
- Claude invents screens without reviewing the current DocIntel screenshots.
- Claude returns only pictures and no component/file handoff.
- Claude creates custom tables, tabs, drawers, modals, navigation or a new design system.
- Claude silently links the Raw Materials BRD to `BAU-6155`.
- Claude claims Impact Canvas, Sidecar or Test Quality Reviewer already has a working backend.
- Claude removes an existing capability without naming and proving its replacement.

