# 02 — CANONICAL DISCOVERY (bundle ↔ repo reconciliation)

Verified 2026-06-27 on branch `fix/dark-chrome-ads13` (= `main` `83bde822e` + uncommitted ADS-13 edit).
Every row checked against the actual filesystem / git — no claim taken from the ledger on trust.

## Bundle artifact → repo state

| Bundle file (`feature-branch/`) | Repo target | Verdict |
|---|---|---|
| `src/styles/catalyst-ads-parity.css` | `src/styles/catalyst-ads-parity.css`, imported `main.tsx:10` | ✅ on `main`, **byte-identical** (`diff -q` clean) |
| `src/styles/catalyst-ads-chart-tokens.css` | `src/styles/catalyst-ads-chart-tokens.css`, imported `main.tsx:11` (after parity) | ✅ on `main`, **byte-identical** |
| `src/constants/workstreamColors.ts` | `src/constants/workstreamColors.ts` | ✅ on `main`, **byte-identical** |
| `packages/tokens/src/definitions.ts` | — | ❌ **N/A** — no `packages/tokens/` dir; `@catylast/tokens` is external, not in root `package.json`. Apply in that repo, not here. |
| `src/index.css-dark-chrome-ADS13.patch.md` | `src/index.css` | ⏳ **active** — Finding 1 applied; 3 & 4 deferred (see `03_PLAN_LOCK`). |
| `sweeps/*.md`, `PARITY-RUNLOG.md`, `README.md` | reference only | ✅ map/ledger inputs; PR2–PR6 already executed (#286). |

## Two bundle copies (reconciled)
- `feature-branch/` (in repo, **untracked**, not gitignored) and `~/Downloads/feature-branch/`
  are **separate inodes but byte-identical** (`diff -rq` clean). Either is authoritative; they agree.

## Ledger framing note (README vs RUNLOG — resolved, not contradictory)
- `README.md` lists ADS-13 under *"Not in this branch (tracked separately)"*.
- `PARITY-RUNLOG.md` lists the ADS-13 patch among WIDE-lane artifacts.
- **Resolution:** ADS-13 is real work but belongs on its **own branch with its own dark-mode VR gate**
  (`fix/dark-chrome-ads13`), exactly matching "tracked separately." No contradiction; no drift.

## Component-hierarchy / canonical-component check
N/A for this feature — it is CSS token + value work only. No new components, no JiraTable/table
surface, no hand-rolled UI introduced. ADS guardrails apply to the token values themselves.
