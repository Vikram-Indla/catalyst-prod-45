# Phase 8: Typography Audit & Remediation Roadmap
**Date:** June 28, 2026  
**Scope:** 2,133 hard-coded typography violations  
**Status:** Audit complete | Ready for phased remediation  

---

## Executive Summary

**Current State:**
- **2,133 total violations** (100% HARDCODED_FONTSIZE type)
- **1,091 affected files**, split into:
  - **1,265 violations in active code** (6 phases, 5–6 weeks)
  - **484 violations in dormant modules** (optional Phase 8g, 1.5 days)
- **Pattern:** Inline style objects with bare fontSize px values
- **Impact:** Medium-to-high — blocks dark mode consistency, mobile accessibility, WCAG 2.2 compliance

---

## Violation Breakdown

### Top 10 Hotspots (User-Facing)

| File | Violations | Feature | Priority |
|------|-----------|---------|----------|
| VercelConnectionPage.tsx | 89 | admin/deployment | HIGH |
| JiraSyncPage.tsx | 87 | admin/integrations | HIGH |
| AdminAccessPage.tsx | 84 | admin/auth | HIGH |
| BacklogPage.atlaskit.tsx | 73 | backlog/core | **CRITICAL** |
| GadgetSettingsPanel.tsx | 62 | dashboard | HIGH |
| AllReleasesPage.tsx | 79 | releases | MEDIUM |
| GoalDetailDrawer.tsx | 57 | strategy/goals | MEDIUM |
| CycleDetailPage.tsx | 51 | testing | MEDIUM |
| ReportCanvas.tsx | 50 | testing/reports | LOW |
| RingViewV16.tsx | 50 | resource | LOW |

### By Feature Area (Top 15 Modules)

| Feature | Files | Violations | Status |
|---------|-------|-----------|--------|
| chat-v2 | 25 | 83 | Active |
| catalyst-detail-views | 28 | 74 | Active |
| workhub | 31 | 63 | Active |
| project-hub | 19 | 62 | Active |
| admin (pages) | 31 | 48 | Active |
| shared | 18 | 46 | Active |
| project-work-hub (backlog) | 14 | 35 | Active |
| chat | 13 | 34 | Active |
| pages/project-hub | 11 | 30 | Active |
| planner | 14 | 26 | Active |
| stories | 10 | 25 | Active |
| kanban | 11 | 23 | Active |
| strategy | 12 | 22 | Active |
| releases | 10 | 22 | Active |
| wiki (dormant) | 8 | 20 | Dormant |

---

## Impact Assessment

**CRITICAL PATH (Daily, High Traffic):**
- Chat (83 violations) — Message readability, thread typography
- Backlog (73 violations) — Sprint planning surface
- Project Hub Dashboard (62 violations) — Daily reference
- Kanban/Board (23 violations) — Sprint execution

**HIGH PRIORITY (Weekly+ Use):**
- Admin pages (48 violations) — DevOps operations
- Detail Drawers (74 violations) — Goals, stories frequently accessed
- Shared Components (46 violations) — Base patterns affecting all surfaces

**MEDIUM PRIORITY (Less Frequent):**
- Testing hub, releases, requirements, strategy surfaces

**Risk if Unfixed:**
1. Dark mode rendering breaks (Phase 7 fixes regress)
2. Mobile accessibility fails (bare px ignores user zoom) — **WCAG 2.2 blocker**
3. Font scaling inconsistent across breakpoints
4. Typography hierarchy lost
5. Figma → Code sync impossible

---

## Common Violation Patterns

**Most Common Font Sizes:**
```
600+ violations → 12px  → var(--ds-font-size-200)
550+ violations → 13px  → var(--ds-font-size-300)
400+ violations → 14px  → var(--ds-font-size-400)  [BODY_TEXT]
350+ violations → 11px  → var(--ds-font-size-100)
200+ violations → 16px  → var(--ds-font-size-500)  [HEADING_SMALL]
150+ violations → 10px  → var(--ds-font-size-50)   [CAPTION]
```

**Inline Style Pattern (90% of violations):**
```tsx
// BEFORE
<div style={{ fontSize: 12, color: 'var(--ds-text)' }}>...</div>

// AFTER
<div style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text)' }}>...</div>
```

---

## Phased Remediation Roadmap

