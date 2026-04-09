

## Fix: Environment Badge Showing "Staging" Instead of Selected Environment

### Problem
The cycle detail page reads the legacy `environment` text column (always `'staging'`) instead of resolving the environment name from `environment_id` via the `tm_environments` table.

### Root Cause
Two environment columns exist on `tm_test_cycles`:
- `environment` (text) — legacy, defaults to `'staging'`, never updated by edit modal
- `environment_id` (UUID) — correctly set by the edit modal, references `tm_environments`

The detail page renders `cycle.environment` (the stale text field) instead of looking up the name from `tm_environments` using `environment_id`.

### Fix — Two files only

**File 1: `src/pages/testhub/TestCycleDetailPage.tsx`**
- Add a `useEffect` or inline query that resolves `environment_id` → environment name from `tm_environments`
- Replace line 258's display logic: instead of `cycle.environment.charAt(0).toUpperCase()...`, show the resolved environment name
- Fallback: if no `environment_id`, check legacy `environment` field; if neither, show nothing

**File 2: `src/components/testhub/CreateTestCycleModal.tsx`**
- In `handleSubmit` (line 170–178), when saving `environment_id`, also update the `environment` text column with the selected environment's name for backward compatibility
- This ensures other pages that still read the legacy column also get the correct value

### Technical Detail

```text
Detail page resolution logic:
  1. If cycle.environment_id → fetch name from tm_environments → display
  2. Else if cycle.environment → capitalize and display
  3. Else → hide badge

Edit modal save fix:
  updateData.environment = selectedEnvironmentName  // sync legacy column
  updateData.environment_id = environmentId          // already correct
```

### Files to touch
- `src/pages/testhub/TestCycleDetailPage.tsx`
- `src/components/testhub/CreateTestCycleModal.tsx`

### No other files modified

