# STRATA E2E — QA Reference (hand-off sheet)

> **Status: NOT READY FOR QA.** This template is filled by the **repository owner** after the
> release gate below. QA starts ONLY after every `<FILL>` field is populated and the deployed SHA
> is confirmed. Do not distribute with blanks.

## 1. Owner release gate — complete IN ORDER before handing to QA
- [ ] **Review all 10 unpushed commits** on local `main` (`git log --oneline origin/main..HEAD`).
      Confirm each is intended for release (they span sessions: 006, 009, feature-gate, docs, and
      the STRATA fixes). Authors all show `Vikram-Indla` (shared checkout identity) — verify content, not name.
- [ ] **Reconcile `bun.lock`.** Ensure no stray lockfile churn from the abandoned feature-gate pin
      experiment; `git status` clean except intended changes; `bun install` reproduces the lock with no diff.
- [ ] **Push `main`** (clean fast-forward — local is 10 ahead / 0 behind): `git push origin main`.
      Do NOT force-push. Record the resulting SHA below.
- [ ] **Create the immutable QA tag** at that exact SHA (command in §2).
- [ ] **Deploy staging from that exact SHA** and **confirm** the deployed commit matches (Vercel
      dashboard → deployment → source commit). NOTE: `vercel-deploy.yml` only auto-deploys the
      `production` branch to prod; a staging URL for `main`/a SHA is a Vercel preview or a manual
      deploy — the owner must produce and confirm it.
- [ ] **Populate §3** and release to QA.

## 2. Exact tag command (run AFTER `git push origin main`; replace `<PUSHED_SHA>`)
```bash
# Annotated, immutable QA tag at the exact pushed commit:
git tag -a qa-strata-e2e-v2-20260711 <PUSHED_SHA> \
  -m "QA build — STRATA E2E v1+v2 (defects 001–015). Frozen for independent retest."
git push origin qa-strata-e2e-v2-20260711

# Verify the tag points at the intended commit and is on the remote:
git rev-list -n1 qa-strata-e2e-v2-20260711      # must equal <PUSHED_SHA>
git ls-remote --tags origin qa-strata-e2e-v2-20260711
```
(If the tag name is taken, bump the suffix — never move an existing tag.)

