# Jira Releases → Catalyst: Complete Replication Specification

## Document Scope
Full navigational paths, page inventory, Atlassian Design System (ADS) component mapping, functional specs, and implementation specs for replicating the **Jira Software Releases (Versions)** feature on the Catalyst platform.

---

## SECTION A: PAGE INVENTORY & GLOBAL NAVIGATION

### Pages in the Releases Module

| # | Page Name | Jira Route | Description |
|---|-----------|-----------|-------------|
| 1 | **Releases Hub (List View)** | `/projects/{key}?selectedItem=release-page` | Master list of all versions grouped by status |
| 2 | **Release Detail Page** | `/projects/{key}/versions/{versionId}` | Single release detail with issue breakdown |
| 3 | **Release Notes Page** | `/projects/{key}/versions/{versionId}/tab/release-report-all-issues` | Auto-generated release notes |
| 4 | **Create Version Modal** | Modal overlay on Releases Hub | Form to create a new version |
| 5 | **Edit Version Inline / Modal** | Inline or modal on Releases Hub | Form to edit version metadata |
| 6 | **Release Confirmation Dialog** | Modal overlay | Confirmation dialog when releasing a version |
| 7 | **Unrelease Confirmation Dialog** | Modal overlay | Confirmation to un-release |
| 8 | **Archive Confirmation Dialog** | Modal overlay | Confirmation to archive |
| 9 | **Delete Version Dialog** | Modal overlay | Delete with issue reassignment |
| 10 | **Merge Versions Dialog** | Modal overlay | Merge two versions |

---

## SECTION B: 55 NAVIGATIONAL PATHS / SCENARIOS

### Category 1: Releases Hub — Landing & Display (Paths 1–12)

| # | Scenario | Page Name | Trigger / Path | Functional Spec | ADS Components | Implementation Spec |
|---|----------|-----------|----------------|-----------------|----------------|---------------------|
| 1 | **Navigate to Releases Hub** | Releases Hub | Project sidebar → "Releases" menu item | Loads all versions for the project grouped into 3 status buckets: UNRELEASED (top), RELEASED (middle), ARCHIVED (bottom). Default sort: Unreleased by start date ASC; Released by release date DESC; Archived alphabetical. | `@atlaskit/side-navigation` (NavigationItem), `@atlaskit/page-layout`, `@atlaskit/heading` | **API**: `GET /rest/api/3/project/{projectIdOrKey}/versions` returns array of version objects. **State**: Store versions in local state, compute groups by `released` + `archived` booleans. **Route**: `/projects/:key/releases` |
| 2 | **Empty state — no versions** | Releases Hub | Navigate when project has 0 versions | Show empty state illustration with heading "No versions yet" and CTA button "Create version". No table headers shown. | `@atlaskit/empty-state` (EmptyState), `@atlaskit/button` (Button appearance="primary") | Conditionally render EmptyState when `versions.length === 0`. CTA opens Create Version modal. |
| 3 | **View Unreleased versions section** | Releases Hub | Default load | Collapsible section header "UNRELEASED" with count badge. Each row shows: version name (link), start date, release date, description (truncated), progress bar, actions menu. Overdue versions show red text on release date. | `@atlaskit/heading` (H700), `@atlaskit/badge`, `@atlaskit/progress-bar`, `@atlaskit/lozenge` (appearance="removed" for overdue), `@atlaskit/dropdown-menu` | **Progress bar**: Calculated from fix version issues — segments: Done (green), In Progress (blue), To Do (gray). Percentages from `GET /rest/api/3/version/{id}/relatedIssueCounts`. Overdue logic: `releaseDate < today && !released`. |
| 4 | **View Released versions section** | Releases Hub | Default load / scroll | Collapsible section header "RELEASED" with count badge. Each row: version name, release date, description, full progress bar (typically 100% green), actions menu. | Same as #3 plus `@atlaskit/lozenge` (appearance="success" for "Released") | Released versions sorted by `releaseDate` DESC. Progress bar expected to be majority "Done" segment. |
| 5 | **View Archived versions section** | Releases Hub | Scroll to bottom / expand | Collapsed by default. Section header "ARCHIVED" with count badge. Expand reveals archived versions with limited actions (Unarchive, Delete). | `@atlaskit/section-message` (collapsed), `@atlaskit/button` (subtle for expand toggle) | Archived section uses `useState(false)` for collapse toggle. Filter versions where `archived === true`. |
| 6 | **Expand/Collapse section** | Releases Hub | Click section header chevron | Toggle visibility of version rows within that section. Chevron rotates 90° on expand. Transition: 200ms ease. | `@atlaskit/icon` (ChevronDownIcon / ChevronRightIcon), CSS transition | `useState` per section. `aria-expanded` attribute for accessibility. Smooth height animation via `max-height` transition. |
| 7 | **Progress bar hover tooltip** | Releases Hub | Hover over progress bar | Tooltip shows: "X of Y issues done • Z in progress • W to do". Breakdown by count not percentage. | `@atlaskit/tooltip`, `@atlaskit/progress-bar` | Tooltip content built from `versionRelatedIssueCounts`. Tooltip position: "top". Delay: 300ms. |
| 8 | **Overdue indicator display** | Releases Hub | Version with `releaseDate < today && !released` | Release date text turns red. Small warning icon appears. Lozenge "OVERDUE" shown beside date. | `@atlaskit/lozenge` (appearance="removed"), `@atlaskit/icon` (WarningIcon, primaryColor="R400") | Computed property: `isOverdue = !released && releaseDate && new Date(releaseDate) < new Date()`. Apply `color.text.danger` token. |
| 9 | **Version name as link** | Releases Hub | Displayed in each row | Version name is a clickable link styled as primary text. Navigates to Release Detail Page on click. | `@atlaskit/link` or styled anchor, `@atlaskit/css` (text.brand color) | `<Link to={/projects/${key}/versions/${version.id}}>`. Font: 14px, weight 600, color `color.link`. |
| 10 | **Description truncation** | Releases Hub | Long description text | Descriptions truncated to 1 line with ellipsis. Full text visible on Release Detail or edit. | CSS `text-overflow: ellipsis`, `@atlaskit/css` | `white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 300px`. |
| 11 | **Scroll behavior with many versions** | Releases Hub | Project with 40+ versions (like BAU) | Page scrolls naturally. No virtualized list. Sections remain collapsible. Browser scroll position preserved on back navigation. | Native scroll, `@atlaskit/page-layout` | For 40+ versions, consider `react-window` virtualization in Catalyst. Jira uses native scroll. Session storage for scroll position restoration. |
| 12 | **Loading state** | Releases Hub | Initial page load | Skeleton loaders for version rows. 3 skeleton rows per section. Shimmer animation. | `@atlaskit/skeleton` or custom skeleton, `@atlaskit/spinner` (as fallback) | Show `<Skeleton width="100%" height="48px" />` × 3 while API call in flight. `isLoading` state from data hook. |

