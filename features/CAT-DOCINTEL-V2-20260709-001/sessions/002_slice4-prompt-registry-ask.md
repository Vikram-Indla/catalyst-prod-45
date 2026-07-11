# Session Log — CAT-DOCINTEL-V2-20260709-001

Feature Work ID: CAT-DOCINTEL-V2-20260709-001
Claude conversation label: CAT-DOCINTEL-V2-20260709-001 — DocIntel v2 (close audit gaps)
Date/time: 2026-07-11
Branch: main
HEAD: b41c47f67 (at session start)

## Objective
Slice 4 (prompt registry) — first vertical slice: make `ai_agent_prompts` the runtime source of
truth + truthful `ai_agent_runs.prompt_id`, proven end-to-end on the cleanest function (`docintel-ask`)
before propagating to analyze + generate. Delivers the fine-tuning enabler (tune prompt = UPDATE +
version bump, no redeploy).

## Plan Lock status
APPROVED (Vikram "go ahead"). See `03_PLAN_LOCK.md` Slice 4 section. Discovery confirmed
`ai_agent_prompts`=10 placeholder rows, prompts hardcoded inline, runs never stamped prompt_id.

## Files changed
| File | Change |
|---|---|
| `supabase/migrations/20260711011626_docintel_prompt_registry.sql` | add `ai_agent_runs.prompt_id`+`prompt_version`; deactivate placeholder prompts; partial-unique active-prompt index. APPLIED to staging cyij (ledger version matches file). |
| `supabase/functions/_shared/prompts.ts` | NEW — `loadActivePrompt()` self-seeding registry loader (byte-faithful, race-safe, inline fallback) |
| `supabase/functions/docintel-ask/index.ts` | prompt loaded from registry (slug `docintel.ask.answer`), template refactor (byte-faithful), `prompt_id`/`prompt_version` stamped on every ai_agent_runs insert (sync + stream, ok + error) |

## Files forbidden (untouched)
- `src/**` (no frontend change), `docintel-analyze`, `docintel-generate` (later sub-slices),
  `kb_*`, generate's NUL-byte dedupeKey region.

## Validation evidence
- Migration applied — verified live cyij: `ai_agent_runs.prompt_id` exists; 0 active prompts
  (10 placeholders deactivated). Registry now seeds on first Ask call.
- ask caller signatures checked (only 1 real `systemPrompt(` call site, updated).
- No deno locally → deno type-check happens at CI deploy time (non-destructive: a type error
  fails the deploy and the prior version keeps serving).
- Post-deploy live verification (registry seed row + a run stamping prompt_id) = pending CI deploy.

## Screenshots
| Item | Status |
|---|---|
| (edge-fn + schema slice, no UI change) | n/a |

## Drift detected
Drift Event 1 (Slice 1) — bugs already fixed+deployed; see `08_DRIFT_LOG.md`. No new drift this slice.

## Next exact prompt
```
continue feature CAT-DOCINTEL-V2-20260709-001

Then run pre-flight:
pwd && git branch --show-current && git status --short --untracked-files=all && git stash list --max-count=5

Next action: after CI deploys, verify a live Ask on staging seeds ai_agent_prompts slug
'docintel.ask.answer' and stamps ai_agent_runs.prompt_id. Then propagate the pattern to
docintel-analyze (2 prompts) and docintel-generate (per-type base + facts; NUL-safe via git deploy).
```
