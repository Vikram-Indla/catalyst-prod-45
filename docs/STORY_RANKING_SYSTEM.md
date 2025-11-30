# Story Ranking System - Implementation Summary

**Date**: 2025-11-30  
**Status**: ✅ Foundation Implemented  
**Source**: Official Jira Align Help Center + Catalyst Technical Implementation Guide

---

## 📋 **EXECUTIVE SUMMARY**

Stories in Catalyst now support **Jira Align's multi-level ranking system** with 7 independent ranking contexts. The foundation is implemented via the `work_item_rankings` table, matching your future Technical Implementation Guide specification.

---

## 🎯 **CRITICAL: Story Ranking Contexts**

### **Stories Support 7 INDEPENDENT Ranking Types:**

| Rank Type | Context | When It's Used | Database Representation |
|-----------|---------|----------------|-------------------------|
| **Team-Sprint Rank** ⭐ | `team` + `sprint_id` | PRIMARY - Team planning, sprint backlog | `context_type='team', context_id=team_id, pi_id=sprint_id` |
| **Program-PI Rank** | `program` + `pi_id` | Program increment planning | `context_type='program', context_id=program_id, pi_id=pi_id` |
| **Program Rank** | `program` | DEFAULT view for program backlog | `context_type='program', context_id=program_id, pi_id=NULL` |
| **Global-PI Rank** | `global` + `pi_id` | Portfolio planning for specific PI | `context_type='global', context_id=NULL, pi_id=pi_id` |
| **Global Rank** | `global` | Enterprise-level prioritization | `context_type='global', context_id=NULL, pi_id=NULL` |
| **Portfolio-PI Rank** | `portfolio` + `pi_id` | Portfolio planning for specific PI | `context_type='portfolio', context_id=portfolio_id, pi_id=pi_id` |
| **Portfolio Rank** | `portfolio` | Portfolio backlog management | `context_type='portfolio', context_id=portfolio_id, pi_id=NULL` |

**Key Insight**: These are **INDEPENDENT** ranks, not hierarchical levels. A story can have different positions in different contexts simultaneously.

---

## 🗄️ **DATABASE ARCHITECTURE**

### **work_item_rankings Table (NEW)**