---

### Category 2: Create Version (Paths 13–20)

| # | Scenario | Page Name | Trigger / Path | Functional Spec | ADS Components | Implementation Spec |
|---|----------|-----------|----------------|-----------------|----------------|---------------------|
| 13 | **Open Create Version form** | Releases Hub | Click "+ Create version" button at top of Unreleased section | Inline form appears at top of Unreleased section (NOT a modal in current Jira). Form fields: Name, Start date, Release date, Description. All inline in a single row/card. | `@atlaskit/textfield`, `@atlaskit/textarea`, `@atlaskit/datetime-picker` (DatePicker), `@atlaskit/button` | Inline form rendered conditionally with `showCreateForm` state. Auto-focus on Name field. Form at top of unreleased list. |
| 14 | **Fill version name** | Create Version form | Type in Name field | Required field. Max 255 chars. Validates uniqueness within project on blur/submit. Trims whitespace. | `@atlaskit/textfield` (isRequired, maxLength), `@atlaskit/form` (Field with validation) | Client-side: required + max length. Server-side: `409 Conflict` if name exists. Show inline error: "A version with this name already exists". |
| 15 | **Set start date** | Create Version form | Click Start date picker | Calendar dropdown opens. Locale-aware formatting. Start date must be ≤ Release date if both set. | `@atlaskit/datetime-picker` (DatePicker), locale prop | Date format based on user locale. Validation: `startDate <= releaseDate` on submit. Past dates allowed. |
| 16 | **Set release date** | Create Version form | Click Release date picker | Calendar dropdown. If release date < today, version will immediately show as "Overdue" after creation. | `@atlaskit/datetime-picker` (DatePicker) | Warning shown (not error) if selected date is in the past. Validation: `releaseDate >= startDate`. |
| 17 | **Add description** | Create Version form | Type in Description field | Optional. Multi-line text. No rich text (plain text only in Jira versions). Max ~65,535 chars. | `@atlaskit/textarea` (resize="auto") | Textarea auto-resizes. Stores as plain string in version object. |
| 18 | **Submit — Save version** | Create Version form | Click "Save" / press Enter | Creates version via API. New version appears in Unreleased section. Form clears but stays open for rapid creation. Success flag shown briefly. | `@atlaskit/button` (appearance="primary"), `@atlaskit/flag` (success) | **API**: `POST /rest/api/3/version` body: `{ name, projectId, startDate, releaseDate, description }`. Optimistic UI: insert into list immediately, rollback on error. |
| 19 | **Submit — Validation error (duplicate name)** | Create Version form | Submit with existing version name | Inline error under Name field: "A version with this name already exists in this project." Form remains open. Focus returns to Name field. | `@atlaskit/form` (ErrorMessage), `@atlaskit/textfield` (isInvalid) | Catch 409 from API. Set field error state. `aria-invalid="true"` on input. |
| 20 | **Cancel creation** | Create Version form | Click "Cancel" or press Escape | Form collapses. No data saved. Unreleased section returns to normal list view. | `@atlaskit/button` (appearance="subtle") | `setShowCreateForm(false)`. Clear form state. Keyboard: `onKeyDown` handler for Escape key. |

---

### Category 3: Edit Version (Paths 21–28)

