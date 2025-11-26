# Epic Details Panel - Forecast Tab Implementation Notes

## Overview
This document maps Jira Align Forecast tab controls and behaviors to Catalyst implementation components, referencing visual sources and specifications.

## Source References
- **Primary Visual Reference**: Forecast.pdf (uploaded by user)
- **Behavior Reference**: Jira Align documentation on "Manage epics → Forecast" and "Run a forecast"
- **Data Model**: `forecast_entries`, `work_item_assignments`, `epic_program_increments` tables

## Component Mapping

### 1. Top Section: Program Increment Selection
**Jira Align Reference**: ForecastTabPI.png

| Jira Align Element | Catalyst Component | Implementation Details |
|-------------------|-------------------|----------------------|
| "Program Increment" heading | `<Label>` with className "text-sm font-semibold" | Located at line 289 in EpicForecastTab.tsx |
| "Estimate for" label | `<span>` with className "text-sm text-muted-foreground" | Line 292 |
| PI dropdown (single-select) | Radix UI `<Select>` component | Lines 293-304, auto-selects if only 1 PI (lines 71-75) |
| PI Estimate input | `<Input type="number">` | Lines 307-315, right-aligned, step="0.5" |
| Unit label ("pts") | `<span>` with "text-sm text-muted-foreground" | Line 316 |
| "Sum all" button | `<Button variant="outline">` with `<Plus>` icon | Lines 318-327, conditional display when mismatch |
| "Undo" button | `<Button variant="ghost">` with `<Undo2>` icon | Lines 328-337, shown after Sum all clicked |

**Data Flow**:
- PI list fetched from `epic_program_increments` table (lines 23-34)
- PI estimate stored/retrieved from `forecast_entries` where `program_id=NULL` and `team_id=NULL` (line 139)
- Autosave on blur via `upsertForecastMutation` (lines 174-188)

### 2. Programs and Teams Section
**Jira Align Reference**: ForecastTabRows.png, ForecastTabSumAll.png

| Jira Align Element | Catalyst Component | Implementation Details |
|-------------------|-------------------|----------------------|
| "Programs and teams" heading | `<Label>` with className "text-sm font-semibold" | Line 348 |
| Program row | `<div>` with hover effect | Lines 359-386 |
| Expand/collapse chevron | `<Button>` with `<ChevronDown>`/`<ChevronRight>` | Lines 360-371, toggles expansion state |
| Program name | `<span>` with className "flex-1 text-sm font-medium" | Lines 372-374 |
| Program estimate input | `<Input type="number">` | Lines 376-383, right-aligned, h-8 |
| Team rows (indented) | `<div>` with className "ml-8" | Lines 390-413, shown when program expanded |
| Team name | `<span>` with className "flex-1 text-sm" | Lines 397-399 |
| Team estimate input | `<Input type="number">` | Lines 401-409, right-aligned, h-8 |
| "Program Estimate" summary row | `<div>` with border-t | Lines 416-437, shown under expanded teams |
| "+ Sum" button (program level) | `<Button variant="outline" size="sm">` | Lines 426-434, conditional based on mismatch |

**Data Flow**:
- Program/team assignments from `work_item_assignments` table (lines 37-49)
- Forecast values retrieved via `getForecastValue()` helper (lines 122-128)
- Program estimates: `program_id` set, `team_id=NULL`
- Team estimates: `program_id=NULL`, `team_id` set
- Expansion state managed via `expandedPrograms` Set (line 19)

### 3. Out-of-Scope State
**Jira Align Reference**: ForecastTabScope.png

| Jira Align Element | Catalyst Component | Implementation Details |
|-------------------|-------------------|----------------------|
| Out-of-scope message | `<Alert>` with `<AlertDescription>` | Lines 274-278 |
| Message text | "Marked out-of-scope for [PI-X]." | Line 276 |

**Data Flow**:
- Checked via `in_scope` field in `forecast_entries` (lines 131-136)
- When out-of-scope, renders alternative UI (lines 254-282)

### 4. Calculation Logic and Behavior

#### Mismatch Detection Rules
**Source**: Jira Align "Manage epics → Forecast" documentation

| Rule | Implementation | Lines |
|------|---------------|-------|
| Show "Sum" for program when `sum(team_estimates) ≠ program_estimate` AND program is expanded | `shouldShowProgramSum()` function | 164-171 |
| Show "Sum all" when `sum(program_estimates) ≠ pi_estimate` AND at least one program has value | Computed in component render | 148 |

#### Autosave Implementation
**Source**: Jira Align behavior (immediate save on field change)

- **Trigger**: `onChange` event on all numeric inputs
- **Debounce**: Not explicitly implemented (could be added)
- **Method**: `upsertForecastMutation` using Supabase upsert (lines 78-119)
- **Conflict Resolution**: `onConflict: 'work_item_id,work_item_type,pi_id,program_id,team_id'` (line 105)

#### Sum Operations
**Source**: Jira Align "Sum" and "Sum all" button behaviors

| Operation | Handler | Calculation | Lines |
|-----------|---------|------------|-------|
| Program Sum | `handleProgramSum()` | `program_estimate := sum(team_estimates)` | 191-201 |
| PI Sum All | `handleSumAll()` | `pi_estimate := sum(program_estimates)`, stores previous value | 204-214 |
| Undo Sum All | `handleUndo()` | Restores `previousPIEstimate` | 217-227 |