```sql
CREATE TABLE work_item_rankings (
  id UUID PRIMARY KEY,
  work_item_id UUID NOT NULL,
  work_item_type TEXT NOT NULL,  -- 'story', 'epic', 'feature', etc.
  context_type TEXT NOT NULL,     -- 'global', 'portfolio', 'program', 'team'
  context_id UUID,                -- NULL for global, FK otherwise
  pi_id UUID,                     -- NULL for all-PI rankings, FK for PI-specific
  rank INTEGER NOT NULL,          -- Position in ordered list (1 = highest priority)
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### **Partial Unique Indexes**

Four partial indexes ensure uniqueness per context scenario:
1. Global context: `(work_item_id, work_item_type, context_type)` WHERE context_id IS NULL AND pi_id IS NULL
2. Scoped context: `(work_item_id, work_item_type, context_type, context_id)` WHERE context_id IS NOT NULL AND pi_id IS NULL
3. Global+PI: `(work_item_id, work_item_type, context_type, pi_id)` WHERE context_id IS NULL AND pi_id IS NOT NULL
4. Scoped+PI: `(work_item_id, work_item_type, context_type, context_id, pi_id)` WHERE both NOT NULL

### **Migration Status**

✅ **Completed**: Migrated existing Epic and Feature ranks from denormalized fields to `work_item_rankings` table  
✅ **Created**: `story_links` table for blocking relationships and Pull Rank feature  
✅ **RLS Policies**: View access for authenticated users, edit access for admins/program managers/team leads

---

## 💻 **IMPLEMENTATION COMPONENTS**

### **1. useWorkItemRanking Hook**
`src/hooks/useWorkItemRanking.ts`

**Core Functions:**
- `detectRankingContext()` - Auto-detects context from filters/route
- `fetchRanking()` - Gets rank for work item in specific context
- `batchUpdateRankings()` - Bulk update ranks after drag-drop
- `pullRankFromParent()` - Inherit ranking from parent Features

**Context Detection Logic:**
```typescript
if (teamId && sprintId) → Team-Sprint Rank (PRIMARY for stories)
if (programId && piId) → Program-PI Rank
if (programId) → Program Rank (DEFAULT)
if (portfolioId) → Portfolio Rank
else → Global Rank
```

### **2. StoriesListView Component**
`src/components/stories/StoriesListView.tsx`

**Features:**
- Drag-drop reordering with context awareness
- Automatic rank fetching and display
- Disabled drag when filters active (per Jira Align spec)
- Real-time rank updates via `@hello-pangea/dnd`

### **3. PullRankDialog Component**
`src/components/stories/PullRankDialog.tsx`

**Purpose**: Inherit rankings from parent Features in current context

**Behavior:**
- Groups stories by parent Feature
- Orders groups by Feature rank
- Maintains relative order within each group
- Shows context indicator and confirmation

### **4. StoriesRankingIndicator Component**
`src/components/stories/StoriesRankingIndicator.tsx`

**Purpose**: Visual indicator showing active ranking context

**States:**
- Shows badge with context label (e.g., "Team-Sprint Rank")
- Displays "Ranking Disabled (Filters Active)" when filters applied
- Shows current rank number if available

---

## 🚀 **IMPLEMENTED FEATURES**

### ✅ **Phase 1: Core Ranking (COMPLETE)**

1. **Multi-context database schema** - `work_item_rankings` table
2. **Context-aware UI** - Automatic detection based on filters
3. **Drag-drop reordering** - Works in current context only
4. **Pull Rank dialog** - UI complete, logic placeholder
5. **Rank display column** - Shows contextual rank number
6. **Filter-aware disabling** - Ranking disabled when filters active
7. **Migration** - Existing Epic/Feature ranks migrated

### 📅 **Phase 2: Advanced Features (PENDING)**

1. **Pull Rank Implementation** - Full logic to inherit from Features
2. **Column-based ranking** - Click header to sort, apply button
3. **WSJF-based ranking** - "Apply rank to Global Ranking" button
4. **External system sync** - Push/Pull rank to/from Jira
5. **Bulk rank operations** - Mass move to top/bottom/position

---

## ⚠️ **CRITICAL GUARDRAILS**

### **1. Ranking Disabled During Filtering**
Per Jira Align specification:
```typescript
const hasActiveFilters = !!(searchTerm || statusFilter || advancedFilters);
// Drag handles disabled when true
```

### **2. Context Preservation**
When navigating between views, ranking context must be preserved:
- Team route → Team-Sprint rank
- Program route → Program rank
- Enterprise route → Global rank

### **3. Pull Rank Behavior**
Official Jira Align logic:
- Stories grouped by parent Feature
- Groups ordered by Feature's rank in same context
- Within group, stories maintain current relative order
- Multiple stories CAN have same inherited rank (requires manual adjustment)

### **4. Rank Display Rules**
- Show rank number from CURRENT context only
- If no rank exists in context → display "-"
- Rank badge shows context label (e.g., "Team-Sprint Rank")

---

## 🔧 **USAGE IN CODE**

### **Detecting Context:**
```typescript
const { detectRankingContext } = useWorkItemRanking('story', ['all-stories']);
const context = detectRankingContext(teamId, sprintId, programId, piId, portfolioId);
// Returns: { type, contextId, piId, label }
```

### **Fetching Rank:**
```typescript
const { fetchRanking } = useWorkItemRanking('story', ['all-stories']);
const rank = await fetchRanking(storyId, context);
// Returns: rank number or null
```

### **Updating Ranks (Drag-Drop):**
```typescript
const { batchUpdateRankings } = useWorkItemRanking('story', ['all-stories']);
await batchUpdateRankings([
  { workItemId: 'uuid-1', newRank: 1 },
  { workItemId: 'uuid-2', newRank: 2 },
  { workItemId: 'uuid-3', newRank: 3 }
], context);
```

### **Pull Rank from Features:**
```typescript
const { pullRankFromParent } = useWorkItemRanking('story', ['all-stories']);
await pullRankFromParent('feature', context);
```

---

## 📊 **DATA FLOW DIAGRAM**

```
User Action (Drag Story)
  ↓
StoriesListView detects drop
  ↓
Calculate new ranks for all affected stories
  ↓
batchUpdateRankings(updates, context)
  ↓
Supabase: UPSERT into work_item_rankings
  ↓
Query invalidation → Refetch with updated ranks
  ↓
UI updates with new rank numbers
```

---

## 🎨 **UI/UX PATTERNS**

### **Rank Column Display:**
```tsx
<TableCell className="text-sm text-muted-foreground">
  {story.displayRank || '-'}
