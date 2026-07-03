# A3 — Challenger + Root-Cause Thinker

Feature: CAT-TESTHUB-PROD-20260703-001 · Advanced Council v3 · 2026-07-03
Inputs: all 14 discovery reports + all 14 gap shards (127 P0 rows counted) + fresh src/ verification probes run by this advisor tonight.

## Verdict

**CONDITIONAL GO — but the plan as implied by the gap register is aimed one layer too high.** The discovery is excellent and the ~"80% real" headline is honest, yet the register reads like a feature backlog when the actual disease is that **the data layer cannot be trusted to tell the truth** — about errors, about writes, about which tables even exist. If the Plan Lock sequences feature gaps (BDD, parameterization, AI, dashboards) before a Phase-0 live-DB probe pack and a kill-the-lies sweep, this build fails exactly the way TestHub v1 failed: green screenshots over silent-empty queries and success toasts over zero-row writes.

---

## 1. What is UNVERIFIED tonight (no DB probes ran — every one of these is a repo-only claim)

The entire discovery pack is static analysis. Three different "databases" are being conflated: `supabase/migrations/` (intent), `types.ts` (a snapshot of cyij at last typegen), and live cyij (reality). They are known to disagree. Concretely open:

| # | Unverified claim | Why it can sink a slice | Evidence |
|---|---|---|---|
| U1 | `tm_cycle_sets` existence. **I re-verified tonight: 0 matches in migrations, 0 in types.ts**, yet `SetDetailPage.tsx:300/411` writes/reads it via `as any`. | "Add set to cycle" may be a guaranteed runtime 400 rendered as "0 cycles" (drift log L9 already saw this). | discovery 03 §9; my grep |
| U2 | The 12 migration-created-but-untyped tm_ tables (incl. `tm_requirement_tests`, used inside defect-create auto-linking at `useDefects.ts:443`). typegen is recent (contains `tm_ai_usage_log` restored 2026-07-03), so absence-from-types likely = really dropped. | Defect creation partially fails silently today; any traceability plan built on `tm_requirements` builds on a ghost. | discovery 03 §9 |
| U3 | Trigger state on live cyij. History: broken triggers 400'd **every** tm_test_cases UPDATE and **every** tm_cycle_scope UPDATE (L4) — twice. Nobody enumerated `pg_trigger` tonight. | First write from any new surface can be dead on arrival, and root-cause-1 (silent errors) will hide it. | discovery 07 L4 |
| U4 | RLS policy coverage per table (`pg_policies` vs `relrowsecurity`). Precedent: tm_set_cases shipped default-deny → read as "empty", not error (L7). | Same failure signature as U3. | discovery 07 L7 |
| U5 | `tm_test_cycles.sprint_id` FK target. Docs said `iterations`, types say `ph_jira_sprints`, sprints-native Phase 0 re-plumbed membership on 2026-07-02 — target moved twice, never probed. | Cycle↔sprint integration (a headline MVP feature) may join the wrong table. | discovery 07 L21 |
| U6 | "test_* family all 0 rows" is a **2026-06-27 memory**, a week stale — and `tm_test_runs.test_data_row_id` has a **hard FK into legacy `test_data_rows`** (types Relationships). | Any "drop the dead families" slice breaks the canonical execution spine. Data-driven runs depend on a "dead" family. | discovery 03 §10 |
| U7 | ~65 tm_* RPCs + 28 hook-consumed RPCs: existence/signature on cyij never probed (discovery 02 §6 says so explicitly). RPC repair history shows 3 prior "RPC pointed at wrong family" migrations. | Analytics/cycle pages can 404 per-RPC. | discovery 02 §6, 03 §8 |
| U8 | ExecutionPage run-status enum casing — "deferred to Phase 4" in the ENGINE drift log, never re-probed (L8). | Verdict writes could 400 or match 0 rows on the single most important surface (execution). | discovery 07 L8 |
| U9 | Edge fn `ai-generate-test-cases` — **I re-verified: does not exist**; only `ai-generate-story-test-cases` is deployed-adjacent in repo. | The one routed AI feature errors 100% of the time today; the AI gateway plan must not assume a working baseline. | my ls of supabase/functions |
| U10 | Prod lmqw vs staging cyij tm_* divergence (held-back migrations per memory). MVP "in pre-prod tomorrow" — which project is pre-prod? | If the answer is anything but cyij, the whole probe pack must run twice. | memory prod-migration-reconciliation |

**Demand for Plan Lock:** a Phase-0 "DB truth" slice (≤2h) that closes U1–U10 with live cyij queries (information_schema diff vs types.ts, pg_trigger, pg_policies, enum values, FK targets, per-family row counts, one authed write-probe per touched table). No feature slice starts before it. L23 applies: agent claims are hypotheses; probes are facts.