| # | Scenario | Page Name | Trigger / Path | Functional Spec | ADS Components | Implementation Spec |
|---|----------|-----------|----------------|-----------------|----------------|---------------------|
| 21 | **Inline edit — click version name** | Releases Hub | Click version name directly (alternative: actions menu → Edit) | Version row transforms to editable state. Name becomes a textfield, dates become date pickers, description becomes textarea. In-place editing. | `@atlaskit/inline-edit` (InlineEdit), `@atlaskit/textfield`, `@atlaskit/datetime-picker` | Replace display row with form controls. `InlineEdit` component wraps each field. Confirm/cancel buttons appear. |
| 22 | **Edit via actions menu** | Releases Hub | Click ••• menu → "Edit" | Same inline edit experience as #21. Alternative entry point. | `@atlaskit/dropdown-menu` (DropdownItem) | Menu item triggers `setEditingVersionId(version.id)`. Same form component rendered. |
| 23 | **Change version name** | Edit form (inline) | Modify name field | Same validation as create — uniqueness check. Cannot be empty. | `@atlaskit/textfield` (isRequired) | Debounced uniqueness check (300ms after typing stops). Or validate on confirm. |
| 24 | **Change start date** | Edit form (inline) | Modify start date | Updates start date. Validates against release date. | `@atlaskit/datetime-picker` | API: `PUT /rest/api/3/version/{id}` with updated `startDate`. |
| 25 | **Change release date** | Edit form (inline) | Modify release date | Updates release date. May toggle overdue status. | `@atlaskit/datetime-picker` | Recalculate `isOverdue` on save. If moved to future, remove overdue styling. |
| 26 | **Change description** | Edit form (inline) | Modify description | Updates description text. | `@atlaskit/textarea` | API: `PUT /rest/api/3/version/{id}` with updated `description`. |
| 27 | **Confirm edit** | Edit form (inline) | Click ✓ confirm or press Enter | Saves changes via API. Row returns to display mode with updated data. | `@atlaskit/button` (IconButton, icon=CheckIcon) | **API**: `PUT /rest/api/3/version/{id}`. Optimistic update in UI. Show success flag. |
| 28 | **Cancel edit** | Edit form (inline) | Click ✗ cancel or press Escape | Reverts to original values. Row returns to display mode. No API call. | `@atlaskit/button` (IconButton, icon=CrossIcon) | Restore from cached original values. `onKeyDown` Escape handler. |

---

### Category 4: Release / Unrelease Actions (Paths 29–36)

| # | Scenario | Page Name | Trigger / Path | Functional Spec | ADS Components | Implementation Spec |
|---|----------|-----------|----------------|-----------------|----------------|---------------------|
| 29 | **Release a version** | Release Confirmation Dialog | Actions menu → "Release" | Opens confirmation modal. Shows version name, count of unresolved issues. Options: release date (defaults to today), checkbox "Move open issues to next version" with version picker. | `@atlaskit/modal-dialog` (Modal, ModalHeader, ModalBody, ModalFooter), `@atlaskit/datetime-picker`, `@atlaskit/checkbox`, `@atlaskit/select` | **API**: `PUT /rest/api/3/version/{id}` with `{ released: true, releaseDate: selectedDate }`. If moving issues: batch update fix version on unresolved issues. |
| 30 | **Release — set release date** | Release Confirmation Dialog | Modify date in modal | Date picker pre-filled with today. Can change to past or future date. | `@atlaskit/datetime-picker` | Default: `new Date().toISOString().split('T')[0]`. User can override. |
| 31 | **Release — move unresolved issues** | Release Confirmation Dialog | Check "Move open issues" + select target version | Dropdown lists all other unreleased versions. Issues with status ≠ Done get their fix version changed to selected version. | `@atlaskit/checkbox`, `@atlaskit/select` (SingleSelect) | `GET /rest/api/3/project/{key}/versions` filtered to `released === false`. Exclude current version from dropdown. |
| 32 | **Release — ignore unresolved issues** | Release Confirmation Dialog | Uncheck "Move open issues" | Issues remain with current fix version. They will show as incomplete in the released version's detail page. | n/a | No additional API calls for issue movement. |
| 33 | **Confirm release** | Release Confirmation Dialog | Click "Release" button | Version status changes to Released. Version moves from Unreleased to Released section. Progress bar freezes. Success flag shown. | `@atlaskit/button` (appearance="primary"), `@atlaskit/flag` (type="success") | Sequential API: 1) Move issues if checked, 2) PUT version with `released: true`. Animate row from unreleased → released section. |
| 34 | **Cancel release** | Release Confirmation Dialog | Click "Cancel" or Escape | Modal closes. No changes made. | `@atlaskit/modal-dialog` (onClose) | `setShowReleaseModal(false)`. |
| 35 | **Unrelease a version** | Unrelease Confirmation Dialog | Released version actions menu → "Unrelease" | Confirmation dialog: "Are you sure you want to unrelease {name}?" Simple Yes/No. Version moves back to Unreleased section. | `@atlaskit/modal-dialog`, `@atlaskit/button` | **API**: `PUT /rest/api/3/version/{id}` with `{ released: false }`. Remove `releaseDate` or keep it (Jira keeps it). Move row to unreleased section. |
| 36 | **Unrelease — confirm** | Unrelease Confirmation Dialog | Click "Unrelease" | Version returns to Unreleased section. May become overdue if release date is in the past. | `@atlaskit/flag` (type="success") | Recalculate overdue status post-unrelease. |

---

### Category 5: Archive / Unarchive (Paths 37–41)

