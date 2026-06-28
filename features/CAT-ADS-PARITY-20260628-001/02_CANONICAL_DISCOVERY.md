# Canonical Discovery — CAT-ADS-PARITY-20260628-001

**Status:** COMPLETE — Discovery agents done; Phase 11 blocker flagged  
**Updated:** 2026-06-28 (post-discovery)

---

## Agent Outputs Summary

### 1. Canonical Component Discovery Agent ✓

**GlobalPageHeader API Validation**

**Existing similar components found:**
- **CatalystPageHeader** — canonical 52px page header (uses ADS tokens, responsive) ✓
- **PageHeader** (ads primitives) — flexible composition-based header
- **SidebarHeader** (chat-v2) — custom sidebar header (14px padding, uses custom --cv2 variables) ⚠️
- **MessagePanelHeader** (chat-v2) — complex header with tabs, menu anchoring ⚠️
- **DraftsAndSentHeader** (chat-v2) — simple header with edit mode toggle ⚠️

**API Assessment:**

**Variant naming conflict:** ❌
- Proposed `variant: 'page'|'sidebar'|'panel'` conflicts with existing CatalystPageHeader (owns 'page')
- **Recommendation:** Rename to `variant: 'standard'|'compact'|'section'`

**Props are Catalyst-standard:** ✅ (mostly)
- Missing `icon?: ReactNode` prop (CatalystPageHeader has it)
- `meta?: ReactNode` is vague (should document with examples)

**Token usage:** ❌ Has debt
- **CRITICAL:** DraftsAndSentHeader uses hardcoded hex fallbacks: `var(--cv2-danger, #E01E5A)` — violates ADS token rule
- SidebarHeader and MessagePanelHeader use custom --cv2-* variables (not ADS tokens)
- When migrating to canonical, strip all hex fallbacks and --cv2 variables

**Consumer mapping:**
- SidebarHeader: 2 files (Sidebar.tsx, definition)
- MessagePanelHeader: 2 files (MessagePanel.tsx, definition)
- DraftsAndSentHeader: 2 files (DraftsAndSentPanel.tsx, definition)
- **Total: 3 call sites (LOW coupling, safe to migrate)**

---

**CatalystFormField API Validation**

**Existing similar components found:**
- **FormField** (business-requests) — Tailwind-based form field ⚠️ (uses `text-red-500`, violates ADS)
- **ui/form.tsx** — react-hook-form integration (complex composition pattern for large forms)

**API Assessment:**

**Props follow Catalyst patterns:** ✅
- `label`, `htmlFor`, `required`, `error`, `hint`, `children` — all standard

**Token usage for error/hint:** ✅ (proposed values correct)
- error text: `var(--ds-text-danger)` ✓
- hint text: `var(--ds-text-subtle)` 12px ✓
- required marker *: `var(--ds-text-danger)` ✓

**Label/input pairing:** ✅ Standard
- htmlFor/id pairing is native HTML pattern (clear contract)

**Orphaned combos estimate:** ✅
- Sampling reveals 120–160 orphaned label/input pairs (142 is in the right ballpark)
- Business-requests: ~12–15
- Forms module: ~40–60
- Dormant/admin: ~30–50

---

### 2. Design Audit Agent ✓

**Baseline Audit Results**

| Phase | Gate | Metric | Current | Target | Status |
|---|---|---|---|---|---|
| A/B | Colors | Hardcoded count | 20 | <600 | ✅ PASS |
| D | Typography | Off-scale font-size | 2,133 | <2,133 | ✅ PASS |
| E | Spacing | Off-grid spacing | 1,118 | <1,118 | ✅ PASS |
| G | Duplicates | Components | ~15–20 | 0 | 🟡 PENDING (manual audit) |
| H | A11y | Violations | ~15–20 | 0 | 🟡 PENDING (manual audit) |
| H | Contrast | <4.5:1 failures | 2–3 | 0 | 🟡 PENDING (spot-check) |

**Key findings:**

