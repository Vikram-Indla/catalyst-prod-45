# LANE 11 — Git / PR / CI Standards Audit

Feature Work ID: CAT-AUDIT-FULLSWEEP-20260703-001
Lane: 11 (Git / PR / CI)
Date: 2026-07-03
Branch audited: `main` @ f94505429
Mode: READ-ONLY (this file is the sole write)

Evidence sources: `.github/workflows/ci.yml`, `.husky/pre-commit`, `git ls-files`, `git log -300`,
`git for-each-ref refs/remotes`, `git count-objects -vH`, live `npx tsc -p tsconfig.app.json --noEmit` run.

---

## Findings

### CAT-AUDIT-1000 — No npm lockfile; CI installs with `npm install` (non-reproducible builds)
- **Category:** CI/Build Reproducibility
- **Severity:** High
- **Surface:** CI pipeline (all PRs + main pushes)
- **Route:** n/a
- **Component:** n/a
- **File Path:** `.github/workflows/ci.yml` (lines 18–27), repo root
- **Mode:** n/a (non-UI)
- **CRE:** n/a
- **ADS:** n/a
- **Typography:** n/a
- **Performance:** Every CI run re-resolves the full dependency tree; `cache: 'npm'` is explicitly omitted because setup-node hard-fails without a lockfile (comment at ci.yml:18–21). Slower CI on every run.
- **Accessibility:** n/a
- **Evidence:**
  - `package-lock.json` does not exist and is not tracked (`git ls-files --error-unmatch package-lock.json` → "did not match").
  - ci.yml:18 comment: "the repo intentionally ships no lockfile".
  - ci.yml:24–27: `npm install` used because `npm ci` fails with EBADPLATFORM on linux for optional darwin-arm64 rolldown bindings.
  - Meanwhile **bun lockfiles ARE tracked** (`bun.lock`, `bun.lockb` — 1.7 MB) but npm/CI never reads them → mixed-package-manager artifact drift.
  - Downstream fragility is already visible in ci.yml itself: two workaround steps exist purely because installs are non-deterministic — the sync-deps pre-warm (lines 29–35) and the manual `npm install rollup@^4.20.0 --no-save` hoist (lines 37–52, "The lockfile pins rollup at the top level but `npm install` skips it" — a comment referencing a lockfile that no longer exists).
- **Why:** Without a committed lockfile, every CI run and every fresh clone can resolve different transitive versions. A transitive minor bump can break main with zero repo diff. The rollup-hoist hack is the first symptom already in production CI.
- **Recommended Fix:** Regenerate and commit `package-lock.json` (npm ≥ 10.9 fixed the EBADPLATFORM optional-dep regression; alternatively add `--os`/`--cpu` overrides or `optional=false` for the rolldown binding). Switch CI to `npm ci` + `cache: 'npm'`. Remove the rollup-hoist step once the lockfile pins it. Delete or gitignore the unused bun lockfiles to end the dual-package-manager ambiguity.
- **Regression Risk:** Medium — first `npm ci` run may surface version drift already latent in local `node_modules`. Do it in a dedicated PR with a full build + vitest run.
- **Validation Required:** Green CI on the lockfile PR (install, build, tests); `npm ci` completes on linux runner; local `npm ci` on darwin-arm64 succeeds.
- **Suggested PR:** PR-GITCI-1 "build: commit package-lock.json, switch CI to npm ci + cache" (solo PR, nothing else in it).

---

