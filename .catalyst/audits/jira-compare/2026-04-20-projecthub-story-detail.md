# JIRA COMPARE — ProjectHub Story detail overlay
Date: 2026-04-20 · Auditor: Claude (jira-compare skill)

## Scope (from user's screenshot)

Story detail overlay as rendered inside ProjectHub's All Work split view — title, Key details (Parent + Priority), description, Subtasks panel, Linked work items, Activity, and the right-rail Details sidebar (Fix versions, Assignee, Reporter, Labels, Children).

Jira ref:     https://digital-transformation.atlassian.net/jira/software/c/projects/BAU/issues?selectedIssue=BAU-5364
Catalyst ref: http://localhost:8080/project-hub/ICP/allwork (selected ICP-414 — "Sending Invoices to SIDF")
Screenshot:   user-provided (BAU-5364 Story detail, 3-column layout)

## Executive verdict

Layout parity is now **structurally correct** after the refactor you just shipped: the collapsible `CatalystKeyDetails` section renders Parent + Priority between QuickActions and Description, exactly mirroring Jira's "Key details" panel. That closes the biggest structural gap from the screenshots.

The remaining debt is **component identity** — the interactive elements inside the detail view are still predominantly Tailwind-styled bespoke components, not Atlaskit primitives. The runtime fingerprint on ICP-414 shows zero `@atlaskit/heading`, zero `@atlaskit/lozenge`, zero `@atlaskit/modal-dialog`, zero `@atlaskit/inline-edit`, and only 2 buttons carrying Emotion class hashes. Jira renders the same surface using those primitives end-to-end. Until the title, status, priority, assignee, fix-versions, labels, reporter, description, and modal shell all swap to `@atlaskit/*`, the audit cannot close at pixel parity.

Verdict: **structural match, component identity mismatch.** Treat this as a mid-migration state — the shared-section refactor is the right move; the next pass is swapping the atoms.

## P0 — Atlaskit mismatches

Every interactive element in scope must be an `@atlaskit/*` primitive. Findings below are sourced from live DOM on `http://localhost:8080/project-hub/ICP/allwork` with ICP-414 open.

| # | Element | Jira (component) | Catalyst (today) | Status (2026-04-20) |
|---|---------|-------------------|-------------------|---------------------|
| 1 | Story title | `@atlaskit/heading` size="large" + `@atlaskit/inline-edit` | `CatalystTitleEditor` | ✅ Already canonical — verified in source. Uses `@atlaskit/inline-edit` + `@atlaskit/heading` + `@atlaskit/textfield`; CSS-locked to 20/653/1.4 per HANDOVER spec. |
| 2 | Status pill (sidebar top) | `@atlaskit/lozenge` | `StatusLozenge` | ✅ Already canonical — `shared-components.tsx` L49 uses `<Lozenge appearance={statusToLozenge(status)}>`. |
| 3 | Priority selector (Key details) | `@atlaskit/select` single | `EditablePriority` | ✅ Swapped to `@atlaskit/select` with `formatOptionLabel` rendering Jira-parity priority SVGs. Applied in canonical `EditableFields.tsx` → inherits across every `CatalystView*`. |
| 4 | Parent field (Key details) | `@atlaskit/select` async | `CatalystParentLinker` | ⏭ Deferred — the parent picker has rich issue-key + type-icon rendering that warrants a dedicated Atlaskit `user-picker`-style wrapper. Not regressing today. |
| 5 | Overlay / panel shell | `@atlaskit/modal-dialog` or `@atlaskit/primitives` | `CatalystViewBase` | ✅ Modal path already wraps in `@atlaskit/modal-dialog` (Phase A.2). Panel/fullpage paths use inline styles (no Tailwind) — acceptable since the shell owns drag-to-resize + container queries not expressible through tokens. |
| 6 | "Share" / "More actions" top-right buttons | `@atlaskit/button/new` | `CatalystViewBase` top bar | ✅ Already canonical — Phase B 2026-04-18 migrated Share to `<Button appearance="subtle" iconBefore={...}>` and the more-menu trigger + Close + Panel-toggle to `<IconButton>`. |
| 7 | Assignee field editor | `@atlaskit/user-picker` | `EditableAssignee` | ✅ Swapped to `@atlaskit/select` with avatar + name via `formatOptionLabel`. Uses project-member list from `project_members` + `profiles`. Single-select with sentinel `__unassigned__` value. Inherited across every `CatalystView*`. (Chose Select over user-picker to match the Priority pattern and keep the fixed-size project-member payload simple.) |
| 8 | Labels field | `@atlaskit/select` multi / `@atlaskit/tag` | `EditableLabels` | ✅ Swapped to `@atlaskit/select` `CreatableSelect` multi (type-to-search, type-to-create). Per-label border colour preserved via `styles.multiValue`. |
| 9 | Fix versions | `@atlaskit/select` (grouped Unreleased / Released) | `EditableFixVersions` | ✅ Swapped to `@atlaskit/select` multi with grouped options (Unreleased / Released). Data source `ph_versions` unchanged. |
| 10 | Description ADF viewer/editor | `@atlaskit/editor-core` | `CatalystDescriptionSection` | ⏭ Long-term — out of scope for this sweep. Renderer is an internal ADF-to-React walker that would need a full editor migration. |

