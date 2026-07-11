# CAT-TESTHUB-REMEDIATION-20260711-001 — Validation Evidence

> Raw output from validation commands, DOM probes, API responses.
> Append — never delete.

---

## Validation entries

### 2026-07-11 — Phase 1 automated baseline

| Check | Result |
|---|---|
| Existing Test Hub unit suite | PASS — 1 file, 3 tests |
| Strict Test Hub color gate | PASS — 0 violations across 116 files |
| Repo hard-coded color ratchet | PASS — 0 equals baseline 0 |
| ADS audit ratchet | PASS — no category above baseline |
| Accessibility source ratchet | PASS — 343 findings within baseline 345 |
| Focused Test Hub ESLint | FAIL — 147 errors, 213 warnings |
| Repo contrast gate | FAIL — 116 new repo-wide findings; mostly outside Test Hub, ownership unresolved |
| Mobbin tool inventory | PASS — screen and flow search exposed; accepted references were visually inspected and recorded |
| Current signed-in runtime sweep | PASS — Chrome-backed 15-route read-only sweep and screenshots are recorded |

Commands:

```bash
npx vitest run src/hooks/test-management/__tests__/useDeleteTestExecution.test.tsx
npm run lint:colors:testhub
npm run lint:colors:gate
npm run audit:ads:gate
npm run lint:accessibility
npm run audit:contrast
npx eslint src/pages/testhub src/components/testhub src/hooks/test-management src/hooks/testhub src/components/catalyst-detail-views/test-case src/components/catalyst-detail-views/test-cycle
```

### 2026-07-11 — Live staging read-only baseline

Live staging contains 14 active cases, 2 plans, 0 plan-case links, 4 executions,
5 cycles, 0 cycles linked to plans, 5 runs, 10 step results, 1 run without
results, 22 defects, and 4 defects without links.

Security probes confirmed permissive project access, open plan/folder policies,
public evidence storage, and six ERROR-level security-definer views. Full details
are in `docs/testhub-remediation/01-current-state-revalidation.md`.

### 2026-07-11 — Continuation capability recheck (superseded by session 005)

| Check | Result |
|---|---|
| Mobbin tool inventory | BLOCKED at the time of this probe — superseded when Mobbin tools became available in session 005 |
| Shell access to `127.0.0.1:8080` | BLOCKED — connection refused from isolated runtime |
| In-app browser access to `localhost:8080` | BLOCKED — connection refused |
| Chrome control | BLOCKED — Chrome is running, but the ChatGPT Chrome Extension is not installed/enabled in the selected Chrome profile |
| Chrome native host manifest | PASS — present and correctly allows the expected extension origin |

User-visible Chrome can still show the app, as proven by the screenshot. The
blocker is Codex control of that Chrome profile, not evidence that the app is
down.

### 2026-07-11 — Chrome live runtime sweep

Chrome control was restored after the ChatGPT Chrome Extension was installed and
enabled in the selected Chrome profile.

| Check | Result |
|---|---|
| Chrome extension installed/enabled | PASS |
| `localhost:8080` browser control | PASS |
| Test Hub route screenshots | PASS — 15 screenshots saved |
| Runtime route sweep | PASS — dashboard, repository, board, plans, executions, cycles, reports, traceability, defects, filters, timeline, dependencies, my work, admin test ops, and admin permissions inspected read-only |
| Mobbin tool inventory | PASS in continuation session 005 — screen and flow search returned references and images |

Summary: live runtime evidence confirms that the module renders real screens,
but those screens disagree on active scope and lifecycle state. Full details:
`docs/testhub-remediation/03-live-runtime-sweep.md`.

### 2026-07-11 — Mobbin install/add attempt

| Check | Result |
|---|---|
| Mobbin found in local ChatGPT app catalog | PASS — app id `asdk_app_69fdb9081018819193707354f21b366e` |
| Mobbin app page opened | PASS |
| ChatGPT app-level install/add status | PARTIAL — page indicated Mobbin is installed/added |
| Mobbin tools exposed to current Codex task | FAIL/BLOCKED — connected tool discovery still returned no Mobbin tools |

Interpretation: Mobbin likely needs final sign-in/authorization and/or a fresh
Codex task/session refresh before it can be used for the required market
reference phase.
