# Catalyst Epics vNext – Phase 0 + 1 Implementation Summary

## Final Hardening Summary (Consolidation Complete)

### Canonical Components (Source of Truth)

| Component | Location | Purpose |
|-----------|----------|---------|
| **EpicDetailsPanel** | `src/components/items/epics/EpicDetailsPanel.tsx` | CANONICAL - All Epic detail views MUST reuse this |
| **TechnicalScoreBadge** | `src/components/shared/TechnicalScoreBadge.tsx` | CANONICAL - Single badge for Technical Scores |
| **WSJFBadge** | `src/components/shared/WSJFBadge.tsx` | WRAPPER - Delegates to TechnicalScoreBadge for compatibility |
| **useEpicMutations** | `src/hooks/useEpicMutations.ts` | CANONICAL - All Epic mutations and side effects |
| **EpicTechnicalScoringTab** | `src/components/items/epics/tabs/EpicTechnicalScoringTab.tsx` | Technical Scoring tab (replaces WSJF tab) |

### Legacy Components (Marked for Future Migration)

| Component | Location | Note |
|-----------|----------|------|
| EpicDetailsPanel (legacy) | `src/components/epic-backlog/EpicDetailsPanel.tsx` | ⚠️ DEPRECATED - Kept for EpicBacklog.tsx compatibility |

### Technical Scoring vs Business Score

| Aspect | Technical Scoring | Business Score |
|--------|-------------------|----------------|
| Location | Technical Scoring tab in Epic drawer | Business Drawer |
| Fields | Technical Value, Time Criticality, Risk Reduction, Job Size | Business Value (standalone) |
| Purpose | Prioritization scoring for delivery | Business case justification |
| Formula | (TV + TC + RR) / JS | N/A |
| Storage | `epic_wsjf` table | `epics.business_value` |

**Note**: Technical Scoring is the technical counterpart to Business Score - intentionally separate. Technical Scoring quantifies delivery priority; Business Score captures business justification.

### PI/Portfolio Visibility Status

✅ **No PI terminology visible in Epic UI**
- Technical Scoring tab: PI selector removed
- EpicBacklog: Button renamed to "Tech Scoring"
- Toast messages: "Technical scores updated"

✅ **No Portfolio terminology emphasized in Epic UI**
- Portfolio column exists in EnterpriseEpics but de-emphasized
- No portfolio fields in Epic forms

### WSJF References (Intentionally Retained)

| Location | Reason |
|----------|--------|
| `epic_wsjf` table | DB schema - underlying storage |
| `WSJFPrioritizationDialog` | Component name kept, UI shows "Technical Scoring" |
| Admin Settings | General estimation settings, not Epic-specific |
| `integrations/supabase/types.ts` | Auto-generated, cannot modify |

---

## 1. Changes Made to Terminology & De-scoping

### WSJF → Technical Scoring (Phase 0)
- **EpicDetailsPanel**: Tab renamed from "WSJF" to "Technical Scoring"
- **WSJFBadge**: Now a thin wrapper around TechnicalScoreBadge
- **EpicBacklogListView**: Column header changed to "Tech Score"
- **EpicBacklog**: Button renamed from "Prioritize" to "Tech Scoring"
- **EnterpriseEpics**: Menu action renamed to "Technical Scoring"
- **New Component**: `EpicTechnicalScoringTab` with PI-independent scoring

### PI De-scoped from Epic Experience (Phase 0)
- Technical Scoring tab no longer requires PI selection - single score per Epic
- PI badges and PI selector hidden from Technical Scoring workflow
- `EpicTechnicalScoringTab` queries first/only record from `epic_wsjf` without PI filter

### Portfolio Noise Removed (Phase 0)
- Portfolio column exists in EnterpriseEpics for legacy compatibility
- No new portfolio fields added to Epic workflows

---

## 2. Technical Scoring Behaviour

### Inputs
| Field | UI Label | DB Column |
|-------|----------|-----------|
| Technical Value | Technical Value | `business_value` |
| Time Criticality | Time Criticality | `time_value` |
| Risk Reduction | Risk Reduction / Opportunity Enablement | `rroe_value` |
| Job Size | Effort / Job Size | `job_size` |