## 3. QA build reference — OWNER FILLS THESE (all mandatory)
| Field | Value |
|---|---|
| Deployed commit SHA (full) | `<FILL: 40-char SHA>` |
| Immutable QA tag | `qa-strata-e2e-v2-20260711` (confirm pushed) |
| Staging URL | `<FILL: confirmed Vercel staging/preview URL>` |
| Database target | Supabase **staging** `cyijbdeuehohvhnsywig` (confirm the deploy's `VITE_SUPABASE_URL` points here, NOT prod `lmqwtldpfacrrlvdnmld`) |
| Deploy source confirmed = SHA above? | `<FILL: yes + Vercel deployment id>` |
| Handed to QA (date / by) | `<FILL>` |

## 4. Scope of this retest
- **V1 defects 001–009:** use the companion `QA_ACCEPTANCE_CHECKLIST.md` (already in this folder).
- **V2 defects 010–015:** §5 below.
- **Rule:** screenshots are corroboration, not proof. Acceptance = DOM/URL/DB/console probes.
- **Posture:** NOTHING is closed by engineering. QA decides pass/fail against the documented
  acceptance criteria. Known tech debt to note-and-ignore: the `@atlaskit/feature-gate-js-client`
  "version skew" console warning (no confirmed functional impact; separate planned task
  `FOLLOWUP_ATLASKIT_DEP_ALIGNMENT.md`).

---

## 5. V2 acceptance checklist (defects 010–015)

### STRATA-E2E-010 — Strategic KPI authoring (Critical) — PARTIAL FIX, still OPEN
- **Route:** `/strata/kpis` → **New KPI**
- **Acceptance (delivered):** the New KPI form exposes the 5 ownership pickers — Accountable owner,
  Data owner, Reporter, Validator, Escalation owner. Create a KPI with an accountable owner →
  modal closes cleanly; the KPI detail page shows that owner populated (not blank).
- **DB probe:** `SELECT accountable_owner_id FROM strata_kpis WHERE name='<your test KPI>'` → non-null.
- **Scope limit (NOT delivered — do not fail 010 for this alone; it is a documented backend gap):**
  linking a KPI to a Theme/Objective **at creation** is intentionally absent — the server RPC
  `strata_link_element_kpi` rejects non-approved KPIs. Confirm the form copy says linking happens
  after approval from the Strategy Room, and that linking DOES work from **Strategy Room →
  KpiLinksModal** on an **approved** KPI.
- **Regression:** creating a KPI with NO owners still succeeds (draft). SoD: set Validator = the
  submitter → server rejects with a visible error, modal stays open, and **no duplicate KPI** is
  created if you fix it and resubmit (`SELECT count(*) … WHERE name='<test>'` = 1).
- **Console:** clean (ignore the feature-gate skew warning).

### STRATA-E2E-011 — Balanced Scorecard perspectives (High) — REQUIRES QA VALIDATION (not closed)
- **Route:** `/strata/admin` → **Perspectives**
- **Engineering position (to validate, not to trust):** current seed
  `Financial / Customer / Digital / People / ESG` was deemed authoritative (Vikram); the report's
  required five-perspective model was treated as a stale expectation. **No code change was made.**
- **QA action:** validate the IMPLEMENTED perspective set against the DOCUMENTED acceptance criteria
  / target operating model. If the documented model still requires
  `Financial / Customer & Market / Network & Infrastructure / Digital & Innovation / People & Capability`,
  this is a FAIL (data/spec mismatch), regardless of engineering's verdict. QA decides.

### STRATA-E2E-012 — Add Project Card to Portfolio (Critical) — REQUIRES QA VALIDATION (not closed)
- **Route:** `/strata/portfolio` → **Add member** (Member type = Project card)
- **Acceptance:** add a card with allocation/priority → members count increments, the row appears,
  modal closes. **DB probe:** `SELECT count(*) FROM strata_portfolio_memberships WHERE portfolio_id='<id>'`
  increments by 1; the card appears on the portfolio.
- **QA action:** confirm the write persists AND check the acceptance criteria for a required
  success signal — engineering found the write works but shows **no success toast** (intentional
  platform convention). If the AC requires explicit success feedback, flag it as a gap. QA decides.
- **Regression:** removing the member returns the count; no orphaned membership row.

### STRATA-E2E-013 — Portfolio card selector scoping + duplicates (High) — PARTIAL FIX, still OPEN
- **Route:** `/strata/portfolio` → **Add member** → **Project card** selector
- **Acceptance (delivered):** cards already in the portfolio are **excluded** from the selector;
  same-named twin cards are **disambiguated** by source, e.g. `ICP Project · Manual` vs
  `ICP Project · Jira: ICP`. Add one twin → it disappears from the selector; the surviving twin
  renders unambiguously.
- **Scope limit (NOT delivered — documented data/schema gap):** the selector is **not** scoped by
  Strategy Cycle or tenant — `strata_project_cards` has no `cycle_id` and `organization_id` is NULL
  on all rows; there is no org context in the UI. QA should confirm the dedup/exclusion behaviour
  but note cycle/tenant scoping remains open (it is a data + schema decision, not shipped here).

### STRATA-E2E-014 — Legacy Initiative selectable (High) — REQUIRES QA VALIDATION (not closed)
- **Route:** `/strata/portfolio` → **Add member** → **Member type**
- **Engineering position (to validate, not to trust):** `Project card` and `Initiative (legacy)`
  both remain, per REQ-019 (legacy Initiative kept for legacy rows; a seam-guard test enforces it).
  **No code change was made.**
- **QA action:** validate against the documented acceptance criteria. If the AC requires Initiative
  removed from the active workflow (or strictly read-only), this is a FAIL regardless of REQ-019.
  QA decides; a change here also requires updating `initiative.seam.guard.test.ts`.

### STRATA-E2E-015 — Import template download (High) — FIXED
- **Route:** `/strata/execution/import` → **Download STRATA import template**
- **Acceptance:** clicking the button downloads `strata_execution_import_template.xlsx` with 4 sheets
  (Project Cards, Milestones, Delivery Dependencies, Notes). If generation fails, an **actionable ADS
  error** now surfaces on the page (no silent failure) and the button shows an in-flight state.
- **Note for QA:** the generation logic was already correct; the fix adds failure surfacing. Verify
  the download succeeds; if you can force a failure (e.g. block the xlsx chunk), confirm the error
  renders rather than nothing.
- **Console:** clean (ignore the feature-gate skew warning).

---

## 6. Verification risk (carry into the QA report)
- **Vitest cannot run in this environment** (rolldown/Node `styleText` crash). Unit tests were NOT
  executed; the REQ-019 seam guard was verified by reading, not running. Treat "unit tests pass" as
  unproven until the toolchain is fixed.
- Vite dep-cache can corrupt on this checkout → `Boot Error: Failed to fetch dynamically imported
  module`. Fix: stop dev server, `rm -rf node_modules/.vite`, restart. This is an environment issue,
  not a defect.