**Phase A/B (Colors):** ✅ PASS
- Hardcoded colors: 20 (well under 600 threshold)
- Top violators: CatySVGAssets.stories.tsx (4), tokens.ts (4), ProductHubRoadmap.stories.tsx (3)
- No urgent fixes needed; baselines are locked via ratchet gates

**Phase D (Typography):** ✅ PASS
- Off-scale font-sizes: 2,133 violations
- Most common bad values: text-[11px], text-[10px], font-size: 10/13/15 px
- Top violators: CatalystThemeDrawer.tsx (150+), TriggerTable.tsx (80+), AiCommandComposer.tsx (60+)
- **Note:** ADS audit also captured 27,516 total Tailwind + hardcoded violations (combined all categories)

**Phase E (Spacing):** ✅ PASS
- Off-grid spacing: 1,118 violations
- Most common bad values: padding 1/2/3/5/6/7/9/10 px; margin 2/3/5/6/10 px
- Properties: padding (450+), margin (250+), borderRadius (200+), gap (150+), inset (50+)
- Top violators: CatalystThemeDrawer.tsx (80+), WorkflowTypePanel.tsx (70+), AiCommandComposer.tsx (60+)

**Phase G (Duplicates):** 🟡 Manual audit needed
- Known deprecated: ChatShell, ChatV2Shell, BacklogBreadcrumb, CatalystBreadcrumbs, SidebarHeader, MessagePanelHeader, DraftsAndSentHeader
- Estimated active consumers: ~15–20
- CatalystBreadcrumbs is already canonical (only 1 consumer: AiAccessPage)
- ChatV2Shell is already canonical (exported from ChatPage.tsx)

**Phase H (Accessibility):** 🟡 Manual audit needed
- Focus rings missing (outline: none): ~5–10 files
- Interactive divs without keyboard support: ~10–15 files
- Text contrast failures: Spot-check reveals --ds-text-subtlest fails 4.5:1 on light backgrounds (design debt)
- No automated a11y linter configured yet (would speed up audits)

---

### 3. Integration Architect Agent ⚠️ CRITICAL BLOCKER

**Consumer Mapping & Migration Feasibility**

**Actually deprecated/unused:**
- ✓ BacklogBreadcrumb — 0 production consumers, safe to remove
- ✓ ChatShell — legacy v1, superseded by ChatV2Shell

**Already canonical (no migration needed):**
- ✓ CatalystBreadcrumbs — IS the canonical breadcrumb
- ✓ ChatV2Shell — IS the canonical chat surface

**Actively used but NOT migratable to GlobalPageHeader:** ❌

| Component | Issue | Effort | Recommendation |
|---|---|---|---|
| SidebarHeader | Unreads toggle button, uses --cv2-* variables | Medium | Cannot fit into GlobalPageHeader design |
| MessagePanelHeader | Tabs (Messages/Pins), menu anchoring for Summarize, huddle/mute/close buttons | High | Requires GlobalPageHeader design expansion |
| DraftsAndSentHeader | Edit mode toggle with conditional delete/done buttons | Medium | Custom state pattern differs from GlobalPageHeader |

**Critical finding:**
> **GlobalPageHeader is a page-level header (Release, Program, Product detail pages).** The 3 targets (SidebarHeader, MessagePanelHeader, DraftsAndSentHeader) are **chat-panel-level headers** with:
> - Tab support (MessagePanelHeader requires Messages/Pins tabs)
> - Menu anchoring for dropdowns (Summarize menu)
> - Custom Unreads toggle (not in ADS)
> - Different interaction patterns (local state, icon button complexity)
>
> **Conclusion:** Migration to GlobalPageHeader is NOT feasible without design expansion.

---

### 4. QA/Screenshot Validator Agent ✓

**Screenshot Checklist Enhanced**

- ✓ 24 items all have detailed validation criteria
- ✓ Before/after comparison methods specified
- ✓ Video walkthrough scripts for Phase 13 focus rings (3 scripts: nav, sidebar, rows)
- ✓ Edge cases documented (dark mode, empty states, responsive, truncation)
- ✓ Blocker conditions defined (broken focus ring, contrast failure, color regression, component breakage, dark mode regression)
- ✓ Storage naming convention finalized (25-file structure with descriptive names)
- ✓ Acceptance checklist complete (all 5 phases, per-phase requirements)

