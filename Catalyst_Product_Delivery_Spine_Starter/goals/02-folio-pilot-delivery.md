# Goal: deliver one approved Folio pilot feature

Do not run this goal until a new Folio packet is explicitly marked:

```yaml
status: implementation-ready
dispatch: ready
```

## Required cycle

1. Validate packet and approval.
2. Create an isolated worktree.
3. Re-run targeted discovery.
4. Implement the smallest complete user outcome.
5. Add unit/integration tests.
6. Add Playwright headless E2E coverage.
7. Capture screenshots, traces, console errors, and network failures.
8. Run accessibility checks.
9. Update traceability and known limitations.
10. Run independent certification using a fresh agent/thread.
11. Stop at a reviewable local branch. Do not push or deploy unless explicitly instructed.

## Release standard

The pilot passes only when:
- every acceptance criterion has evidence;
- no P0/P1 regression remains;
- all unverified claims are removed;
- rollback/recovery is documented;
- project context contamination is zero.
