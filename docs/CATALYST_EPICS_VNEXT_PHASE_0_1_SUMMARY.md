# Catalyst Epics vNext – Phase 0 + 1 Implementation Summary

## 1. Changes Made to Terminology & De-scoping

### WSJF → Technical Scoring (Phase 0)
- **EpicDetailsPanel**: Tab renamed from "WSJF" to "Technical Scoring"
- **WSJFBadge**: Tooltip now shows "Technical Scoring Components" and "Tech Score"
- **EpicBacklogListView**: Column header changed from "WSJF Prioritization" to "Tech Score"
- **EnterpriseEpics**: Menu action renamed from "WSJF Estimation" to "Technical Scoring"
- **New Component**: `EpicTechnicalScoringTab` replaces `EpicWSJFTab` with PI-independent scoring

### PI De-scoped from Epic Experience (Phase 0)
- Technical Scoring tab no longer requires PI selection - single score per Epic
- PI badges and PI selector hidden from Technical Scoring workflow
- `EpicTechnicalScoringTab` queries first/only record from `epic_wsjf` without PI filter

### Portfolio Noise Removed (Phase 0)
- Portfolio column remains in EnterpriseEpics for legacy compatibility but not emphasized
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
- Query invalidations for `epics`, `features`, `epic-wsjf`, `backlog-items`

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

## 6. Limitations & TODOs for Future Phases

1. **PI Foreign Key Constraint**: `epic_wsjf.pi_id` still required - placeholder PI used for new records. Future migration needed to make PI optional.

2. **Automatic Roll-up Trigger**: Feature changes don't yet auto-trigger `triggerFeatureRollUp`. Need to integrate into Feature mutation hooks.

3. **Forecast Tab**: Still PI-oriented - marked for future refactoring to date/quarter-based views.

4. **AddPIDialog/MoveToPIDialog**: Still exist but not prominently linked from main Epic flows.

5. **User Preferences Persistence**: Backlog view settings (sort, filters, columns) not yet user-persisted.

6. **EnterpriseEpics Portfolio Column**: Still visible - future phase to hide completely.

---

## Files Changed

### New Files
- `src/hooks/useEpicMutations.ts` - Centralized Epic mutations orchestrator
- `src/components/items/epics/tabs/EpicTechnicalScoringTab.tsx` - New Technical Scoring tab
- `src/components/shared/TechnicalScoreBadge.tsx` - New badge component

### Modified Files
- `src/components/items/epics/EpicDetailsPanel.tsx` - Tab renamed, uses new component
- `src/components/items/epics/dialogs/DeleteEpicDialog.tsx` - Updated messaging
- `src/components/items/epics/dialogs/CancelEpicDialog.tsx` - Updated messaging
- `src/components/epic-backlog/EpicBacklogListView.tsx` - Column header renamed
- `src/components/shared/WSJFBadge.tsx` - Tooltip text updated
- `src/pages/enterprise/EnterpriseEpics.tsx` - Menu action renamed
