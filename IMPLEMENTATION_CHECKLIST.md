# IMPLEMENTATION CHECKLIST — ADS Description Field
**Ready-to-build checklist for CanonicalDescriptionField**

---

## PRE-FLIGHT CHECKLIST

### Dependencies Check
- [ ] Verify @atlaskit packages available in package.json
- [ ] Add if missing: @atlaskit/textarea, @atlaskit/form, @atlaskit/button, @atlaskit/icon
- [ ] Run `npm install` to verify no conflicts
- [ ] Check TypeScript version (must be ≥4.9)

### Project Structure
- [ ] Verify `src/components/shared/` directory exists
- [ ] Verify `src/hooks/` directory exists
- [ ] Verify `src/lib/` directory exists
- [ ] Create subdirectory: `src/components/shared/CanonicalDescriptionField/`

### Git Branch
- [ ] Create feature branch: `git checkout -b feat/canonical-description-field`
- [ ] Current branch: `claude/beautiful-dhawan-cf35f3` ✅

---

## PHASE 1: COMPONENT CREATION (Week 1)

### Step 1: Type Definitions
**File:** `src/components/shared/CanonicalDescriptionField/description.types.ts`

**Checklist:**
- [ ] Create file
- [ ] Copy type definitions from `DESCRIPTION_ARCHITECTURE.md` section 2
- [ ] Export: WorkItemType, DescriptionConfig, DescriptionState, CanonicalDescriptionFieldProps, DescriptionMention
- [ ] Run `tsc --noEmit` to verify types compile

**Lines of code:** 68

---

### Step 2: Main Component
**File:** `src/components/shared/CanonicalDescriptionField/CanonicalDescriptionField.tsx`

