# Workflows Admin — Claude Code Handover Package

Complete, self-contained handover for rebuilding `/admin/workflows` in Catalyst:
global status registry + per-work-item-type workflows with Editor and Diagram modes.

## Contents

| File | Role |
|---|---|
| `00-KICKOFF-PROMPT.md` | The ONLY thing you paste into Claude Code. Pre-filled defaults; 2 slots to fill (migration path, branch). |
| `01-HANDOVER.md` | Full implementation brief: data model DDL, Atlaskit component map, file map, hooks, 19 testable behaviors, pipeline, decision gates. Claude Code reads this from disk. |
| `02-workflows-admin-mockup-v3.html` | The exact visual + interaction spec. Open in any browser. Contains the consistency-checked seed data (STATUSES / WORKFLOWS / GLOBAL_RULES) in its `<script>` block. |

## How to use — 3 steps

1. **Commit this folder** to the Catalyst repo at `docs/handover/workflows-admin/`
   on the branch you want the work done on. (Claude Code must read the handover
   and open the mockup from disk — do not paste their contents into chat.)
2. **Edit `00-KICKOFF-PROMPT.md`**: fill the two `<FILL>` slots (migration path,
   branch). Review the two pre-filled decisions — DECISION-1 defaults to folding
   Terminal into Done (3-color guardrail intact); change the line if you want
   4 categories instead.
3. **Paste the body of `00-KICKOFF-PROMPT.md`** (everything below the `---`) as
   the first message in a fresh Claude Code session opened at the repo root.
   Claude Code will start with P1 and show the migration SQL for your approval
   before applying anything.

## What "exact replication" is enforced by

- Mockup-as-spec: Claude Code screenshots its build against the mockup region
  per phase and must list + fix every difference before proceeding.
- 19 Playwright-asserted behaviors in handover section 6.
- ads-validator clean (tokens only), regression sweep, jira-compare parity pass,
  CRUD acceptance on a canonical status as the final gate.

## Versioning

Mockup v3 supersedes v1/v2 (adds Diagram mode + registry-wide name-uniqueness
validation). If you regenerate the mockup, bump the filename and the reference
in both the kickoff prompt and handover.
