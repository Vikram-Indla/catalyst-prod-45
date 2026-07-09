# Karpathy Loop Log (Hypothesis → Experiment → Measure → Keep/Discard → Log)

| # | Date | Hypothesis | Experiment | Measure | Verdict |
|---|---|---|---|---|---|
| 1 | 2026-07-09 | Ideation is greenfield | 6-lane repo discovery | Full legacy module found (ph_ideas + 8 tables + 8 pages) | ❌ Discard — pivoted to wipe+rebuild per Vikram |
| 2 | 2026-07-09 | Ideas belong inside the work-item hierarchy | Hierarchy registry inspection | Seeded 6-level registry roots at business_request; no benchmark embeds ideas | ❌ Discard — Idea = linked intake object |
| 3 | 2026-07-09 | Legacy conversion targets business_requests | grep ideasRoadmapService | Targets ph_requests (wrong table) | ✅ Keep finding — new conversion targets business_requests |
| 4 | 2026-07-09 | Scoring should be hardcoded formulas | Benchmark (PB drivers, Aha! scorecards, ServiceNow weights) + legacy 40-col failure | Legacy scoring columns 90% unused | ❌ Discard — governed scoring framework (models/drivers) |
| 5 | 2026-07-09 | No Mobbin evidence exists for merge/scatter/feedback tools | Web-fallback search | Claimed absent | ❌ Discard — MCP pass found Salesforce/folk merge, TheyDo matrix, Canny |
| 6 | 2026-07-09 | AI panel should be an overlay drawer | Mobbin MCP image inspection (Intercom Details/Copilot rail tabs) | Rail-tab = less chrome, persistent context | 🔁 Revised — rail tab on Detail, drawer on Inbox preview |
| 7 | 2026-07-09 | Portfolio chart needs a new charting dependency | package.json audit | recharts ^3.5.1 present | ✅ Keep — build on recharts |
| 8 | 2026-07-09 | Auto-Delivered lacks an event source | Migration grep | track_epic_process_step_change() trigger precedent + useWorkItemRealtime | ✅ Keep — mirror the trigger pattern |