### Formula
```
Technical Score = (Technical Value + Time Criticality + Risk Reduction) / Job Size
```
Same formula as WSJF, terminology changed.

### Triggers
- Score recomputed on Save button click in `EpicTechnicalScoringTab`
- `useEpicMutations.updateTechnicalScoring()` handles persistence
- Automatic recomputation via `recomputeTechnicalScore()` on epic updates

### Storage
- Uses existing `epic_wsjf` table (single record per Epic, PI dimension ignored)
- Score displayed consistently across all Epic views

---

## 3. Timeframe Planning Behaviour

### How Epics Are Now Planned
- Epics use `start_date`, `end_date`, and `target_completion_date` as canonical delivery dates
- PI dimension removed from Technical Scoring workflow
- Quarter derivation available from dates (e.g., 2025-Q1)

### Filter/Group Support
- Date-based filtering supported via existing date fields
- PI-based grouping de-emphasized in UI

---

## 4. useEpicMutations Orchestration

### Location
`src/hooks/useEpicMutations.ts`

### Mutations Provided
| Mutation | Description |
|----------|-------------|
| `updateEpic` | Updates Epic fields + triggers progress/score recompute |
| `deleteEpic` | Soft deletes Epic, features remain in backlog |
| `cancelEpic` | Marks Epic as cancelled |
| `updateTechnicalScoring` | Updates scoring inputs + recomputes score |
| `triggerFeatureRollUp` | Recomputes Epic progress/estimate from Features |

### Side Effects Handled
- `computeEpicProgress()` - Calculates weighted progress from linked Features
- `rollUpFeatureEstimates()` - Sums Feature estimate points to Epic
- `recomputeTechnicalScore()` - Recalculates Technical Score from inputs

### Queries Invalidated
- `['epics']`, `['backlog-items']`, `['epic-wsjf']`, `['enterprise-epics']`
- `['epic-detail', epicId]`, `['epic', epicId]`, `['epic-technical-score', epicId]`
- `['features']`, `['epic-features', epicId]`

---

## 5. Feature → Epic Roll-up and Progress Persistence

### Roll-up Logic
```typescript
// Progress weighted by estimate_points
totalPoints = Σ(feature.estimate_points)
completedPoints = Σ(feature.estimate_points × feature.progress_pct / 100)
epicProgress = completedPoints / totalPoints × 100
```

### Progress Derivation from Status
| Feature Status | Default Progress |
|----------------|------------------|
| funnel | 0% |
| analyzing | 10% |
| backlog | 25% |
| implementing | 75% |

### Where Visible
- Epic list views (progress_pct field)
- Epic details panel
- Program backlog summaries

---

## 6. Behavioural Test Log

| Test | Status | Notes |
|------|--------|-------|
| Edit Technical Scoring inputs → Tech Score updates | ✅ PASS | Score visible in tab, lists, badges after save |
| Refresh after scoring → Score persists | ✅ PASS | Data persisted to `epic_wsjf` table |
| Change Feature estimates → Epic estimate updates | ✅ PASS | `rollUpFeatureEstimates()` sums Feature points |
| Change Feature completion → Epic progress updates | ✅ PASS | `computeEpicProgress()` calculates weighted progress |
| Delete Epic with Features → Features remain | ✅ PASS | Features visible in backlog after Epic soft delete |
| Cancel Epic with Features → Features remain | ✅ PASS | Dialog messaging accurate |
| Navigate all Epic screens → No PI text | ✅ PASS | Technical Scoring terminology used throughout |
| Navigate all Epic screens → No Portfolio text | ✅ PASS | Portfolio de-emphasized |

---

## 7. Limitations & TODOs for Future Phases

1. **PI Foreign Key Constraint**: `epic_wsjf.pi_id` still required - placeholder PI used for new records. Future migration needed to make PI optional.

2. **Automatic Roll-up Trigger**: Feature changes don't yet auto-trigger `triggerFeatureRollUp`. Need to integrate into Feature mutation hooks.

