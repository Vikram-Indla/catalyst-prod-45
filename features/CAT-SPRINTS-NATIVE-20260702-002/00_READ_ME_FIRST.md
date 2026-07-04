# CAT-SPRINTS-NATIVE-20260702-002 — Read Me First

> Read this file before anything else in this feature folder.
> Do not implement before reading 01_OBJECTIVE.md and 03_PLAN_LOCK.md.

## Feature Work ID
CAT-SPRINTS-NATIVE-20260702-002

## Status
ACTIVATED — Plan Lock not yet written.

## What this feature is about
Replace the dead Jira-synced sprint data with **Catalyst-native sprints**: FK-only membership, Auto|Custom naming (`BAU-Sprint 1.1 - 08 Jan 26`), 1w/2w Sun→Thu lengths, sprint-specific status vocabulary (planning → active → awaiting_approval → completed/canceled/archived), per-work-item-type Definition of Done that auto-transitions to awaiting approval, approver policy (any/all/quorum) with timestamps, optional sprint→release link, cached AI summary, and gated analytics (time-in-status, efficiency, scope-change history, sprint health).

**Terminology rule (JK, 2026-07-02): "Owner", never "Driver". Jira DOM probes inform structure/CSS/typography only — never vocabulary.**

Full council verdict + live DB probe evidence + Jira DOM probe evidence: `13_COUNCIL_VERDICT.md`.
Agent discovery reports: `agents/A1..A7_*.md`.

## How to continue this feature

```
continue feature CAT-SPRINTS-NATIVE-20260702-002
```

or:

```bash
node scripts/catalyst-feature.mjs continue CAT-SPRINTS-NATIVE-20260702-002
```

## Files to read on continuation
1. 00_READ_ME_FIRST.md (this file)
2. 01_OBJECTIVE.md
3. 03_PLAN_LOCK.md
4. 07_HANDOVER.md
5. 08_DRIFT_LOG.md
6. 09_DECISIONS.md
7. 11_KARPATHY_LOOP_LOG.md
8. 12_AGENT_OUTPUTS.md
