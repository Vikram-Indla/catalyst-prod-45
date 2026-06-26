# Karpathy AutoResearch — Analysis & Catalyst Adaptation

**Source:** https://github.com/karpathy/autoresearch  
**Read:** 2026-06-25  
**Purpose:** Extract the operating model and adapt it for Catalyst Feature Finder & Builder

---

## 1. What AutoResearch Actually Is

A minimal autonomous experimentation loop for LLM training research. An AI agent modifies a single Python file (`train.py`), runs a 5-minute training job, reads one metric (`val_bpb`), decides keep/discard, and loops — overnight, indefinitely, without human prompts.

The human writes `program.md` (intent, constraints). The agent writes `results.tsv` (evidence). Everything else is autonomous.

---

## 2. Repository Structure (Complete)

```
autoresearch/
├── prepare.py      ← FIXED. Data prep, tokenizer, dataloader, evaluation. NEVER modified by agent.
├── train.py        ← THE ONLY FILE THE AGENT EDITS. Model, optimizer, training loop.
├── program.md      ← Human-authored instructions. The "research org spec". Agent reads this.
├── results.tsv     ← Agent-authored. Tab-separated experiment log. NOT committed to git.
├── analysis.ipynb  ← Human analysis notebook (post-hoc).
├── pyproject.toml  ← Dependencies. Agent cannot change.
└── uv.lock         ← Lockfile.
```

### The Split

| File | Author | Changes | Purpose |
|---|---|---|---|
| `prepare.py` | Human | Never | Fixed constants, ground truth metric |
| `train.py` | Agent | Every cycle | The experiment surface |
| `program.md` | Human | Iteratively | Research direction and constraints |
| `results.tsv` | Agent | Every cycle | Evidence log (untracked) |

---

## 3. The Exact Loop

```
SETUP:
  1. Agree on a run tag (e.g. mar5)
  2. git checkout -b autoresearch/<tag>
  3. Read prepare.py, train.py, program.md
  4. Create results.tsv with header
  5. Run baseline (unmodified train.py) to establish starting val_bpb

LOOP FOREVER:
  1. Look at git state (current branch/commit)
  2. Modify train.py with one experimental idea
  3. git commit
  4. uv run train.py > run.log 2>&1  [FIXED 5-minute wall-clock budget]
  5. grep "^val_bpb:\|^peak_vram_mb:" run.log
  6. If empty → crash. Read tail -n 50 run.log. Attempt fix or skip.
  7. Log to results.tsv: commit | val_bpb | memory_gb | status | description
  8. If val_bpb improved (lower) → KEEP. Branch advances.
  9. If val_bpb equal or worse → DISCARD. git reset to prior commit.
  10. NEVER ask human if you should continue. Loop forever.
```

### results.tsv Format
```
commit	val_bpb	memory_gb	status	description
a1b2c3d	0.997900	44.0	keep	baseline
b2c3d4e	0.993200	44.2	keep	increase LR to 0.04
c3d4e5f	1.005000	44.0	discard	switch to GeLU activation
```

---

## 4. Core Design Principles (The Ones That Matter)

### P1 — Fixed Time Budget
Each experiment runs for exactly 5 minutes, regardless of model size or architecture. This makes experiments directly comparable. No cherry-picking by training longer.

**Catalyst translation:** Each experiment targets ONE bounded slice. Time budget = 1 component, 1 hook, or 1 page view. Never a "full feature" in one experiment.

### P2 — Single File to Modify
The agent only touches `train.py`. Scope is unambiguous. Diffs are reviewable. Complexity doesn't sprawl.

**Catalyst translation:** Each experiment specifies EXACTLY which files it touches, declared upfront. Nothing outside scope is touched.

### P3 — Metric is Sacred
`val_bpb` is computed by `prepare.py` (immutable). The agent cannot change the yardstick. A "win" is defined before the experiment starts.

**Catalyst translation:** Each experiment has a pre-declared acceptance test. Pass criteria are specified BEFORE writing any code. The scorecard runs after.

### P4 — Simplicity Criterion
"All else being equal, simpler is better. A 0.001 improvement that adds 20 lines of hacky code? Not worth it. Removing something and getting equal results? Definitely keep."

**Catalyst translation:** Prefer reusing an existing Catalyst component over building new. A patch that mounts `JiraTable` with a new adapter is better than a new table from scratch with the same visual result.

### P5 — Keep vs Discard is Binary
No "partial keep." Either val_bpb improved (keep) or it didn't (discard and revert). No emotional attachment to work.

**Catalyst translation:** Each experiment concludes with PASS, FAIL, or REVISE. FAIL = revert. No half-committed features.

### P6 — Never Stop
The loop runs until the human interrupts. The agent doesn't ask for permission. Results accumulate overnight.

**Catalyst translation:** The Feature Builder protocol is self-sustaining. Each experiment feeds the next. The research program defines the direction; the builder executes without waiting for re-approval of each step.

### P7 — program.md = Research Intent
The human writes the strategy. The agent executes tactics. `program.md` is iterated by humans as understanding improves.

**Catalyst translation:** `test-hub-research-program.md` is the Catalyst equivalent. Vikram writes intent. Builder executes. Research program evolves as gaps are discovered.

---

## 5. What Does NOT Apply to Catalyst

| AutoResearch Concept | Why It Doesn't Translate |
|---|---|
| GPU training loop | Catalyst is a UI product, not ML training |
| val_bpb metric | Metric is ADS compliance + functional completeness, not loss |
| VRAM constraint | Constraint is "no global edits" and "must reuse existing patterns" |
| uv / Python | Stack is TypeScript + React + Supabase |
| `prepare.py` (immutable) | Catalyst equivalent = CLAUDE.md guardrails + existing shared components |
| Single GPU | No distributed compute concern; constraint is "no wide refactors" |
| PyTorch dependencies | Atlaskit + Supabase dependencies are fixed |
| Branch per experiment | Work on main per CLAUDE.md 2026-06-03 branch policy |

---

## 6. The Structural Analogy

```
AutoResearch               Catalyst Feature Builder
──────────────             ────────────────────────
train.py             ←→   The experiment target file(s)
prepare.py           ←→   CLAUDE.md guardrails + shared components
program.md           ←→   research-program.md (per domain)
results.tsv          ←→   experiment-log.tsv
val_bpb              ←→   Quality scorecard (parity + ADS + functional)
git keep/discard     ←→   PASS / FAIL / REVISE decision
5-min budget         ←→   Single bounded slice per experiment
autoresearch/<tag>   ←→   experiment-<n> entry in experiment log
```

---

## 7. Key Insight for Catalyst

AutoResearch's power is not the ML. It's the **discipline**: fixed scope, fixed metric, autonomous iteration, evidence-based decisions. The same discipline applied to UI feature building produces the same benefit: reviewable diffs, comparable experiments, no sprawl.

The `program.md` pattern is especially powerful: it separates "what the human wants" from "what the agent executes." For Catalyst, this means the Test Hub research program defines the domain; individual experiments define the implementation slices; the scorecard measures each slice; the loop continues.
