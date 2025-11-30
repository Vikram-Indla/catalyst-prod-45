# Stories Module - Quick Reference

## Quick Start

### Creating Stories
```typescript
// Quick Add (inline)
<StoryQuickAdd onSuccess={() => refetch()} />

// Full Form
<Button onClick={() => setDialogOpen(true)}>
  Create Story
</Button>
```

### Filtering Stories
```typescript
// Program filter (required per Jira Align)
const requiresProgramSelection = !advancedFilters.programId && currentContext.type === 'global';

// Apply filters
<StoriesFiltersDialog 
  open={filtersOpen}
  onApplyFilters={setAdvancedFilters}
/>
```

### Ranking Stories
```typescript
// Detect context
const currentContext = detectRankingContext(
  teamId, sprintId, programId, piId, portfolioId
);

// Pull rank from Features
await pullRankFromParent('feature', currentContext);
```

---

## Component Usage

### StoryDetailPanel
```typescript
<StoryDetailPanel
  story={selectedStory}
  open={detailsOpen}
  onClose={() => setDetailsOpen(false)}
  onUpdate={refetch}
/>
```

**Tabs:**
- Details: Name, description, acceptance criteria, status, hierarchy, estimation
- Children: Subtasks management
- Links: Internal & external links
- Attachments: File upload/download (10MB max)
- Discussions: Comments
- History: Activity log

### StoriesToolbar
```typescript
<StoriesToolbar
  selectedCount={selectedRows.size}
  selectedIds={Array.from(selectedRows)}
  stories={stories}
  onRefetch={refetch}
  onClearSelection={() => setSelectedRows(new Set())}
  onPullRank={handlePullRank}
/>
```

**Actions:**
- Export to CSV
- Bulk delete
- Pull rank
- Move (placeholder)
- Assign (placeholder)

---

## Database Queries

### Fetch Stories
```typescript
const { data: stories } = useQuery({
  queryKey: ['all-stories', filters],
  queryFn: async () => {
    let query = supabase
      .from('stories')
      .select('*, features(name), teams(name), iterations(name)');
    
    // Apply filters
    if (programId) {
      const { data: programFeatures } = await supabase
        .from('features')
        .select('id')
        .eq('program_id', programId);
      query = query.in('feature_id', featureIds);
    }
    
    return query;
  }
});
```

### Create Story
```typescript
const { error } = await supabase
  .from('stories')
  .insert({
    name,
    feature_id,
    status: 'todo',
    estimate_points,
    team_id,
    sprint_id
  });
```

### Update Story
```typescript
const { error } = await supabase
  .from('stories')
  .update({ status: 'done' })
  .eq('id', storyId);
```

---

## File Attachments

### Upload File
```typescript
// 1. Upload to storage
const fileName = `${storyId}/${Date.now()}.${ext}`;
const { data } = await supabase.storage
  .from('attachments')
  .upload(fileName, file);

// 2. Create record
await supabase.from('attachments').insert({
  entity_type: 'stories',
  entity_id: storyId,
  file_name: file.name,
  file_path: fileName,
  file_size: file.size,
  mime_type: file.type,
  uploaded_by: userId
});
```

### Download File
```typescript
const { data } = await supabase.storage
  .from('attachments')
  .download(filePath);

const url = URL.createObjectURL(data);
// Trigger download
```

---

## CSV Export

```typescript
const handleExport = () => {
  const headers = ['ID', 'Name', 'Status', 'Feature', 'Team', 'Sprint', 'Points', 'LOE', 'Created'];
  const rows = stories.map(s => [
    s.id, s.name, s.status, 
    s.features?.name, s.teams?.name, s.iterations?.name,
    s.estimate_points, s.points_loe, 
    new Date(s.created_at).toLocaleDateString()
  ]);
  
  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  
  // Download
  const blob = new Blob([csv], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `stories_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
};
```

---

## Ranking System

### Context Detection
```typescript
const detectRankingContext = (teamId, sprintId, programId, piId, portfolioId) => {
  if (teamId && sprintId) return { type: 'team', label: 'Team-Sprint Rank' };
  if (programId && piId) return { type: 'program', label: 'Program PI Rank' };
  if (programId) return { type: 'program', label: 'Program Rank' };
  if (portfolioId) return { type: 'portfolio', label: 'Portfolio Rank' };
  return { type: 'global', label: 'Global Rank' };
};
```

### Pull Rank Logic
```typescript
// Stories inherit EXACT rank of parent Feature
const pullRankFromParent = async (parentType, context) => {
  // 1. Fetch stories in context
  const stories = await fetchStories(context);
  
  // 2. Fetch parent Features with ranks
  const features = await supabase
    .from('features')
    .select('id, global_rank')
    .in('id', stories.map(s => s.feature_id));
  
  // 3. Assign Feature ranks to Stories
  const updates = stories.map(story => {
    const feature = features.find(f => f.id === story.feature_id);
    return { workItemId: story.id, newRank: feature.global_rank };
  });
  
  // 4. Batch update
  await batchUpdateRankings(updates, context);
};
```

---

## Status Workflow

```
To Do → In Progress → Done → Accepted
                    ↓
                 Blocked (can move to any state)
```

**Status Colors:**
- `todo`: Muted gray
- `in_progress`: Primary blue/gold
- `done`: Theme green
- `accepted`: Success green
- `blocked`: Destructive red

---

## Design Tokens

```css
/* Brand Colors */
--brand-gold: hsl(35, 46%, 60%);      /* #C69C6D */
--brand-gold-hover: hsl(35, 42%, 55%); /* #B8905F */

/* Spacing Scale */
--s1: 4px;
--s2: 8px;
--s3: 12px;
--s4: 16px;
--s5: 20px;
--s6: 24px;
--s7: 32px;
--s8: 40px;
--s9: 48px;
```

---

## Common Patterns

### Empty States
```typescript
{stories.length === 0 ? (
  <div className="text-center py-8">
    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
    <p className="text-sm text-muted-foreground">No stories yet</p>
    <Button onClick={handleCreate} className="mt-4">
      Create First Story
    </Button>
  </div>
) : (
  <StoriesList stories={stories} />
)}
```

### Loading States
```typescript
{isLoading ? (
  <p className="text-sm text-muted-foreground text-center py-4">
    Loading stories...
  </p>
) : (
  <StoryContent />
)}
```

### Error Handling
```typescript
onError: (error) => {
  console.error('Story error:', error);
  toast.error('Failed to update story');
}
```

---

## Keyboard Shortcuts

(Future enhancement - not currently implemented)

Proposed:
- `N`: New story
- `E`: Edit selected
- `D`: Delete selected
- `/`: Focus search
- `Esc`: Close panels/dialogs

---

## Testing Utilities

```typescript
// Mock story data
const mockStory = {
  id: '123',
  name: 'Test Story',
  status: 'todo',
  feature_id: 'feature-1',
  estimate_points: 5,
  features: { name: 'Feature 1' }
};

// Test query
await waitFor(() => {
  expect(screen.getByText('Test Story')).toBeInTheDocument();
});
```

---

**Last Updated:** 2025-11-30  
**Version:** 1.0.0
