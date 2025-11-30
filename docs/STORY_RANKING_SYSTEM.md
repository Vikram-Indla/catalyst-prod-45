# Story Ranking System - DEFINITIVE Implementation

**Date**: 2025-11-30  
**Status**: ✅ **PRODUCTION READY**  
**Source**: Official Jira Align Help Center + Catalyst Technical Implementation Guide

---

## 🔐 **DEFINITIVE ARCHITECTURAL DECISIONS**

### **✅ 1. Default Context: Program Rank (REQUIRED)**
**Decision**: `/work-items/stories` **REQUIRES** program selection before displaying stories.

**Jira Align Spec**: *"To view the story backlog, select a program as your scope."*

**Implementation**: Empty state shown if no program selected with prompt to select program via filters.

---

### **✅ 2. Primary Operational Context: Team-Sprint Rank**
**Decision**: When Team + Sprint filters are applied, **Team-Sprint Rank** becomes the active context.

**Jira Align Spec**: *"The number displayed at the far left of a story's row is the rank of the story in the selected sprint."*

**Context Detection Priority**:
1. Team + Sprint → **Team-Sprint Rank** (HIGHEST)
2. Program + PI → **Program-PI Rank**
3. Program only → **Program Rank** (DEFAULT)
4. Portfolio → **Portfolio Rank**
5. No program → Show empty state (blocked)

---

### **✅ 3. Pull Rank Logic: Same-Rank Inheritance**
**Decision**: All stories under the same Feature inherit **that Feature's exact rank** (creating duplicates requiring manual adjustment).

**Jira Align Spec**: *"A feature may have multiple stories that inherit its rank... Therefore, further manual ranking may be required when bulk work items inherit a parent rank (for example, you cannot have 5 work items ranked 1, so they must be manually ranked 1 through 5.)"*

**Algorithm**:
1. Fetch all stories in current context
2. Fetch parent Features' ranks in same context
3. Group stories by feature_id
4. Sort features by rank
5. **All stories under each feature get SAME rank** as parent
6. Orphan stories (no feature) → placed at bottom (max_rank + 1, +2, +3...)
7. Batch upsert to work_item_rankings
8. Show toast warning about duplicate ranks

---

### **✅ 4. Moving Stories Between Sprints**
**Decision**: Story moved to different sprint gets **new rank at bottom** of destination sprint backlog.

**Rationale**: Forces explicit re-prioritization, prevents accidental high placement in new context.

---

### **✅ 5. Ranking Disabled During Filtering**
**Decision**: Drag-and-drop ranking **disabled** when any filters active.

**Jira Align Spec**: *"Ranking is disabled if filtering is on."*

**Rationale**: Prevents incorrect ranking when not all items visible.

---

## 🎯 **7 INDEPENDENT RANKING CONTEXTS**

| Rank Type | Context | When Used | Database Representation |
|-----------|---------|-----------|-------------------------|
| **Program Rank** 🔑 | `program` | **DEFAULT** - Program backlog | `context_type='program', context_id=program_id, pi_id=NULL` |
| **Team-Sprint Rank** ⭐ | `team` + `sprint` | **PRIMARY** - Sprint planning | `context_type='team', context_id=team_id, pi_id=sprint_id` |
| **Program-PI Rank** | `program` + `pi` | PI planning | `context_type='program', context_id=program_id, pi_id=pi_id` |
| **Portfolio Rank** | `portfolio` | Portfolio backlog | `context_type='portfolio', context_id=portfolio_id, pi_id=NULL` |
| **Portfolio-PI Rank** | `portfolio` + `pi` | Portfolio PI planning | `context_type='portfolio', context_id=portfolio_id, pi_id=pi_id` |
| **Global Rank** | `global` | Enterprise-wide (blocked) | `context_type='global', context_id=NULL, pi_id=NULL` |
| **Global-PI Rank** | `global` + `pi` | Enterprise PI planning | `context_type='global', context_id=NULL, pi_id=pi_id` |

---

## 🗄️ **DATABASE ARCHITECTURE**

### **work_item_rankings Table**

```sql
CREATE TABLE work_item_rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id UUID NOT NULL,
  work_item_type TEXT NOT NULL,  -- 'story', 'epic', 'feature', etc.
  context_type TEXT NOT NULL,     -- 'global', 'portfolio', 'program', 'team'
  context_id UUID,                -- NULL for global, FK otherwise
  pi_id UUID,                     -- NULL for all-PI rankings, FK for PI-specific
  rank INTEGER NOT NULL,          -- Position (1 = highest priority)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### **Partial Unique Indexes** (4 indexes handle NULL combinations):
1. Global context: `(work_item_id, work_item_type, context_type)` WHERE `context_id IS NULL AND pi_id IS NULL`
2. Scoped context: `(work_item_id, work_item_type, context_type, context_id)` WHERE `context_id IS NOT NULL AND pi_id IS NULL`
3. Global+PI: `(work_item_id, work_item_type, context_type, pi_id)` WHERE `context_id IS NULL AND pi_id IS NOT NULL`
4. Scoped+PI: `(work_item_id, work_item_type, context_type, context_id, pi_id)` WHERE both NOT NULL

---

## 💻 **IMPLEMENTATION COMPONENTS**

### **1. useWorkItemRanking Hook** ✅ COMPLETE
`src/hooks/useWorkItemRanking.ts`

**Functions**:
- `detectRankingContext(teamId, sprintId, programId, piId, portfolioId)` - Auto-detects active context
- `fetchRanking(workItemId, context)` - Gets rank for work item in specific context
- `batchUpdateRankings(updates, context)` - Bulk rank updates after drag-drop
- `pullRankFromParent(parentType, context)` - **FULLY IMPLEMENTED** - Inherits ranks from Features

**Pull Rank Algorithm** (NEW - COMPLETE):
```typescript
// 1. Fetch all stories in current context (team/sprint/program filters applied)
// 2. Fetch parent Features' ranks from work_item_rankings
// 3. Group stories by feature_id
// 4. Sort features by rank
// 5. Assign SAME rank to all stories within each feature group
// 6. Orphan stories (no feature) → max_rank + sequential
// 7. Batch UPSERT to work_item_rankings
// 8. Show toast: "X stories inherited rank. Manual adjustment may be needed..."
```

---

### **2. Stories Page** ✅ COMPLETE
`src/pages/Stories.tsx`

**NEW - Program Selection Requirement**:
```tsx
const requiresProgramSelection = 
  !advancedFilters.programId && currentContext.type === 'global';

