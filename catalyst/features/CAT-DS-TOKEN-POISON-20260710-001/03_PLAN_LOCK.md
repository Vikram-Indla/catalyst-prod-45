# Plan Lock — CAT-DS-TOKEN-POISON-20260710-001

**Status:** ACTIVE — approved by Vikram's /goal + /loop directive of 2026-07-10, which explicitly authorizes execution to proven completion ("Execute this five-goal loop to proven completion… Stop only with PASS on branch `poison`"). That directive is the user-approved plan; this lock transcribes it.

## Objective
Remove all token poisoning from Catalyst (duplicate, cyclic, undefined, shadowed, cross-category, inherited, runtime-overridden tokens), install a parser-backed root gate, and produce a signed PASS certificate. Preserve business behavior and data functionality.

## Branch / isolation
- Branch: `poison`, created from `main` @ 057d3c686.
- Worktree: `.claude/worktrees/poison` (origin checkout belongs to another session — never switch branches there).
- Never merge/rebase another branch. Never push to main. Stop only with PASS on `poison`.

## Scope (goals, in order; loop until clean)
1. **Token graph** — parser-backed inventory (postcss + TypeScript AST) of every `--ds-*`, `--cp-*`, local property, ADS `token()` call, arbitrary Tailwind value, inline style, runtime mapping (`customColors` in `src/theme/atlassian/tokens.ts`), theme attribute. Owners, scope, import order, cycles, undefined refs, fallback chains, category, consumers, computed light/dark outcome. Classification: valid ADS use / temporary alias / poison / unsafe override / obsolete debt / unresolved risk.
2. **Remove poison at highest parent** — Atlaskit exclusively owns `--ds-*` (delete app-authored definitions in `catalyst-ads-parity.css`, `index.css`, module CSS); remove/correct `customColors` semantic inversions; kill all 32 self-reference cycles; one one-way single-owner compat bridge (`catalyst-semantic-aliases.css`) for unavoidable temporary aliases; text→text, bg→bg/surface, border→border, icon→icon, chart→chart. No new fallbacks hiding poison.
3. **Sweep descendants** — all consumers of removed/undefined/poisoned tokens (935 phantom refs across 270 files: `--cp-bg-neutral`, `--cp-border-neutral`, `--cp-border-neutral-light`), hard-coded colors, manual typography → current ADS tokens/roles/components, classified by CSS property, both themes, all routes/overlays/states.
4. **Root immunity** — repo-root gate using real CSS parser + TS AST (not regex-only): app-owned `--ds-*`, direct/indirect cycles, undefined refs, duplicate global owners, cross-category aliases, unsafe `customColors`, ambiguous legacy tokens, hard-coded colors, raw typography, invalid light/dark resolution, contrast regressions. Rendered fixtures + computed-style assertions + dual-theme checks + poisoned fixtures proving every rule fails. No baseline suppression of poison.
5. **Certify** — repeat discover→classify→repair→sweep→gate→render both themes→inspect until zero poisonous items. Signed certificate with branch, commit, before/after counts, evidence, explicit PASS/FAIL.

## Non-scope
- No merge to main, no push of main, no DB/schema work, no behavioral/feature changes, no visual redesign beyond token-correct rendering.

## Forbidden
- `git add -A` / `git add .`; touching the origin checkout's branch; baselines that accept poison; value-based (visual-similarity) token replacement; "pre-existing / not in scope / low severity" deferrals.

## Validation commands
- `node scripts/token-graph/build-token-graph.mjs` (inventory + counts)
- `node scripts/token-gate/run-gate.mjs` (Goal 4 gate; must fail on poisoned fixtures)
- `npm run lint:colors` / `npm run audit:ads` (existing ratchets — must not regress)
- `npx tsc --noEmit` + build; dual-theme rendered fixture assertions.

## Timeboxing
Work proceeds in ≤2h slices, one commit per slice, session logs under `sessions/`. The /loop self-paces across slices.

## Stop conditions
- Any evidence a change alters business behavior → stop, RED FLAG, log to 08_DRIFT_LOG.
- Conflict between this lock and new user instruction → newest user instruction wins.
