# CAT-TESTHUB-ENGINE-20260626-001 — READ ME FIRST

## ⛔ SESSION BOOTSTRAP CONTRACT — DO THIS BEFORE ANY ACTION (every session, no exceptions)

Any session (new conversation, continuation, subagent, or context-compaction resume) that touches this
feature MUST, before reading code or editing anything:

1. Run mandatory start sequence: `pwd`, `git branch --show-current`, `git status --short -uall`, `git stash list`.
2. Read this folder IN ORDER — none may be skipped:
   - `00_READ_ME_FIRST.md` (this file)
   - `01_OBJECTIVE.md` — what done looks like, in/out of scope
   - `02_CANONICAL_DISCOVERY.md` — the discovery (code + DB + acceptance + components). **Do not re-discover; trust this, verify only if stale.**
   - `03_PLAN_LOCK.md` — the locked phased plan. **Cannot be missed or re-invented.**
   - `07_HANDOVER.md` — current state + context health + EXACT next action
   - `08_DRIFT_LOG.md` — what diverged from plan
   - `09_DECISIONS.md` — locked decisions D1–D7 (binding)
   - `11_KARPATHY_LOOP_LOG.md` — hypothesis/measure log
   - latest file in `sessions/` — last session's trail
3. Print rehydration report: current phase, active slice, last decision, next action, context-health flag.
4. **Do not implement** unless `07_HANDOVER.md` "Execution authorization" = GRANTED for the current phase.

If any of 00/01/02/03/07/09 is missing or contradicts the code → STOP and ask. Do not silently proceed.

## ANTI-LOSS RULES (the things that "cannot be missed")
- **The plan** lives in `03_PLAN_LOCK.md`. Never re-plan from scratch; amend it and log the change in 08.
- **The documentation path** (acceptance source PDFs): `/Users/vikramindla/Downloads/Catalyst/Catalyst Tests`. Pinned here and in 01. Re-read specific PDFs on demand; never assume.
- **The acceptance criteria** = AioTests product docs (precedence D6). Canonical model captured in 02 §C.
- **The discovery** = 02. Resumable discovery-agent IDs in 07 + session 001.

## CONTEXT-HEALTH / HANDOVER DISCIPLINE (write-back to the process)
- After EVERY slice (and at any context-risk moment), update `07_HANDOVER.md`: state, % context used estimate, next action, open risks. Append to `04_EXECUTION_LOG.md`.
- Before ending/handing off a conversation: 07 must be current enough that a cold session can resume from it alone.
- Each session writes its own `sessions/NNN_<purpose>.md`.

---

**Purpose:** Build the native Catalyst Test Management engine to AioTests acceptance parity:
Repository (Folders/Cases/Steps/Versions) → Sets → Cycles → **Execution** → Defects → Traceability,
plus an Admin customization module and Access-Management wiring. Reports & Dashboard are OUT OF SCOPE.

**DB:** dev app connects to Supabase **staging `cyij`** (cyijbdeuehohvhnsywig). Canonical schema family = `tm_*`.
`th_*` and bare `test_*` families are DEAD — do not touch.

**Hard constraints (CLAUDE.md):** Plan Lock before code · parallel discovery agents · vertical slice + wiring proof per phase (user sign-off gate) · JiraTable mandatory · no hand-rolled UI · ADS tokens only (no bare hex) · native SVG icons via registry · zero-assumption rendering · no schema change without approval · stage explicit files only.

**Note:** Aiden Validation Block is OFF for this feature (D7).
