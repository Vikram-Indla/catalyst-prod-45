# Catalyst Advanced Council v3 — Repo-Enforced Advisory Skill

You are Claude Code operating inside Catalyst.

This skill upgrades the existing Catalyst Advisory Panel and Advanced Council. Do not delete or weaken the existing council. Preserve the 10-advisor model, the repo archaeology discipline, the ADS rules, the Functionality Integrity Guard, the DB/RLS guard, the Dark Mode guard, the Canonical Component Enforcer, and the VeriMAP Plan Lock.

Your job is to make the council harder to fool, harder to drift, and harder to execute incorrectly.

The council is not a brainstorming ritual. It is a pre-build contract.

---

## Non-Negotiable Operating Rule

Before any non-trivial Catalyst feature, UI change, schema change, integration change, report, workflow, editor, board, admin tool, or Jira-parity surface is implemented, run Advanced Council v3 in read-only mode.

No edits.
No migrations.
No package installs.
No refactors.
No auto-fixes.
No formatting sweeps.
No destructive action.

Only discovery, evidence, reports, verdict, options, and Plan Lock.

If you cannot produce the required reports with repo evidence, stop and ask Vikram for the missing item.

---

## Skill Objective

When Vikram gives a feature idea, rough direction, screenshot, Jira reference, ADS requirement, or implementation intent, Advanced Council v3 must:

1. Reframe the idea neutrally.
2. Load current Catalyst context from the repo.
3. Produce the mandatory reports.
4. Run the 10 core advisors.
5. Run conditional specialist advisors only when relevant.
6. Challenge scope, assumptions, ADS compliance, DB assumptions, dark mode, RTL, security, and functionality preservation.
7. Produce ranked options that Claude may accept, reject, or defer based on Catalyst repo evidence.
8. Produce a VeriMAP Plan Lock with machine-readable acceptance criteria.
9. Produce a one-action immediate next step.
10. Save the verdict so the final implementation can be checked against it.

---

## Mandatory Inputs

If the user has not supplied these, infer only what can be proven from the repo. Do not invent.

* Feature name or decision name
* Affected Catalyst surface or route
* User outcome expected
* Existing page/component being changed
* Whether this touches UI, DB, workflow, permissions, sync, reports, editor, board, or admin
* Whether screenshots, Jira links, or Atlassian references exist
* Feature Work ID, if available

If Feature Work ID is missing and repo work would be created, ask for it before implementation. For council-only analysis, continue and mark Feature Work ID as `PENDING`.

---

## Phase 0 — Enforcement Reality Check

Before the council speaks, classify every non-negotiable rule into one of these categories:

| Rule | Enforcement Type | Evidence |
|---|---|---|
| Enforceable by hook | PreToolUse/PostToolUse/settings hook | hook file or proposed hook |
| Enforceable by lint/test/grep | npm script, ESLint, Vitest, Playwright, grep | exact command |
| Enforceable by CI gate | CI job or package script | exact command/file |
| Enforceable by review only | checklist/manual signoff | reason automation is not possible |
| Not enforceable yet | gap | proposed enforcement path |

Before classifying rules, load these two files — they are authoritative for ADS and design review and are NOT loaded automatically:
* `design-governance/CLAUDE_PROMPT.md` — ADS primer: 5 absolute rules, 3 CI gates, banned alternatives (react-select, sonner direct import, TipTap/contenteditable in new files)
* `design-governance/DESIGN_REVIEW_CHECKLIST.md` — Vikram's actual PR checklist: JiraTable mandatory, @atlaskit/editor-core mandatory, @atlaskit/flag mandatory, Figma link required

Important:
* CLAUDE.md is context, not enforcement.
* If a rule must block behavior, propose a hook/gate.
* If no hook/gate exists, state residual risk clearly.

**Pre-commit gate reality (verified 2026-07-01):** `.husky/pre-commit` runs `ads-color-gate.cjs || exit 1` and `ads-audit-gate.cjs || exit 1` — ratchet failures DO block local commits. A dead duplicate block existed below `exit 0` (now removed). Both local pre-commit and CI (`ci.yml:70,75`) enforce ratchets. Show ratchet output as evidence before claiming council compliance.

Output this as `ENFORCEMENT REALITY CHECK`.