### CAT-AUDIT-1001 — Type check runs `continue-on-error: true` (tsc never blocks a merge)
- **Category:** CI Gap
- **Severity:** High
- **Surface:** CI pipeline
- **File Path:** `.github/workflows/ci.yml` lines 54–59
- **Mode / CRE / ADS / Typography / Accessibility:** n/a
- **Performance:** n/a
- **Evidence:** `run: npx tsc -p tsconfig.app.json --noEmit` with `continue-on-error: true  # ~157 baseline errors; remove continue-on-error once the baseline is burned down.` The baseline has existed since at least the memory note ("~157 baseline errors") with no ratchet, so new type errors merge freely — see CAT-AUDIT-1004/1005 for proof it regressed.
- **Why:** A non-blocking type check is a green checkmark that certifies nothing. New TS errors land silently; the burn-down never happens because nothing enforces the direction of travel.
- **Recommended Fix:** Do not flip to hard-fail immediately (would block all work). Add a **tsc error-count ratchet** identical in shape to `scripts/ads-color-gate.cjs`: script counts `error TS` lines, compares to a committed `design-governance/tsc-baseline.json`, fails only on increase, `--update` flag ratchets down. Wire into ci.yml (blocking) and `.husky/pre-commit`.
- **Regression Risk:** Low — increase-only gate cannot block existing debt.
- **Validation Required:** Gate passes at current count; deliberately adding one `const x: string = 1` in a scratch branch fails the gate.
- **Suggested PR:** PR-GITCI-2 "ci: tsc error-count ratchet gate (fail-on-increase)".

---

### CAT-AUDIT-1002 — ESLint runs `continue-on-error: true` (lint never blocks)
- **Category:** CI Gap
- **Severity:** Medium
- **Surface:** CI pipeline
- **File Path:** `.github/workflows/ci.yml` lines 61–64
- **Mode / CRE / ADS / Typography / Performance / Accessibility:** n/a (though the lint config carries the hub-scope ADS + lucide-react ban, so ADS enforcement via eslint is also non-blocking)
- **Evidence:** `run: npm run lint` + `continue-on-error: true  # Tighten to fail-on-warn once swept files are promoted to error tier`. Same "temporary until burned down" pattern as tsc, with no mechanism forcing burn-down.
- **Why:** The lucide-react ban and hub-scope ADS rules referenced in the step name are advisory only in CI. Violations merge.
- **Recommended Fix:** Same ratchet pattern: count eslint errors+warnings (`--format json`), commit a baseline, fail on increase. Alternatively use eslint's built-in `--max-warnings <baseline>` as the cheapest ratchet. Wire into ci.yml + pre-commit.
- **Regression Risk:** Low.
- **Validation Required:** Gate green at baseline; synthetic violation fails it.
- **Suggested PR:** PR-GITCI-2 (same PR as 1001 — one "CI ratchet gates" PR).

---

### CAT-AUDIT-1003 — Tests: `vitest run --passWithNoTests` + known vitest/Node-20 breakage
- **Category:** CI Gap
- **Severity:** Medium
- **Surface:** CI pipeline
- **File Path:** `.github/workflows/ci.yml` lines 87–88
- **Mode / CRE / ADS / Typography / Performance / Accessibility:** n/a
- **Evidence:**
  - `npx vitest run --passWithNoTests` is the final step.
  - The repo has **338 tracked `*.test.*`/`*.spec.*` files**, so the flag is not needed for the happy path — its only effect is to convert "vitest discovered zero tests" (e.g. a glob/config regression silently excluding everything) into a green build.
  - Session memory records vitest cannot start locally on Node 20 (rolldown `styleText` issue); CI pins `node-version: '20'` (ci.yml:17). If that breakage manifests as a startup error CI fails loudly (acceptable); if it manifests as zero collected tests, `--passWithNoTests` greens it.
- **Why:** The flag's only reachable behavior on this repo is masking a test-discovery failure. It offers no benefit and one silent failure mode.
- **Recommended Fix:** Remove `--passWithNoTests`. Optionally add a cheap floor assertion (fail if collected test files < 300) to catch discovery regressions explicitly.
- **Regression Risk:** Low — with 338 test files present the flag removal changes nothing on a healthy run.
- **Validation Required:** CI test step green after removal; confirm vitest actually collects/executes on the linux runner (paste collected-file count into PR).
- **Suggested PR:** PR-GITCI-2.

---