**Checklist:**
- [ ] Create file
- [ ] Copy component code from `DESCRIPTION_ARCHITECTURE.md` section 2
- [ ] Import types from ./description.types.ts
- [ ] Verify all ADS imports are correct (@atlaskit/*)
- [ ] Test: `npm run dev` → no errors
- [ ] Test: Component renders without crashing

**Key functions:**
- parseMentions() — extract @user and URL patterns
- handleChange() — validate + update on text input
- handleSave() — call onSave mutation
- handleCancel() — revert to original value
- handleEditToggle() — switch between view/edit modes

**Lines of code:** 282

---

### Step 3: View Mode Component
**File:** `src/components/shared/CanonicalDescriptionField/DescriptionViewMode.tsx`

**Checklist:**
- [ ] Create file
- [ ] Copy component code from `DESCRIPTION_ARCHITECTURE.md` section 2
- [ ] Implement renderMarkdown() function for **bold**, _italic_, `code`
- [ ] Test: Empty state displays "No description provided."
- [ ] Test: Edit button appears and is clickable

**Lines of code:** 104

---

### Step 4: Edit Mode Component
**File:** `src/components/shared/CanonicalDescriptionField/DescriptionEditMode.tsx`

**Checklist:**
- [ ] Create file
- [ ] Copy component code from `DESCRIPTION_ARCHITECTURE.md` section 2
- [ ] ADS TextArea must show maxLength indicator
- [ ] Error message displays below textarea when error prop set
- [ ] Markdown hint displays: "Supports: **bold** _italic_ `code`"
- [ ] Character counter shows "X / 10000 characters"

**Lines of code:** 89

---

### Step 5: Validation Utilities
**File:** `src/components/shared/CanonicalDescriptionField/DescriptionValidation.ts`

**Checklist:**
- [ ] Create file
- [ ] Implement validateDescription() function
  - Validates minLength
  - Validates maxLength
  - Validates isRequired
  - Returns { valid: boolean, error?: string }
- [ ] Test: All validation rules work

**Lines of code:** 42

---

### Step 6: Export Index
**File:** `src/components/shared/CanonicalDescriptionField/index.ts`

**Checklist:**
- [ ] Create file
- [ ] Export: CanonicalDescriptionField, DescriptionViewMode, DescriptionEditMode
- [ ] Export types: WorkItemType, CanonicalDescriptionFieldProps

```typescript
export { CanonicalDescriptionField } from './CanonicalDescriptionField';
export { DescriptionViewMode } from './DescriptionViewMode';
export { DescriptionEditMode } from './DescriptionEditMode';
export type {
  WorkItemType,
  CanonicalDescriptionFieldProps,
  DescriptionMention,
} from './description.types';
```

---

## PHASE 2: HOOKS LAYER (Week 1)

### Step 7: useCanonicalDescription Hook
**File:** `src/hooks/useCanonicalDescription.ts`

**Checklist:**
- [ ] Create file
- [ ] Copy hook code from `DESCRIPTION_ARCHITECTURE.md` section 3
- [ ] Uses @tanstack/react-query for data fetching
- [ ] Implements mutation for save operation
- [ ] Handles onSuccess/onError callbacks
- [ ] Test: Fetches description on mount
- [ ] Test: Save mutation works
- [ ] Test: Query invalidation on success

**Lines of code:** 68

---

### Step 8: useDescriptionValidation Hook
**File:** `src/hooks/useDescriptionValidation.ts`

**Checklist:**
- [ ] Create file
- [ ] Copy hook code from `DESCRIPTION_ARCHITECTURE.md` section 3
- [ ] Implements ValidationRules interface
- [ ] Validates minLength, maxLength, isRequired
- [ ] Supports customValidator callback
- [ ] Returns: { error, validate }
- [ ] Test: All validation rules trigger correctly

**Lines of code:** 54

---

## PHASE 3: API LAYER (Week 1)

### Step 9: descriptionApi
**File:** `src/lib/descriptionApi.ts`

**Checklist:**
- [ ] Create file
- [ ] Copy API code from `DESCRIPTION_ARCHITECTURE.md` section 4
- [ ] Implements: fetch(), update()
- [ ] Routes to correct Supabase table based on workItemType
  - 'task' → planner_tasks
  - 'feature' → features
  - 'incident' → incidents
  - 'epic' → epics
  - 'story' → stories
- [ ] fetch() returns description string or ''
- [ ] update() sets description + updated_at timestamp
- [ ] Test: Query returns correct data for each workItemType
- [ ] Test: Update persists to database

**Lines of code:** 51

---

## PHASE 4: TESTING (Week 1-2)

### Step 10: Unit Tests
**File:** `src/components/shared/CanonicalDescriptionField/CanonicalDescriptionField.test.tsx`

**Checklist:**
- [ ] Test: Component renders in view mode
- [ ] Test: Component renders in edit mode
- [ ] Test: Edit button toggles to edit mode
- [ ] Test: Cancel button reverts to original value
- [ ] Test: Save button calls onSave
- [ ] Test: Character counter is accurate
- [ ] Test: Validation errors display
- [ ] Test: parseMentions() extracts @user patterns
- [ ] Test: parseMentions() extracts URLs
- [ ] Test: Dark mode classes apply correctly

---

### Step 11: Hook Tests
**File:** `src/hooks/useCanonicalDescription.test.ts`

**Checklist:**
- [ ] Test: useCanonicalDescription fetches description
- [ ] Test: useCanonicalDescription saves description
- [ ] Test: useCanonicalDescription handles errors
- [ ] Test: useCanonicalDescription works for all workItemTypes
- [ ] Test: useDescriptionValidation validates minLength
- [ ] Test: useDescriptionValidation validates maxLength
- [ ] Test: useDescriptionValidation validates isRequired
- [ ] Test: useDescriptionValidation calls customValidator

---

### Step 12: Integration Tests
**File:** `src/components/shared/CanonicalDescriptionField/CanonicalDescriptionField.integration.test.tsx`

**Checklist:**
- [ ] Test: Full edit → save workflow
- [ ] Test: Full edit → cancel workflow
- [ ] Test: Validation prevents save on error
- [ ] Test: Data persists after save
- [ ] Test: Refetch updates view after save

---

### Step 13: Accessibility Tests
**Checklist:**
- [ ] Run axe accessibility audit on component
- [ ] Test: Label associated with textarea
- [ ] Test: Error messages announced with role="alert"
- [ ] Test: Keyboard navigation (Tab, Shift+Tab)
- [ ] Test: Keyboard shortcuts (Enter to save, Esc to cancel)
- [ ] Test: Focus ring visible when focused
- [ ] Test: Color contrast ≥ 4.5:1 (light + dark mode)
- [ ] Test: Screen reader reads all content correctly

---

### Step 14: Visual Regression Tests
**Checklist:**
- [ ] Screenshot: Light mode view
- [ ] Screenshot: Light mode edit
- [ ] Screenshot: Dark mode view (NOCTURNE)
- [ ] Screenshot: Dark mode edit (NOCTURNE)
- [ ] Screenshot: Mobile viewport (375px)
- [ ] Screenshot: Tablet viewport (768px)
- [ ] Screenshot: Desktop viewport (1280px)
- [ ] Verify: Dark mode computed bg = `rgb(26, 23, 20)` in DevTools

---

## PHASE 5: DARK MODE VERIFICATION (Week 1)

### Step 15: NOCTURNE Token Check
**Checklist:**
- [ ] Open component in browser with dark mode enabled
- [ ] Open DevTools Inspector on the textarea
- [ ] Computed background-color should equal: `rgb(26, 23, 20)`
- [ ] Computed text color should equal: `rgb(245, 243, 240)`
- [ ] Border color should be: `rgba(255, 255, 255, 0.08)`
- [ ] Focus ring should be visible and correct color
- [ ] No HSL values in computed styles (all should be RGB or named)
- [ ] No "!important" overrides in index.css

---

## PHASE 6: FIRST MIGRATION — BACKLOG (Week 2)

### Step 16: Replace DescriptionEditor
**File:** `src/components/backlog/DetailPanel/DescriptionEditor.tsx`

**Current implementation:**
- Uses contentEditable div
- Uses Lucide icons
- Scattered formatting logic
- Not ADS-compliant

**Replace with CanonicalDescriptionField:**

```typescript
import { CanonicalDescriptionField } from '@/components/shared/CanonicalDescriptionField';
import { useCanonicalDescription } from '@/hooks/useCanonicalDescription';

export function DescriptionEditor({ 
  backlogItemId 
}: { 
  backlogItemId: string 
}) {
  const { description, save, isSaving, error } = useCanonicalDescription(
    backlogItemId,
    'task' // backlog items are tasks
  );
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(description);

  return (
    <CanonicalDescriptionField
      workItemId={backlogItemId}
      workItemType="task"
      value={value}
      onChange={setValue}
      onSave={save}
      isEditing={isEditing}
      onEditToggle={setIsEditing}
      isLoading={isSaving}
      error={error?.message}
    />
  );
}
```

**Checklist:**
- [ ] Delete old DescriptionEditor implementation
- [ ] Replace with new code above
- [ ] Update imports
- [ ] Verify types: workItemId (string), workItemType ('task')
- [ ] Test: Component renders
- [ ] Test: Edit mode works
- [ ] Test: Save persists to database
- [ ] Test: No console errors
- [ ] Commit: `git commit -m "refactor: replace backlog DescriptionEditor with CanonicalDescriptionField"`

---

### Step 17: Replace IncidentDescription
**File:** `src/components/incidents/IncidentDescription.tsx`

**Current implementation:**
- Uses shadcn/ui Textarea
- Simple read/write toggle
- No formatting support

**Replace with CanonicalDescriptionField:**

```typescript
import { CanonicalDescriptionField } from '@/components/shared/CanonicalDescriptionField';
import { useCanonicalDescription } from '@/hooks/useCanonicalDescription';

export function IncidentDescription({ 
  incidentId 
}: { 
  incidentId: string 
}) {
  const { description, save, isSaving, error } = useCanonicalDescription(
    incidentId,
    'incident'
  );
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(description);

  return (
    <CanonicalDescriptionField
      workItemId={incidentId}
      workItemType="incident"
      value={value}
      onChange={setValue}
      onSave={save}
      isEditing={isEditing}
      onEditToggle={setIsEditing}
      isLoading={isSaving}
      error={error?.message}
      placeholder="Describe the incident in detail..."
    />
  );
}
```

**Checklist:**
- [ ] Delete old IncidentDescription implementation
- [ ] Replace with new code above
- [ ] Update imports
- [ ] Test: Component renders
- [ ] Test: Edit mode works
- [ ] Test: Save persists
- [ ] Test: No console errors
- [ ] Commit: `git commit -m "refactor: replace IncidentDescription with CanonicalDescriptionField"`

---

### Step 18: Test Phase 1 Migration
**Checklist:**
- [ ] Run full test suite: `npm test`
- [ ] No regressions in backlog/incidents flows
- [ ] Verify Backlog Detail Panel works end-to-end
- [ ] Verify Incident Detail Panel works end-to-end
- [ ] Check DevTools for dark mode compliance (NOCTURNE)
- [ ] Manual testing: create, edit, save, cancel on both
- [ ] Verify database: descriptions persist correctly

---

## PHASE 7: REMAINING MIGRATIONS (Weeks 3-4)

### Step 19: Feature Migration
**File:** `src/pages/project/components/FeatureDescription.tsx`

Same pattern as above, but for 'feature' workItemType.

**Checklist:**
- [ ] Replace with CanonicalDescriptionField
- [ ] workItemType = 'feature'
- [ ] Test: Full workflow
- [ ] Verify mutations work
- [ ] Verify query invalidation
- [ ] No regressions

---

### Step 20: Planner TaskDescription Migration
**File:** `src/modules/planner/components/TaskDetailDrawer/TaskDescription.tsx`

Current uses MentionTextarea. Canonical replaces with mention detection via parseMentions().

**Checklist:**
- [ ] Replace with CanonicalDescriptionField
- [ ] workItemType = 'task'
- [ ] Verify @mention parsing works
- [ ] Test: Full workflow
- [ ] No regressions in modal

---

### Step 21: Planner Modal DescriptionTab Migration
**File:** `src/components/planner/task-modal/organisms/tabs/DescriptionTab.tsx`

Currently inline styles + vanilla textarea.

**Checklist:**
- [ ] Replace with CanonicalDescriptionField
- [ ] Remove inline styles (use ADS only)
- [ ] workItemType = 'task'
- [ ] Test: Modal workflow
- [ ] Verify dark mode (NOCTURNE)
- [ ] No HSL drift

---

## PHASE 8: CLEANUP (Week 5)

### Step 22: Remove Deprecated Components
**Checklist:**
- [ ] Delete old `DescriptionEditor.tsx` (backlog)
- [ ] Delete old `IncidentDescription.tsx`
- [ ] Delete old `TaskDescription.tsx`
- [ ] Delete old `FeatureDescription.tsx`
- [ ] Delete old `DescriptionTab.tsx`
- [ ] Verify no imports remain to deleted files
- [ ] Run full test suite
- [ ] Commit: `git commit -m "refactor: remove deprecated description components"`

---

### Step 23: Update Storybook
**Checklist:**
- [ ] Create Storybook stories for CanonicalDescriptionField
- [ ] Story: View mode
- [ ] Story: Edit mode
- [ ] Story: Loading state
- [ ] Story: Error state
- [ ] Story: Mention parsing
- [ ] Story: Dark mode (NOCTURNE)
- [ ] Story: Mobile responsive

---

### Step 24: Update Documentation
**Checklist:**
- [ ] Add CanonicalDescriptionField to component library docs
- [ ] Document: API (props, types)
- [ ] Document: Usage patterns
- [ ] Document: Customization (minLength, maxLength, placeholder, etc.)
- [ ] Add migration notes to README
- [ ] Document dark mode compliance

---

## FINAL VERIFICATION CHECKLIST

### Code Quality
- [ ] All TypeScript types compile without errors
- [ ] No ESLint warnings or errors
- [ ] No console warnings in browser
- [ ] Code coverage ≥ 85%
- [ ] No unused imports

### Functionality
- [ ] View mode displays description
- [ ] Edit button toggles to edit mode
- [ ] Save button saves to database
- [ ] Cancel button reverts changes
- [ ] Character counter is accurate
- [ ] Validation errors display correctly
- [ ] Mention parsing works (@user, URLs)

### Accessibility
- [ ] WCAG AA contrast ratio ≥ 4.5:1
- [ ] All interactive elements keyboard accessible
- [ ] Focus ring visible
- [ ] Error messages announced
- [ ] Label associated with textarea
- [ ] Screen reader reads content

### Dark Mode (NOCTURNE)
- [ ] Computed background = rgb(26, 23, 20)
- [ ] Computed text = rgb(245, 243, 240)
- [ ] Border = rgba(255, 255, 255, 0.08)
- [ ] No HSL values in computed styles
- [ ] No !important overrides in CSS

### Performance
- [ ] Initial load < 150ms (cached)
- [ ] Edit toggle < 50ms
- [ ] Save < 500ms
- [ ] No lag on character input
- [ ] No memory leaks (DevTools)

### Security
- [ ] No XSS vulnerabilities (DOMPurify)
- [ ] No SQL injection (parameterized queries)
- [ ] No sensitive data in logs
- [ ] CSRF protection active
- [ ] Rate limiting in place

---

## SIGN-OFF CHECKLIST

### For Development
- [ ] All code committed to feature branch
- [ ] All tests passing
- [ ] Code review completed
- [ ] No unresolved comments

### For QA
- [ ] All test cases passing
- [ ] No regressions in other features
- [ ] Dark mode verified
- [ ] Accessibility verified

### For Product
- [ ] Feature complete per specification
- [ ] All 5 implementations migrated
- [ ] Jira parity verified
- [ ] User documentation complete

### For Deployment
- [ ] Commits ready for main
- [ ] Database migrations if needed (none in Phase 1)
- [ ] Environment variables configured
- [ ] Rollback plan in place

---

## SUCCESS CRITERIA

✅ **Phase 1 Complete When:**
1. CanonicalDescriptionField component created and tested
2. All tests passing (unit, integration, accessibility)
3. Dark mode verified (NOCTURNE tokens)
4. Backlog + Incidents migrated successfully
5. Zero regressions
6. Ready for phase 2 (Feature, Planner migrations)

---

## TIMELINE

| Week | Phase | Deliverable | Status |
|---|---|---|---|
| W1 | Foundation | CanonicalDescriptionField + hooks + tests | In progress |
| W2-3 | Phase 1 | Backlog + Incidents migration | Ready to start |
| W3-4 | Phase 2 | Feature + Planner migration | Ready to start |
| W4-5 | Phase 3 | Cleanup + documentation | Ready to start |
| W5+ | Launch | Announcement + monitoring | Ready to start |

---

## 🎯 READY TO BUILD?

All items above are your implementation checklist. Work through them sequentially:

1. ✅ Pre-flight checks (dependencies, structure)
2. ✅ Phase 1-4 (Component + Hooks + API, Testing)
3. ✅ Phase 5 (Dark mode verification)
4. ✅ Phase 6 (First migration: Backlog)
5. ⏳ Phase 7 (Remaining migrations: Feature, Planner)
6. ⏳ Phase 8 (Cleanup + docs)

**Next:** Start with Step 1 (Type Definitions).