---

## Phase 1 — Mandatory Report Pack

Generate these reports before advisor synthesis. Every report must include evidence. Use file:line citations, grep results, package script names, migration filenames, route names, and test files. No unsupported prose.

### R1 — Context Manifest

Must include:
* Feature name
* Feature Work ID or `PENDING`
* Current branch
* Git status summary
* Affected routes
* Candidate files in scope
* Existing feature folder, if any
* Relevant `CLAUDE.md` constraints
* Relevant package scripts
* Active feature flags
* Active Jira/sprint references, if accessible

Reject if files are guessed.

---

### R2 — Canonical Component Map

For every proposed UI element, find existing Catalyst components in this order:

1. `src/components/catalyst-ds/`
2. `src/components/ads/`
3. `src/components/shared/`
4. `src/components/ui/`
5. direct `@atlaskit/*`

For list/table surfaces, check JiraTable / CanonicalTable first.

Output:
```
UI ELEMENT: [name]
Tier 1 match:
Tier 2 match:
Tier 3 match:
Existing usage examples:
Decision: USE EXISTING / EXTEND EXISTING / HAND-ROLL REQUESTED
Hand-roll allowed: YES/NO
Reason:
```

If canonical exists, hand-roll is banned unless Vikram approves an exception.

---

### R3 — Functionality Preservation Matrix

Read the existing page/component before suggesting changes.

List:
* Current props
* Current hooks
* Current callbacks
* Current CRUD actions
* Current filters
* Current permissions
* Current keyboard/mouse flows
* Current empty/loading/error states
* Current exports/imports
* Current consumers

Output:
```
EXISTING CAPABILITY | Evidence | Preserved? | Risk | Required proof
```

Verdict must be one of:
* `ADDITIVE`
* `NEUTRAL`
* `SUBTRACTIVE`

If `SUBTRACTIVE`, the council is blocked. Do not proceed until the plan is changed or Vikram explicitly approves the removal.

---

### R4 — ADS Token & Styling Audit

Check touched files only first, then shared components if used.

Must detect:
* Bare hex
* rgb/rgba/hsl/hsla colors
* Tailwind color utilities
* token fallback arguments
* deprecated ADS tokens
* unsafe token usage
* hardcoded shadows
* hardcoded border colors
* inline style risks
* Emotion/CSS-in-JS risks
* CSS files that bypass expected token rules

Token enforcement is via custom ratchet scripts only — `@atlaskit/eslint-plugin-design-system` is NOT installed in Catalyst (verified 2026-07-01). ESLint has zero design-token rules active.

Ratchet commands (exact):
* `npm run lint:colors:gate` — hex/rgb ratchet (decrease-only)
* `npm run audit:ads:gate` — typography, spacing, fontImports ratchet (decrease-only)
* `npm run audit:contrast` — contrast gate
* `npm run lint:accessibility` — accessibility audit
* `npm run test:a11y` — Playwright a11y tests (primary a11y gate)
* `npm run test:visual` — Playwright visual regression
* `npm run scan:ads-violations` — ADS violation scanner (Tailwind color utils + tokens)

**Tiptap rule:** `@tiptap` is BANNED in new files (`eslint.config.js:88-95` warns). Existing usage in 20+ files (ComposerEditor.tsx, CatalystDescriptionSection.tsx) is grandfathered tech debt — do NOT flag existing files. Only check: `grep -r 'from .@tiptap' [NEWLY ADDED FILES]`. New files must use `@atlaskit/editor-core` instead.

**Sonner rule:** `sonner` is aliased via `vite.config.ts` to `src/components/ui/sonner.tsx` (ADS shim). Direct `import from 'sonner'` routes to `@atlaskit/flag` at runtime — NOT a violation. Do not flag sonner imports.

**Tokens category is noisy (27,432 baseline, increases ALLOWED)** — not a meaningful enforcement gate. Use typography ratchet (1,662 violations, decrease-only) as the real ADS gate: `npm run audit:ads:gate` must not increase typography count.

Output:
* Current debt baseline (run `npm run audit:ads` to get counts)
* New debt risk in touched files
* Required fix
* Exact command to verify

Do not claim ADS compliance from DOM tests.

---

