# 06 — VALIDATION EVIDENCE (session 005, 2026-07-09, app: worktree on :8081, DB: staging cyijbdeuehohvhnsywig)

## Staging migration apply (Plan Lock sanctioned; project-ref asserted per call)
| Version | Content | Result |
|---|---|---|
| 20260709170000 | Play→Theme table+RPC rename + needs_attention repair | Applied. 4 charter rows preserved, 2 RLS policies followed rename, old table+RPC gone |
| 20260709171000 | card→objective edge + validation trigger + portfolio referential guard | Applied |
| 20260709172000 | canonical-chain seed extension | Applied — rule-5/6 UPDATE was a NO-OP (drift D-BUILD-002) |
| 20260709180000 | chain repair (new this session): demo cards → objective-bearing sub-themes, chain re-closed | Applied. 4/4 cards linked, proj objective + KPI rollup edges created |
Ledger: 4 rows inserted with exact file versions (1:1 with committed files). Verified `ledger_rows=4… 3+1`.

## DB-level linkage verification (rules 5–15)
- cards_linked 4/4; proj_obj `…1911` parent = Grow B2B Revenue `…1111` (rules 7/8); `rolls_up_to` edge for proj KPI `…1912` (rules 9/10); Care card has `has_objective`+`measures` links.
- **Negative tests PASS (rules 12–15)**: `member_type='theme'` → rejected by CHECK+trigger; theme UUID smuggled as `project_card` → rejected by referential guard. Test transaction rolled back (no residue).

## DOM acceptance on :8081 (worktree build, live staging data)
- **REQ-004/005**: sidebar = Command Center + 4 canonical areas + Configuration; banned labels (Play, Strategy Hub, Objectives & OKRs) absent. 10/10 routes render, zero dead links/error boundaries.
- **REQ-006**: `strata-config-context` toolbar with Cycle FY2026 + Period Q2 FY2026 present on ALL 10 routes (JS sweep).
- **REQ-001/003**: hierarchy shows Theme labels; no "Play" text on Strategy Room.
- **REQ-013 drilldown**: Scorecards → CEO Scorecard · Q2 FY2026 (slug route) → measure B2B Revenue Growth (KPI detail: achievement 111.3%, lineage → RUN-1001 staging row, ownership dashes) → Execution → Care App v3 (slug route) showing Strategic Theme **B2B Growth Engine**, Linked Strategic Objective **Grow B2B Revenue**, Blockers first-class (0), Milestones 3, Dependencies 1. **Sector/CXO leg NOT exercisable — no sector scorecard instance in seed (gap, see Remaining).**
- **REQ-012 grouping**: Scorecards page groups models under "CEO Scorecard"; Sector/CXO group not visible without seeded sector model.

## Micro-interaction ACs (Plan Lock list — sampled evidence)
1. Hover states: PASS (sampled — interactive rows/cards respond; component-owned styles).
2. Focus ring: PASS — visible ~2.8px outline on focused sidebar button and page buttons (JS computed-style probe).
3. Loading: PASS (no blank flash observed on navigation; data pages render skeleton→content). Not instrumented per-surface.
4. Empty states: PASS — "No project cards in this group" (ZZTEST group); unknown fields render "—" everywhere (card Overview, KPI ownership).
5. Transitions: not instrumented this session (map zoom/pan untested) — OPEN.
6. Mutation feedback: not exercised (no writes this session) — OPEN.
7. Drilldown continuity: back/forward navigation preserved list state during REQ-013 walk — PASS (sampled).
8. Tooltips: **PARTIAL FAIL** — status lozenges (e.g. ON TRACK on card detail) carry no title/aria tooltip explaining RAG meaning.

## Truthfulness findings (not bugs in this slice; logged for follow-up)
- Seeded charters for B2B Growth Engine + Network Excellence have `owner_id=NULL` but DB `status='complete'` (seeded directly, bypassing RPC derivation) → UI truthfully shows "Charter incomplete" from field-level check. Data repair candidate.
- StrataStrategyRoomPage.tsx:620 recomputes charter completeness client-side (hypothesis+value_thesis+owner) — weaker than the server derivation (also requires scope+gate_model). Should read `charter.status` once seeded statuses are trustworthy.
- `catalyst-rq-cache` (persisted react-query cache) hydrates stale data after DB changes with no network refetch on load — masked the migration effects until cleared. Worth a staleTime/buster review.
- Legacy staging data still contains theme named "Enterprise Expansion Play (proof)" (old proof row on FY2027 cycle) — data, not code; REQ-022/023 territory.

## Screenshots (signoff pending Vikram)
Scorecards landing, CEO Scorecard detail, KPI detail, Execution by-theme, Care App v3 detail — attached in chat session 005.
