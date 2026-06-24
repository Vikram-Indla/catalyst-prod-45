# Phase 1: UI/UX Investigation Plan

## Objective
Reverse-engineer Jira's dependency feature UI/UX for Catalyst prototype sign-off. Focus on visual behavior, interaction states, DOM structure, and accessibility — NOT backend integration.

## Jira Dependency Feature Scope

### Primary Flow
1. **Empty State** → "Plan and prioritize around dependencies" view
2. **Add Dependency Flow** → Modal/dialog to create a dependency
3. **Dependency List View** → Display of existing dependencies with interaction options
4. **Dependency Details/Editing** → Modify dependency relationship or type

### Expected Interaction States
- [ ] Empty state (initial page load) — verified
- [ ] "Add a dependency" button hover
- [ ] "Add a dependency" button focus
- [ ] "Add a dependency" button click → modal/dialog opens
- [ ] Modal: issue selection / search
- [ ] Modal: dependency type selection (blocks, is blocked by, etc.)
- [ ] Modal: form validation states
- [ ] Modal: save/submit button
- [ ] Modal: cancel/close behavior
- [ ] Dependency row hover (edit/delete menu)
- [ ] Dependency row focus
- [ ] Dependency deletion confirm
- [ ] Empty state again (after deleting all)
- [ ] Loading state (optional)
- [ ] Error state (optional)

## Research Strategy

### 1. Current Page Analysis
**URL**: https://ministryofinvesment.atlassian.net/jira/plans/1/scenarios/1/dependencies
- Status: Empty dependency list (no dependencies yet)
- CTA visible: "Add a dependency" button
- Helper link: "Read about dependency mapping"

**Challenge**: Empty state is the current view. Need to find a scenario WITH dependencies to see the full UI.

### 2. Alternative Routes to Explore
- [ ] Check URL structure: Can we navigate to `/scenarios/X/dependencies` where X has data?
- [ ] Check sidebar for other plans/scenarios
- [ ] Look for test/demo data scenarios
- [ ] Check if "Add a dependency" modal is discoverable from empty state

### 3. DOM/CSS Verification Checklist
For EACH state captured:
- [ ] Element: button element ID and className
- [ ] Computed styles: font, color, spacing, borders, shadows
- [ ] Accessibility: role, aria-label, aria-describedby
- [ ] Keyboard: Tab order, Enter/Escape behavior
- [ ] Hover state: :hover pseudo-class styles
- [ ] Focus state: :focus pseudo-class styles
- [ ] Active/pressed state: :active pseudo-class styles
- [ ] Disabled state (if applicable)
- [ ] Dark mode (if Jira supports it)

### 4. Component Verification Checklist
For EACH visible component:
- [ ] Button: @atlaskit/button or styled element?
- [ ] Modal/Dialog: @atlaskit/modal-dialog? Custom?
- [ ] Select/Search: @atlaskit/select? @atlaskit/dropdown?
- [ ] Form: @atlaskit/textfield? Standard HTML?
- [ ] Table/List: @atlaskit/dynamic-table? Custom grid?
- [ ] Lozenge/Badge: @atlaskit/lozenge? Custom?
- [ ] Icons: Jira icon pack? @atlaskit/icon?
- [ ] Typography: Atlaskit font tokens? ADS?
- [ ] Spacing: Grid system? Hardcoded?

## Screenshot Naming Convention

```
state-name_[action]_[context].jpeg
```

Examples:
- `01-empty-state_initial-load.jpeg`
- `02-button-hover_add-dependency.jpeg`
- `03-modal-open_dependency-search.jpeg`
- `04-issue-select_search-results.jpeg`
- `05-type-select_blocks-option.jpeg`
- `06-modal-submit_success.jpeg`
- `07-dependency-row_hover-menu.jpeg`
- `08-delete-confirm_modal.jpeg`

## Catalyst Prototype Requirements

### Must Include
1. **Empty state screen** — matching Jira's "Plan and prioritize" visual
2. **"Add a dependency" button** — primary blue CTA with proper states
3. **Add dependency modal** — with:
   - Issue picker (search or select)
   - Dependency type selector (blocks, is blocked by, etc.)
   - Save button
   - Cancel button
   - Form validation
4. **Dependency list** — display created dependencies with:
   - Issue key
   - Dependency type arrow
   - Target issue key
   - Row hover menu (edit, delete)
5. **All interaction states** — hover, focus, active, disabled
6. **Keyboard navigation** — Tab, Enter, Escape
7. **Loading states** — if observed
8. **Error states** — if observed

### Must NOT Include
- Real Jira API integration
- Real Supabase database tables
- Real user authentication changes
- Production data persistence
- Backend endpoints
- Migration of data model

### Prototype Surface
- Catalyst route: `/project-hub/[key]/dependencies` (tentative)
- Mock data: Static dependency rows
- State management: React hooks (local state only)
- Styling: Catalyst design tokens + ADS tokens

## Sign-Off Criteria

### Visual Parity
- [ ] Empty state matches Jira screenshot
- [ ] Button styling matches Jira (size, color, shadows, radius)
- [ ] Modal layout matches Jira (width, padding, shadows)
- [ ] Typography matches Jira (sizes, weights, colors)
- [ ] Icons match Jira (style, size)
- [ ] Spacing matches Jira (grid, alignment)
- [ ] Colors match Jira (background, text, accents)

### Behavioral Parity
- [ ] Button click opens modal
- [ ] Modal has focusable fields
- [ ] Tab key navigates through form
- [ ] Escape closes modal
- [ ] Enter submits form (if applicable)
- [ ] Hover states visible and correct
- [ ] Focus states visible and correct
- [ ] Form validation prevents invalid submissions

### Accessibility
- [ ] All buttons have accessible names
- [ ] All form fields have labels
- [ ] Modal has proper role="dialog"
- [ ] Focus trap in modal (optional but recommended)
- [ ] Color contrast meets WCAG AA

## Exclusions (Out of Scope)

❌ Backend implementation
❌ Supabase schema changes
❌ Jira API integration
❌ Real data persistence
❌ User permission system changes
❌ Notification/event system
❌ Audit logging
❌ Data migration

## Next Steps

1. ✅ Phase 0: MCP tools verified
2. → Phase 1: Investigation plan (this document)
3. → Phase 2: Behavior capture with screenshots
4. → Phase 3: DOM/CSS/A11Y inspection
5. → Phase 4: Component identification
6. → Phase 5: Catalyst UI inventory
7. → Phase 6: Build UI prototype
8. → Phase 7: Verification
9. → Phase 8: Sign-off package

## Timeline
- Phase 2-3: Capture and inspect Jira UI states (30 min)
- Phase 4-5: Identify components and Catalyst inventory (20 min)
- Phase 6: Build prototype (60 min)
- Phase 7-8: Verify and document (30 min)
- Total: ~2.5 hours for complete UI/UX sign-off prototype