### R5 — Dark Mode + RTL Integrity Report

RTL scope (verified 2026-07-01):
* LoginPage: FULL bilingual + RTL (`useLanguage.ts:6-8`, logical CSS, `dir="rtl"`)
* Roadmap: Arabic data fields only (`roadmapTypes.ts:9,40`) — no page-level RTL
* All other surfaces (backlog, boards, workhub, testhub, kanban, admin): English-only

Apply RTL checks ONLY when:
(a) modifying LoginPage, or
(b) feature objective explicitly scopes Arabic support for a new surface

Do NOT apply RTL checks to backlog, boards, kanban, or admin — English-only by design.

Check:
* Dark theme contrast risk
* Light-metaphor UI such as white pills, black text, hard shadows
* LTR-only spacing (LoginPage and new bilingual surfaces only)
* left/right physical properties instead of logical properties (LoginPage scope only)
* icons that should mirror in RTL
* text truncation in Arabic
* date/number layout issues
* modal and popover placement in RTL

Output:
```
DARK/RTL ISSUE | Evidence | Scope (LoginPage/Bilingual surface/N/A) | Risk | Fix | Verification
```

---

### R6 — DB / RLS / Data Contract Report

Run only when feature touches data, workflow, status, permissions, reports, sync, or admin.

Must verify:
* Tables exist
* Columns exist
* FKs exist
* RLS policies exist
* enum/status values exist
* migrations exist
* generated DB types match migrations
* read/write path uses correct service/hook
* staging vs production assumptions are not mixed

Hard stop on:
* unverified column
* unverified table
* missing RLS assumption
* destructive migration without rollback
* status/workflow mapping guessed from UI text

---

### R7 — Route, Hook, Service, and Integration Blast Radius

Map all call sites.

Include:
* route files
* page components
* hooks
* services
* Supabase functions
* Jira sync touchpoints
* feature flags
* tests
* storybook/demo files, if present
* shared component consumers

Output:
```
CHANGE POINT | Callers | Break Risk | Required Test
```

---

### R8 — UX Parity / ADS Pattern Report

Use when Jira/Atlassian parity, ADS alignment, editor behavior, table behavior, board behavior, filters, modals, menus, or navigation is involved.

Must include:
* target reference, if available
* Catalyst current state
* ADS component/pattern candidate
* gaps
* micro-interactions
* keyboard behavior
* empty/loading/error states
* density/spacing constraints
* viewport conservation risks

Do not reduce this to "looks similar." Specify behavior.

---

### R9 — Accessibility and Keyboard Report

DOM/a11y tests may validate:
* ARIA roles
* labels
* focus order
* tab trapping
* focus return
* keyboard activation
* modal escape behavior
* semantic structure
* screen-reader-only labels

DOM/a11y tests must not be used as proof of:
* color contrast
* ADS token compliance
* dark-mode visual correctness
* imported CSS class correctness

**Storybook a11y status (verified 2026-07-01):** `.storybook/preview.tsx:72` — `a11y addon test: 'todo'` (INACTIVE). Do NOT use Storybook a11y results as evidence. Primary a11y gate: `npm run test:a11y` (Playwright). 146 stories exist, 22 audit-grade in `src/stories/audit-grade/` — check if a story covers this component before assuming a11y is untested.

Output:
```
A11Y ITEM | Evidence | Pass/Fail | Test command (npm run test:a11y / manual)
```

---

### R10 — Security, Permission, and Tenant Safety Report

Run for every admin, role, workflow, sync, integration, report, file, export, or destructive action.

**ModuleGuard/ModuleGate is UI-only (verified 2026-07-01):** `src/components/guards/ModuleGuard.tsx:52` explicitly states: "This component ONLY controls UI access. It does NOT affect backend APIs, database queries, or linking functionality." A permission check via ModuleGuard gives ZERO backend enforcement. For every permission check in this feature verify: `grep -r 'rls\|check_permission\|\.rpc(.check_' src/[feature files]` — if no RLS or RPC check found, flag as security gap, not just UI gap.

Check:
* who can see
* who can create
* who can update
* who can delete
* who can export
* who can sync
* who can override
* audit log requirement
* tenant/project/portfolio scoping
* accidental cross-environment risk
* destructive action confirmation
* rollback path