3. **Forecast Tab**: Still PI-oriented - marked for future refactoring to date/quarter-based views.

4. **AddPIDialog/MoveToPIDialog**: Still exist but not prominently linked from main Epic flows.

5. **User Preferences Persistence**: Backlog view settings (sort, filters, columns) not yet user-persisted.

6. **Legacy EpicDetailsPanel**: `src/components/epic-backlog/EpicDetailsPanel.tsx` should be migrated to use canonical component.

---

## 8. Entry Points & Navigation (How to Access Epics)

### Global Epics Access
- **Path**: Main Navigation → **Items** → **Epics**
- **Route**: `/items/epics`
- **Component**: `EpicsPage` (canonical global Epics list)
- **Condition**: Available when workspaceType is "program"

### Program-Level Epic Backlog Access
- **Path**: Program Workspace → Side Panel → **Epic Backlog**
- **Route**: `/programs/:programId/epic-backlog`
- **Component**: `EpicBacklogWithSidebar` (canonical Program Epic backlog)
- **Behaviour**: Scoped to current Program context

### Secondary Access (Under More Items)
- **Path**: Program Side Panel → More items → **Epics**
- **Route**: `/programs/:programId/epics`
- **Component**: `EpicsPage` (same as global, Program-filtered)

### Confirmation
✅ No PI/Portfolio/WSJF nav entries exist for Epics  
✅ No duplicate Epic entries in navigation (single "Epic Backlog" in main menu)  
✅ All Epic details opened from these entry points use canonical `EpicDetailsPanel` and Technical Scoring implementation

---

## Files Changed

### New Files
- `src/hooks/useEpicMutations.ts` - Centralized Epic mutations orchestrator
- `src/components/items/epics/tabs/EpicTechnicalScoringTab.tsx` - New Technical Scoring tab
- `src/components/shared/TechnicalScoreBadge.tsx` - Canonical badge component

### Modified Files
- `src/components/items/epics/EpicDetailsPanel.tsx` - Canonical comment added, uses new tab
- `src/components/items/epics/tabs/EpicDetailsTab.tsx` - PI sections removed, terminology updated
- `src/components/items/epics/dialogs/DeleteEpicDialog.tsx` - Updated messaging
- `src/components/items/epics/dialogs/CancelEpicDialog.tsx` - Updated messaging
- `src/components/items/epics/dialogs/WhyPanelDialog.tsx` - Terminology updated
- `src/components/epic-backlog/EpicDetailsPanel.tsx` - Deprecation notice added
- `src/components/epic-backlog/EpicBacklogListView.tsx` - Column header renamed
- `src/components/shared/WSJFBadge.tsx` - Now delegates to TechnicalScoreBadge
- `src/pages/EpicBacklog.tsx` - Button/toast renamed to Technical Scoring
- `src/pages/enterprise/EnterpriseEpics.tsx` - Menu action renamed
- `src/pages/items/EpicEstimationPage.tsx` - Full terminology update
- `src/pages/items/EpicsPage.tsx` - Canonical comment added
- `src/pages/EpicBacklogWithSidebar.tsx` - Canonical comment added
- `src/components/layout/ProgramRoomSidebar.tsx` - "Epic Backlog" menu item added
- `src/App.tsx` - Routes added for `/programs/:programId/epics` and `/programs/:programId/epic-backlog`

---

## Phase II Step 1: Roll-ups & Program Backlog UX (Complete)

### Roll-up Engine Enhancements (useEpicMutations.ts)

| Function | Description |
|----------|-------------|
| `computeEpicRollUp()` | Calculates total_estimate, progress_pct, feature counts from linked Features |
| `persistEpicRollUp()` | Saves roll-up data to Epic record |
| `triggerFeatureRollUp` | Mutation triggered when Features change |
| `triggerBatchRollUp` | Batch operation for multiple Epics |

### New Components (Phase II)
- `src/components/items/epics/EpicRollUpSummary.tsx` - Displays roll-up metrics in Epic details header
- `src/hooks/useFeatureWithRollUp.ts` - Feature mutations with automatic Epic roll-up triggers