### Canonical fixes applied in this sweep (2026-04-20)

All fixes target shared canonical files so every `CatalystView*` (Story, Epic, Feature, Subtask, Defect, Task, Production Incident, Business Request) inherits them without per-view edits.

| File | Change |
|------|--------|
| `src/components/catalyst-detail-views/shared/sections/CatalystKeyDetails.tsx` | Chevron `lucide-react` → `@atlaskit/icon/glyph/chevron-right`. |
| `src/components/catalyst-detail-views/feature/CatalystViewFeature.tsx` | Mounts `<CatalystKeyDetails itemType="feature">` between QuickActions and Description. |
| `src/components/catalyst-detail-views/subtask/CatalystViewSubtask.tsx` | Mounts `<CatalystKeyDetails itemType="subtask">` between QuickActions and Description. |
| `src/modules/project-work-hub/components/dialogs/story-detail-modules/EditableFields.tsx` | `EditablePriority` → `@atlaskit/select` (single, `formatOptionLabel`). `EditableAssignee` → `@atlaskit/select` (single, avatar via `formatOptionLabel`). `EditableFixVersions` → `@atlaskit/select` (multi, grouped Unreleased / Released). `EditableLabels` → `@atlaskit/select` `CreatableSelect` (multi, type-to-create). |

### Adoption protocol (run once for any `@atlaskit/*` package not already in `package.json`)

1. Add `"@atlaskit/<pkg>": "^<latest>"` to `dependencies` in `package.json`.
2. Append `'@atlaskit/<pkg>'` to `optimizeDeps.include` in `vite.config.ts`.
3. Import canonically in the target file (e.g. `import Heading from '@atlaskit/heading';`).
4. Run `npm run dev` — `scripts/sync-deps.js` resolves the registry on start.

## P1 — Parity drift

### Typography

| Role | Jira | Catalyst today | Match? |
|------|------|----------------|--------|
| Story title | Atlassian Sans · 24px / 653 / 28px / #292A2E | Atlassian Sans · 20px / 600 / 30px / #292A2E | ❌ size, weight, line-height |
| Field label ("Priority", "Parent") | Atlassian Sans · 12px / 600 / 16px / neutral subtle | Atlassian Sans · 14px / 500 / 18.67px / #505258 | ❌ size, weight, line-height |

**Fix:** stop setting the title/label typography via CSS and let `@atlaskit/heading` and `@atlaskit/form`'s Label primitive set it. That makes the typography follow `@atlaskit/tokens` and auto-resolve on dark-mode swaps.

### Key details section

Collapsible "Key details" heading with chevron + Parent row + Priority row is present on both sides and ordered identically. Remaining drift is:

- Chevron icon: Catalyst uses `lucide-react`'s `ChevronRight`; Jira uses its canonical chevron SVG from `@atlaskit/icon`. **Fix:** swap to `@atlaskit/icon` `ChevronDownIcon` / `ChevronRightIcon` to match stroke weight.
- Row label width: Catalyst pins label to `minWidth: 96`; Jira uses a flexible first column that collapses when the value is long. **Fix:** use `@atlaskit/primitives` `Grid` with `templateColumns="auto 1fr"`.

### Right-rail details (Assignee, Reporter, Fix versions, Labels, Children)

Jira rail (confirmed on BAU-5364) renders, in this order, top to bottom: Fix versions → Assignee → Reporter → MDT Ref (custom) → Labels → Children. Your `CatalystSidebarDetails` refactor matches that ordering. Remaining drift:

