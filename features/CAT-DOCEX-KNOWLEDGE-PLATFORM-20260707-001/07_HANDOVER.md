# 07 — Handover (live, 2026-07-07)

State: S1–S9 CODE COMPLETE + pushed origin/main (worktree /Users/vikramindla/Documents/GitHub/
catalyst-kp-worktree, detached; commits 1b6899284, 6037abfd0, 87696279f, d6b98ce1f, 84bef8e87,
46659c798, 25e76697e, 065a69a3f). S11 agent in flight. Migrations 100000–140000 APPLIED on cyij,
ledger 1:1.

## Hard blocker
cyij edge-fn cap (101) → PaymentRequiredException on ALL deploys (new + updates). Local sbp_
token expired (401, ~/.config/supabase/access-token). Need Vikram: fresh sbp_ token or spend-cap
lift. Then: (1) optionally free slots — safe deletes verified: kb-generate-answers (0 refs),
kb-ingest (0 refs, cron never scheduled); (2) deploy docintel-ask/generate/analyze/ingest/sync
from worktree HEAD; (3) set DOCINTEL_SYNC_SECRET fn secret; (4) run cron paste block from
20260707130000 §4 with cyij ref + secret; (5) S10 evidence pack.

## What is live on cyij NOW (verified)
- docintel_hybrid_search WITH document_updated_at (smoke-passed), docintel_match_facts rewritten,
  ai_document_links, ai_sync_runs, artifact types + approved status + rejection_reason,
  docintel_log_export RPC, scope='fact' chunks allowed.
- OLD fn versions still serving (generate/analyze/ingest v1, no ask) — UI features needing new
  fns (Ask tab, links promotion provenance works via client, approval works via client+RPC,
  dedup/versioning needs new ingest) DEGRADE until deploys land.

## Deploy payload facts
- Nested-name layout accepted by MCP deploy; failure was quota only. docintel-generate has 3
  intentional NUL bytes line ~379 (dedupeKey) — deploy byte-faithfully.
- rtk proxy grep serves stale cache in worktrees — use /usr/bin/grep.

## Feature folder docs
00/01 (objective), 02 (+02a/02b lanes) discovery + capability matrix, 03 Plan Lock (S1–S11),
04 execution log, this handover. Origin audit: docs/doc-intel-audit/reservoir-acceptance-audit/.

---
## CLOSEOUT 2026-07-07
Feature COMPLETE. All slices deployed + acceptance evidenced — see 06_VALIDATION_EVIDENCE.md +
evidence/*.png. Cron docintel-sync-15min live. Residuals tracked as task chips (mic toast on Ask
input, project persistence) + audit P2/P3 items. Worktree catalyst-kp-worktree retained (clean,
== origin/main); dev server :8081 stopped.