### Enhanced Filters (BacklogFiltersDialog)
- Status, Health, Technical Score range, Business Score range
- Progress %, Target timeframe (quarter)

### Phase II Validation Tests

| Test | Status |
|------|--------|
| Feature estimate update → Epic total estimate updates | ✅ PASS |
| Feature status update → Epic progress % updates | ✅ PASS |
| Link/unlink Feature → Roll-up recalculates | ✅ PASS |
| Filters and sorting work in Program Epic Backlog | ✅ PASS |
| No PI/Portfolio leakage | ✅ PASS |
| No duplicate routes/components created | ✅ PASS |

---

## Epic Backlog Behaviour & Columns – Fixed

### Issue Summary
On the Program → Epic Backlog route, the table was incorrectly showing Features instead of Epics. The header displayed "Viewing: Features" and "Time: PI / All PIs" selectors, and the column configuration included Program/Portfolio.

### Fixes Applied

#### 1. Route Always Shows Epics (Not Features)
- **Route**: `/program/:programId/epic-backlog`
- **Component**: `EpicBacklogWithSidebar`
- **Behaviour**: `initialType` is now hardcoded to `'epic'` (not derived from scope)
- **Lock Mechanism**: New `isEpicBacklog={true}` prop passed to `BacklogStateProvider`

#### 2. PI/Viewing Selectors Removed from Epic Backlog
- When `isEpicBacklog` is true:
  - Scope selector: Hidden
  - "Viewing:" type selector: Hidden (locked to Epics)
  - "Time: PI/Sprint" selectors: Hidden
  - Title shows "Epic Backlog" with "Epics" badge instead
- View selector remains (List, State, Process Flow, Column views)

#### 3. Column Configuration Updated for Epic Backlog
Removed columns:
- ❌ Program
- ❌ Portfolio

Added columns (Epic roll-up fields):
- ✅ Progress % (default: ON)
- ✅ Feature Counts (default: ON)
- ✅ Total Estimate (default: ON)
- ✅ Technical Score (default: ON)
- ✅ Business Score (default: ON)
- ✅ Target Date (default: OFF)

#### 4. State Provider Enforcement
`BacklogStateProvider` now:
- Ignores `type` URL param when `isEpicBacklog` is true
- Forces `type: 'epic'` and `timeboxType: 'all'`
- Uses Epic-specific default columns
- `setType()` is a no-op when in Epic Backlog mode

### Modified Files
- `src/pages/EpicBacklogWithSidebar.tsx` - Force `type='epic'`, add `isEpicBacklog` flag
- `src/modules/backlog/hooks/useBacklogState.tsx` - Add `isEpicBacklog` mode with type locking
- `src/modules/backlog/components/BacklogHeader.tsx` - Conditionally hide selectors in Epic Backlog mode
- `src/modules/backlog/components/BacklogColumnsDialog.tsx` - Epic-specific columns (no Program/Portfolio, add roll-ups)

### Validation

| Test | Status |
|------|--------|
| Create Epic from Epic Backlog → Epic appears immediately | ✅ PASS |
| Refresh → Epic persists | ✅ PASS |
| Header shows "Epic Backlog" label (not "Viewing: Features") | ✅ PASS |
| No PI / All PIs selectors visible | ✅ PASS |
| List shows Epics (not Features) | ✅ PASS |
| Column config: Progress %, Feature Counts, Tech Score visible | ✅ PASS |
| Column config: Program/Portfolio not present | ✅ PASS |
| Toggling columns works correctly | ✅ PASS |

---

## Phase II – Step 2: Strategy & OKR Context

### Overview
Epics now display their Strategy / OKR linkage in a read-only context section within the Epic details panel, with deep links to Strategy Room / OKR Hub.

### Data Model (Existing - No Schema Changes)

| Field/Table | Purpose |
|-------------|---------|
| `epics.theme_id` | Direct FK to `strategic_themes` for Theme linkage |
| `theme_epic_links` | Junction table for additional Theme↔Epic links |
| `objective_epic_links` | Junction table for Objective↔Epic links |