| # | Scenario | Page Name | Trigger / Path | Functional Spec | ADS Components | Implementation Spec |
|---|----------|-----------|----------------|-----------------|----------------|---------------------|
| 37 | **Archive a version** | Archive Confirmation Dialog | Actions menu → "Archive" | Confirmation: "Archive {name}? Archived versions are hidden from most views." Only unreleased and released versions can be archived. | `@atlaskit/modal-dialog`, `@atlaskit/button` | **API**: `PUT /rest/api/3/version/{id}` with `{ archived: true }`. Row moves to Archived section (collapsed by default). |
| 38 | **Archive — confirm** | Archive Confirmation Dialog | Click "Archive" | Version moves to Archived section. Count badge updates on Archived header. Issues remain linked but version hidden from picker dropdowns. | `@atlaskit/flag` (type="success"), `@atlaskit/badge` | Update local state: set `archived: true`. Decrement source section count, increment archived count. |
| 39 | **Unarchive a version** | Releases Hub (Archived section) | Archived version actions → "Unarchive" | Version returns to Released or Unreleased section based on its `released` flag. No confirmation dialog (instant action). | `@atlaskit/dropdown-menu` (DropdownItem) | **API**: `PUT /rest/api/3/version/{id}` with `{ archived: false }`. Determine target section: `released ? 'Released' : 'Unreleased'`. |
| 40 | **Archived section — expand** | Releases Hub | Click "Show archived versions" link | Reveals list of archived versions. Shows: name, release date (if any), limited actions (Unarchive, Delete). | `@atlaskit/button` (appearance="link") | Toggle `showArchived` state. Load archived versions if lazy-loaded. |
| 41 | **Archived section — collapse** | Releases Hub | Click "Hide archived versions" | Collapses the archived section. | `@atlaskit/button` (appearance="link") | `setShowArchived(false)`. Smooth collapse animation. |

---

### Category 6: Delete & Merge Versions (Paths 42–48)

| # | Scenario | Page Name | Trigger / Path | Functional Spec | ADS Components | Implementation Spec |
|---|----------|-----------|----------------|-----------------|----------------|---------------------|
| 42 | **Delete version — open dialog** | Delete Version Dialog | Actions menu → "Delete" | Modal shows version name, count of issues in fix version and affects version. Radio options: "Move fix version issues to: [version picker]" / "Remove fix version from issues". Same for affects version. | `@atlaskit/modal-dialog`, `@atlaskit/radio`, `@atlaskit/select` | Fetch issue counts: `GET /rest/api/3/version/{id}/relatedIssueCounts`. Build radio group for fix version and affects version separately. |
| 43 | **Delete — move issues to another version** | Delete Version Dialog | Select "Move to" + choose target version | All issues with this fix version get reassigned to selected version. Then version is deleted. | `@atlaskit/radio` (RadioGroup), `@atlaskit/select` | **API**: `DELETE /rest/api/3/version/{id}?moveFixIssuesTo={targetId}&moveAffectedIssuesTo={targetId}`. |
| 44 | **Delete — remove version from issues** | Delete Version Dialog | Select "Remove fix version" | Issues lose their fix version value. Version is deleted. | `@atlaskit/radio` (RadioGroup) | **API**: `DELETE /rest/api/3/version/{id}` without move params. Issues' fix version field set to null. |
| 45 | **Delete — confirm** | Delete Version Dialog | Click "Delete" | Version removed from all sections. Issue counts update. Success flag. | `@atlaskit/button` (appearance="danger"), `@atlaskit/flag` | Remove from local state. Show danger-styled flag: "Version {name} has been deleted." |
| 46 | **Delete — cancel** | Delete Version Dialog | Click "Cancel" or Escape | Modal closes. No changes. | `@atlaskit/modal-dialog` (onClose) | Standard modal dismiss. |
| 47 | **Merge versions — open dialog** | Merge Versions Dialog | Actions menu → "Merge" | Modal: "Merge {name} into:" with version picker. Merging moves all fix version and affects version issues to the target, then deletes source version. | `@atlaskit/modal-dialog`, `@atlaskit/select` | **API**: `PUT /rest/api/3/version/{id}/mergeTo/{targetId}`. Lists all non-archived versions except self. |
| 48 | **Merge — confirm** | Merge Versions Dialog | Select target + click "Merge" | Source version deleted. All its issues now reference target version. Target version progress bar updates. | `@atlaskit/button` (appearance="warning"), `@atlaskit/flag` | Sequential: merge API call → remove source from state → refresh target version counts. |

---

### Category 7: Release Detail Page (Paths 49–58)

