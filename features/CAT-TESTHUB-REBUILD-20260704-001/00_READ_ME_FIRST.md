# CAT-TESTHUB-REBUILD-20260704-001 — TestHub Enterprise Rebuild

**Phase**: A — Discovery & Fitment (evidence only, NO implementation)
**Status**: Discovery in progress (8 parallel probes launched 2026-07-04)
**Master prompt**: Full enterprise rebuild discovery/blueprint per Vikram's master prompt (2026-07-04). Approval-first: blueprint → prototype route proposal → Vikram approval → only then implementation.

## Ground rules (from master prompt)
- Existing TestHub treated as failed until proven otherwise; audit doc = ~5% weight.
- Manual testing lifecycle only; automation + test-data mgmt OUT of scope.
- UI/UX is 80% of the job. Project Hub = design authority. ADS tokens only.
- No destructive migrations, no route removal, no prod replacement without approval.
- Blueprint output: `docs/testhub-enterprise-rebuild/00_DISCOVERY_FITMENT_BLUEPRINT.md`
- Prototype (Phase B, after approval): safe route `/testhub-lab` or `/testhub/preview` only.

## Key stale-audit finding (session 001)
Provided audit (CATALYST_TESTHUB_TECHNICAL_AUDIT.md, scratchpad) claims "UI awaits greenlight / 2 hooks / Phase 1 not built". Reality: 68 testhub TS/TSX files, full reports subsystem (26-report registry), versioning, timeline, board, defect detail already on main. Recent memory: TestHub prod revamp P0+P1 shipped 2026-07-03.

## Read order for continuation sessions
00 (this) → 01_OBJECTIVE → discovery agent outputs (sessions/001) → blueprint doc in docs/testhub-enterprise-rebuild/.