### CAT-AUDIT-1004 — No tsc/eslint ratchet gates, unlike the ADS ratchets (asymmetric enforcement)
- **Category:** CI Gap / Governance
- **Severity:** Medium
- **Surface:** CI + pre-commit
- **File Path:** `.github/workflows/ci.yml`, `.husky/pre-commit`, `scripts/ads-color-gate.cjs`, `scripts/ads-audit-gate.cjs`
- **Mode / CRE / ADS / Typography / Performance / Accessibility:** n/a
- **Evidence:** The repo already has three blocking fail-on-increase gates (`lint:colors:gate`, `audit:ads:gate`, `lint:cre` — ci.yml:66–80 and `.husky/pre-commit`), proving the ratchet pattern is established and accepted. Type errors and lint errors — the two most correctness-relevant signals — are the only checked categories with **no** ratchet.
- **Why:** Design-token debt cannot grow, but type-safety debt can grow without bound. Backwards priority for correctness. CAT-AUDIT-1005 shows it already grew (+26 over baseline).
- **Recommended Fix:** As per 1001/1002 — `scripts/tsc-gate.cjs` + `scripts/eslint-gate.cjs` cloned from the ads-color-gate shape (count, compare to committed baseline JSON, fail on increase, `--update` to ratchet down), added to both ci.yml and pre-commit.
- **Regression Risk:** Low.
- **Validation Required:** Both gates green at baseline; both fail on synthetic regression; baselines committed.
- **Suggested PR:** PR-GITCI-2.

---

### CAT-AUDIT-1005 — Live tsc run: 183 errors (baseline ~157), including 5 structurally broken tracked files
- **Category:** Code Health / CI Gap consequence
- **Severity:** High
- **Surface:** App source
- **Route:** Capacity heatmap surface; tasks board Kanban; story detail comments
- **Component:** CapacityHeatmap, SortableColumn, RichTextCommentEditor, icon-registry
- **File Path:**
  - `src/lib/icons/icon-registry.ts` — 150 errors
  - `src/pages/admin/connections/__tests__/JiraSyncPage.integration.test.ts` — 24 errors
  - `src/components/capacity-heatmap/CapacityHeatmap.tsx` — 7 errors
  - `src/modules/tasks/components/boards/SortableColumn.tsx` — 1 error
  - `src/modules/project-work-hub/components/dialogs/story-detail-modules/RichTextCommentEditor.tsx` — 1 error
- **Mode / CRE / ADS / Typography / Accessibility:** n/a
- **Performance:** n/a
- **Evidence (raw, from `npx tsc -p tsconfig.app.json --noEmit`, 2026-07-03):**
  - Total: **183 errors in 5 files.** Top codes: TS1005 ×102, TS1109 ×52, TS1128 ×16, TS1161 ×5, TS1110 ×3 — i.e. overwhelmingly *syntax*-class, not type-class.
  - `icon-registry.ts` contains JSX (`return <CopyIconCore size="small" aria-hidden />;` at line 65) in a **`.ts`** file — tsc cannot parse JSX there; needs `.tsx`. Last touched in commit `eaa1f912d` ("cc" — also a commit-convention violation). No other file imports it (grep across src), so it is dead + broken.
  - `JiraSyncPage.integration.test.ts` — same class: JSX in a `.ts` test file.
  - `CapacityHeatmap.tsx` lines 258–266: three inline callbacks (`onResolveConflict`, `onAddAllocation`, `onEditAllocation`) are **missing their closing `}}`** — genuinely broken syntax committed to main. `use-capacity-heatmap-data.ts` references the surface.
  - `SortableColumn.tsx:95` and `RichTextCommentEditor.tsx:210` — TS2657 "JSX expressions must have one parent element". `SortableColumn` **is imported by** `src/modules/tasks/components/boards/BoardKanban.tsx`.
  - Note on the delta: 183 > ~157 baseline, and because these are parse-level failures the semantic pass over those 5 files never runs — the true error count is ≥183. This is exactly the regression class `continue-on-error` (CAT-AUDIT-1001) permits.
