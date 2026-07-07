# GOD MODE DELIVERY MANUAL
### Catalyst full-stack AI delivery operating model — skills audit + SDLC SOP
**Date:** 2026-07-08 · **Auditor:** Fable 5 · **Evidence:** 3 parallel read-only audits of every SKILL.md across project (`.claude/skills/`, 27 dirs), user (`~/.claude/skills/`, 57 dirs), and plugin runtimes (`~/.claude/plugins/` + Cowork store). Facts cited from files; anything not read is marked **cannot confirm**.

> **Next audit due: ~2026-10-08 (quarterly).** No durable scheduler exists for this (session-based cron expires in ≤7 days), so this line is the reminder — whoever opens this file past the due date should re-run the 3-agent audit from §A's evidence line and refresh this manual. Last full pass: 2026-07-08 (Weeks 1–3 of §L executed; Week 4 agent-persona prune executed same day, expanded from the original criteria — see git history on this file's directory).

---

## A. EXECUTIVE DIAGNOSIS

The estate is a working system buried under three layers of sediment.

1. **Three runtimes, one namespace.** Skills resolve from (a) project `.claude/skills/`, (b) user `~/.claude/skills/`, (c) Claude Code plugins, plus (d) a *separate* Claude Desktop Cowork store (`anthropic-skills:*`, `design:*`, `cowork-plugin-management:*`) that is not under `~/.claude/plugins/` at all. Nine skills exist in 2–3 divergent copies. In every measured case except one, the **project copy is newest and richest** — the project repo is already the de-facto source of truth. The estate just hasn't admitted it.
2. **Documentation lies.** `.claude/skills/README.md` claims a "5-skill stack"; 27 skill dirs exist. `AGENT_PIPELINE.md` rosters only those 5. `/4` cross-references `/1` and `/2` aliases that don't exist. `skillui-catalyst/SKILL.md` is 0 bytes. User-level `catalyst-feature/` and `save-memory/` are empty dirs. User-level `jira-compare` points at **catalyst-prod-44** (repo is -45) and permits port 8081 (banned).
3. **Two competing merge-to-main automations.** `deploy` (git CLI, halts on conflict, gated) and `gitmerge` (drives **GitHub Desktop via computer-use**, auto-merges, auto-deletes remote branches, no PR gate, duplicated byte-identical in the Cowork store). Two mechanisms for the most destructive workflow in the repo is one too many.
4. **One permission-bypass skill.** `hermes-jira-clone` advertises "no permission prompts, no mid-cycle stops … full autonomy" — direct contradiction of the CLAUDE.md commit gate and concurrent-session laws.
5. **Council inflation.** Four deliberation skills (`llm-council`, `advanced-council`, Cowork `council`, `mega`) plus preflight's embedded 17-advisor panel. Without routing, "council this" is a coin flip.
6. **Agent sprawl mirrors skill sprawl.** ~200 boilerplate agent personas (marketing/legal/game-dev/China-commerce) duplicated at user+project level. Seven tiny bespoke agents (<1 KB each: `code-graph-agent`, `repo-context-agent`, `safety-change-control-agent`, `memory-guardrail-agent`, `ui-dom-probe-agent`, `token-efficiency-agent`, `implementation-planner-agent`, `tool-output-agent`) are the only ones wired to real Catalyst work.
7. **Cross-user contamination.** Project `preflight/SKILL.md:105` hardcodes `/Users/jahanarakhan/...`; the orphan CC preflight plugin hardcodes `/Users/vikramindla/...`. Two machines merged into one skill set.
8. **What actually works:** the project-level Catalyst core (`catalyst-feature`, `preflight`, `jira-compare`, `design-critique`, `design-intelligence`, `inspect`, `cre`, `regression`, `deploy`, `advanced-council`, `llm-council`, `fable`, `mirror-component`) plus built-in harness skills (`verify`, `code-review`, `security-review`, `simplify`, `run`, `loop`) plus the repo's ratchet gates (`lint:colors:gate`, `audit:ads:gate` in husky + CI). That is a complete SDLC toolchain. Everything else is duplication, drift, or off-domain.

**Verdict:** you don't need new skills. You need one canonical copy per capability, a router that picks by phase, and gates that are impossible to route around.

---

## B. DUPLICATE / MERGE / DECOMMISSION MATRIX

Legend: **KEEP** = canonical. **MERGE** = fold content into canonical, delete source. **DECOM** = delete. **QUAR** = keep on disk, remove from invocation path until reviewed. **SPEC** = specialist-only, never auto-invoked.

