# Session 008 — Decommission inventory + WorkTree pill extraction (2026-07-09)

## Inventory (REQ-016/018/019/022/023 scoping — the "never probed" step, now probed)

### Repo (strata-standalone)
- Legacy stacks: `src/modules/objectives/`, `src/modules/okr-v2/`, `src/components/okr/` (16 files in components/okr). Route: `EnterpriseRoutesShell.tsx:39` → `/enterprise/objectives` → `EnterpriseObjectives.tsx` → `OKRHubV2` → `StrategyCockpit`.
- External importers (excluding stories metadata + generated usage-map): ONLY `EnterpriseObjectives.tsx` (dies with the route) and `WorkTreeHierarchy.tsx` (3 shared pills — extracted this session).
- Legacy tables referenced by the stacks (own tables, not shared): `objectives`, `key_results`, `key_result_checkins`, `kr_work_contributions`, `objective_feature_links`, `objective_work_item_alignments`, `strategic_themes`.

### DB row counts
- **STAGING (cyijbdeuehohvhnsywig): ALL SEVEN legacy tables have 0 rows.** `public.scorecards` does not exist on staging (REQ-018 moot there; the only code ref is STRATA's own `/strata/scorecards` route — nothing references the dead table).
- **PROD (lmqwtldpfacrrlvdnmld): MCP token has no permission — counts UNKNOWN.** Open scoping item: Vikram runs the count query (in 20260709190000-style, see below) or grants access. REQ-022 data migration is a staging NO-OP; prod scope pending.
  ```sql
  SELECT 'objectives', count(*) FROM objectives UNION ALL SELECT 'key_results', count(*) FROM key_results
  UNION ALL SELECT 'key_result_checkins', count(*) FROM key_result_checkins UNION ALL SELECT 'kr_work_contributions', count(*) FROM kr_work_contributions
  UNION ALL SELECT 'objective_feature_links', count(*) FROM objective_feature_links UNION ALL SELECT 'objective_work_item_alignments', count(*) FROM objective_work_item_alignments
  UNION ALL SELECT 'strategic_themes', count(*) FROM strategic_themes;
  ```

## Delivered: pill extraction (D-BUILD-001 prerequisite)
- `git mv` OkrStatusPill / OkrProgressCell / OkrThemeDot → `src/components/shared/okr-pills/`; `ProgressBaseline` + `TrendCode` types inlined (their only okr-v2 dependency). Importers repointed: WorkTreeHierarchy (survivor) + okr-v2 StrategyTree (keeps branch compiling until deletion). Stories registry source string updated.
- Validation: tsc clean, 16/16 tests, gates at baseline. Work Tree page renders on :8081 (no error boundary).

## Deletion slice now unblocked (next session, own 2h slice)
1. Delete `src/modules/objectives/`, `src/modules/okr-v2/`, `src/components/okr/`, `EnterpriseObjectives.tsx`.
2. Route retirement (REQ-023): `/enterprise/objectives` → redirect to `/strata/strategy`; remove routeRegistry entry `'/enterprise/objectives'`.
3. Regenerate `usage-map.generated.ts`; sweep stories metadata.
4. REQ-019 seams (initiative→project-card naming in Execution UI) — separate small slice.
5. REQ-022 prod data migration — BLOCKED on prod row counts.