- **Why:** main carries files that cannot compile. Whether vite's esbuild path tolerates or tree-shakes them, tsc-verified correctness is broken and the CI type step waved it through.
- **Recommended Fix:** (1) Rename `icon-registry.ts` → `.tsx` (or delete if truly dead), same for the test file → `.test.tsx`; (2) restore the missing `}}` in CapacityHeatmap.tsx; (3) wrap the multi-root JSX in fragments in SortableColumn.tsx / RichTextCommentEditor.tsx; (4) re-run tsc, record new count, seed the CAT-AUDIT-1004 baseline from it.
- **Regression Risk:** Medium for CapacityHeatmap/SortableColumn (live surfaces — need render verification); trivial for the renames.
- **Validation Required:** tsc error count strictly decreases and no new files appear; DOM probe of tasks board Kanban and capacity heatmap after fix (screenshots per COMMIT GATE for any visual delta).
- **Suggested PR:** PR-GITCI-3 "fix(ts): repair 5 unparseable files; seed tsc ratchet baseline" (lands before or with PR-GITCI-2).

---

### CAT-AUDIT-1006 — API key committed in tracked `.mcp.json` (and duplicate `.mcp 2.json`)
- **Category:** Security / Repo Hygiene
- **Severity:** High
- **Surface:** Repository
- **File Path:** `.mcp.json`, `.mcp 2.json` (both tracked per `git ls-files --error-unmatch`)
- **Mode / CRE / ADS / Typography / Performance / Accessibility:** n/a
- **Evidence:** Both files contain a TestSprite MCP server block with `"API_KEY": "sk-user-…"` — a real, non-placeholder credential prefix — under `env`. Value confirmed present (not inspected further, not reproduced here).
- **Why:** A live third-party API key is in git history for every collaborator/CI runner. Unlike the tracked env files (see CAT-AUDIT-1008) this is **not** an anon/publishable key by design.
- **Recommended Fix:** Rotate the TestSprite key immediately; move the key to `~/.claude` user-level config or an env var reference; remove it from both files; delete `.mcp 2.json` entirely (Finder-duplicate junk). History scrub (filter-repo) is a Vikram decision — rotation makes it moot.
- **Regression Risk:** Low — only TestSprite MCP sessions affected until members re-add the key locally.
- **Validation Required:** `git grep 'sk-user-'` returns nothing on HEAD; TestSprite MCP still connects with the relocated key.
- **Suggested PR:** PR-GITCI-4 "chore(security): remove committed TestSprite API key, drop .mcp duplicate" — flag to Vikram before merging (key rotation is out-of-repo).

---