| Capability | Copies found | Canonical | Others | Reason / risk / migration |
|---|---|---|---|---|
| catalyst-feature | project (118L, 06-26) · Cowork AS (06-20) · user (EMPTY dir) | **KEEP project** | DECOM user stub + AS copy | Project is repo-shipped feature OS bound to CLAUDE.md. Risk of stubs: name resolves to nothing. Migration: `rmdir ~/.claude/skills/catalyst-feature` |
| jira-compare | project (461L, 06-24) · user (914L, 05-21, **refs catalyst-prod-44 + port 8081**) · Cowork AS (329L) | **KEEP project** | DECOM user + AS | User copy actively dangerous (stale repo slug, banned port). Migration: delete user dir; `user/jira-compare/CLAUDE.md` lessons log is empty — delete too |
| design-critique | project (600L, 06-24) · user (536L, 06-05) · design plugin (118L generic Figma) | **KEEP project** | DECOM user; **SPEC** design:design-critique | Plugin one is generic mockup feedback, fine for non-Catalyst work only. Never for Catalyst surfaces (no ADS rules) |
| design-intelligence | project (764L, 06-17) · user (699L, 05-10) | **KEEP project** | DECOM user | Project has AGENT_ROSTER + newer lesson anchors |
| systematic-debugging | project (238L, Catalyst-tuned, 06-24) · user (222L, generic Hermes port) | **KEEP project** | DECOM user | Same trigger phrase = wrong-invocation risk |
| preflight | project v3 (695L, 06-17) · orphan CC plugin (455L, unregistered) · Cowork rpm (244L) | **KEEP project — after fixing `jahanarakhan` path at L105** | DECOM orphan plugin dir + Cowork rpm | Three generations of the same planner. Orphan plugin isn't even in installed_plugins.json. Migration: fix path, `rm -rf ~/.claude/plugins/preflight` |
| gitmerge | project (119L) · Cowork AS (byte-identical) | **DECOM both** | — | Highest-risk skill in estate: GUI automation of GitHub Desktop, auto-merge + permanent remote branch deletion, no PR/review gate. Replacement: `/deploy` (halts on conflict, gated) + `gh` CLI. Migration: delete both; keep this manual's §J as the merge SOP |
| deploy | project only | **KEEP (gated)** | — | Memory-blessed (`project_deploy_skill`). Fix hardcoded repo slug `anthropics/catalyst-prod-45` before it breaks on a remote change |
| llm-council | project (467L) · Cowork AS (identical) | **KEEP project** | DECOM AS copy | Identical bytes — pure duplication |
| advanced-council | project only (883L, 07-01, newest council) | **KEEP** | — | Pre-build contract w/ VeriMAP Plan Lock. Scope: big features only (see §F) |
| council (Cowork AS) | Cowork only (176L) | **DECOM** | — | Third council variant; superseded by advanced-council (superset) |
| mega | user only | **QUAR** | — | "Probing + council + Idea Fencing" grab-bag; overlaps llm-council. Cannot confirm value; review before reuse |
| regression | project (122L, 06-18) · Cowork AS (352L, richer) | **MERGE AS → project, KEEP project** | DECOM AS after merge | Plugin body has route-inventory content project version lacks. Regression without route inventory is shallow (blind spot #4) — merge fixes that |
| hermes-jira-clone | user only | **QUAR** | — | Explicit "no permission prompts / full autonomy" posture violates commit gate + concurrent-session law. If wanted, strip the bypass language first |
| hermes-pixel-probe | user only | **KEEP (SPEC)** | — | Genuinely useful DOM/CSS + functional parity probe; called by jira-compare flow, standalone-triggerable |
| hermes-regression-sweep | user only | **MERGE → project regression** | DECOM after | 3-adjacent-surface sweep is the missing "blast radius" step of /regression |
| hermes-memory/-search/-compress/-route/-insights/-persona/-skill/-traj | user only (generic ported pack, all 05-07 beta) | **QUAR all 8** | — | Overlap harness-native memory + context management. Three memory systems (harness memory dir, hermes-memory, Obsidian vault) = pollution risk (blind spot #7). Harness memory + `anthropic-skills:save-memory` (Obsidian) are canonical; hermes pack redundant |
| catalyst-clone | project only (467L) | **QUAR** | — | Overlaps jira-compare + mirror-component + pixel-twin-route; auto-appends CLAUDE.md **every run** = contract-file pollution. Review before reuse |
| mirror-component | project only | **KEEP** | — | Matches standing feedback: "reuse canonical page, never parallel" |
| pixel-twin-route | project only (945L) | **SPEC** | — | Heavy 10-phase twin machinery; only when an isolated route twin is explicitly requested |
| inspect | project only | **KEEP** | — | Component-level ADS audit/fix with cascade |
| 4 / A / B / C | project only | **KEEP /4** (fix stale /1 /2 refs) · **DECOM A, B, C** | — | A→start, B→design-critique, C→systematic-debugging are 20-line forwarders whose only content is a widget-ban rule. Single-letter names = maximum wrong-invocation risk. Move the widget-ban rule into CLAUDE.md once, delete aliases |
| skillui-catalyst | project only, **0 bytes** | **DECOM** | — | Dead stub |
| start | project only (335L) | **KEEP** | — | Proceed-gated router; becomes the single front door (§K) |
| catalyst-agent | project only (714L + 8 ref files) | **KEEP (SPEC)** | — | Probe-first router; overlaps start. Use for probe/gap-report tasks; start for everything else. If friction persists, merge into start in the 30-day plan |
| fable | project only | **KEEP** | — | Goal→falsifiable-DoD wrapper; pairs with the /goal loop |
| delegate | project only | **KEEP** | — | Cost routing; verify its two hook scripts exist (cannot confirm — not inspected) |
| cre | project only | **KEEP** | — | Rules-engine management; lint:cre is a blocking gate |
| obsidian | project only | **KEEP** | — | Handover transcripts. Distinct from save-memory (vault notes). Keep both, distinct lanes |
| story-writer | project (182L) · Cowork AS | **KEEP project** | DECOM AS | Writes Jira issues — external side effect; always confirm before create |
| github-code-review / github-issues / github-pr-workflow | user only, generic | **SPEC all 3** | — | Built-in `/code-review`, `/security-review`, `gh` CLI supersede for review; issues/pr-workflow fine as references |
| test-driven-development · subagent-driven-development | user only | **KEEP** | — | Method skills, no overlap |
| ads-validator | Cowork AS only | **SPEC** | — | Overlaps repo ratchet gates (`lint:colors:gate`, `audit:ads:gate`) which are canonical + CI-enforced. Use ads-validator only for live-Jira computed-style diffing |
| save-memory / recall-memory / consolidate-memory | Cowork AS (+ empty user save-memory dir) | **KEEP AS trio** · DECOM empty user dir | — | Obsidian vault lane. Scope rule in §I |
| supabase + supabase-postgres-best-practices | CC plugin 0.1.11 (+ project symlinks) | **KEEP** | purge stale 0.1.6 cache | Plugin skill has **no prod/read-only guard** — bind to staging-first law (§I). Symlinks resolve fine |
| caveman plugin (7 skills) | CC plugin | **KEEP** | — | Output-style, orthogonal to SDLC. caveman-commit verified message-only (doesn't run git) |
| docx/pptx/xlsx/pdf, skill-creator, schedule, market-intelligence, ui-ux-pro-max, ui-extraction-react-replication, fable-prompt (Cowork AS) | Cowork | **KEEP** docs+skill-creator+schedule · **cannot confirm** market-intelligence / ui-ux-pro-max / ui-extraction / fable-prompt (bodies not inspected) | — | Un-inspected ones: read before first use, then classify |
| ~30 non-SDLC user skills (solana, polymarket, stable-diffusion, whisper, vllm, sherlock, …) | user | **QUAR (out of SDLC path)** | — | Not harmful, just noise; sherlock (OSINT) has no business in a delivery session |
| ~200 boilerplate agent personas (user + project `.claude/agents/`, duplicated) | both | **QUAR project copies of off-domain packs; KEEP the 8 bespoke <1KB agents + engineering/testing/design subset** | — | Duplication doubles maintenance; off-domain personas (Douyin strategist et al.) dilute agent selection |

---

## C. CANONICAL SKILL TAXONOMY

One skill per capability, resolved from **project `.claude/skills/` first, built-ins second, Cowork specialist lane last**.

| Layer | Capability | Canonical skill | Backup |
|---|---|---|---|
| 0 Governance | Operating contract | CLAUDE.md (not a skill — the law) | — |
| 0 Governance | Goal fidelity / DoD | `fable` | built-in /goal loop |
| 1 Intake/Routing | Front door | `start` | `catalyst-agent` (probe-shaped tasks) |
| 1 Intake/Routing | Cost/model routing | `delegate` | — |
| 2 Planning | Feature lifecycle | `catalyst-feature` | — |
| 2 Planning | Pre-build plan | `preflight` (project v3) | `advanced-council` (big features) |
| 2 Planning | Decision tradeoffs | `llm-council` | — |
| 3 Product | Stories/acceptance | `story-writer` | Product Manager agent |
| 3 Product | Market/competitive | `anthropic-skills:market-intelligence` (cannot confirm) | `deep-research` (built-in) |
| 4 Design | Heuristic critique | `design-critique` (project) | `design:design-critique` (non-Catalyst only) |
| 4 Design | ADS deep audit | `design-intelligence` | `inspect audit` |
| 4 Design | Component fix/cascade | `inspect fix` | `mirror-component` |
| 4 Design | Jira parity | `jira-compare` (project) | `hermes-pixel-probe` (measurement only) |
| 4 Design | A11y review | `design:accessibility-review` + Accessibility Auditor agent | — |
| 5 Build | TDD | `test-driven-development` | — |
| 5 Build | Parallel build | `subagent-driven-development` | Workflow tool |
| 5 Build | Debugging | `systematic-debugging` (project) | — |
| 5 Build | Rules engine | `cre` | — |
| 5 Build | DB work | `supabase` plugin + staging-first law | `supabase-postgres-best-practices` |
| 6 Verify | Runtime proof | `/verify` (built-in) | `/run` |
| 6 Verify | Code review | `/code-review` (built-in) | `caveman:caveman-review` (cheap pass) |
| 6 Verify | Security | `/security-review` (built-in) | Security Engineer agent |
| 6 Verify | Regression | `regression` (project, post-merge of AS + hermes-sweep content) | — |
| 6 Verify | Visual evidence | `/4` | `design-critique` closure block |
| 7 Ship | Merge/deploy | `deploy` | manual git + `gh` per §J |
| 7 Ship | Scheduled ops | `/schedule`, `/loop` (built-ins) | — |
| 8 Memory | Session memory | harness memory dir (auto) | — |
| 8 Memory | Vault notes | `anthropic-skills:save-memory` / `recall-memory` | — |
| 8 Memory | Handover | `obsidian` | CLAUDE.md handover template |

**Invocation rule:** when two skills share a name, always invoke the plain (project) name; namespaced (`anthropic-skills:*`, `design:*`) only when this table says so explicitly.

---

## D. FULL-STACK AI TEAM STRUCTURE

Sixteen roles. Each is a *hat* the session (or a subagent) wears — not 16 simultaneous agents. One accountable owner per phase, always.

| # | Role | Carried by | Primary skills | Backup |
|---|---|---|---|---|
| 1 | Product Owner | Vikram (human) + Product Manager agent as drafter | `catalyst-feature`, `fable` | `llm-council` |
| 2 | Business Analyst | Product Manager agent | `story-writer`, `anthropic-skills:market-intelligence` | `deep-research` |
| 3 | UX Researcher | UX Researcher agent | `design:user-research`, `design:research-synthesis` | — |
| 4 | UI Designer | UI Designer agent + Figma MCP | `design:design-handoff`, Figma tools | `design:ux-copy` |
| 5 | Design System Auditor | main session | `design-intelligence`, `inspect`, ratchet gates | `ads-validator` (live diff only) |
| 6 | Solution Architect | Plan agent / Software Architect agent | `preflight`, `advanced-council` | `code-graph-agent` |
| 7 | Frontend Dev | main session | `test-driven-development`, `mirror-component`, `inspect fix` | `subagent-driven-development` |
| 8 | Backend Dev | main session / Backend Architect agent | `test-driven-development`, `systematic-debugging` | — |
| 9 | DB/Supabase Engineer | main session | `supabase` plugin, migration ledger discipline | `supabase-postgres-best-practices` |
| 10 | QA | main session + Evidence Collector agent | `/verify`, `/run`, `/4`, TestHub flows | API Tester agent |
| 11 | Accessibility Auditor | Accessibility Auditor agent | `design:accessibility-review` | axe via Chrome MCP |
| 12 | Security Reviewer | `/security-review` + Security Engineer agent | `/security-review`, `oss-forensics` (deps) | Supabase `get_advisors` |
| 13 | Release Manager | main session | `deploy`, `/schedule` | §J manual path |
| 14 | Git/Merge Owner | main session (worktree law) | §J governance, `gh` CLI | `github-pr-workflow` (reference) |
| 15 | Regression Owner | main session | `regression` (merged version), route inventory | `hermes-pixel-probe` |
| 16 | Council Chair | main session | `llm-council`, `advanced-council` | `mega` (QUAR — only after review) |

---

## E. ROLE → SKILL → MODEL ROUTING TABLE

Model policy: **Fable/Opus for judgment, Sonnet for breadth, Haiku for mechanics.** Session model = Fable 5; route subagents down via `delegate` logic.

| Work shape | Model | Effort | Why |
|---|---|---|---|
| Plan Lock, architecture, council synthesis, security verdicts, merge decisions | Fable (session) | high | Judgment-dense, irreversible |
| Advisor drafts in councils, parallel discovery agents, code review finders | Sonnet | medium | Breadth beats depth; verified downstream |
| File sweeps, route inventories, grep-shaped audits, screenshot capture | Haiku | low | Mechanical; output verified by gates |
| Implementation slices (2h timebox) | Sonnet/Opus subagent or main session | medium | Plan Lock already made the decisions |
| Adversarial verify passes (regression, review verdicts) | Fable or Opus | high | Cheap finders + expensive judges |

Standing rule: **never let a Haiku-tier agent write code that ships; never spend Fable on a grep.**

---

## F. COUNCIL SOP

**Three councils, three jobs. Routing is mandatory — "council this" alone goes to llm-council.**

| Council | Job | When |
|---|---|---|
| `llm-council` | Decision tradeoffs (A vs B, is this the right move) | Any genuine tradeoff with stakes; <30 min |
| `advanced-council` | Pre-build contract for **big** features (new module, schema migration, workflow change) | After intake, before Plan Lock; produces VeriMAP Plan Lock |
| `preflight` embedded panel | Standard-feature planning | Default; runs inside /preflight, no separate invocation |

**Procedure (llm-council / advanced-council):**
1. **Intake:** Chair (main session) writes the question as a single falsifiable decision statement + context pack (files read, constraints from CLAUDE.md, prior decisions from `09_DECISIONS.md`).
2. **Decompose:** Chair splits into ≤5 advisor lenses (e.g., correctness, ADS/UX, data safety, delivery cost, regression risk). Domain-relevant lenses speak; no ceremonial seats.
3. **First responders:** evidence-holding lenses first (Data/Safety Guard, Canonical Discovery) — they can kill an option cheaply before opinion lenses spend tokens.
4. **Drafts:** advisors run as parallel Sonnet subagents, independent, no cross-talk.
5. **Peer review:** anonymized drafts cross-scored (llm-council method).
6. **Synthesis:** Chair (Fable) writes verdict: decision, rejected options + why, conditions, kill criteria.
7. **Authority:** **Vikram > active Plan Lock > Chair synthesis > individual advisor.** Council output is *advice* until written into `03_PLAN_LOCK.md` or `09_DECISIONS.md` — that write is what makes it binding (blind spot #3: council without authority is noise; authority = the artifact, not the meeting).
8. **Conflict rule:** two advisors disagree on a fact → probe the fact (code/DB/DOM), don't vote on it. Disagree on values → Chair decides, logs dissent in `09_DECISIONS.md`.
9. **Timebox:** one council per decision. No re-council without new evidence.

---

## G. PHASE-BY-PHASE SDLC SOP

Wrapper: everything below runs inside `activate feature <name>` / `continue feature <ID>` (`catalyst-feature`). No Feature Work ID + folder = no implementation. Every phase logs to the feature folder.

| # | Phase | Entry criteria | Owner | Skills | Artifact | Evidence | Fail condition | Rollback | Gate |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Intake | Request exists | Council Chair | `start`, `fable` | `01_OBJECTIVE.md` + falsifiable DoD list | Restated goal Vikram confirms | Ambiguous scope, no DoD | Discard folder | Vikram confirms objective |
| 2 | Product discovery | Objective approved | PO + BA | `deep-research`, market-intelligence, Product Manager agent | Discovery note in `02_CANONICAL_DISCOVERY.md` | Sources cited; existing-Catalyst overlap checked | "Build new" without reuse proof | N/A (paper) | Reuse-first verdict recorded |
| 3 | Requirements | Discovery done | BA | `story-writer` | Stories w/ Given/When/Then acceptance criteria | Each story testable; ≥1 unhappy path each | Vague criteria ("works well") | Rewrite | PO signs stories (blind spot #8) |
| 4 | IA / journeys | Stories signed | UX Researcher | `design:user-research`, Workflow Architect agent | Journey map incl. failure/empty/loading states | Every state named; zero-assumption rule applied | Happy-path-only map | Rewrite | Chair check: all states covered |
| 5 | UX/UI + design system | Journeys done | UI Designer + DS Auditor | Figma MCP, `design-intelligence`, `design:design-handoff` | Mockups + handoff spec, ADS tokens only | Design Intelligence Brief; canonical components named per CLAUDE.md hierarchy | Hand-rolled UI proposed; bare colors | Redesign | DS Auditor pass + canonical-component proof |
| 6 | Architecture | Design gated | Solution Architect | `preflight` (or `advanced-council` if big) | `03_PLAN_LOCK.md` | File list, forbidden files, wiring plan, validation commands, stop conditions | No timebox; >2h slices; files-forbidden empty | Discard plan | **Plan Lock approved by Vikram — no code before this** |
| 7 | DB/data model | Plan Lock live | DB Engineer | `supabase` plugin, migration ledger rules | Migration files in `supabase/migrations/` | `project-ref` asserted = cyij **before every batch**; ledger 1:1 with files; slug contract for URL-navigable tables | Prod ref detected; unregistered DDL; `:id` route param | Down-migration / restore staging | Schema probe proves columns exist (memory: marked ≠ executed) |
| 8 | Implementation | Schema proven | FE/BE Dev | `test-driven-development`, `mirror-component`, `subagent-driven-development` | Code on branch/worktree; `04_EXECUTION_LOG.md` | tsc clean (≤183 pinned), build passes, 2h slice log | Touching forbidden files; scope creep | `git restore` slice | Slice review vs Plan Lock |
| 9 | Unit/integration tests | Slice built | QA | TDD red-green evidence | Test files + run output | Raw test output pasted (not "tests pass") | Only happy paths; skipped tests | Fix or revert slice | All new behavior covered incl. failure paths |
| 10 | Accessibility | UI slice done | A11y Auditor | `design:accessibility-review`, Accessibility Auditor agent | A11y findings in `05_UI_UX_REVIEW.md` | Keyboard nav, focus ring (`--ds-border-focused`), roles/labels, contrast **in both themes**; dark mode via reload-into-dark (memory) | P0 barrier open | Fix before ship | Zero P0 a11y findings |
| 11 | Security | Feature code-complete | Security Reviewer | `/security-review`, Supabase `get_advisors`, `oss-forensics` for new deps | Findings list w/ verdicts | RLS on new tables proven by probe as anon; no secrets in diff; advisors clean | RLS missing; secret committed | Revert offending commit | Zero confirmed high findings. **Also runs early:** any new table/endpoint gets a mini security pass at phase 7 (blind spot #10) |
| 12 | Regression | All slices merged to feature branch | Regression Owner | `regression` (merged version) + route inventory + `hermes-pixel-probe` | Regression report | Route inventory diffed (`src/lib/routes.ts` + FullAppRoutes); 3 adjacent surfaces swept; screenshots of neighbors | Neighbor surface broken | Fix cluster or revert | Sweep clean (blind spot #4: inventory-driven, not vibes) |
| 13 | PR review | Regression clean | Git Owner | `/code-review` (high), `/verify` | PR (or main-push review record) | Review findings addressed or waived w/ reason; `/verify` drove the actual flow | Unreviewed diff; verify skipped | Close PR | Zero confirmed correctness findings |
| 14 | Merge to main | Review clean | Git Owner | §J governance, `deploy` | Merge commit | Commit-gate checklist (§J) all green | Any gate red | `git revert` merge | Ratchet gates pass in CI |
| 15 | Deployment | Main green | Release Manager | `deploy`, Supabase MCP (edge fns) | Deploy summary | Edge fns deployed + `get_logs` clean; staging app loads | CI red; edge fn 500s | Redeploy previous; revert | Post-deploy checks scheduled |
| 16 | Post-deploy validation | Deployed | QA + Release Manager | `/verify` on live staging, `/4`, `get_advisors`, `get_logs` | `06_VALIDATION_EVIDENCE.md` + closure screenshots | Live CRUD probe on canonical entity; error logs 15-min window clean | Live probe fails | Revert + incident note in `08_DRIFT_LOG.md` | **Vikram screenshot signoff = done** |

---

## H. EVIDENCE & ARTIFACT CHECKLIST

"Done" requires ALL applicable rows. A claim without its row is a claim, not a fact.

- [ ] Feature folder complete (`00`–`11` + `sessions/NNN_*.md` for this session)
- [ ] `03_PLAN_LOCK.md` approved before first code line
- [ ] Raw command output pasted for: tsc, build, tests, `lint:colors:gate`, `audit:ads:gate` (zero-output grep for bare colors)
- [ ] `lint:cre` pass if create/link surfaces touched
- [ ] Screenshots: every changed surface, **light + dark** (reload-into-dark), before/after where relevant — plus DOM/CSS probe (`/4` or pixel-probe) because screenshots don't prove computed styles (blind spot #9)
- [ ] Functional proof: `/verify` drove the real flow — not "typecheck passed"
- [ ] DB: `supabase/.temp/project-ref` output pasted for every linked batch; migration ledger 1:1
- [ ] RLS probe as anon for new tables
- [ ] Regression sweep report w/ named routes checked
- [ ] A11y pass note (keyboard, focus, labels, contrast)
- [ ] Security review verdicts (or "no security surface" statement w/ reason)
- [ ] Exact staged-file list (never `git add -A`)
- [ ] Post-deploy live probe + clean logs window
- [ ] Handover updated if context ends mid-feature (`07_HANDOVER.md`)

---

## I. FAILURE-MODE PLAYBOOK

| Failure mode | Control |
|---|---|
| Context drift / long session | `07_HANDOVER.md` + `obsidian` at context risk; continuation sessions MUST read 00/01/03/07/08/09 before acting; `fable` DoD list re-read each session |
| Duplicate work across sessions | One session = one worktree (CLAUDE.md hard stop); check `git reflog`/`ps` before blaming hooks; never commit files you didn't author |
| Hallucinated "done" | `fable` refuses done without per-criterion evidence; six-point self-verify (memory: mandatory); silence beats invented defaults (zero-assumption rendering) |
| Wrong-skill invocation | §C invocation rule (plain name = project); DECOM single-letter aliases A/B/C; after 30-day cleanup, one copy per name |
| Stale-tool poisoning | rtk proxy served pre-deletion grep results once (memory) — cross-check load-bearing greps with plain grep/ls |
| Skill estate rot | Quarterly: re-run this audit; README.md must list actual skills or say nothing |
| Memory pollution | Three lanes, no cross-writes: harness memory = durable session facts; `save-memory` = Obsidian vault notes (explicit ask only); `obsidian` skill = handovers. Hermes memory pack QUAR. Every memory: absolute dates, verify referenced files still exist on recall |
| Dark-mode regressions | Light-metaphor trap (memory): every dark defect = light idiom shipped into dark; probe via reload-into-dark only |
| DB disaster | Staging-first law: all DDL → cyij; prod lmqw only on explicit instruction via disposable linked dir; assert project-ref per batch; "cwd recovered" error = full stop |
| Branch disaster | No `git checkout` in checkouts you didn't create; land via detached worktree cherry-pick; `git add -A` banned |
| Merge w/o evidence | §J checklist is blocking; husky ratchets physically block bare-color increases |
| Security-at-the-end | Mini security pass at DB phase (RLS, advisors) + full pass pre-merge |
| Council noise | §F: decision statement in, artifact out, one council per decision |
| QA happy-path bias | Story gate requires ≥1 unhappy path per story; journey map must enumerate empty/error/loading states before design starts |
| Regression shallowness | Route inventory (routes.ts) is the sweep's input, not memory of "what's nearby" |

---

## J. MERGE-TO-MAIN GOVERNANCE

Standing authorization: direct push to origin/main allowed (memory `feedback_git_push`). Authorization ≠ absence of gates.

**Blocking checklist (in order):**
1. `pwd` + `git branch --show-current` + `git status --short -uall` — confirm you're in YOUR worktree, on the branch you think.
2. `/preflight` was run for this work (repo-impacting rule).
3. tsc / build / tests raw output green.
4. `npm run lint:colors:gate` + `npm run audit:ads:gate` pass (husky enforces anyway; run first, don't discover at commit).
5. `/verify` drove the changed flow end-to-end.
6. `/code-review` findings resolved; `/security-review` if auth/data/API surface touched.
7. `regression` sweep if UI/routes touched.
8. Stage **explicit files only** — every staged file authored this session.
9. Commit message approved format; push; confirm CI green.
10. Baselines: if a slice *reduced* color/audit counts, ratchet down (`--update`) and commit baseline.

**Banned:** `git add -A`/`.`, `--no-verify`, force-push, `gitmerge` skill (decommissioned), rebasing others' unpushed commits, merging with red CI.
**Conflict during merge:** stop, show conflict, decide with Vikram — never auto-resolve.
**Rollback:** `git revert <merge-sha>` (never reset --hard on shared main); DB: down-migration or staging restore; edge fns: redeploy previous version.

---

## K. COMMAND RECIPES

| Task | Recipe |
|---|---|
| New feature | `activate feature <name>` → discovery agents → `/preflight` (or `/advanced-council` if big) → Plan Lock → STOP for approval → build w/ TDD → §G phases 9–16 |
| Resume feature | `continue feature <CAT-...>` → rehydration report → proceed only if Plan Lock allows |
| Ambiguous request | `/start` → classify → proceed gate |
| Bug, unclear cause | `/systematic-debugging` → repro test (red) → fix (green) → `/verify` → `/4` evidence |
| Defect backlog | `/regression` → triage table → goahead → cluster fixes, one cluster/commit |
| "Make X look like Jira" | `/jira-compare <surface>` → diff table → PATCH cycle (cap 5) → CRUD acceptance |
| "Same table as X at Y" | `/mirror-component` (factory extract; never hand-rebuild) |
| Design signoff | `/design-critique <url>` → P0/P1 fixes → closure evidence block |
| Deep ADS audit | `/design-intelligence <surface>`; per-component: `/inspect audit` → `/inspect fix` |
| Decision w/ stakes | `/llm-council "<decision statement>"` → verdict → write `09_DECISIONS.md` |
| Pre-merge | §J checklist verbatim |
| Ship | `/deploy` (halts on conflict) → phase 16 validation |
| Visual proof | `/4 <url>` (screenshot + DOM probe tables) |
| Save durable lesson | harness memory (auto) or `anthropic-skills:save-memory` for vault — never both for same fact |
| End-of-context | update `07_HANDOVER.md` + `/obsidian` handover |

---

## L. 30-DAY CLEANUP ROADMAP

**Week 1 — delete the dead (zero risk):**
- `rm` empty stubs: project `skillui-catalyst/`, user `catalyst-feature/`, user `save-memory/`, user `user/` (empty lessons log)
- Delete user-level stale twins: `jira-compare` (catalyst-prod-44!), `design-critique`, `design-intelligence`, `systematic-debugging`
- Delete orphan `~/.claude/plugins/preflight/` + stale supabase 0.1.6 cache
- Fix project `preflight/SKILL.md:105` (`jahanarakhan` → repo-relative path); fix `/4`'s dead `/1` `/2` refs

**Week 2 — kill dangerous overlap:**
- DECOM `gitmerge` (project + Cowork); §J + `/deploy` replace it
- QUAR `hermes-jira-clone` (strip "no permission prompts" language if kept), `catalyst-clone` (remove CLAUDE.md auto-append), `mega`, hermes generic 8-pack
- DECOM aliases A/B/C; move widget-ban rule into CLAUDE.md once
- Fix `deploy` hardcoded repo slug; parameterize Supabase project id in the 5 skills that hardcode `lmqw...`

**Week 3 — merge and consolidate:**
- MERGE Cowork `regression` route-inventory content + `hermes-regression-sweep` into project `regression`; delete sources
- DECOM byte-identical Cowork dupes: `llm-council`, `gitmerge` (done wk2), `story-writer`, `jira-compare`, `catalyst-feature`, `council`
- Decide `catalyst-agent` vs `start` (merge or keep SPEC split)
- Rewrite `.claude/skills/README.md` + `AGENT_PIPELINE.md` to list the true canonical set; commit

**Week 4 — governance (DONE 2026-07-08):**
- ✅ Read + classified the 4 un-inspected Cowork skills: `market-intelligence` (clean, KEEP SPEC), `ui-extraction-react-replication` (clean, KEEP SPEC), `fable-prompt` (clean, KEEP — distinct from project `fable`), `ui-ux-pro-max` (QUARANTINED — its setup runs an unreviewed `git clone` + `npx uipro-cli@latest init`, and its 161 hex color palettes directly violate the ADS-token-only law; both Cowork copies patched with a quarantine notice, not deleted)
- ✅ Pruned off-domain agent personas from project `.claude/agents/` (192→75 files). **Correction to the original criterion above:** "engineering/testing/design subset" was incomplete — it would have deleted `project-management-jira-workflow-steward`, `specialized-mcp-builder`, and `agents-orchestrator`, all cited as top-tier picks in this manual's own §D and in `.claude/skills/README.md`. Actual kept set: `engineering-*` (29) + `testing-*` (8) + `design-*` (8) + `project-management-*` (6) + `product-*` (5) + `specialized-*` (11) + `agents-orchestrator.md` + the 8 bespoke Catalyst-only agents (code-graph-agent, repo-context-agent, safety-change-control-agent, memory-guardrail-agent, ui-dom-probe-agent, token-efficiency-agent, implementation-planner-agent, tool-output-agent) = 75. Removed 117 off-domain personas (marketing/sales/paid-media/finance/legal/healthcare/academic/game-dev/~30 singleton specialists) — full 184-file backup remains at user-level `~/.claude/agents/` (confirmed identical before deletion).
- ✅ Manual added to the repo, linked from CLAUDE.md supporting docs table
- ⚠️ Quarterly skills-audit reminder: **no durable mechanism exists.** `CronCreate`/`/schedule` are session-scoped and auto-expire in ≤7 days — cannot carry a quarterly cadence across sessions. Substituted a durable in-file reminder instead (see the "Next audit due" callout at the top of this manual, refreshed by whoever runs the next audit).
- ✅ Verified `delegate` hook scripts exist on disk (`.claude/hooks/delegation-guard.sh`, `.claude/hooks/record-session-model.sh`) — no fix needed.

**Deliberately not done — needs your action, not mine:**
- Cowork-store byte-identical/stale duplicate skills (`llm-council`, `story-writer`, `jira-compare`, `catalyst-feature`, plain `council`) live under `~/Library/Application Support/Claude/local-agent-mode-sessions/` — a different app's (Claude Desktop) managed plugin storage. The `cowork-plugin-management` skill (`cowork-plugin-customizer`, `create-cowork-plugin`) is for *authoring/customizing* Cowork plugins, not deduping installed ones — confirmed by inspecting both its skill names; it has no delete/dedupe capability. Raw `rm` there risks desyncing whatever manifest Claude Desktop keeps for that store. Resolve via that app's own plugin UI, or explicitly authorize raw deletion if you're confident no manifest tracks file counts.

---

*Cannot-confirm register: `market-intelligence`, `ui-ux-pro-max`, `ui-extraction-react-replication`, `fable-prompt`, `mega` bodies not read in depth; `delegate` hook scripts not verified on disk; Cowork runtime resolution order vs Claude Code namespace not verified experimentally. Everything else above is grounded in file reads dated 2026-07-08.*
