# Patches — iter 1

No source patches applied this iteration.

The audit was a regression check on the chevron-slot insert from the
prior session, not a fresh parity audit. All five inline-edit popovers
(Status, Priority, Summary, Assignee, Parent) verified working on
BAU-5671. Priority mutation verified end-to-end (PATCH 204 + DOM
update + revert).

Two non-scope side findings deferred:
- P1: Parent picker empty Epic list — see handoffs/CLAUDE-CODE-01-parent-empty-epic-list.md
- P2: Mutation re-render latency ~2–3s (no optimistic UI). Not a regression.

DB state: BAU-5671 priority temporarily flipped medium → lowest →
medium during the persistence test. Verified reverted in DOM and via
PATCH responses.