### CAT-AUDIT-1007 — 13 tracked macOS " 2." duplicate files, incl. duplicate source modules; multi-MB audit dumps and zips tracked
- **Category:** Repo Hygiene / Size
- **Severity:** Medium
- **Surface:** Repository
- **File Path (duplicates, all tracked):** `.claude/scheduled_tasks 2.lock`, `.env 2.development`, `.mcp 2.json`, `KEYBOARD_SHORTCUTS_IMPLEMENTATION_SUMMARY 2.md`, `TESTHUB_GAP_ANALYSIS 2.md`, `TESTHUB_VERIFICATION_REPORT 2.md`, `bun 2.lockb`, `design-governance/rules/font-import-enforcer 2.js`, `src/components/project-hub/dashboard/widget-types 2.ts`, `src/components/project-hub/dashboard/widgets/TeamMemberHoverCard 2.tsx`, `src/lib/jira-changelog-mapper/mapper 2.ts`, `src/lib/jira-changelog-mapper/mapper.test 2.ts`, `supabase/functions/wh-jira-changelog-backfill/mapper 2.ts` (13 total, `git ls-files | grep -cE ' 2\.'`)
- **File Path (bulk):** `ads-audit-phase-3-final.txt` (8.3 MB), `ads-audit.json` (5.7 MB), `icons.zip` (428 KB), `bun.lockb` + `bun 2.lockb` (1.7 MB each)
- **Mode / CRE / ADS / Typography / Accessibility:** n/a
- **Performance:** Repo pack size 115.74 MiB / `.git` 154 MB for an 8,269-file tree; the dumps and duplicate binaries are permanent history weight. `git count-objects -vH`: in-pack 214,469 objects, 11 packs, 1,358 prune-packable.
- **Evidence:** Listings above from `git ls-files` + `du -k`. The " 2." pattern is macOS Finder copy artifacts committed wholesale (symptom of `git add -A`-style staging, which COMMIT GATE bans). Four of the duplicates are **live-looking source files inside `src/` and `supabase/functions/`** — a wrong import (`widget-types 2`) would resolve and silently fork behavior.
- **Why:** Junk source duplicates are a correctness hazard, not just clutter; multi-MB generated audit output belongs in CI artifacts, not the tree.
- **Recommended Fix:** `git rm` all 13 " 2." files (diff each against its sibling first — keep any unique content); `git rm` the two ads-audit dumps and `icons.zip`; add `.gitignore` entries: `* 2.*`, `ads-audit*.txt`, `ads-audit*.json`. Bun lockfiles: remove per CAT-AUDIT-1000 decision.
- **Regression Risk:** Low — verify with `grep -rn "widget-types 2\|TeamMemberHoverCard 2\|mapper 2" src supabase` that nothing imports a duplicate before deleting.
- **Validation Required:** Build green after removal; grep shows zero imports of removed paths.
- **Suggested PR:** PR-GITCI-5 "chore(repo): purge Finder-duplicate files and generated audit dumps".

---

