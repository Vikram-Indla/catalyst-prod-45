# DECISIONS — CAT-STRATA-FOUNDATION-20260709-001

## Gate R1 — Contract (2026-07-09)
Approved by user reply "approved": workspace = `features/CAT-STRATA-FOUNDATION-20260709-001/`, mode deep-discovery, repo-evidence-first, 0 web budget, research-only (no code/DB changes this phase).

## Build authorization (2026-07-09)
User `/goal` directive: "build it on the strata standalone branch … continue there with the complete goal … all micro-interactions addressed as acceptance criteria … always alerting on context health. feature CAT-STRATA-FOUNDATION." Treated as Plan Lock approval — `03_PLAN_LOCK.md` written and active. User switched the origin checkout to `strata-standalone` via GitHub Desktop; this session owns it. Research pack committed+pushed (d0d5ba2).

## Gate R2 — Baseline conflicts (2026-07-09, resume session, answered via structured question)

| ID | Decision | Consequence |
|---|---|---|
| CON-001 | **Full rename including DB.** `strata_play_charters`→`strata_theme_charters`, RPC `strata_upsert_play_charter`→`strata_upsert_theme_charter`, plus TS type/hook/UI label sweep. | REQ-002 un-gated → ready (P1). No terminology fork left anywhere. |
| CON-002 | **Decommission + migrate.** `/enterprise/objectives` (`modules/objectives`, `modules/okr-v2`) and `components/okr/` are decommissioned; their data migrates into `strata_*` tables. Dead `StrategyCockpit` deleted. | Largest-scope option (flagged big/risky at ask time — user chose it knowingly). REQ-016 un-gated; new REQ-022 (data migration) and REQ-023 (route retirement + redirects) added. CONTRACT amendment A1 logged. Must be split into 2-hour slices at Plan Lock; migration is its own wave. |
| CON-003 | **`strata-standalone` branch, `/strata` hub IA.** Build sessions branch from `strata-standalone` per README_STRATA_ISOLATION.md; extend existing `/strata/*` routes/sidebar into the four canonical areas. | This session (on `main`) stays research-only. Build session MUST start from `strata-standalone`. IMPLEMENTATION-PROMPT updated. |
| CON-006 | **Delete Astryx + update CLAUDE.md.** Remove orphaned `src/modules/strategy/astryx/`; correct the CLAUDE.md Astryx section. | REQ-017 un-gated → ready (P2). CLAUDE.md edit is part of the slice (doctrine touch approved here). |

Also resolved in analysis (no user decision needed):
- **CON-004** — sidebar regroup to four canonical areas (REQ-004), approved implicitly by CON-003's `/strata` IA choice.
- **CON-005** — narrowed by ASM-002 repo verification: rules 8/10 edges already exist; only card→strategic-objective edge missing (REQ-007). REQ-008/009 downgraded to test-coverage assertions.

## Gate R3 — Requirements freeze (2026-07-09)
**FROZEN** by user selection "Freeze": REQ-001..023 locked with all mechanical checks passing. Post-freeze changes require an entry in `CONTRACT.md` amendments. Next: build session per `90_handoff/IMPLEMENTATION-PROMPT.md` — worktree from `strata-standalone`, W0 probes, `03_PLAN_LOCK.md`, STOP for approval before code.

## AC6 interpretation (2026-07-09, session 007)
Plan Lock micro-interaction AC6 asks for an Atlaskit flag on every mutation (success/error).
The platform-wide doctrine in `src/hooks/use-toast.ts` — "DEPRECATED 2026-06-16 (Vikram):
non-destructive confirmation badges are suppressed platform-wide. Only destructive (error)
toasts render." — supersedes the success half. AC6 is therefore satisfied by: reload-consistent
state via invalidate() (visible "Calculated <time>" refresh) + error feedback (inline message,
error flags). No success flags added anywhere in STRATA.