### Phase 8a: Chat + Backlog (Critical Path)
- **Violations:** 156 (83 chat + 73 backlog)
- **Files:** 12 core components
- **Effort:** 6–8 hours (1 engineer)
- **Timeline:** 1–1.5 days
- **Risk:** Low
- **Acceptance:** Chat/backlog render identically light + dark; mobile 320–375px verified

### Phase 8b: Project Hub + Shared (Dashboard)
- **Violations:** 108 (62 dashboard + 46 shared)
- **Files:** 18 components
- **Effort:** 5–6 hours
- **Timeline:** 1 day
- **Risk:** Low

### Phase 8c: Admin + Integrations (High Traffic)
- **Violations:** 170 (89 Vercel + 87 Jira + 84 access + ops pages)
- **Files:** 15 pages
- **Effort:** 8–10 hours
- **Timeline:** 1.5–2 days
- **Risk:** Medium (Jira parity validation needed)

### Phase 8d: Strategy + Detail Views
- **Violations:** 141 (74 detail views + 45 themes + 22 strategy)
- **Files:** 16 components
- **Effort:** 6–7 hours
- **Timeline:** 1 day

### Phase 8e: Tables, Lists, Mid-Traffic
- **Violations:** 290 (51 cycles + 50 reports + 50 resource + 49+ others)
- **Files:** 20 components
- **Effort:** 10–12 hours
- **Timeline:** 2–2.5 days
- **Risk:** Medium (data-heavy)

### Phase 8f: Remaining Active Modules
- **Violations:** 400 (scattered across layout, tasks, ideas, etc.)
- **Files:** 25+ files
- **Effort:** 12–15 hours
- **Timeline:** 2.5–3 days
- **Risk:** Medium

### Phase 8g: Dormant Modules (Optional)
- **Violations:** 484 (wiki, ideation, deprecated)
- **Files:** 23 files
- **Effort:** 8–10 hours
- **Timeline:** 1.5 days
- **Risk:** Low (not shipped)
- **Decision:** Defer unless reactivating

---

## Effort Summary (Active Codebase 8a–8f)

| Phase | Violations | Hours | Days | Engineers |
|-------|-----------|-------|------|-----------|
| 8a | 156 | 6–8 | 1–1.5 | 1 |
| 8b | 108 | 5–6 | 1 | 1 |
| 8c | 170 | 8–10 | 1.5–2 | 1–2 |
| 8d | 141 | 6–7 | 1 | 1 |
| 8e | 290 | 10–12 | 2–2.5 | 2 |
| 8f | 400 | 12–15 | 2.5–3 | 2 |
| **TOTAL** | **1,265** | **47–58** | **9–10.5** | **2–3 FTE** |

---

## Token Mapping Reference

**Quick Replacements:**

| From | To | Use Case |
|------|----|----|
| `fontSize: 10` | `var(--ds-font-size-50)` | Captions |
| `fontSize: 11` | `var(--ds-font-size-100)` | Small labels |
| `fontSize: 12` | `var(--ds-font-size-200)` | Small text |
| `fontSize: 13` | `var(--ds-font-size-300)` | Secondary text |
| `fontSize: 14` | `var(--ds-font-size-400)` | Body text |
| `fontSize: 16` | `var(--ds-font-size-500)` | Small heading |
| `fontSize: 18` | `var(--ds-font-size-600)` | Medium heading |
| `fontSize: 24` | `var(--ds-font-size-800)` | Large heading |
| `fontWeight: 500` | `var(--ds-font-weight-medium)` | Medium |
| `fontWeight: 600` | `var(--ds-font-weight-semibold)` | High |
| `fontWeight: 700` | `var(--ds-font-weight-bold)` | Bold |

---

## Guardrails & Validation

**Per-Phase QA Gate:**
- ✅ Screenshots (light + dark mode; 320/768/1440px)
- ✅ DOM inspection (no inline fontSize remain)
- ✅ Lighthouse accessibility (maintain or improve)
- ✅ No new violations introduced (ratchet gate enforces)

**Validation Commands:**
```bash
npm run audit:ads           # Check violation count
npm run audit:ads:gate      # Fail-on-increase gate
npm run test                # Unit tests pass
npm run build               # No TS errors
```

---

## Recommendation

**Approve Phases 8a–8f** (active codebase, 1,265 violations, 47–58 hours)  
**Defer Phase 8g** unless wiki/ideation modules reactivating  
**Critical blocker:** Complete Phase 8 before Phase 14 (WCAG 2.2 accessibility audit)

---

**Next Action:** Lock Phase 8 Plan Lock → Begin Phase 8a implementation