{requiresProgramSelection ? (
  <EmptyState message="Select a program as your scope" />
) : (
  <StoriesListView ... />
)}
```

---

### **3. StoriesListView** ✅ COMPLETE
`src/components/stories/StoriesListView.tsx`

**Features**:
- Drag-drop reordering (via `@hello-pangea/dnd`)
- Automatic rank fetching per context
- Disabled drag when filters active
- Real-time batch updates
- Rank column displays context rank or "-"

---

### **4. PullRankDialog** ✅ COMPLETE
`src/components/stories/PullRankDialog.tsx`

**UI**:
- Shows context badge and story count
- Explains same-rank inheritance
- Warns about manual adjustment needed
- Confirms before applying

---

### **5. StoriesRankingIndicator** ✅ COMPLETE
`src/components/stories/StoriesRankingIndicator.tsx`

**States**:
- Shows badge: "Program Rank", "Team-Sprint Rank", etc.
- Shows "Ranking Disabled (Filters Active)" when filters applied
- Displays current rank number

---

## 🚀 **IMPLEMENTATION STATUS**

### ✅ **Phase 1: Core Ranking - COMPLETE**

1. ✅ Multi-context database schema
2. ✅ Context-aware UI with Program Rank default
3. ✅ Program selection requirement enforced
4. ✅ Drag-drop reordering
5. ✅ **Pull Rank FULLY IMPLEMENTED** - Same-rank inheritance
6. ✅ Rank display column
7. ✅ Filter-aware disabling
8. ✅ story_links table created

### 📅 **Phase 2: Advanced Features - PENDING**

1. Column-based ranking (click header → apply)
2. WSJF-based ranking
3. External Jira sync
4. Bulk rank operations (move to top/bottom/position)

---

## 🔧 **USAGE EXAMPLES**

### **Detect Context**:
```typescript
const context = detectRankingContext(teamId, sprintId, programId, piId, portfolioId);
// Returns: { type: 'program', contextId: programId, piId: null, label: 'Program Rank' }
```

### **Fetch Rank**:
```typescript
const rank = await fetchRanking(storyId, context);
// Returns: rank number or null
```

### **Update Ranks (Drag-Drop)**:
```typescript
await batchUpdateRankings([
  { workItemId: 'uuid-1', newRank: 1 },
  { workItemId: 'uuid-2', newRank: 2 }
], context);
```

### **Pull Rank (NEW)**:
```typescript
await pullRankFromParent('feature', context);
// Groups stories by feature
// Sorts by feature rank
// Assigns SAME rank to all stories in group
// Toast: "X stories inherited rank. Manual adjustment may be needed..."
```

---

## 📚 **JIRA ALIGN SOURCES**

### **[Prioritize/rank work items](https://help.jiraalign.com/hc/en-us/articles/115002917308)**
> "Work items have several different, independent ranks, depending on your selected scope and time period."

> "Ranking is disabled if filtering is on."

> "A feature may have multiple stories that inherit its rank... you cannot have 5 work items ranked 1, so they must be manually ranked 1 through 5."

### **[Backlog for stories](https://help.jiraalign.com/hc/en-us/articles/115000237847)**
> "**Note:** To view the story backlog, select a program as your scope."

> "Pull rank: You can use a parent feature rank to sort stories."

> "The number displayed at the far left of a story's row is the rank of the story in the selected sprint."

---

## ✅ **PRODUCTION READY**

**All Core Features Implemented**:
- ✅ Program Rank DEFAULT (enforced via empty state)
- ✅ Team-Sprint Rank PRIMARY (active when team+sprint filters)
- ✅ Pull Rank FULLY FUNCTIONAL (same-rank inheritance)
- ✅ Context-aware ranking (7 independent contexts)
- ✅ Filter-aware disabling
- ✅ Drag-drop with batch updates

**Architecture Benefits**:
- ✅ Specification-compliant with Jira Align
- ✅ Future-proof (matches Technical Implementation Guide)
- ✅ Scalable (pattern works for all work item types)
- ✅ Performance-optimized (partial indexes, batch updates)

---

**Document Version**: 2.0 DEFINITIVE  
**Last Updated**: 2025-11-30  
**Status**: ✅ **PRODUCTION READY**