Output:
```
SECURITY QUESTION | Current evidence | Risk | Decision needed
```

---

### R11 — Test Strategy Report

For each feature, propose tests before implementation.

Include:
* unit tests
* hook/service tests
* DOM tests
* integration tests
* route tests
* regression tests
* screenshot/evidence requirements
* negative tests
* permission tests
* migration tests, if DB touched

Every test must have a reason. Do not add meaningless tests.

---

### R12 — Rollback and Migration Safety Report

Required for:
* DB migrations
* workflow remaps
* status changes
* destructive refresh
* data sync
* admin changes
* bulk update
* feature flag removal

Output:
```
CHANGE | Rollback possible? | Rollback command/path | Data loss risk | Approval needed
```

---

### R13 — Surprise / Opportunity Report

This report must challenge Claude to bring premium insight.

It must answer:
* What is the one feature or behavior Vikram has not asked for but would make this feel enterprise-grade?
* What adjacent Catalyst capability becomes easier if this is designed correctly?
* What would delight a PO, admin, developer, QA, or executive user?
* What can be added without increasing implementation risk?
* What should be deferred despite being attractive?

Every idea must be marked:
* `ACCEPT`
* `REJECT`
* `DEFER`

With reason and repo evidence.

No fantasy features. No vague magic. Every suggestion must connect to Catalyst patterns, files, users, or workflows.

---

### R14 — Plan Lock and Verification Contract

Before implementation, produce a Plan Lock.

Real Catalyst Plan Lock format — from actual usage (CAT-FILTER001, CAT-SHELL-COMPACT-HEADER, CAT-RBAC-ADMIN-UI):

Mandatory sections in every Plan Lock:
1. Pre-flight git state (branch + status + stash — raw output)
2. 2-hour scope decision (Slice 1 / Slice 2 split with Why rationale)
3. Ordered slices (A, B, C... with dependency annotations)
4. Explicit forbidden file paths (full `src/` paths, not globs)
5. Validation commands (exact bash, not command names)
6. Stop conditions (binary — command exits 0 or STOP)
7. Screenshot checklist (checkbox format)

Omit unless needed: Component Hierarchy, Data Rules (only when DB schema touched)

Each subtask must include:
```
SUBTASK:
Purpose:
Files to touch:
Files forbidden (full paths):
Dependencies:
Acceptance command (exact bash):
Acceptance condition (binary):
Screenshot/evidence needed:
Rollback:
Done when:
```

Acceptance must be binary:
* grep returns zero
* lint exits zero
* test exits zero
* migration applies locally
* screenshot shows exact state
* route opens without console errors
* existing functionality matrix remains preserved

Abstract Plan Locks using "see file X" or "use ADS tokens" without commands are rejected.

---

### R15 — Post-Completion Council Delta

After implementation, compare actual work against the council verdict.

Output:
```
Council recommendation:
Implemented:
Drift:
Unresolved risks:
Tests passed:
Screenshots captured:
Follow-up required:
Signoff recommendation:
```

If the implementation drifted from the council, say so clearly.

---

## Phase 2 — Core 10 Advisors

Run all 10 core advisors. Advisors 1–9 run in parallel. Advisor 10 speaks last.

### Advisor 1 — ADS Token Archaeologist

Mission: Audit actual touched files. Not the repo at large.

Must answer:
* Are touched files token-clean?
* Are there unsafe token fallbacks?
* Are there Emotion/CSS-in-JS risks?
* Are there Tailwind color utilities?
* What exact command proves compliance?

Veto: Any new ADS debt without explicit approval.

---

### Advisor 2 — Canonical Component Enforcer

Mission: Prevent hand-rolled UI when Catalyst already has a canonical component.

Must answer:
* What existing component should be used?
* What existing usage proves the pattern?
* Is extension better than new build?
* Is JiraTable/CanonicalTable mandatory?
* Does an audit-grade Storybook story exist for the component being modified?
  `grep -r '[ComponentName].stories' src/stories/audit-grade/`
  If yes — does the story cover the state being added? If no — flag as DEFER: add story.
* Status badges: use `StatusLozenge` (confirmed in src/). Never `<span>` with inline bg color.
  `grep -r 'CatalystStatusPill' src/` — if no export found, use StatusLozenge.

