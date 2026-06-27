# CAT-ADMIN-AI-CMD-CENTER-20260627-001 — READ ME FIRST

Feature: AI Admin Command Center Redesign
Route: `/admin/ai-assistant`
Branch: main (direct)
Created: 2026-06-27

## What this is

Redesign and harden the existing /admin/ai-assistant page into an enterprise-grade AI Admin Command Center. Replace the blank chat surface with a full-width 3-column cockpit featuring: command library, conversation timeline, live action plan panel, stats strip, sticky composer, and recent activity. Fix P0 backend bugs in the same PR.

## Status

- [x] Feature folder created
- [x] Discovery agents run (4 parallel)
- [x] Discovery doc written: `docs/ai-admin-assistant/UI_UX_REDESIGN_DISCOVERY.md`
- [x] Plan Lock drafted
- [ ] Plan Lock reviewed by Vikram
- [ ] Implementation started
- [ ] Screenshot evidence collected
- [ ] Tests written
- [ ] PR open

## Critical rules

1. Do NOT change the route (`/admin/ai-assistant`)
2. Do NOT add a second admin sidebar
3. Do NOT add a second AdminLayout wrapper
4. Fix the 2 P0 bugs in edge function in the same PR
5. All colors via `var(--ds-*)` tokens only
6. No hardcoded hex colors

## Feature folder index

- `00_READ_ME_FIRST.md` — this file
- `01_OBJECTIVE.md` — full task spec
- `03_PLAN_LOCK.md` — approved implementation plan (read before coding)
- `04_EXECUTION_LOG.md` — written during execution
- `06_VALIDATION_EVIDENCE.md` — screenshots + test results
- `07_HANDOVER.md` — written at context risk
- `09_DECISIONS.md` — key decisions made
- `11_KARPATHY_LOOP_LOG.md` — hypothesis → experiment → measure → log
- `sessions/001_discovery.md` — this session