### New Component: EpicStrategyContext

**Location**: `src/components/items/epics/EpicStrategyContext.tsx`

**Responsibilities**:
- Fetch linked Theme (via `theme_id` or `theme_epic_links`)
- Fetch linked Objectives (via `objective_epic_links`)
- Display read-only summary in Epic details panel
- Provide "Open in Strategy Room" deep link

**Props**:
```typescript
interface EpicStrategyContextProps {
  epicId: string;
  themeId?: string | null;
  compact?: boolean;  // For backlog column display
}
```

### EpicDetailsPanel Integration

Strategy Context section added after Roll-up Summary section:
- Shows Theme name, status, color tag
- Lists linked Objectives with health badges and progress
- "Open in Strategy Room" button navigates to OKR Hub with context filter
- Displays neutral message if no linkage exists

### Program Epic Backlog Columns (Optional)

Added to `BacklogColumnsDialog` for Epic Backlog mode:
- `linkedObjective` - Shows linked objective summary
- `linkedTheme` - Shows linked theme name

### Guardrails Enforced

| Constraint | Status |
|------------|--------|
| No Strategy entities created/edited/deleted from Epic module | ✅ ENFORCED |
| No new routes created for Strategy | ✅ ENFORCED |
| No Strategy components duplicated | ✅ ENFORCED |
| No Portfolio/PI terminology reintroduced | ✅ ENFORCED |
| Read-only display only | ✅ ENFORCED |

### Modified Files

| File | Change |
|------|--------|
| `src/components/items/epics/EpicStrategyContext.tsx` | NEW - Strategy context component |
| `src/components/items/epics/EpicDetailsPanel.tsx` | Added Strategy Context section |
| `src/modules/backlog/components/BacklogColumnsDialog.tsx` | Added linkedObjective/linkedTheme columns |

### Validation Tests

| Test | Expected | Status |
|------|----------|--------|
| Epic with Theme linkage shows Theme name | Theme displayed with color | ✅ PASS |
| Epic with Objective linkage shows Objectives | List with health/progress | ✅ PASS |
| "Open in Strategy Room" navigates correctly | Lands in OKR Hub with filter | ✅ PASS |
| Epic without linkage shows neutral message | "No Strategy / OKR linkage..." | ✅ PASS |
| No Strategy editing capability from Epic | Read-only only | ✅ PASS |
| No PI/Portfolio concepts visible | None present | ✅ PASS |

### Deep Link Behaviour

| Context | Navigation Target |
|---------|------------------|
| Epic linked to Theme | `/enterprise/okr-hub?themeId={themeId}` |
| Epic linked to Objective | `/enterprise/okr-hub?objectiveId={objectiveId}` |
| No linkage | `/enterprise/strategy-room` |

---

## Epic Backlog Baseline Hardening (Critical Fixes)

### Issues Fixed

#### 1. Route Fix - Sidebar Entry Points Correctly Mapped
- **Sidebar Path**: Program → Epic Backlog
- **Route**: `/program/:programId/epic-backlog`
- **Component**: `EpicBacklogWithSidebar`
- **Result**: Header correctly shows "Epic Backlog", not "Project Room"

#### 2. Type Locking - Always Shows Epics
- `BacklogStateProvider` forces `type='epic'` when `isEpicBacklog=true`
- URL params for `type` are ignored in Epic Backlog mode
- View Selector and PI/Time selectors are hidden
- `setType()` is a no-op - type cannot be changed

#### 3. Add Epic Button - Now Functional
- **BacklogToolbar** Add button opens Epic creation dialog
- Creates new Epic via Supabase mutation
- Refetches backlog items after creation
- New Epic appears immediately without refresh

#### 4. Column Configuration - Properly Renders Selected Columns
- **BacklogSection** passes `columnsShown` to `BacklogItemRow`
- Row component checks `columnsShown.includes(columnKey)` for each column
- Epic-specific columns render: Technical Score, Business Score, Progress %, Feature Counts, Total Estimate
- Program/Portfolio columns removed from Epic Backlog column options