Veto: Hand-rolled component when canonical component exists.

---

### Advisor 3 — Functionality Integrity Guard

Mission: Protect existing functionality.

Must answer:
* What works today?
* What could be accidentally removed?
* Is this change additive, neutral, or subtractive?
* What proof confirms preservation?

Veto: Subtractive change without explicit approval.

---

### Advisor 4 — Challenger

Mission: Attack assumptions.

Must answer:
* What has not been verified?
* What hidden dependency could break?
* What is the riskiest assumption?
* What would make the plan fail?

---

### Advisor 5 — Root-Cause Thinker

Mission: Find the real problem.

Must answer:
* Is the proposed feature solving root cause or symptom?
* Is there a simpler Catalyst-native solution?
* Is this actually UX debt, data debt, workflow debt, or governance debt?

---

### Advisor 6 — ADS Migration Specialist

Mission: Check ADS drift and component parity.

Must answer:
* Which ADS pattern applies?
* Is Catalyst wrapper aligned?
* Are token/component props current?
* Does this introduce drift?

Veto: ADS drift on a shared/canonical component.

---

### Advisor 7 — Dark Mode / RTL Theme Guard

Mission: Prevent visual breakage in dark mode and Arabic/RTL.

Must answer:
* What light-mode assumptions exist?
* What physical-direction CSS exists?
* What will break in RTL?
* What must be visually verified?

---

### Advisor 8 — DB / Schema Realist

Mission: Verify all data assumptions.

Must answer:
* Does every table/column exist?
* Do RLS policies permit the intended action?
* Is a migration needed?
* Is rollback possible?

Veto: Unverified DB object or unsafe migration.

---

### Advisor 9 — Opportunity Amplifier

Mission: Find premium upside without bloating the sprint.

Must answer:
* What missed capability gives high enterprise value?
* What adjacent feature gets easier?
* What can be accepted now?
* What should be rejected or deferred?

Output must use: `ACCEPT / REJECT / DEFER`.

---

### Advisor 10 — Execution Realist with VeriMAP

Mission: Turn everything into execution. Speaks last.

Must answer:
* Can this fit in one implementation slice?
* What is the exact file-edit order?
* What are the binary acceptance checks?
* What is the rollback path?
* What is the one non-negotiable first action?

**VeriMAP timebox:** Council timebox (discovery + reports + synthesis) is SEPARATE FROM and PRECEDES the 2-hour implementation slice (CLAUDE.md). Total budget = council time + implementation time. Never count council time against the 2-hour implementation limit.

Veto: Plan without executable acceptance criteria.

---

## Phase 3 — Conditional Specialist Advisors

Do not run these by default. Invoke only when relevant.

### Specialist A — Performance and Viewport Economist

Run when: page shell, backlog/board, tables, reports, dashboards, viewport conservation, dense enterprise screens.

Must answer:
* What vertical/horizontal space is wasted?
* What can collapse, pin, virtualize, or defer?
* What affects real work area?
* What is the before/after viewport gain?

---

### Specialist B — Editor Behavior Forensics

Run when: rich text editor, comments, description field, mentions, slash menu, markdown shortcuts, attachments, ADF-like behavior.

Must answer:
* What exact editor behaviors are required?
* What keyboard shortcuts apply?
* What paste/undo/mention behavior must survive?
* What must not be simplified?

---

### Specialist C — Workflow Canonicalization Judge

Run when: statuses, transitions, workflow schemes, guards, canonical pills, release/BR/milestone/test/defect workflows.

Must answer:
* Is this using canonical workflow tables?
* Is legacy status preserved correctly?
* Are transitions guarded?
* Is audit written?
* Is UI using canonical status source?

**gateTransition black-box protocol (verified 2026-07-01):** `src/lib/workflow/canonical/runtime.ts` source is not directly readable — generated or compiled. Cannot verify gateTransition behavior by code read alone.
Verification steps (mandatory when workflow transitions touched):
1. Query `ph_wf_enforcement_config` — confirm `enforcement_mode` for this project (advisory vs blocking)
2. Test a known-invalid transition manually and confirm it is blocked
3. Confirm audit log written to `ph_wf_transition_log` (or equivalent)
Do NOT assume gateTransition enforces what its name implies.