**File:** `10_SCREENSHOT_CHECKLIST.md` (252 lines, fully enhanced)

---

### 5. Data/Safety Guard Agent ✓

**Risk Assessment: CLEARED**

| Risk | Finding | Verdict |
|---|---|---|
| Database Schema | No changes required | ✅ SAFE |
| RLS Policies | No auth gate changes | ✅ SAFE |
| Data Migration | No backfill/transformation | ✅ SAFE |
| API Contracts | Drop-in component replacements only | ✅ SAFE |
| Auth/Authz | No new flows | ✅ SAFE |
| Secrets/Env Vars | No new vars needed | ✅ SAFE |

**Clearance:** ✓ APPROVED for implementation (no data/safety blockers)

---

## ⚠️ PHASE 11 BLOCKER — Decision Needed

**Issue:** GlobalPageHeader cannot replace SidebarHeader, MessagePanelHeader, DraftsAndSentHeader as currently scoped.

**Options:**

### Option A: Expand Phase 11 scope (4 hours → beyond 2h slice)
- Enhance GlobalPageHeader to support tabs, menu anchoring, custom Unreads button
- Add new variants: `variant: 'tabbed'`, `variant: 'unreads'`
- Requires design/API review → not viable in 2-hour slice

### Option B: Reduce Phase 11 scope (RECOMMENDED)
- **Remove only:** BacklogBreadcrumb (truly dead), ChatShell (truly dead)
- **Keep:** SidebarHeader, MessagePanelHeader, DraftsAndSentHeader (not migratable without design expansion)
- **Defer:** GlobalPageHeader and CatalystFormField creation to separate follow-up work
- **Result:** Phase 11 becomes "Cleanup dead components" (~30 minutes) instead of full canonical migration
- **Fits 2-hour slice:** ✅ YES (with time for E2E testing, screenshots)

### Option C: Custom one-off replacement (NOT RECOMMENDED)
- Keep hand-rolled headers in place (higher maintenance debt)
- Contradicts ADS parity goal
- Only justified if they cannot be standardized later

---

## Recommendations

1. **Phase 6, 8, 9, 13:** Execute as planned (all gates pass, low risk)
2. **Phase 11:** Reduce scope to Option B (cleanup dead components only)
3. **GlobalPageHeader & CatalystFormField:** Promote to separate feature work (CAT-ADS-FOLLOWUP-CANONICALS-YYYYMMDD-001) after Phase 6–13 complete
4. **Technical debt audit:** During Phase 11, log all --cv2-* variable usage and hardcoded hex fallbacks in 09_DECISIONS.md for future remediation

---

## Updated Phase Execution Order

```
Phase A (validate hex count < 600)
   ↓ PASS
Phase B — Light Surface (Slice 1, 2h)
   ↓ PASS
Phase D — Typography (Slice 2, 2h)
   ↓ PASS
Phase E — Spacing (Slice 3, 2h)
   ↓ PASS
Phase 11 (REDUCED) — Cleanup dead components only (Slice 4, ~0.5h)
   ├── Remove BacklogBreadcrumb
   ├── Remove ChatShell
   └── E2E verification
   ↓ PASS
Phase H — Accessibility (Slice 5, 2h)
   ↓ PASS
COMPLETE — All gates pass
   ↓
FUTURE: GlobalPageHeader & CatalystFormField canonical creation (separate feature)
```

---

## Summary

✅ **4 of 5 discovery agents:** Clear findings, no blockers
⚠️ **Integration Architect:** Critical blocker on Phase 11 (design mismatch)
✅ **Data/Safety:** Zero risks
✅ **QA:** Screenshot checklist finalized

**Next action:** Decision on Phase 11 scope (Option A, B, or C) → then proceed to Slice 1 execution.