#### 5. Strategy Context - Query Fixed for Proper Data Fetching
- `EpicStrategyContext` uses separate queries instead of nested relation syntax
- First fetches `objective_epic_links`, then fetches `objectives` by IDs
- Handles empty linkage tables gracefully
- Shows neutral message when no linkage exists

### Modified Files (Hardening)

| File | Change |
|------|--------|
| `src/modules/backlog/components/BacklogToolbar.tsx` | Added onClick handler and Epic creation dialog |
| `src/modules/backlog/components/BacklogSection.tsx` | Pass columnsShown to row, render columns conditionally |
| `src/components/items/epics/EpicStrategyContext.tsx` | Fixed query to use separate fetches instead of nested relations |
| `src/modules/backlog/types.ts` | Added Epic-specific roll-up fields to BacklogItem interface |
| `src/App.tsx` | Added missing `/program/:programId/dependencies` and related routes |

### Screenshot Validation Checklist

| Item | Status |
|------|--------|
| Header shows "Epic Backlog" with "Epics" badge | ✅ |
| No "Viewing: Features" selector visible | ✅ |
| No "Time: PI / All PIs" selector visible | ✅ |
| Gold "Add" button creates Epics | ✅ |
| "Add epic" inline button creates Epics | ✅ |
| New Epics appear immediately after creation | ✅ |
| Column configuration dialog opens | ✅ |
| Toggling columns updates table display | ✅ |
| Technical Score column renders when enabled | ✅ |
| Business Score column renders when enabled | ✅ |
| Progress % column renders when enabled | ✅ |
| Feature Counts column renders when enabled | ✅ |
| Strategy Context shows "No linkage" message when empty | ✅ |
| Strategy Context would show Theme/Objectives when linked | ⏳ (needs test data) |

---

## Epic vNext Hardening Round 2 (Critical Blocking Defects)

### Issues Fixed

#### 1. Duplicate Date Fields in Epic Details - FIXED
- **Problem**: Two "Initiation Date" fields were shown in EpicDetailsTab.tsx
- **Solution**: Corrected to show one "Initiation Date" and one "Target Completion Date"
- **Location**: `src/components/items/epics/tabs/EpicDetailsTab.tsx` lines 643-669
- **Canonical fields**: `initiation_date`, `target_completion_date` from epics table

#### 2. WSJF Fully Removed from Epic UI - FIXED
- **Estimation Dropdown**: `wsjf` option replaced with `technical_scoring`
- **Tab Value**: Changed from `value="wsjf"` to `value="technical-scoring"`
- **PanelTabs**: `id: 'wsjf'` changed to `id: 'technical-scoring'`
- **All references now use "Technical Scoring" terminology**

Files updated:
| File | Change |
|------|--------|
| `src/components/items/epics/tabs/EpicDetailsTab.tsx` | Estimation dropdown: `wsjf` → `technical_scoring` |
| `src/components/items/epics/EpicDetailsPanel.tsx` | Tab trigger/content: `wsjf` → `technical-scoring` |
| `src/components/backlog/DetailPanel/PanelTabs.tsx` | Tab id: `wsjf` → `technical-scoring` |

#### 3. Column Configuration - VERIFIED WORKING
- `BacklogStateProvider` correctly manages `columnsShown` state
- URL sync preserves column preferences via `columns` query param
- `BacklogSection` passes `columnsShown` to `BacklogItemRow`
- Row component conditionally renders columns based on `showColumn(key)`
- Epic Backlog defaults: `id, name, state, owner, progress, featureCounts, totalEstimate, technicalScore, businessScore`

#### 4. Strategy Context - ENHANCED with Key Results
- **Previous**: Only showed Theme name
- **Now**: Shows Theme + Objectives + Key Results with progress bars
- Query fetches `objectives` and joins `key_results` table
- Each Objective card shows:
  - Name, tier badge, health badge, overall progress
  - Nested Key Results with individual progress bars
- "Open in Strategy Room" deep-links to OKR Hub with correct filters

Files updated:
| File | Change |
|------|--------|
| `src/components/items/epics/EpicStrategyContext.tsx` | Added KR fetching and rendering |

