# Dark-Mode Page-by-Page Audit — 2026-04-30

Format: append-only, newest at top. Per page: dark-mode screenshot path → defects found → fix applied → verification.

Viewport: 1413×1033 (desktop, user's current). iPad/iPhone passes deferred until desktop is clean.

---

## Page 1 — `/for-you` → redirects to `/` (Home / ForYouPage)

**Initial state:** BLANK PAGE — only top chrome rendered, content area empty.

**Root cause (functional, not dark-mode):**
- `CatalystShell.tsx` lazy-loads 14 chunks (header, banner, 11 sidebars, detail router) with bare `lazy()`.
- During an in-flight HMR / partial deploy, any one chunk URL with a stale `?t=…` timestamp would fail with `Failed to fetch dynamically imported module`.
- ErrorBoundary swallowed the rejection, leaving the entire shell empty.
- This blocked the dark-mode audit because there was nothing to inspect.

**Fix applied:**
- Added `lazyWithRetry()` wrapper in `src/components/layout/CatalystShell.tsx` (lines 7-49).
- On stale-chunk failure, sessionStorage-gated single hard reload (no infinite loops).
- Wired all 14 lazy imports in CatalystShell through the wrapper.

**Verification:**
- Re-navigated `/for-you` → page redirected to `/` and rendered Home + ForYouPage with all sidebars, recent items, and the "For you" feed.
- No `Failed to fetch dynamically imported module` errors in console after fix.
- Remaining console noise (informational, NOT dark-mode):
  - `404 /rest/v1/announcements` — table missing (pre-existing functional)
  - `400 /rest/v1/catalyst_workflow_statuses` — bad query shape (pre-existing functional)
  - `400 /rest/v1/ph_comment_reactions` — bad query shape (pre-existing functional)
  - Statsig `Client must be initialized` — Atlaskit Portal feature-gate init order

**Dark-mode defects on this page:** ⏳ NOT YET ASSESSED — page now renders, audit can resume on next pass.

---
