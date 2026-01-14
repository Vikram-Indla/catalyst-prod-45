# Query Caching Guardrails - Preventing UI Flickering

## Problem

User pickers, dropdowns, and other UI components that fetch data can cause **flickering** when:
1. Queries refetch on every mount/focus
2. Real-time subscriptions trigger immediate invalidations
3. Missing `staleTime` causes data to be considered "stale" immediately

## Solution: Aggressive Caching Pattern

All queries for **static reference data** (users, workstreams, teams, statuses, etc.) should use this pattern:

```typescript
const { data } = useQuery({
  queryKey: ['my-data'],
  queryFn: async () => {
    // fetch data
  },
  // GUARDRAIL: Prevent UI flickering
  staleTime: 5 * 60 * 1000,      // 5 minutes - data considered fresh
  gcTime: 30 * 60 * 1000,        // 30 minutes - keep in cache when unmounted
  refetchOnMount: false,          // Don't refetch if data exists
  refetchOnWindowFocus: false,    // Don't refetch on tab focus
  refetchOnReconnect: false,      // Don't refetch on network reconnect
});
```

## When to Use This Pattern

| Data Type | Use Aggressive Caching? | Example |
|-----------|------------------------|---------|
| User/Profile lists | ✅ Yes | `useActiveUsers`, user pickers |
| Teams/Workstreams | ✅ Yes | Filter dropdowns, selects |
| Statuses/Categories | ✅ Yes | Status dropdowns, kanban columns |
| Real-time data | ❌ No | Live dashboards, chat messages |
| User-specific data | ⚠️ Depends | Personal settings, notifications |

## Real-time Subscription Guidelines

When using real-time subscriptions with `supabase.channel()`:

1. **Debounce invalidations** - Don't invalidate on every change:
```typescript
const lastInvalidation = useRef(0);
const DEBOUNCE_MS = 30000; // 30 seconds

// In subscription handler:
const now = Date.now();
if (now - lastInvalidation.current > DEBOUNCE_MS) {
  lastInvalidation.current = now;
  queryClient.invalidateQueries({ queryKey: ['my-data'] });
}
```

2. **Share subscriptions** - Use global subscription for shared data:
```typescript
// Instead of creating a new channel per component instance,
// use a shared global subscription with reference counting
let globalSubscription = null;
let subscriberCount = 0;
```

## Files Updated with This Pattern

- `src/hooks/useActiveUsers.ts` - Main user picker hook
- `src/components/ui/user-picker.tsx` - User picker component
- `src/components/business-requests/AssigneeUserPicker.tsx`
- `src/components/business-requests/table-view/cells/AssigneeCell.tsx`
- `src/modules/planner/components/kanban/KanbanFilters.tsx`
- `src/hooks/useBoardView.ts`

## Testing for Flickering

1. Open any drawer with a user picker
2. Open the dropdown multiple times rapidly
3. Switch browser tabs and come back
4. Check for any loading spinners appearing briefly

If flickering occurs, verify the query has all guardrail options set.

## Adding New Queries

When adding new queries for dropdown/picker data:

1. Add the `// GUARDRAIL:` comment to document the pattern
2. Include all 5 caching options listed above
3. Test by opening/closing the dropdown rapidly
4. Verify no loading states appear after initial load