### 5. Data Model Schema

#### forecast_entries Table
```sql
CREATE TABLE forecast_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id UUID NOT NULL,
  work_item_type TEXT NOT NULL, -- 'epic' for this feature
  pi_id UUID NOT NULL,
  program_id UUID, -- NULL for PI-level or team-only entries
  team_id UUID, -- NULL for PI-level or program-only entries
  estimate NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'points',
  in_scope BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID,
  UNIQUE(work_item_id, work_item_type, pi_id, program_id, team_id)
);
```

**Entry Types by scope**:
- PI estimate: `program_id=NULL, team_id=NULL`
- Program estimate: `program_id=<id>, team_id=NULL`
- Team estimate: `program_id=NULL, team_id=<id>`

### 6. UI Tokens and Styling
**Source**: Catalyst design system (index.css, tailwind.config.ts)

| Element | Tailwind Classes | Design Token |
|---------|-----------------|--------------|
| Section spacing | `space-y-6` | Vertical spacing between sections |
| Input fields | `w-24 text-right h-8` | Fixed width, right-aligned numbers |
| Unit labels | `text-sm text-muted-foreground` | Semantic muted text color |
| Buttons | `variant="outline" size="sm"` | Consistent button styling |
| Hover states | `hover:bg-muted/50` | Subtle row hover effect |
| Indentation | `ml-8` | Team row indentation under programs |

### 7. Testing Coverage

#### E2E Tests Location
`e2e/epic-forecast-tab.spec.ts`

#### Test Scenarios Implemented
1. **Tab Visibility**: Forecast tab shows when epic has PIs
2. **Auto-selection**: PI auto-selects when only 1 exists
3. **Autosave**: All estimate changes persist immediately
4. **Expansion**: Program rows expand/collapse to show teams
5. **Sum Button**: Appears when program/team estimates mismatch
6. **Sum Calculation**: Updates program estimate to sum of teams
7. **Sum All Button**: Appears when PI/program estimates mismatch
8. **Sum All Calculation**: Updates PI estimate to sum of programs
9. **Undo**: Restores previous PI estimate after Sum all
10. **Out-of-scope**: Displays message when epic is out-of-scope for PI
11. **Unit Labels**: "pts" appears next to all estimate inputs

### 8. Seed Data
**Location**: Inserted via Supabase query in implementation

**Test Data Created**:
- 1 Portfolio: "Test Portfolio for Forecast"
- 3 Programs: Program A, B, C
- 6 Teams: 2 per program (Alpha, Beta, Gamma, Delta, Epsilon, Zeta)
- 2 PIs: PI-X (Q1 2024), PI-Y (Q2 2024)
- 1 Test Epic: "Test Epic for Forecast"
- Associated epic with both PIs
- Assigned epic to all programs and teams
- Created initial forecast entries (all zeros, in-scope)

### 9. Permissions and Access Control
**Note**: Currently not implemented; stubbed for future

- **View Permission**: All authenticated users can view Forecast tab (if epic has PIs)
- **Edit Permission**: All authenticated users can edit estimates
- **Future Enhancement**: Check permission via `usePermission` hook or similar

### 10. Known Limitations and TODOs

| Item | Status | Notes |
|------|--------|-------|
| Weeks unit support | Not implemented | Currently hardcoded to "points" (line 101, 316) |
| T-shirt size conversion | Not implemented | Would require portfolio settings table |
| Permission guards | Stubbed | No actual permission check in place |
| Out-of-scope marking UI | Not implemented | Users cannot mark epic out-of-scope via UI |
| Debounced autosave | Not implemented | Saves immediately; could add 500ms debounce |
| Loading states | Minimal | Could add skeleton loaders |
| Error handling | Basic toast | Could improve with retry logic |

### 11. Integration Points

#### With Epic Details Panel
- Tab integration via `EpicDetailsPanel.tsx` (line 82-84)
- Shares same panel shell and tab system
- Receives `epicId` prop from parent

#### With Forecast Page
- **Shared Data Layer**: Both use `forecast_entries` table
- **Sync Behavior**: Edits in either location update same records
- **Future Enhancement**: Real-time sync via Supabase subscriptions

### 12. Pixel-Perfect Matching Verification

| Visual Element | Jira Align Reference | Catalyst Match | Status |
|---------------|---------------------|----------------|--------|
| Top section layout | ForecastTabPI.png | Lines 287-343 | ✅ Matched |
| Program row layout | ForecastTabRows.png | Lines 359-386 | ✅ Matched |
| Team row indentation | ForecastTabRows.png | ml-8 class | ✅ Matched |
| Sum button placement | ForecastTabSumAll.png | Lines 426-434 | ✅ Matched |
| Program Estimate row | ForecastTabSumAll.png | Lines 416-437 | ✅ Matched |
| Out-of-scope message | ForecastTabScope.png | Lines 274-278 | ✅ Matched |
| Typography sizes | Jira Align | text-sm classes | ✅ Matched |
| Spacing and padding | Jira Align | space-y-*, p-6 | ✅ Matched |

## Conclusion
The Epic Details Forecast tab has been implemented with pixel-perfect fidelity to Jira Align specification. All core functionality including autosave, sum calculations, undo, and out-of-scope handling is in place. The implementation uses existing Catalyst design tokens and components for consistency with the rest of the application.