### CAT-AUDIT-1008 — Tracked `.env*` backup files (anon keys only, but noise + bad precedent)
- **Category:** Repo Hygiene
- **Severity:** Low
- **Surface:** Repository
- **File Path:** `.env.local.prod-backup`, `.env.local.staging-backup`, `.env.staging`, `.env.development`, `.env 2.development` (all tracked)
- **Mode / CRE / ADS / Typography / Performance / Accessibility:** n/a
- **Evidence:** Key inventory limited to `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_ENABLE_*` feature flags. `.env.development` header explicitly documents these as publishable anon credentials, committed intentionally. `.gitignore:30` covers `.env` but not the `-backup` variants.
- **Why:** `.env.development` is a documented, deliberate exception — fine. The `*-backup` files and the " 2." duplicate are not: they train contributors that env files are committable, and the `.local.` infix conventionally means "never commit". One day a backup will contain a service-role key.
- **Recommended Fix:** `git rm` the two `-backup` files and `.env 2.development`; extend `.gitignore` with `.env.local*` and `.env*backup*`. Keep `.env.development`/`.env.staging` only if Vikram confirms they are the intentional pattern.
- **Regression Risk:** None at runtime (Vite doesn't load `-backup` names).
- **Validation Required:** Dev server boots with unchanged env resolution.
- **Suggested PR:** PR-GITCI-5.

---

### CAT-AUDIT-1009 — Commit conventions: 85% conventional; violations cluster in the same sessions as the broken files
- **Category:** Git Standards
- **Severity:** Low
- **Surface:** Git history
- **File Path:** n/a
- **Mode / CRE / ADS / Typography / Performance / Accessibility:** n/a
- **Evidence:** Over the last 300 non-merge commits, 256 (85.3%) match `type(scope): subject`. Violations sampled from the last 200: `Update CatalystHeader.tsx`, `Update Board.tsx`, `Update types.ts`, `Update InlineCreateCard.tsx`, `ccc i dnt know what i did` (×2), `I don't know what I did.`, `cc intstall depen`, `design governance`, `lot of items fixed`, `some fixes`, `minor fixes`, `im home bhai component`, `Added figma icon`, `timeline table ellipses column`. Note `eaa1f912d "cc"` is the commit that landed the broken `icon-registry.ts` (CAT-AUDIT-1005) — the convention violations and the quality escapes are the same events. Also observed: repeated duplicate-subject commit pairs (e.g. `815ee8071`/`4b7e947a2`, `e023c360c`/`05e0eb5e4`) from cross-branch cherry-pick + merge flow — noisy but benign.
- **Why:** "i dnt know what i did" commits on main defeat bisection, changelog generation, and the COMMIT GATE's "commit message approved" requirement.
- **Recommended Fix:** Add commitlint (`@commitlint/config-conventional`) as a `commit-msg` husky hook — warn-only for one week, then blocking. Types allowlist: feat|fix|docs|chore|refactor|test|perf|build|ci|revert.
- **Regression Risk:** None (tooling only).
- **Validation Required:** Hook rejects a nonconforming message locally; conforming messages pass.
- **Suggested PR:** PR-GITCI-6 "ci: commitlint hook + PR template" (with 1010).

---

### CAT-AUDIT-1010 — No PR template; PR standards exist only in CLAUDE.md prose
- **Category:** Git Standards
- **Severity:** Low
- **Surface:** GitHub PR flow
- **File Path:** `.github/` (no `PULL_REQUEST_TEMPLATE.md` — confirmed absent)
- **Mode / CRE / ADS / Typography / Performance / Accessibility:** n/a
- **Evidence:** `ls .github/PULL_REQUEST_TEMPLATE*` → no matches. Eight workflows exist (including `claude-pr-review.yml`) but nothing structures the human-facing PR body around the COMMIT GATE checklist.
- **Why:** The COMMIT GATE (Feature Work ID, session log, Plan Lock, raw validation output, screenshot acceptance, guardrails, file list) is enforced only by agent discipline. A template makes it reviewer-checkable.
- **Recommended Fix:** Add `.github/PULL_REQUEST_TEMPLATE.md` mirroring the COMMIT GATE — see the Multi-PR Strategy Standard below for the exact template.
- **Regression Risk:** None.
- **Validation Required:** New PR shows template.
- **Suggested PR:** PR-GITCI-6.

---

## Positive findings (no defect raised)

- **Branch hygiene is clean.** `git branch -r | wc -l` → 6 refs (origin/HEAD + main + 3 `catalyst/*` session branches + origin marker). Every remote branch's last commit is dated **2026-07-03** (today). **Zero branches older than 30 days.** No action needed; the worktree-per-session discipline added 2026-07-03 to CLAUDE.md appears to be working.
- **Ratchet-gate pattern is proven.** Color gate, audit gate, and CRE gate are blocking in both pre-commit and CI — the template for the missing tsc/eslint gates already exists in-repo.
- **338 test files tracked** — the test base is real; only the CI invocation needs tightening.

---

## Multi-PR Strategy Standard (Lane 11 deliverable, item 7)

Standard for splitting remediation (this audit and future sweeps) into reviewable PRs. Binds to the CLAUDE.md **COMMIT GATE** and **TWO-HOUR SLICE RULE**.

### Branch naming
```
fix/CAT-AUDIT-<ID>-<kebab-slug>        # single-finding fix
chore/CAT-<AREA>-<FEATURE>-pr<N>-<slug> # slice N of a multi-PR feature
```
- One Feature Work ID per branch; branch created from fresh `origin/main`; one session = one worktree (per CLAUDE.md concurrent-sessions rule).
- No direct commits to `main`. Session branches (`catalyst/*`) merge via PR only.

### PR sizing
- One concern per PR (e.g. lockfile ≠ ratchet gates ≠ junk purge — hence PR-GITCI-1…6 above).
- ≤ ~400 changed lines of hand-written diff, or one mechanical transform however large (state which).
- Each PR independently revertable: no PR may depend on an unmerged sibling except where declared in a "Depends-on:" line.

### PR template (proposed `.github/PULL_REQUEST_TEMPLATE.md`)
```markdown
## Feature Work ID
CAT-...

## What / Why
<one paragraph>

## COMMIT GATE checklist
- [ ] Session log: features/<ID>/sessions/<NNN>_<purpose>.md
- [ ] Plan Lock approved (or N/A + reason)
- [ ] Raw validation output pasted below
- [ ] Screenshots attached (UI changes) or "no UI delta"
- [ ] Guardrails: no bare colors, no hand-rolled UI, no assumption defaults
- [ ] Explicit file list staged (no git add -A / .)

## Validation evidence
<raw command output: tsc gate, lint gate, color gate, audit gate, cre gate, vitest>

## Rollback plan
<single git revert? feature flag? data migration reversal? state it>

## Depends-on
<PR link or "none">
```

### Per-PR validation gates (must be green, in order)
1. `npm ci` (post PR-GITCI-1) — install determinism
2. `npx tsc -p tsconfig.app.json --noEmit` → count ≤ committed baseline (tsc ratchet)
3. `npm run lint` → count ≤ baseline (eslint ratchet)
4. `npm run lint:colors:gate` (existing, blocking)
5. `npm run audit:ads:gate` (existing, blocking)
6. `npm run lint:cre` (existing, blocking)
7. `npx vite build`
8. `npx vitest run` (no `--passWithNoTests`)
9. UI-touching PRs: screenshot acceptance per CATALYST_UI_UX_ACCEPTANCE.md

### Rollback plan requirements (mandatory PR-body section)
- Every PR states its rollback: default is "single `git revert <merge-commit>` is clean" and the author must verify the revert applies without conflict at open time.
- PRs touching `supabase/migrations/` must include the inverse migration or an explicit "irreversible — restore-from-backup" declaration, plus the project-ref check evidence (prod `lmqwtldpfacrrlvdnmld` vs staging `cyijbdeuehohvhnsywig`).
- PRs changing CI gates must state how to restore the previous gate baseline (baselines only ratchet down; a revert restores the old JSON).

### Suggested PR train for this lane
| PR | Contents | Findings |
|---|---|---|
| PR-GITCI-1 | Commit package-lock.json; `npm ci` + cache in CI; drop rollup-hoist step; remove bun lockfiles | 1000 |
| PR-GITCI-2 | tsc + eslint ratchet gates (scripts, baselines, ci.yml, pre-commit); remove `--passWithNoTests` | 1001, 1002, 1003, 1004 |
| PR-GITCI-3 | Repair 5 unparseable files; seed tsc baseline | 1005 |
| PR-GITCI-4 | Remove committed TestSprite API key (after rotation — Vikram) | 1006 |
| PR-GITCI-5 | Purge " 2." duplicates, audit dumps, icons.zip, env backups; .gitignore hardening | 1007, 1008 |
| PR-GITCI-6 | commitlint hook + PR template | 1009, 1010 |

Order: 3 → 2 (baseline seeds from repaired tree) → 1 → 4 → 5 → 6. PR-GITCI-4 can jump the queue the moment the key is rotated.

---

## Lane Summary

**11 findings raised (CAT-AUDIT-1000 … CAT-AUDIT-1010): 4 High, 4 Medium, 3 Low. 1 security item requiring out-of-repo action (key rotation).**

- **High:** no lockfile + `npm install` CI (1000); non-blocking tsc (1001); tsc debt regressed to 183 errors with 5 unparseable files committed to main, two on live surfaces (1005); committed `sk-user-…` API key in tracked `.mcp.json` (1006).
- **Medium:** non-blocking eslint (1002); `--passWithNoTests` masking discovery failures on a Node-20 runner with known vitest fragility (1003); missing tsc/eslint ratchets despite an in-repo proven ratchet pattern (1004); 13 tracked Finder-duplicate files incl. `src/` source dupes + 14 MB of committed audit dumps (1007).
- **Low:** tracked env backups (1008); 85% conventional-commit compliance with junk messages tied to the same commits that shipped broken files (1009); no PR template operationalizing the COMMIT GATE (1010).
- **Clean:** remote branch hygiene — 5 branches, all current today, zero stale >30 days.
- **Deliverable:** Multi-PR Strategy Standard defined above (branch naming, PR template, 9 ordered validation gates, rollback requirements, 6-PR remediation train).
