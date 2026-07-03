# 01 — Objective

## Feature Work ID
CAT-TESTHUB-PROD-20260703-001

## What Vikram asked for (2026-07-03 overnight brief)
1. **Deep discovery** of the whole Catalyst repo — spend real time understanding routes, hooks, components, and how the project module "excelled" (tables, drawers, modals, pop-up notifications).
2. **Linkage analysis** — complete map of how every TestHub work-item type relates to stories, defects, incidents, releases, sprints. TestHub was built with stubs and drivers; assume integrations are broken until proven wired.
3. **Gap analysis, 500+ items** — as a test-architecture specialist (Xray / AIO Tests / TestRail class), identify what a real test-management product has that we don't. Target 1000+ improvement opportunities overall.
4. **Architecture blueprint** — full proposed test architecture, functional decomposition explained like I'm fifteen, pseudo-code level detail: components, integrations, mutations, UI/UX improvements (light + dark), so execution needs zero re-thinking.
5. **UI/UX audit** — Atlassian Design System + Catalyst canonical patterns ONLY. No foreign design systems. Match project-module quality (JiraTable, drawers, modals, flags). Both light and dark mode.
6. **AI test-case generation** — design a Gemini-API-gateway flow for enterprise-grade AI test case generation. Protect API credits (user-triggered, cached, batched).
7. **Placeholders list** — wherever a good feature needs answers we don't have, create explicit placeholders and list every one.
8. **Plan Lock** — phased execution plan. Vikram wakes → go/no-go → execution cycle builds a working MVP usable in pre-prod next day.

## Constraints (binding)
- Planning cycle only tonight. **No src/ code edits, no migrations, no prod anything.**
- Enhance / refactor / revamp allowed; **deprecating existing TestHub behavior is not**. Reports: reuse, never refactor.
- Stay inside Catalyst rule engine (CRE), CLAUDE.md operating contract, ADS tokens only, canonical components, slug contract, zero-assumption rendering.
- Data is disposable (staging cyij) — seed/delete freely during execution, but engine + shell correctness is the point, not data.
- Target user: 500+ seat testing-domain companies. Usable, dense, enterprise — not fancy.
- Kanban/backlog views must mirror the existing project module views, not diverge.

## Done means (for the planning cycle)
- 02_CANONICAL_DISCOVERY.md — evidence-backed discovery pack (14 discovery reports)
- GAP_REGISTER.md — 500+ classified gaps vs enterprise baseline
- ARCHITECTURE_BLUEPRINT.md — ELI15 functional decomposition + pseudo-code + placeholders list
- 03_PLAN_LOCK.md — VeriMAP, phased slices, binary acceptance, forbidden files
- Council verdict (Advanced Council v3 synthesis) recorded in 09_DECISIONS.md
- Final overnight report to Vikram
