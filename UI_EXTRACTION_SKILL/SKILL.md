# UI Extraction & React Replication Skill

**Version:** 1.0  
**Status:** Production-ready  
**Last updated:** 2026-06-26  

---

## What This Skill Does

Takes a screenshot and live URL of ANY page (Jira, web app, etc.) and produces **exact, functional React component implementations** using Catalyst/Atlaskit. No prototypes—only production React code that matches pixel-perfectly and handles all micro-interactions.

**In:** Screenshot + URL  
**Out:** Complete React implementation with types, mock data, and test route  
**Duration:** ~3 hours per page  

---

## Activation Command

```
/ui-extract
```

Or manually:
1. Provide screenshot of target page
2. Provide URL to live page
3. Specify any regions to prioritize (optional)
4. Skill executes 7-phase extraction pipeline

---

## What You Get

### Deliverables
1. **6 extraction documents** (layout, DOM, styles, interactions, data, components)
2. **Production React code**:
   - Main page component
   - Sub-components (toolbar, table, dialogs, etc.)
   - TypeScript types
   - Mock data (15+ items)
3. **Route integration** (added to App.tsx)
4. **Validation evidence** (screenshots, diffs, test results)

### Code Quality
- ✅ Zero hardcoded colors (all Atlaskit tokens)
- ✅ 100% TypeScript (no `any` types)
- ✅ Semantic HTML + ARIA attributes
- ✅ All interactive states (hover, focus, active, disabled)
- ✅ Keyboard navigation (Tab, Enter, Escape)
- ✅ Form validation & error handling
- ✅ Pixel-perfect layout matching (~2-3% tolerance)
- ✅ Zero console/TypeScript errors

---

## The 7-Phase Extraction Pipeline

### Phase 1: Visual Inventory (15-20 min)
Screenshot regions, document layout, identify sticky/fixed elements, estimate spacing.

### Phase 2: DOM Inspection (10-15 min)
Extract semantic structure, roles, aria-labels, data attributes, event listeners.

### Phase 3: Computed Styles (15-20 min)
Collect colors, typography, spacing, borders, shadows, hover/focus states.

### Phase 4: Interactions (20-30 min)
Test every button, input, dropdown, modal — document state changes, validation, keyboard behavior.

### Phase 5: Data Model (10-15 min)
Extract table structure, form fields, mock data, content strings, validation rules.

### Phase 6: Component Architecture (15-20 min)
Map to Atlaskit components, design component hierarchy, identify reusable patterns.

### Phase 7: Implementation (60-90 min)
Code all components, integrate routes, validate against original, screenshot test.

---

## Real Example: Jira Releases Page

**Input:**
- Screenshot of Jira Releases page
- URL: `https://jira.atlassian.net/projects/BAU/versions`

**Output:**
```
src/pages/jira-clone/releases/
├── ReleasePage.tsx (main)
├── types.ts (Release, ReleaseStatus interfaces)
├── data/mockReleases.ts (18 mock items)
└── components/
    ├── ReleasesToolbar.tsx
    ├── ReleasesTable.tsx
    ├── ReleaseTableRow.tsx
    ├── ProgressBar.tsx
    ├── CreateReleaseDialog.tsx
    └── ReleaseConfirmationDialog.tsx
```

**Route:** `/catalyst/releases` (test environment)

**Evidence:**
- Layout matches: ✅ Verified
- All colors accurate: ✅ Verified (green #216E4E, red #AE2A19, tokens only)
- Search/filter functional: ✅ Tested
- Dialogs open/close: ✅ Tested
- Form validation: ✅ Tested
- Keyboard nav: ✅ Tested
- No errors: ✅ Verified

---

## Key Rules (Golden Paths)

### Colors
Always map to Atlaskit tokens FIRST:
```tsx
// ✅ Correct
style={{ color: token('ds-text-danger') }}

// ❌ Wrong
style={{ color: '#AE2A19' }}
```

### Components
Use Atlaskit-first hierarchy:
1. Atlaskit component exists? → Use it
2. Atlaskit component + wrapper needed? → Wrap it
3. Atlaskit component insufficient? → Build custom

Example:
```tsx
// ✅ Correct (Lozenge from Atlaskit)
<Lozenge appearance="default">{status}</Lozenge>

// ❌ Wrong (custom badge)
<span style={{ background: '#DDD', padding: '2px 8px' }}>
  {status}
</span>
```

### Interactions
Every element must have:
- Default state
- Hover state (change color, background, or appearance)
- Focus state (visible focus ring)
- Active/pressed state
- Disabled state (if applicable)

### Accessibility
- Preserve all `aria-label`, `role`, `aria-selected` attributes
- Use semantic HTML (`<button>`, `<input>`, `<table>`, not `<div>`)
- Test keyboard navigation (Tab, Enter, Escape, Arrow keys)
- Verify focus ring is visible

### Validation
Never mark extraction complete without:
- [ ] Visual diff < 3% variance
- [ ] All colors verified (color picker)
- [ ] All interactions tested
- [ ] Form validation working
- [ ] Keyboard nav working
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Mock data sufficient (15+ items)

---

## When to Use

**Good use cases:**
- ✅ Replicate Jira pages (Releases, Backlog, Board, etc.)
- ✅ Clone internal admin dashboards
- ✅ Port Figma designs to React
- ✅ Build parity implementations
- ✅ Extract competitor UI patterns (research)

**Not ideal for:**
- ❌ Simple one-off forms (use your default path)
- ❌ Highly custom creative designs with heavy animations
- ❌ Pages with massive video/media content

---

## Lessons Baked In

This skill encodes lessons from the Jira Releases page extraction:

1. **Systematic exhaustion** — Don't guess. Inspect every element.
2. **Token-first styling** — Never hardcode colors. Use design tokens.
3. **Semantic HTML** — Build accessible-first. Use `<button>`, `<input>`, `<table>`.
4. **Complete state coverage** — Default, hover, focus, active, disabled. All of them.
5. **Micro-interaction precision** — Timing, debounce, validation. Match exactly.
6. **Component reuse** — Find patterns (StatusBadge, RowActions, DateCell). Extract them.
7. **Type safety** — Full TypeScript. No `any`. Interfaces for everything.
8. **Mock data fidelity** — 15+ items. Realistic. Testable. Covers edge cases.
9. **Validation evidence** — Screenshots, diffs, test results. Prove it works.
10. **Zero errors** — Console clean. TypeScript clean. Non-negotiable.

---

## Quick Start

1. **Provide inputs:**
   - Screenshot (full page, clear regions)
   - Live URL
   - Any region priorities

2. **Skill runs 7 phases** (automatically):
   - Phase 1-6: Extraction & analysis
   - Phase 7: Implementation & validation

3. **Deliverables arrive in:**
   - `/src/pages/[page-name]/` (React components)
   - Extraction docs (for your records)
   - Test route ready to verify

4. **Verify:**
   - Open test route in browser
   - Compare to original side-by-side
   - All interactions working?
   - → Ready to ship or integrate

---

## Support

- **Questions on extraction?** Ask in Phase 1-6 outputs
- **Need to refine a component?** Skill can iterate based on feedback
- **Want to extend?** Skill handles custom patterns, new regions, additional interactions

---

## Version History

- **1.0** (2026-06-26): Initial release. Tested on Jira Releases page. Production-ready.

---

**Ready to extract a page? Use `/ui-extract` and provide screenshot + URL.**