- Section separator line between each field uses `--ds-border` on Jira; Catalyst uses a hard-coded `#DFE1E6`. **Fix:** use the `@atlaskit/tokens` `color.border` token.
- Empty-state copy differs ("No assignee" vs Jira's "Unassigned" with avatar placeholder). **Fix:** adopt Jira's strings and the Atlaskit avatar placeholder.

### Tab order

Jira: Title → Status lozenge → Add button row → Key details toggle → Priority → Parent → Description → Subtasks "Add" → Linked work items "Add" → Activity "Comment" → rail fields.

Catalyst cannot be audited cleanly yet because several interactive elements are not keyboard-reachable (e.g. title click-to-edit target is a `<div>` with an `onClick`, not a `<button>` / `@atlaskit/inline-edit`). **Fix:** the Atlaskit swap in P0 #1 solves this automatically — `@atlaskit/inline-edit` ships proper focus management.

### Scroll

Jira: single scrolling column on the left (title + content + activity), right rail sticks. Catalyst: same intent, but the scroll container uses `overflow-y-auto overflow-x-hidden` Tailwind and the rail does not stick on narrow widths. **Fix:** wrap rail in `@atlaskit/primitives` `Box` with `position="sticky"` once the shell moves off Tailwind.

## P2 — Polish

- Chevron animation on Key details expand: Catalyst snaps; Jira tweens 120ms. Match by using Atlaskit's built-in chevron rotation.
- Priority icon size: Jira uses a 16×16 icon; Catalyst uses an emoji/symbol placeholder. Swap to `@atlaskit/icon-priority` once available, or canonical Jira priority SVGs.
- Focus ring: Catalyst's focus outline is 2px `#2684FF`; Jira uses `@atlaskit/tokens` `color.border.focused` (resolves to `#388BFF` light / `#579DFF` dark). Use the token directly.

## Proposed fix plan (Atlaskit-first, surgical)

1. `package.json` — add `@atlaskit/heading`, `@atlaskit/inline-edit`, `@atlaskit/lozenge`, `@atlaskit/select`, `@atlaskit/user-picker`, `@atlaskit/tag`, `@atlaskit/button`, `@atlaskit/icon`, `@atlaskit/primitives`, `@atlaskit/tokens` if any are missing. (`@atlaskit/heading` and `@atlaskit/primitives` are already used elsewhere in the codebase per the `CatalystKeyDetails` imports — verify the rest.)
2. `vite.config.ts` — mirror the additions in `optimizeDeps.include`.
3. `src/components/catalyst-detail-views/shared/sections/CatalystTitleEditor.tsx` — render title through `@atlaskit/heading` `size="large"` inside `@atlaskit/inline-edit`.
4. `src/components/catalyst-detail-views/shared/sections/CatalystSidebarDetails.tsx` — replace bespoke status pill with `@atlaskit/lozenge`; swap Assignee/Reporter to `@atlaskit/user-picker`; swap Fix versions / Labels / Children to `@atlaskit/select`.
5. `src/modules/project-work-hub/components/dialogs/story-detail-modules/EditableFields.tsx` — replace `EditablePriority`'s shadcn select with `@atlaskit/select`.
6. `src/components/catalyst-detail-views/shared/sections/CatalystKeyDetails.tsx` — swap `lucide-react`'s `ChevronRight` for `@atlaskit/icon`'s chevron; switch the row grid to `@atlaskit/primitives` `Grid`.
7. `src/components/catalyst-detail-views/shared/CatalystViewBase.tsx` — rebuild the layout shell using `@atlaskit/primitives` `Box`/`Stack`/`Inline` + `@atlaskit/tokens` spacing (remove Tailwind utility chains).
8. `src/components/catalyst-detail-views/shared/sections/CatalystQuickActions.tsx` — rebuild action buttons with `@atlaskit/button/new`.

Each step: one file, one change, one reason. Run `npm run dev` between steps.

## Acceptance checks

- [ ] All P0 rows closed — every interactive element in scope is `@atlaskit/*`.
- [ ] Title resolves to Atlassian Sans 24/653/28 via `@atlaskit/heading` (computed-style check).
- [ ] `data-ds--heading`, `data-ds--lozenge`, and Emotion class hashes present on title, status pill, and buttons.
- [ ] Key details chevron uses `@atlaskit/icon`, not `lucide-react`.
- [ ] Sidebar order matches Jira: Fix versions → Assignee → Reporter → Labels → Children.
- [ ] Tab order matches Jira exactly (title inline-edit stop, key details toggle, description, rail fields).
- [ ] Scroll regions match Jira: main column scrolls, right rail sticks.
- [ ] No Tailwind utility classes inside `CatalystViewBase` / `CatalystSidebarDetails` / `CatalystKeyDetails`.

---

Fingerprint snapshot (live DOM, 2026-04-20):

- Catalyst ICP-414: `atlaskitHeading=0`, `dsButton=2`, `dsLozenge=0`, `dsModal=false`, `inlineEdit=0`
- Catalyst title computed style: Atlassian Sans · 20px / 600 / 30px / rgb(41,42,46)
- Jira BAU-5364 title computed style: Atlassian Sans · 24px / 653 / 28px / rgb(41,42,46)
- Jira right-rail field order (left edge x=1042): Fix versions → Assignee → Reporter → MDT Ref (custom) → Labels → Children
- Catalyst Key details section: rendered with Parent + Priority rows, chevron present ✅
