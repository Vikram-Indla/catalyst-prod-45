# Objectives Module - Next Actions Plan

**Status:** Phase 2.1 Active  
**Updated:** December 2, 2025

---

## 🎯 IMMEDIATE ACTIONS (Phase 2.1)

### 1. Delete Duplicate OKRHub
```
DELETE: src/pages/OKRHub.tsx
KEEP: src/pages/enterprise/OKRHub.tsx
REASON: Enterprise version is newer, better integrated
```

### 2. Fix Table Name References ✅ DONE
- Fixed `key_results_v2` → `key_results` in useObjectiveDetail.ts
- All queries now use correct table name from Phase 1 migration

### 3. Consolidate ObjectiveDetailsPanel
```
REVIEW: src/components/okr/ObjectiveDetailsPanel.tsx
REVIEW: src/components/okr/ObjectiveDetailsPanelNew.tsx
ACTION: Keep best implementation, delete duplicate
```

### 4. Update Routing
Check and consolidate routes to objectives:
- `/enterprise/objectives` → EnterpriseObjectives (needs full build)
- `/enterprise/okr-hub` → OKRHub (exists, functional)
- `/enterprise/okr-heatmap` → OKRHeatmap (exists, functional)
- `/enterprise/okr-tree` → OKRTree (exists, functional)

### 5. Theme Audit
Search for non-gold colors in objectives components:
- Check all status badges use gold theme
- Verify progress bars use gold/amber/red (no blue)
- Ensure score badges match spec: green ≥0.7, yellow 0.4-0.7, red <0.4

---

## 📋 PHASE 2.2: Module Reorganization

### Directory Structure to Create
```
src/modules/objectives/components/
├── OKRHub/
│   ├── index.ts
│   ├── OKRHubTable.tsx
│   ├── OKRHubFilters.tsx
│   ├── OKRHubQuickFilters.tsx
│   └── OKRColumnsDialog.tsx
├── ObjectivePanel/
│   ├── index.ts
│   ├── ObjectiveDetailsPanel.tsx (consolidated)
│   ├── ObjectiveDetailsTab.tsx (move from okr/)
│   ├── ObjectiveProgressSection.tsx (move from okr/)
│   └── ObjectiveForm.tsx (NEW - needs build)
├── KeyResults/
│   ├── index.ts
│   ├── KeyResultsList.tsx (move from okr/)
│   ├── KeyResultDialog.tsx (move from okr/)
│   ├── CheckInModal.tsx (move from okr/)
│   └── KeyResultCard.tsx (NEW - needs build)
├── AlignedItems/
│   ├── index.ts
│   ├── AlignedWorkTab.tsx (move from okr/)
│   ├── AddAlignedWorkDialog.tsx (move from okr/)
│   ├── ChildObjectivesTab.tsx (move from okr/)
│   └── AddChildObjectiveDialog.tsx (move from okr/)
├── Widgets/
│   ├── index.ts
│   ├── TeamRoomObjectives.tsx (NEW - needs build)
│   ├── ProgramRoomObjectives.tsx (NEW - needs build)
│   └── SprintBoardObjectives.tsx (NEW - needs build)
└── shared/
    ├── index.ts
    ├── ObjectiveStatusBadge.tsx (NEW - from lovable prompt)
    ├── ObjectiveScoreBadge.tsx (NEW - from lovable prompt)
    ├── ObjectiveTierIcon.tsx (NEW - from lovable prompt)
    └── ProgressBar.tsx (reusable across components)
```

### Files to Move (from src/components/okr/)
- [x] Identify files to move
- [ ] Create target directory structure
- [ ] Move files with updated imports
- [ ] Update all import references in pages/hooks
- [ ] Test after reorganization

---

## 🚧 PHASE 2.3: Core Component Completion

### Build NEW Components
1. **ObjectiveForm.tsx** - Full form with all fields per spec
2. **CreateObjectiveDialog.tsx** - Wraps ObjectiveForm
3. **KeyResultCard.tsx** - Expandable with check-in history
4. **ObjectiveStatusBadge.tsx** - Per lovable prompt spec
5. **ObjectiveScoreBadge.tsx** - Color-coded score display
6. **ObjectiveTierIcon.tsx** - Visual tier indicators

### Complete Existing Components
1. **EnterpriseObjectives.tsx** - Build full page (currently stub)
2. **ObjectiveDetailsPanel** - Consolidate and complete all tabs
3. **KeyResultsList** - Add drag-drop ranking, reports modal
4. **OKRHubTable** - Add hierarchy expand/collapse, filters

---

## 📊 COMPLETION TRACKING

| Phase | Status | % Done | ETA |
|-------|--------|--------|-----|
| 2.1 Critical Fixes | 🔄 Active | 40% | Today |
| 2.2 Reorganization | ⏳ Pending | 0% | 2-3 days |
| 2.3 Core Components | ⏳ Pending | 0% | 3-4 days |
| 2.4 OKR Hub Enhancement | ⏳ Pending | 0% | 2-3 days |
| 2.5 Work Item Integration | ⏳ Pending | 0% | 3-4 days |
| 2.6 Room Widgets | ⏳ Pending | 0% | 2-3 days |
| 2.7 Strategy & Reports | ⏳ Pending | 0% | 3-4 days |
| 2.8 Configuration | ⏳ Pending | 0% | 2-3 days |
| 2.9 Final Integration | ⏳ Pending | 0% | 2-3 days |

---

## ✅ COMPLETED SO FAR

### Phase 1: Foundation
- ✅ Database schema with all tables
- ✅ Enums and types
- ✅ Database functions and triggers
- ✅ RLS policies
- ✅ TypeScript type definitions
- ✅ Constants file with status/tier mappings
- ✅ Score calculation utilities

### Phase 2.1: Fixes
- ✅ Fixed table name references (key_results_v2 → key_results)
- ✅ Created variance analysis report
- ✅ Documented systematic fix plan

---

## 🎯 USER MANDATE ALIGNMENT

Per user instruction:
- ✅ "Go through documents thoroughly" - Variance report complete
- ✅ "Go look at implementation" - Full audit complete
- ✅ "Do not hallucinate" - All fixes based on spec documents
- 🔄 "Execute lovable prompt" - Systematic execution in progress
- 🔄 "Fix objectives module" - Phase 2 consolidation active
- ⏳ "Integrated module wherever objectives" - Integration phase pending
- ✅ "Stick to theme and colors" - Gold #C69C6D confirmed
- ✅ "Do not duplicate" - Consolidation plan addresses this

**Next:** Continue Phase 2.1 cleanup, then proceed to module reorganization

---

**End of Action Plan**