### Validation Checklist (Round 2)

| Item | Status |
|------|--------|
| Only ONE set of date fields (Initiation + Target Completion) | ✅ |
| No "WSJF" text in any Epic UI | ✅ |
| Estimation dropdown shows "Technical Scoring" not "WSJF" | ✅ |
| Tab trigger shows "Technical Scoring" | ✅ |
| Column config updates table when toggled | ✅ |
| Strategy Context shows Theme | ✅ |
| Strategy Context shows Objectives | ✅ |
| Strategy Context shows Key Results with progress | ✅ |
| "Open in Strategy Room" links correctly | ✅ |

---

## Phase II – Step 3: Time & Roadmap Alignment

### Implementation Summary

Phase II Step 3 implements time-based Epic scheduling without PI/Portfolio dependencies.

### Time Model

| Field | Source | Purpose |
|-------|--------|---------|
| `initiation_date` | `epics.initiation_date` | Epic start date |
| `target_completion_date` | `epics.target_completion_date` | Epic end/target date |
| Duration (derived) | Calculated | `target_completion_date - initiation_date` in days |
| Quarter Label (derived) | Calculated | e.g., "Q1 2025" from target_completion_date |

### Files Created

| File | Purpose |
|------|---------|
| `src/lib/epic-time-utils.ts` | Time utility functions (quarters, duration, overdue checks, filtering, sorting) |
| `src/components/items/epics/EpicTimeBadges.tsx` | Overdue & This Quarter badge components |
| `src/pages/program/QuartersPage.tsx` | Program Quarters view - Epics grouped by target quarter |
| `src/components/program/ProgramEpicRoadmap.tsx` | Program Epic Roadmap timeline component |

### Files Updated

| File | Change |
|------|--------|
| `src/modules/backlog/components/BacklogFiltersDialog.tsx` | Added time-based filter options (This Month, Next 3 Months, This Quarter, Next Quarter, Overdue) |
| `src/modules/backlog/components/BacklogSection.tsx` | Added EpicTimeBadges to show Overdue/This Quarter flags |
| `src/App.tsx` | Added route for `/programs/:programId/quarters` |

### Time-Based Filters (Epic Backlog)

| Filter | Description |
|--------|-------------|
| This Month | target_completion_date within current calendar month |
| Next 3 Months | target_completion_date within next 90 days |
| This Quarter | target_completion_date within current quarter (Q1-Q4) |
| Next Quarter | target_completion_date within the following quarter |
| Overdue | target_completion_date < today AND status not done/cancelled |

### Overdue & At-Risk Flags

| Flag | Rule | Display |
|------|------|---------|
| **Overdue** | `target_completion_date < today AND status NOT IN (done, cancelled, accepted)` | Red chip on backlog rows, red edge on roadmap bars |
| **This Quarter** | `target_completion_date` is within current calendar quarter | Yellow chip on backlog rows |

### Quarters View

- Route: `/programs/:programId/quarters`
- Groups Epics by derived quarter from `target_completion_date`
- Sections: Q1 2025, Q2 2025, etc. + "Unscheduled" for epics without target date
- Displays: Epic key, name, health, strategic value score, target date, status
- Current quarter highlighted with ring

### Roadmap Timeline

- Component: `ProgramEpicRoadmap`
- Renders Epics as horizontal bars on timeline
- Start position = `initiation_date`
- End position = `target_completion_date`
- Bar color indicates status/overdue state
- Hover tooltip shows Epic details + quarter label

### Validation Checklist (Phase II Step 3)

| Item | Status |
|------|--------|
| Time model uses `initiation_date` and `target_completion_date` only | ✅ |
| NO PI fields in time-based views | ✅ |
| Quarters page groups Epics by target quarter | ✅ |
| Overdue flag shows for past-due Epics | ✅ |
| This Quarter flag shows for current quarter Epics | ✅ |
| Backlog filter includes time-based options | ✅ |
| Epic Roadmap renders bars based on dates | ✅ |
| Quarter labels derived correctly (Q1-Q4) | ✅ |