## 2. Riskiest assumptions, ranked

1. **"The repo picture = the staging picture."** Everything above. The last build died on exactly this (wrote tm_*, read th_* → always empty).
2. **"80% real means the data layer is trustworthy."** 40 silent `{data}` destructures in 16 files + 3 error-as-empty blocks + a mock-on-error fallback mean *nothing rendered tonight is evidence of anything*. A page full of data and a page whose query 400'd look identical.
3. **"MVP usable in pre-prod tomorrow" is compatible with a 500+ gap register.** It is not, unless MVP is ruthlessly scoped (see §5). The ENGINE feature succeeded only via per-slice live proof; the register invites scope explosion (L2/L24/L26 warned this).
4. **"Reports: reuse never refactor" is free.** Reports union `ph_issues` QA-Bug/Incident + `tm_defects` (D-005 hybrid). The defect model has already flip-flopped three times (L3: D1→D5→D14→D-005). If this plan touches the defect spine (DEF-006 split-brain) without re-pinning the model, the 26 "done" reports drift silently — the one surface Vikram declared untouchable becomes the casualty.
5. **"No deprecation" constraint protects users, but it also protects the lies.** The unrouted `src/pages/releases/Test*` + `src/components/test-{plans,cycles}/**` generation is a mock-stuffed landmine (85 fake rows, mock team members, toast-theater). Objective says don't deprecate *behavior*; the plan must get an explicit decision to delete/quarantine *dead unrouted code*, or a future session routes a mock — again.

## 3. Root cause or symptom? — the 500+ gaps are ~10 root causes

The register is wide but not deep. Compression (with representative gap IDs):