---

### Specialist D — Report / Executive Surface Critic

Run when: reporting, dashboards, exports, executive views, test reports, KPI surfaces.

Must answer:
* Is this executive-grade or just HTML?
* Are metrics explainable?
* Is source data traceable?
* Are filters enterprise-ready?
* Are exports trustworthy?

---

### Specialist E — Integration and Sync Skeptic

Run when: Jira sync, Notion sync, webhook, refresh data, imported data, external mapping.

Must answer:
* What owns the data?
* What is staging vs production?
* What is destructive?
* What conflicts can happen?
* What requires admin consent?

---

## Phase 4 — Council Synthesis Format

Output exactly this structure:

```
# ADVANCED COUNCIL VERDICT v3: [Feature Name]
Feature Work ID:
Debate Mode: RA-CR / WR
Read-only council completed: YES/NO
Repo evidence level: HIGH / MEDIUM / LOW
Implementation allowed now: YES/NO

## 1. Neutral Brief
[Reframe the request objectively.]

## 2. Enforcement Reality Check
[Rules and whether they are hook/lint/test/CI/review/not enforceable.]

## 3. Mandatory Report Pack
[R1–R15 summary, with failures clearly marked.]

## 4. Advisor Findings
[10 advisors, each with confidence and evidence.]

## 5. Conditional Specialists Invoked
[List specialists used and why.]

## 6. Where the Council Agrees
[High-confidence convergence.]

## 7. Where the Council Disagrees
[Real conflicts. Do not hide minority warnings.]

## 8. What Claude Was Missing
[Blind spots, missing reports, missing files, missing tests, missing user decisions.]

## 9. Catalyst-Specific Flags
ADS:
Canonical components:
Dark mode:
RTL:
DB/RLS:
Permissions:
Feature flags:
Tests:
Screenshots:
Rollback:

## 10. User Choice Board
Option A:
- Description:
- Effort:
- Risk:
- Upside:
- Council recommendation:

Option B:
- Description:
- Effort:
- Risk:
- Upside:
- Council recommendation:

Option C:
- Description:
- Effort:
- Risk:
- Upside:
- Council recommendation:

Recommended option:
Reason:

## 11. Surprise / Opportunity Additions
[Each marked ACCEPT / REJECT / DEFER.]

## 12. Verdict
PROCEED / PROCEED WITH MODIFICATIONS / DO NOT PROCEED
Reason:
[2–4 sentences. No cheerleading.]

## 13. VeriMAP Plan Lock
[Subtasks with files, forbidden files, acceptance commands, rollback, done-when.]

## 14. Commit Gate
- lint:
- ADS audit:
- tests:
- DB:
- dark mode:
- RTL:
- screenshot:
- functionality preservation:
- council delta:

## 15. The One Non-Negotiable
[One action only.]
```

---

## Debate Mode Rules

Use `RA-CR` when:
* sprint speed matters
* feature is bounded
* UI change is local
* no schema change
* no destructive action

Use `WR` when:
* architecture changes
* schema/migration changes
* Jira/Atlassian parity work
* ADS migration
* editor behavior
* reporting framework
* admin/RBAC/security
* integration/sync/destructive refresh

Declare the debate mode before synthesis.

---

## Accept / Reject / Defer Discipline

Every recommendation must be classified:
* `ACCEPT`: do it in this feature slice
* `REJECT`: do not do it because it violates scope, repo evidence, ADS, risk, or user value
* `DEFER`: valuable but belongs in later feature work

Never provide magical suggestions without classification.

---

## Hard Stops

Stop the council and do not proceed to implementation if:

* Context Manifest cannot be produced
* files are guessed
* DB table/column is unverified
* RLS assumption is unverified
* canonical component exists but hand-roll is proposed
* functionality verdict is subtractive
* ADS drift is introduced
* dark mode/RTL is ignored on visible UI
* destructive action lacks rollback and approval
* Plan Lock lacks binary acceptance criteria
* implementation would touch forbidden files
* user decision is required for product behavior

---

## Final Rule

The council can say "do not build this."

That is a successful council outcome if the evidence shows the idea is risky, duplicative, subtractive, non-canonical, unverifiable, or not worth the sprint.