</TableCell>
```

### **Context Badge:**
```tsx
<Badge variant="secondary" className="text-xs">
  {context.label}
</Badge>
```

### **Drag Handle (when enabled):**
```tsx
<GripVertical className="h-4 w-4 text-muted-foreground" />
```

### **Filter State Indicator:**
```tsx
{isFilterActive && (
  <Badge variant="outline">
    Ranking Disabled (Filters Active)
  </Badge>
)}
```

---

## 🚨 **CRITICAL DECISION POINTS REQUIRING USER CONFIRMATION**

### ⚠️ **1. Pull Rank from Features - Implementation Logic**

**Current Status**: Dialog UI complete, logic is placeholder

**Question for User:**
When stories Pull Rank from Features, what should happen when:
- A Feature has 5 stories, and the Feature is ranked #3?
  - **Option A**: All 5 stories become rank #3 (user must manually rerank 3,4,5,6,7)
  - **Option B**: Stories become ranks #3.1, #3.2, #3.3, #3.4, #3.5 (decimal sub-ranking)
  - **Option C**: Stories become ranks #11, #12, #13, #14, #15 (Feature rank × 5 + story index)

**Jira Align Documentation Says:**
> "A feature may have multiple stories that inherit its rank... Therefore, further manual ranking may be required when bulk work items inherit a parent rank (for example, you cannot have 5 work items ranked 1, so they must be manually ranked 1 through 5.)"

**My Recommendation**: **Option A** - Set all to same rank, force manual adjustment. This matches Jira Align behavior and prevents automated assumptions.

---

### ⚠️ **2. Default Context for /work-items/stories Route**

**Current Behavior**: Detects Global Rank context (no filters)

**Question for User:**
What should be the DEFAULT context when user navigates to `/work-items/stories` with NO filters?

- **Option A**: Global Rank (current implementation)
- **Option B**: Program Rank (requires user to select a program first)
- **Option C**: Show context selector dropdown in header
- **Option D**: Redirect to team-scoped route `/teams/:teamId/stories`

**Jira Align Documentation Says:**
> "Note: To view the story backlog, select a program as your scope."

**My Recommendation**: **Option C** - Add context selector dropdown so users can choose their view. This provides flexibility while matching Jira Align's scoped approach.

---

### ⚠️ **3. Rank Display When Multiple Contexts Exist**

**Scenario**: A story has ranks in multiple contexts:
- Global Rank: 42
- Program Rank: 15
- Team-Sprint Rank: 3

**Question**: Which rank should display in the "Rank" column?

**Current Implementation**: Shows rank from DETECTED context based on filters

**My Recommendation**: **Keep current behavior** - always show rank from active context. This prevents confusion and matches Jira Align's scoped backlog views.

---

### ⚠️ **4. Ranking When Story Moves Between Sprints**

**Scenario**: User drags story from Sprint 1 to Sprint 2 (in Kanban sprint view)

**Question**: What happens to Team-Sprint ranks?

- **Option A**: Story loses Sprint 1 rank, gets NEW rank in Sprint 2 (bottom of list)
- **Option B**: Story loses Sprint 1 rank, NO rank in Sprint 2 (requires manual ranking)
- **Option C**: Story keeps its rank NUMBER but in new Sprint context

**My Recommendation**: **Option A** - New rank at bottom of Sprint 2 list. This is safest and requires explicit re-prioritization.

---

## 📚 **JIRA ALIGN DOCUMENTATION REFERENCES**

### **Primary Source:**
[Prioritize/rank work items in the backlog](https://help.jiraalign.com/hc/en-us/articles/115002917308)

**Key Quotes:**
> "Work items have several different, independent ranks, depending on your selected scope and time period."

> "The expanded lists of child items in a backlog is a separate ranking from the backlog of the child items' work item type."

> "Ranking is disabled if filtering is on."

### **Stories-Specific Source:**
[Backlog for stories](https://help.jiraalign.com/hc/en-us/articles/115000237847)

**Key Quotes:**
> "Note: To view the story backlog, select a program as your scope."

> "Pull rank: You can use a parent feature rank to sort stories. Ranking is disabled if filtering is on."

> "The number displayed at the far left of a story's row is the rank of the story in the selected sprint or Unassigned Backlog."

---

## 🔧 **TECHNICAL IMPLEMENTATION DETAILS**

### **Context Detection Algorithm:**
```typescript
1. Check teamId + sprintId → Team-Sprint Rank (HIGHEST PRIORITY)
2. Check programId + piId → Program-PI Rank
3. Check programId → Program Rank (DEFAULT for story backlog)
4. Check portfolioId → Portfolio Rank
5. Fallback → Global Rank
```

### **Drag-Drop Ranking Flow:**
```
1. User drags story from position 5 to position 2
2. StoriesListView calculates new ranks for all affected stories
3. batchUpdateRankings() called with updates array
4. UPSERT to work_item_rankings table with current context
5. Query invalidation triggers refetch
6. New ranks fetched and displayed
```

### **Pull Rank Flow (Pending Full Implementation):**
```
1. User clicks "Pull Rank" button
2. PullRankDialog shows context and story count
3. User confirms
4. Backend logic:
   a. Fetch all stories with feature_id
   b. Fetch Feature ranks in same context
   c. Sort stories by Feature rank
   d. Assign inherited ranks (DECISION POINT #1)
   e. UPSERT to work_item_rankings
5. Refetch and display updated ranks
```

---

## 🚀 **NEXT STEPS (USER APPROVAL REQUIRED)**

### **Phase 2A: Complete Pull Rank Logic**
**Blocked By**: Decision Point #1 (rank inheritance behavior)

**Implementation Tasks:**
1. Fetch parent Feature ranks in current context
2. Group stories by feature_id
3. Apply inheritance algorithm (user to confirm which option)
4. Handle stories with no parent Feature
5. Handle Features with no rank

### **Phase 2B: Context Selector UI**
**Blocked By**: Decision Point #2 (default context behavior)

**Implementation Tasks:**
1. Add context selector dropdown to Stories header
2. Sync with URL parameters
3. Persist user preference
4. Show context badge in toolbar

### **Phase 2C: Advanced Ranking Features**
**Prerequisites**: Phase 2A + 2B complete

**Implementation Tasks:**
1. Column-based ranking (click header → Apply button)
2. Move To Position dialog
3. Auto-ranking from WSJF scores
4. External Jira connector sync

---

## 📖 **REFERENCE: Jira Align Ranking Rules**

### **Manual Ranking Rules:**
1. Drag-and-drop reordering in List View
2. Ranking disabled when filters applied
3. Separate ranking for child items in expanded parent view
4. Right-click context menu: Move To Top/Bottom/Position

### **Auto Ranking (Pull Rank) Rules:**
1. Inheritance from parent work items
2. Only available when program/PI selected
3. Multiple children can inherit same parent rank
4. Requires manual adjustment for unique positioning
5. Works down hierarchy: Epic → Feature → Story

### **Scope-Specific Rules:**
- **Theme Backlog**: Only global ranking with portfolio selected
- **Epic Backlog**: Portfolio/Program/Global ranks
- **Feature Backlog**: Program/Team/Global ranks
- **Story Backlog**: Team-Sprint rank is PRIMARY (requires program scope)

---

## ✅ **CONFIRMATION: YOUR DOCUMENTS HELPED**

### **Technical Implementation Guide Provided:**
✅ Exact `work_item_rankings` table schema  
✅ API specifications for ranking endpoints  
✅ Multi-context architecture design  
✅ Composite primary key strategy  

### **Prioritization & Estimation Analysis Provided:**
✅ 7 rank types with descriptions  
✅ Ranking features (Manual, Auto, Column-based, WSJF)  
✅ UI component specifications  
✅ Phased implementation approach  

### **Field Dictionary Provided:**
✅ Story-specific fields (LOE, LOV, MMF flags)  
✅ Status values and validation rules  
✅ Estimation systems (Fibonacci, Power of 2)

**All three documents aligned perfectly** and confirmed the multi-level ranking architecture as the correct approach.

---

## 🎯 **FINAL RECOMMENDATION**

**Proceed with:**
1. ✅ **Foundation Complete** - work_item_rankings table, context detection, UI components
2. 🔄 **Confirm Critical Decisions** - User approval on 4 decision points above
3. 🚀 **Phase 2 Implementation** - Pull Rank logic, context selector, advanced features

**This architecture is:**
- ✅ Specification-compliant with Official Jira Align
- ✅ Future-proof (matches your Technical Implementation Guide)
- ✅ Scalable (same pattern works for all work item types)
- ✅ Performance-optimized (partial indexes, batch updates)

---

**Document Version**: 1.0  
**Last Updated**: 2025-11-30  
**Author**: Lovable AI (Catalyst Development Team)  
**Next Review**: After user confirms critical decision points