| RC | Root cause | Gap symptoms it generates |
|---|---|---|
| RC1 | **Silent error swallowing** — `{data}`-only destructures (40×), error-as-empty returns, mock-on-error fallback (`useAssignmentTable.ts:203-206`, verified tonight). DB failure is indistinguishable from empty state. | TD-002, VER-032/042/048, PLN-004/010/046, EXE-005, DEF-003/010/011 — ≥60 rows across shards |
| RC2 | **Fake-success theater** — no-op stub hooks re-exported by the barrel (`test-management/index.ts:33-51`, verified tonight), mock LogDefectModal (`Math.random()` DEF key, DEF-001), Apply-assignment writes 0 rows while toasting success, toast-only quick actions. | TD-003, PLN-002/003, DEF-001, stub audit #6/#11 |
| RC3 | **Parallel stacks / split-brains** — defects ×2 (tm-defect* vs g25-*), cycle CRUD ×3, releases ×3, set-membership ×2 (tm_set_cases vs tm_test_set_cases), requirement linking ×2 (linked_story_key vs tm_requirement_links), audit log ×2, defect key-gen ×2 (client MAX-scan races vs RPC). | DEF-005/006/007, PLN-011/014, TRC-001, discovery 02 §7 |
| RC4 | **Canonical schema still leaning on "dead" families** — tm_test_runs FK→test_data_rows, execution history reads test_cycle_executions, G25 reads th_test_executions. | VER-032/048, DEF-010, U6 |
| RC5 | **Untyped DB surface behind `as any`** — tm_cycle_sets, plan_test_cycles, tm_requirement_tests; typegen blindness converts schema drift into runtime 400s that RC1 then hides. | PLN-013/014, DEF-003, U1/U2 |
| RC6 | **History/versioning integrity broken by design** — runs execute live steps (pinned version never read), ON DELETE CASCADE from steps destroys step results, restore is lossy overwrite, 4 snapshot writers with 3 shapes. This forfeits the core claim of a test-management product: auditability. | VER-001..008 (the single worst architectural cluster) |
| RC7 | **Query-key fragmentation** — 9+ key families over the same cycle data, dead invalidations (`['test-cycles']`, `['tm_test_cycles']`), stale-until-remount releases page. Staleness bugs masquerading as data bugs. | PLN-011, discovery 02 §4 |
| RC8 | **Dead-but-importable legacy generation** — unrouted mock-heavy families still exported via barrels; Move-not-copy violated historically. | Stub audit P2 umbrella, RC2 feeders |
| RC9 | **No DB-level link integrity** — requirement_id bare uuid no FK, free-text external keys, parent_key text; traceability that cannot be trusted arithmetically. | TRC-001/002/003, G06 shard broadly |
| RC10 | **Route/slug contract violations** — sets UUID routes + broken row-click targets (`/testhub/defects/:id` doesn't exist), routes.ts builders that don't match mounted params. | TD-001, DEF-004, PLN-053 |

**The root cause of the root causes:** there has never been an enforced *data-layer contract* (throw on error, typed tables only, one stack per entity, probe before code) nor a live-DB gate in acceptance. Every RC above is a downstream expression of that. **The revamp is solving the root cause only if the Plan Lock's first two phases are data-trust phases.** A plan that leads with UI polish, AI generation, or gap-count burn-down is treating symptoms — TestHub v1's exact autopsy.

## 4. Ordering that minimizes risk

- **P0 — DB Truth (½ day):** the probe pack of §1. Output: a single PROBE_LEDGER.md, every table/RPC/enum/FK/trigger/policy in scope marked LIVE/ABSENT/BROKEN. Kills U1–U10.
- **P1 — Kill the lies (RC1, RC2, RC8; ~3 slices):** delete stub barrel exports (re-export real hooks), delete mock fallbacks + LogDefectModal mock path, sweep the 40 silent destructures with the established SectionMessage+Retry pattern (memory: silent-query-error-sweep), delete or import-ban the dead legacy generation (needs the §2.5 decision). Cheap, mechanical, and it makes every later slice *verifiable* — you cannot validate Phase 3 while errors render as empty states.
- **P2 — One stack per entity (RC3, RC5, RC7):** pick the canonical hook per domain, migrate consumers, delete the other; key-gen via `tm_next_entity_key` everywhere; regen types and ban `as any .from()` (add a lint). Create-or-delete decision for tm_cycle_sets/plan_test_cycles based on P0 findings.
- **P3 — Execution + history integrity (RC6, RC4):** pinned-version reads in the runner, RESTRICT-or-soft-delete instead of cascade, single snapshot writer, atomic run save (EXE-001). This is the spine of "production-grade".
- **P4 — MVP happy path hardening + light/dark screenshot gates.** Then, and only then, P5+: feature gaps (BDD, parameterization, automation ingest, AI gateway, dashboards).

Anything that inverts P1/P2 with P5 should be rejected in council.

## 5. How this fails like last time — and the specific guards

Last time the handover promised "no placeholders" and shipped stubs anyway. Mechanism, per the evidence: (a) **acceptance = screenshots**, and silent-empty renders beautifully; (b) **copy-not-move** left old generations importable and a barrel quietly re-exporting no-ops; (c) **stale docs used as spec** (TESTHUB_BUILD_HANDOVER caused a live column-name bug — L1); (d) **no per-slice write probe**, so "built" ≠ "writes persist". The failure signature to design against is: *success toast + empty database*.

Guards the Plan Lock must carry as binary acceptance rows:
1. Every surface slice proves a **data round-trip** (create → clear `catalyst-rq-cache` → hard reload → row visible) AND an **error-path proof** (induced failure → SectionMessage, not empty state). Screenshots alone prove nothing (L11/L17).
2. **Grep gates per commit:** zero `mutationFn: async () => ({})`-style stubs; zero `generateMock*`; zero new `{ data } = await` without error handling; zero new `as any` on `.from()`; plus the existing tsc/lint:colors/audit:ads/lint:cre gates (L24).
3. **Defect model pinned in the Plan Lock** (tm_defects = TestHub store; ph_issues QA Bug/Incident = delivery side; hybrid reports; creation via canonical CreateStoryModal). Any change = formal decision, not mid-slice pivot (L3).
4. **Explicit decision recorded** on the dead legacy generation: delete vs quarantine. "Leave as-is" is not an option — it is how a future session routes a mock.
5. MVP-for-tomorrow scope = P0+P1+P2 plus ONE proven happy path (repository → cycle → execute → defect → report visibility), light + reload-into-dark. Everything else is phased. If the Plan Lock's day-1 scope is wider than this, challenge it as fantasy.

## 6. Claims I re-verified in src/ tonight (challenger due diligence)

- `src/hooks/test-management/index.ts:33-51` — no-op stubs + always-empty list hooks: **REAL**.
- `src/hooks/test-cycles/useAssignmentTable.ts:203-205` — `catch → return generateMockAssignments(cycleId)`: **REAL**.
- `supabase/functions/` — `ai-generate-test-cases` **ABSENT** (only `ai-generate-story-test-cases` exists): discovery #1 P0 confirmed.
- `tm_cycle_sets` — **0 matches** in `supabase/migrations/` and in `src/integrations/supabase/types.ts`; live existence on cyij still UNKNOWN (U1).
- `src/hooks/useTestCycleByKey.ts:21-22` — `const { data } = await query.maybeSingle(); return data ?? null;` — canonical silent-destructure on the **route resolver**: **REAL** (transient error = wrongful 404).

— A3, Challenger + Root-Cause Thinker