| # | Scenario | Page Name | Trigger / Path | Functional Spec | ADS Components | Implementation Spec |
|---|----------|-----------|----------------|-----------------|----------------|---------------------|
| 49 | **Navigate to Release Detail** | Release Detail Page | Click version name link from Releases Hub | Full page showing: version header (name, dates, status, description), progress summary bar, and tab-based issue breakdown. Breadcrumb: Project → Releases → {Version Name}. | `@atlaskit/page-header` (PageHeader), `@atlaskit/breadcrumbs`, `@atlaskit/tabs`, `@atlaskit/progress-bar`, `@atlaskit/lozenge` | **Route**: `/projects/:key/versions/:versionId`. **API**: `GET /rest/api/3/version/{id}` + issue search `fixVersion = "{name}"`. |
| 50 | **Version header display** | Release Detail Page | Page load | Shows: Version name (H1), Status lozenge (Unreleased/Released/Archived), Start date, Release date, Description (full text, multi-line). Edit button. | `@atlaskit/heading` (H800), `@atlaskit/lozenge`, `@atlaskit/button` (appearance="subtle", label="Edit") | Status lozenge: `released ? "success" : archived ? "default" : "inprogress"`. Dates formatted per user locale. |
| 51 | **Progress summary bar** | Release Detail Page | Page load | Wider progress bar than hub. Below it: "X of Y issues — Z% done". Three segments clickable to filter the issue list below. | `@atlaskit/progress-bar` (custom segmented), `@atlaskit/css` (color tokens: G400, B400, N40) | Custom component: `<SegmentedProgressBar segments={[{count, color, label}]} />`. Click handler filters issue list by status category. |
| 52 | **Issues tab — all issues** | Release Detail Page | Default tab or click "All issues" tab | Table of all issues with fix version = this version. Columns: Type icon, Key (link), Summary, Status, Priority, Assignee. Sortable by any column. Paginated (50/page). | `@atlaskit/dynamic-table` (DynamicTable), `@atlaskit/avatar`, `@atlaskit/lozenge`, `@atlaskit/icon` | **JQL**: `fixVersion = "{versionName}" ORDER BY created DESC`. Dynamic table with sortable heads. Pagination via `DynamicTable` built-in. |
| 53 | **Issues tab — filter by status category** | Release Detail Page | Click progress bar segment OR use filter dropdown | Filters issue list to show only issues in selected status category (To Do / In Progress / Done). Filter pill shown. Clear filter returns to all. | `@atlaskit/button` (selected state), `@atlaskit/tag` (removable filter tag) | Append to JQL: `AND statusCategory = "Done"`. Show removable tag: "Status: Done ✕". |
| 54 | **Issue row — click to open** | Release Detail Page | Click issue key or summary | Navigates to the issue detail page. In Catalyst: could open in side panel or navigate. | `@atlaskit/link`, standard navigation | `<Link to={/browse/${issue.key}}>`. Consider side-panel for Catalyst (split view). |
| 55 | **Release notes — auto-generated** | Release Detail Page | Click "Release notes" tab | Shows formatted release notes. Groups issues by type (Bugs, Stories, Tasks, etc.). Each entry: Key + Summary. Copyable as plain text or HTML. | `@atlaskit/tabs` (Tab), `@atlaskit/heading` (section headers), `@atlaskit/button` ("Copy") | Generate from issue list grouped by `issuetype`. Template: `### Bug Fixes\n- [KEY-123] Summary\n### New Features\n- [KEY-456] Summary`. Copy to clipboard via `navigator.clipboard.writeText()`. |
| 56 | **Edit version from Detail page** | Release Detail Page | Click "Edit" button in header | Inline edit of version metadata (same fields as hub edit). Alternatively opens a modal with pre-filled form. | `@atlaskit/inline-edit` or `@atlaskit/modal-dialog`, `@atlaskit/form` | Same edit API as hub: `PUT /rest/api/3/version/{id}`. |
| 57 | **Release from Detail page** | Release Detail Page | Click "Release" button in header area | Same release flow as hub (#29-33) but triggered from detail page context. Returns to updated detail page after release. | Same as #29 | Same modal flow. On success, update header lozenge to "Released". |
| 58 | **Back navigation to Releases Hub** | Release Detail Page | Click breadcrumb "Releases" or browser back | Returns to Releases Hub. Scroll position should be restored to where the user was. | `@atlaskit/breadcrumbs` (BreadcrumbsItem) | `<BreadcrumbsItem href={/projects/${key}/releases} text="Releases" />`. Scroll restoration via `sessionStorage`. |

---

### Category 8: Drag & Drop Reordering (Paths 59–61)

| # | Scenario | Page Name | Trigger / Path | Functional Spec | ADS Components | Implementation Spec |
|---|----------|-----------|----------------|-----------------|----------------|---------------------|
| 59 | **Drag to reorder unreleased versions** | Releases Hub | Drag handle on version row | Unreleased versions can be manually reordered via drag-and-drop. Determines display order and "next version" for release dialogs. | `@atlaskit/pragmatic-drag-and-drop` (draggable, droppable, monitor), custom drag handle icon | Use Atlassian's `pragmatic-drag-and-drop` library. `POST /rest/api/3/version/{id}/move` with `{ after: targetVersionUrl }` or `{ position: "First" }`. |
| 60 | **Drag visual feedback** | Releases Hub | During drag | Dragged row gets elevated shadow + slight opacity reduction. Drop target shows blue insertion line. Other rows shift to make space. | `@atlaskit/pragmatic-drag-and-drop` (DropIndicator), `@atlaskit/motion` | Drag preview: clone of row at 0.8 opacity. Drop indicator: 2px blue line (`color.border.brand`). `edge: "top" | "bottom"` indicator. |
| 61 | **Drop — save new order** | Releases Hub | Release drag | New order persisted. "Next version" relationships update. | `@atlaskit/pragmatic-drag-and-drop` | API call on drop. Optimistic reorder in state. Rollback on error. Sequence number updated server-side. |

---

### Category 9: Keyboard & Accessibility (Paths 62–67)

| # | Scenario | Page Name | Trigger / Path | Functional Spec | ADS Components | Implementation Spec |
|---|----------|-----------|----------------|-----------------|----------------|---------------------|
| 62 | **Keyboard focus on version rows** | Releases Hub | Tab key navigation | Each version row is focusable. Focus ring visible. Enter opens detail page. | `@atlaskit/css` (focus ring tokens), `tabIndex="0"` | Focus ring: `outline: 2px solid color.border.focused; outline-offset: 2px`. `role="row"` with `aria-label`. |
| 63 | **Keyboard open actions menu** | Releases Hub | Focus on ••• button → Enter/Space | Opens dropdown menu. Arrow keys navigate items. Enter selects. Escape closes. | `@atlaskit/dropdown-menu` (built-in keyboard support) | `@atlaskit/dropdown-menu` handles keyboard natively. Ensure `trigger` has `aria-haspopup="true"`. |
| 64 | **Screen reader announcements** | Releases Hub | ARIA live regions | Version creation/deletion announced. "Version {name} created successfully." Status changes announced. | `aria-live="polite"`, `@atlaskit/flag` (auto-announced) | Flags are auto-announced by screen readers. Add `role="status"` to progress bar region. |
| 65 | **Keyboard navigation in modals** | All Dialogs | Tab within modal | Focus trapped inside modal. Tab cycles through form fields and buttons. Escape closes modal. Initial focus on first interactive element. | `@atlaskit/modal-dialog` (built-in focus trap) | Modal-dialog handles focus trap natively. Ensure `autoFocus` is set. |
| 66 | **Keyboard inline edit** | Releases Hub | Enter on focused version row → edit mode | Activates inline edit. Tab between fields. Enter confirms. Escape cancels. | `@atlaskit/inline-edit` (built-in keyboard) | InlineEdit activates on Enter, confirms on Enter, cancels on Escape natively. |
| 67 | **Aria labels for progress bar** | Releases Hub | Screen reader focus | Progress bar reads: "Version progress: X% complete. Y done, Z in progress, W to do out of N total issues." | `aria-label`, `aria-valuenow`, `aria-valuemax`, `role="progressbar"` | Custom `aria-label` string built from issue counts. `role="progressbar"` with `aria-valuenow={percentDone}`. |

---

### Category 10: Filtering, Searching & Sorting (Paths 68–72)

| # | Scenario | Page Name | Trigger / Path | Functional Spec | ADS Components | Implementation Spec |
|---|----------|-----------|----------------|-----------------|----------------|---------------------|
| 68 | **Search/filter versions** | Releases Hub | Type in search box at top | Filters version list by name (case-insensitive substring match). All sections filtered simultaneously. Shows "No results" if no match. | `@atlaskit/textfield` (elemBeforeInput=SearchIcon), `@atlaskit/icon` (SearchIcon) | Client-side filter: `versions.filter(v => v.name.toLowerCase().includes(query))`. Debounce 200ms. Preserve section grouping. |
| 69 | **Filter by status** | Releases Hub | Status filter dropdown | Filter to show only: Unreleased / Released / Archived / Overdue. Multi-select. | `@atlaskit/select` (CheckboxSelect) or `@atlaskit/dropdown-menu` with checkboxes | Client-side filter by `released`, `archived`, and computed `isOverdue` flags. |
| 70 | **Sort versions** | Releases Hub | Column header click (if table view) | Sort by: Name (alpha), Start date, Release date. Toggle ASC/DESC. | `@atlaskit/dynamic-table` (sortable headers) | Sort function applied within each section. Sort icon: ↑ ASC, ↓ DESC. Preserve section grouping. |
| 71 | **Clear all filters** | Releases Hub | Click "Clear" button or ✕ on filter tags | Removes all active filters. Full version list restored. | `@atlaskit/button` (appearance="subtle"), `@atlaskit/tag` (removable) | Reset `searchQuery`, `statusFilter` to defaults. |
| 72 | **URL-based filter state** | Releases Hub | Direct URL with query params | Filter state reflected in URL: `?status=unreleased&q=sprint`. Bookmarkable. Shared links preserve filters. | React Router query params | `useSearchParams()` hook. Sync filter state with URL params on change. Parse on mount. |

---

### Category 11: Cross-Feature Integration Points (Paths 73–80)

| # | Scenario | Page Name | Trigger / Path | Functional Spec | ADS Components | Implementation Spec |
|---|----------|-----------|----------------|-----------------|----------------|---------------------|
| 73 | **Fix Version picker on issue** | Issue Create/Edit | Fix Version field in issue form | Multi-select dropdown showing all unreleased versions. Grouped: Unreleased first, Released second. Archived hidden. Create-new option at bottom. | `@atlaskit/select` (CreatableSelect, isMulti) | **API**: `GET /rest/api/3/project/{key}/versions?status=unreleased,released`. `formatGroupLabel` for section headers. `onCreateOption` triggers version create API. |
| 74 | **Affects Version picker on issue** | Issue Create/Edit | Affects Version field in issue form | Multi-select dropdown. Shows all non-archived versions. Used for bug reporting (which version has the bug). | `@atlaskit/select` (Select, isMulti) | Same API as #73. No create-new option (typically). |
| 75 | **Version link in issue detail** | Issue Detail Page | Fix Version / Affects Version field display | Version names shown as clickable links/lozenges. Click navigates to Release Detail page. | `@atlaskit/lozenge` or `@atlaskit/tag` (with onClick) | `<Tag text={version.name} href={/projects/${key}/versions/${version.id}} />`. Removable if user has edit permission. |
| 76 | **Board — version filter** | Board View | Filter by fix version | Board can filter to show only issues belonging to a specific version. | `@atlaskit/select` (board filter bar) | JQL filter appended: `AND fixVersion = "{name}"`. |
| 77 | **Backlog — version grouping** | Backlog View | Group by fix version | Backlog can group issues by their fix version. Version headers in backlog with drag-to-assign. | `@atlaskit/heading`, drag-and-drop zones | Backlog grouping mode adds version headers. Dragging issue to version group updates fix version. |
| 78 | **Roadmap — version markers** | Roadmap/Timeline View | Version markers on timeline | Versions shown as vertical lines/diamonds on the timeline. Hover shows version name + date. Click navigates to detail. | Custom SVG markers, `@atlaskit/tooltip` | Plot `releaseDate` as markers on timeline x-axis. Color: released = green, unreleased = blue, overdue = red. |
| 79 | **Dashboard gadget — Version Report** | Dashboard | Add "Version Report" gadget | Chart showing issue progress over time for a version. Burndown-style. Configurable version picker. | `@atlaskit/select` (gadget config), chart library (Recharts or similar) | Gadget config: project + version selection. Data: historical issue count snapshots. Chart: area/line chart with done/undone series. |
| 80 | **Release notification** | System | On version release | Optional notification to watchers/team when a version is released. Configurable in project settings. | n/a (server-side) | Webhook or notification scheme trigger on version release event. Email template with release notes. |

---

## SECTION C: ATLASSIAN DESIGN SYSTEM (ADS) COMPONENT MASTER LIST

| Component | Package | Usage in Releases | Catalyst Equivalent |
|-----------|---------|-------------------|---------------------|
| **Button** | `@atlaskit/button` | Create, Save, Cancel, Release, Delete, Archive actions | Custom `<CatalystButton>` wrapping same variants |
| **IconButton** | `@atlaskit/button` | Confirm/cancel inline edit, actions trigger | `<CatalystIconButton>` |
| **Textfield** | `@atlaskit/textfield` | Version name input, search filter | `<CatalystTextField>` |
| **Textarea** | `@atlaskit/textarea` | Version description | `<CatalystTextArea>` |
| **DatePicker** | `@atlaskit/datetime-picker` | Start date, Release date pickers | `<CatalystDatePicker>` |
| **Select** | `@atlaskit/select` | Version picker in merge/delete/release modals, fix version field | `<CatalystSelect>` |
| **Modal Dialog** | `@atlaskit/modal-dialog` | Release, Delete, Merge confirmation dialogs | `<CatalystModal>` |
| **Dropdown Menu** | `@atlaskit/dropdown-menu` | Version actions menu (•••) | `<CatalystDropdownMenu>` |
| **Dynamic Table** | `@atlaskit/dynamic-table` | Issue list on Release Detail page | `<CatalystDataTable>` |
| **Inline Edit** | `@atlaskit/inline-edit` | Version name, dates, description inline editing | `<CatalystInlineEdit>` |
| **Progress Bar** | `@atlaskit/progress-bar` | Version completion progress (segmented) | `<CatalystSegmentedProgress>` (custom) |
| **Lozenge** | `@atlaskit/lozenge` | Status indicators (Released, Unreleased, Overdue) | `<CatalystLozenge>` |
| **Badge** | `@atlaskit/badge` | Section count badges | `<CatalystBadge>` |
| **Flag** | `@atlaskit/flag` | Success/error notifications | `<CatalystFlag>` / toast system |
| **Tooltip** | `@atlaskit/tooltip` | Progress bar details, date info | `<CatalystTooltip>` |
| **Heading** | `@atlaskit/heading` | Section headers, page title | `<CatalystHeading>` |
| **Breadcrumbs** | `@atlaskit/breadcrumbs` | Navigation trail on detail page | `<CatalystBreadcrumbs>` |
| **Tabs** | `@atlaskit/tabs` | Issues / Release Notes tabs on detail page | `<CatalystTabs>` |
| **Skeleton** | `@atlaskit/skeleton` | Loading states | `<CatalystSkeleton>` |
| **Spinner** | `@atlaskit/spinner` | Action loading states | `<CatalystSpinner>` |
| **Empty State** | `@atlaskit/empty-state` | No versions state | `<CatalystEmptyState>` |
| **Radio** | `@atlaskit/radio` | Delete dialog options | `<CatalystRadio>` |
| **Checkbox** | `@atlaskit/checkbox` | Release dialog "move issues" option | `<CatalystCheckbox>` |
| **Tag** | `@atlaskit/tag` | Filter pills, version links on issues | `<CatalystTag>` |
| **Avatar** | `@atlaskit/avatar` | Assignee display in issue table | `<CatalystAvatar>` |
| **Icon** | `@atlaskit/icon` | Chevrons, search, warning, drag handle | `<CatalystIcon>` |
| **Side Navigation** | `@atlaskit/side-navigation` | Project sidebar "Releases" link | `<CatalystSideNav>` |
| **Page Layout** | `@atlaskit/page-layout` | Overall page structure | `<CatalystPageLayout>` |
| **Page Header** | `@atlaskit/page-header` | Release Detail page header | `<CatalystPageHeader>` |
| **Section Message** | `@atlaskit/section-message` | Informational messages (e.g., archived section) | `<CatalystSectionMessage>` |
| **Form** | `@atlaskit/form` | Create/Edit version form validation | `<CatalystForm>` |
| **Pragmatic DnD** | `@atlaskit/pragmatic-drag-and-drop` | Version reordering | Catalyst DnD implementation |
| **Motion** | `@atlaskit/motion` | Collapse/expand animations | CSS transitions or Framer Motion |
| **CSS (Tokens)** | `@atlaskit/css` / `@atlaskit/tokens` | All color, spacing, typography tokens | Catalyst design tokens |

---

## SECTION D: DATA MODEL & API MAPPING

### Version Object Structure

```typescript
interface CatalystRelease {
  id: string;                    // Unique identifier
  name: string;                  // Version name (required, unique per project)
  description?: string;          // Plain text description
  projectId: string;             // Parent project reference
  startDate?: string;            // ISO date (YYYY-MM-DD)
  releaseDate?: string;          // ISO date (YYYY-MM-DD)
  released: boolean;             // Whether version is released
  archived: boolean;             // Whether version is archived
  overdue: boolean;              // Computed: releaseDate < today && !released
  sequence: number;              // Display order (for drag reordering)
  
  // Computed / fetched separately
  issueStats: {
    total: number;
    done: number;
    inProgress: number;
    toDo: number;
    percentDone: number;
  };
}
```

### API Endpoints to Replicate

| Operation | Jira API | Catalyst API (Suggested) |
|-----------|----------|--------------------------|
| List versions | `GET /rest/api/3/project/{key}/versions` | `GET /api/projects/:key/releases` |
| Get version | `GET /rest/api/3/version/{id}` | `GET /api/releases/:id` |
| Create version | `POST /rest/api/3/version` | `POST /api/releases` |
| Update version | `PUT /rest/api/3/version/{id}` | `PUT /api/releases/:id` |
| Delete version | `DELETE /rest/api/3/version/{id}` | `DELETE /api/releases/:id` |
| Merge versions | `PUT /rest/api/3/version/{id}/mergeTo/{targetId}` | `POST /api/releases/:id/merge` |
| Move/reorder | `POST /rest/api/3/version/{id}/move` | `PUT /api/releases/:id/reorder` |
| Issue counts | `GET /rest/api/3/version/{id}/relatedIssueCounts` | `GET /api/releases/:id/stats` |
| Issues by version | JQL: `fixVersion = "name"` | `GET /api/releases/:id/issues` |

---

## SECTION E: UX BEHAVIOR SPECIFICATIONS

### 1. State Transitions
```
[Create] → UNRELEASED → [Release] → RELEASED → [Unrelease] → UNRELEASED
                ↓                        ↓                         ↓
           [Archive]              [Archive]                  [Archive]
                ↓                        ↓                         ↓
           ARCHIVED ←←←←←←←←←←← ARCHIVED ←←←←←←←←←←←←← ARCHIVED
                ↓
          [Unarchive] → returns to previous state (Released/Unreleased)
                
Any state → [Delete] → REMOVED (with issue reassignment options)
Any state → [Merge] → REMOVED (issues transferred to target)
```

### 2. Optimistic UI Pattern
All mutations should follow optimistic UI:
1. Update local state immediately
2. Send API request
3. On success: show success flag, no further action
4. On error: rollback local state, show error flag, restore previous UI

### 3. Animation Specifications
| Animation | Duration | Easing | Description |
|-----------|----------|--------|-------------|
| Section collapse/expand | 200ms | ease-in-out | Height transition |
| Row insertion (create) | 150ms | ease-out | Slide-down + fade-in |
| Row removal (delete/merge) | 150ms | ease-in | Slide-up + fade-out |
| Row move (release/unrelease) | 300ms | ease-in-out | Slide from source to target section |
| Drag reorder | real-time | linear | Follow cursor, spring settle |
| Modal appear | 150ms | ease-out | Fade + scale from 0.95 to 1 |
| Progress bar update | 400ms | ease-out | Width transition per segment |

### 4. Responsive Breakpoints
| Breakpoint | Behavior |
|------------|----------|
| ≥1200px | Full layout: all columns visible, inline edit |
| 960–1199px | Description column hidden, narrower date columns |
| 768–959px | Compact cards instead of table rows |
| <768px | Single-column stacked cards, full-width modals |

### 5. Error Handling Matrix
| Error | User Message | Recovery |
|-------|-------------|----------|
| Duplicate name (409) | "A version with this name already exists" | Focus on name field |
| Permission denied (403) | "You don't have permission to manage versions" | Disable action buttons |
| Version not found (404) | "This version may have been deleted" | Redirect to hub |
| Network error | "Unable to connect. Your changes will be saved when connection is restored." | Queue for retry |
| Concurrent edit (409) | "This version was modified by someone else. Refresh to see changes." | Offer refresh button |
