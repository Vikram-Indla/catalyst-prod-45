# Part 2: Permission Model, Exact UI Copy, & Accessibility Tree

---

## 3. PERMISSION MODEL

### 3.1 Jira Permission → Action Mapping

| Action | Required Jira Permission | Permission Key | Scope | Default Granted To |
|---|---|---|---|---|
| **View** Releases page | Browse Projects | `BROWSE_PROJECTS` | Project | Any logged-in project member |
| **Create** version | Administer Projects | `ADMINISTER_PROJECTS` | Project | Project Admin role |
| **Edit** version (name, dates, description) | Administer Projects | `ADMINISTER_PROJECTS` | Project | Project Admin role |
| **Release** a version | Administer Projects | `ADMINISTER_PROJECTS` | Project | Project Admin role |
| **Unrelease** a version | Administer Projects | `ADMINISTER_PROJECTS` | Project | Project Admin role |
| **Archive** a version | Administer Projects | `ADMINISTER_PROJECTS` | Project | Project Admin role |
| **Unarchive** a version | Administer Projects | `ADMINISTER_PROJECTS` | Project | Project Admin role |
| **Delete** a version | Administer Projects | `ADMINISTER_PROJECTS` | Project | Project Admin role |
| **Merge** versions | Administer Projects | `ADMINISTER_PROJECTS` | Project | Project Admin role |
| **Reorder** (drag & drop) | Administer Projects | `ADMINISTER_PROJECTS` | Project | Project Admin role |
| **View** release detail page | Browse Projects | `BROWSE_PROJECTS` | Project | Any logged-in project member |
| **View** issues in release | Browse Projects | `BROWSE_PROJECTS` | Project | Any logged-in project member |
| **Generate** release notes | Browse Projects | `BROWSE_PROJECTS` | Project | Any logged-in project member |
| Set **Fix Version** on issue | Edit Issues | `EDIT_ISSUES` | Project | Project Member role |
| **Jira Admin** override | Administer Jira | `ADMINISTER` | Global | Jira Admins group |

### 3.2 UI Behavior When Permission Denied

```typescript
interface PermissionUI {
  // What happens in the UI when user lacks permission
  scenarios: {
    noAdministerProjects: {
      createButton: 'hidden';           // "Create version" button not rendered
      actionsMenu: 'hidden';            // "•••" column not rendered
      dragHandles: 'hidden';            // Drag handles not rendered
      inlineEdit: 'disabled';           // Version name is plain text link, not editable
      versionNameLink: 'clickable';     // Still navigates to detail page
      releaseNotesButton: 'visible';    // Read-only feature, still shown
    };
    noBrowseProjects: {
      releasesPage: '404';              // Entire page returns 404 / "You don't have access"
    };
    noEditIssues: {
      fixVersionField: 'read-only';     // Fix version shown but not editable on issue
      releaseAction: 'disabled';        // Can't release because can't move issues
    };
  };
}
```

### 3.3 Permission Check — API Level

```typescript
// Before rendering, Jira makes this check:
// GET /rest/api/3/mypermissions?projectKey={KEY}&permissions=ADMINISTER_PROJECTS

interface PermissionCheckResponse {
  permissions: {
    ADMINISTER_PROJECTS: {
      id: string;
      key: 'ADMINISTER_PROJECTS';
      name: 'Administer Projects';
      type: 'PROJECT';
      description: string;
      havePermission: boolean;  // ← This drives all UI visibility
    };
  };
}

// Catalyst implementation:
async function checkReleasesPermissions(projectKey: string): Promise<ReleasesPermissions> {
  const response = await api.getMyPermissions(projectKey, [
    'BROWSE_PROJECTS',
    'ADMINISTER_PROJECTS',
    'EDIT_ISSUES',
  ]);

  return {
    canView: response.permissions.BROWSE_PROJECTS.havePermission,
    canManage: response.permissions.ADMINISTER_PROJECTS.havePermission,
    canEditIssues: response.permissions.EDIT_ISSUES.havePermission,
  };
}
```

### 3.4 Catalyst Permission Mapping

| Jira Permission | Catalyst Equivalent | Implementation |
|---|---|---|
| `BROWSE_PROJECTS` | `releases.view` | Check on page load; 403 if denied |
| `ADMINISTER_PROJECTS` | `releases.manage` | Check on page load; hide CRUD UI elements |
| `EDIT_ISSUES` | `issues.edit` | Check when release action involves moving issues |
| `ADMINISTER` (global) | `platform.admin` | Bypasses all project-level checks |

### 3.5 Role → Permission Default Matrix

| Role | Browse | Edit Issues | Administer Project |
|---|---|---|---|
| Viewer | ✅ | ❌ | ❌ |
| Member | ✅ | ✅ | ❌ |
| Project Admin | ✅ | ✅ | ✅ |
| Jira Admin | ✅ | ✅ | ✅ |

---

## 4. EXACT UI COPY

### 4.1 Page-Level Copy

```yaml
# Releases Hub Page
page_title: "Releases"
page_breadcrumb: "{Project Name} / Releases"

# Section Headers
section_unreleased: "UNRELEASED"
section_released: "RELEASED"
section_archived: "ARCHIVED"

# Column Headers
col_version: "Version"
col_status: "Status"
col_progress: "Progress"
col_start_date: "Start date"
col_release_date: "Release date"
col_description: "Description"
col_actions: ""  # No text, just ••• icon

# Empty State — No Versions
empty_state_title: "Plan and track work with versions"
empty_state_description: "Versions are points-in-time for a project. They help you organize and plan work, prepare for a release, and take action on a group of issues."
empty_state_button: "Create version"

# Empty State — No Unreleased Versions
empty_unreleased_title: "No unreleased versions"
empty_unreleased_description: "Create a new version to start planning your next release."

# Empty State — No Released Versions
empty_released_message: "No versions have been released yet"

# Search / Filter
search_placeholder: "Search versions"
filter_label: "Status"
filter_option_all: "All"
filter_option_unreleased: "Unreleased"
filter_option_released: "Released"
filter_option_archived: "Archived"
filter_option_overdue: "Overdue"
```

### 4.2 Create Version Modal

```yaml
modal_title: "Create version"

# Field Labels
label_name: "Name"
label_start_date: "Start date"
label_release_date: "Release date"
label_description: "Description"

# Placeholders
placeholder_name: ""  # No placeholder — empty field
placeholder_start_date: "d/MMM/yy"  # Locale-dependent
placeholder_release_date: "d/MMM/yy"
placeholder_description: ""

# Field Helper Text
helper_name: ""  # None
helper_start_date: ""
helper_release_date: ""
helper_description: ""

# Buttons
button_submit: "Save"
button_cancel: "Cancel"

# Validation Errors
error_name_required: "You must specify a version name"
error_name_too_long: "The version name must not exceed 255 characters"
error_name_duplicate: "A version with this name already exists in this project."
error_date_invalid: "The date you entered is not valid."
error_date_range: "The start date must be before the release date."
```

### 4.3 Edit Version (Inline Edit)

```yaml
# Inline edit trigger: click on version name text
# Shows text field in-place with confirm (✓) and cancel (✗) buttons

# On save success:
toast_edit_success: ""  # No toast — inline update is immediate

# On save failure:
flag_edit_error_title: "Error"
flag_edit_error_description: "We couldn't save your changes. Try again."
```

### 4.4 Release Version Modal

```yaml
modal_title: "Release {versionName}"

# When no unresolved issues:
message_no_issues: "All issues in this version are resolved."
label_release_date: "Release date"
# Date field pre-fills with today's date

# When unresolved issues exist:
message_unresolved: "This version has unresolved issues."
label_unresolved_count: "{count} unresolved issue(s)"

label_radio_move: "Move them to version:"
label_radio_ignore: "Ignore"

# Buttons
button_release: "Release"
button_cancel: "Cancel"

# Success
flag_release_success_title: ""  # No title
flag_release_success_description: "Version {versionName} has been released."

# Error
flag_release_error_title: "Error"
flag_release_error_description: "We couldn't release this version. Try again."
```

### 4.5 Unrelease Version

```yaml
# No confirmation modal — action executes immediately on menu click

menu_item_label: "Unrelease"

# Success
flag_unrelease_success: "Version {versionName} has been unreleased."
```

### 4.6 Delete Version Modal

```yaml
modal_title: "Delete version: {versionName}"

# When version has issues:
message_has_issues: "Any issues with a fix version or affected version of {versionName} will be updated."

label_fix_version_action: "Fix version"
radio_fix_move: "Move to:"
radio_fix_remove: "Remove from all issues"

label_affected_version_action: "Affects version"
radio_affected_move: "Move to:"
radio_affected_remove: "Remove from all issues"

# Dropdown placeholder for version picker
dropdown_placeholder: "Choose a version"

# When version has no issues:
message_no_issues: "Are you sure you want to delete version {versionName}?"

# Warning
warning_message: "This action cannot be undone."

# Buttons
button_delete: "Delete"
button_cancel: "Cancel"

# Success
flag_delete_success: "Version {versionName} has been deleted."

# Error
flag_delete_error_title: "Error"
flag_delete_error_description: "We couldn't delete this version. Try again."
```

### 4.7 Merge Version Modal

```yaml
modal_title: "Merge version"

label_source: "Merge version {versionName} into:"
dropdown_placeholder: "Choose a version"

# Info message
info_message: "All issues with a fix version or affected version of {versionName} will be moved to the selected version."

# Warning
warning_message: "Version {versionName} will be deleted after merging. This cannot be undone."

# Buttons
button_merge: "Merge"
button_cancel: "Cancel"

# Success
flag_merge_success: "Version {versionName} has been merged into {targetVersionName}."
```

### 4.8 Archive / Unarchive

```yaml
# Archive — no modal, immediate action from menu
menu_item_archive: "Archive"
flag_archive_success: "Version {versionName} has been archived."

# Unarchive — no modal, immediate action from menu
menu_item_unarchive: "Unarchive"
flag_unarchive_success: "Version {versionName} has been unarchived."
```

### 4.9 Release Detail Page

```yaml
# Header
header_title: "{versionName}"
header_breadcrumb: "{Project Name} / Releases / {versionName}"

# Status Lozenge (next to title)
# One of: "UNRELEASED", "RELEASED", "OVERDUE"

# Dates displayed
label_start: "Start:"
label_release: "Release:"
format_date_not_set: "None"

# Description
label_description: "Description"
placeholder_no_description: "No description"

# Progress Section
label_progress: "Progress"
label_done: "Done"
label_inprogress: "In progress"
label_todo: "To do"

# Issue counts format
format_issue_count: "{count} issue(s)"
format_percentage: "{percent}%"

# Tabs
tab_issues: "Issues"
tab_release_notes: "Release notes"

# Issues Tab — Empty State
empty_issues_title: "No issues in this version"
empty_issues_description: "Add issues to this version by setting the fix version field."

# Release Notes Tab
release_notes_title: "Release notes"
release_notes_description: "Auto-generated from resolved issues in this version."
button_configure_notes: "Configure"
button_copy_notes: "Copy to clipboard"
format_notes_item: "• [{issueKey}] {issueSummary}"

# Action Buttons (top right, based on version status)
button_release_version: "Release"
button_edit: "Edit"
button_actions_menu: "•••"  # Opens dropdown with: Delete, Merge, Archive
```

### 4.10 Action Menu Items (••• Dropdown)

```yaml
# For Unreleased versions:
menu_release: "Release"
menu_edit: "Edit"
menu_merge: "Merge"
menu_delete: "Delete"

# Separator line between groups

# For Released versions:
menu_unrelease: "Unrelease"
menu_edit: "Edit"
menu_archive: "Archive"
menu_merge: "Merge"
menu_delete: "Delete"

# For Archived versions:
menu_unarchive: "Unarchive"
menu_delete: "Delete"
```

### 4.11 Toast / Flag Messages (SectionMessage & Flag)

```yaml
# All flags use @atlaskit/flag with these properties:
flag_appearance_success: "success"  # Green left border
flag_appearance_error: "error"      # Red left border
flag_appearance_warning: "warning"  # Yellow left border
flag_appearance_info: "info"        # Blue left border

# Auto-dismiss timing:
flag_autodismiss_success: 6000  # 6 seconds
flag_autodismiss_error: null    # Manual dismiss required
flag_autodismiss_info: 8000     # 8 seconds
```

### 4.12 Overdue Warning

```yaml
# On releases table row (replaces release date cell)
overdue_date_format: "{date} — Overdue"  # Date shown in red
overdue_icon: "warning"  # ⚠️ triangle icon in R400 color

# On release detail page header
overdue_lozenge: "OVERDUE"  # Red bold lozenge replaces "UNRELEASED"
```

---

## 5. ACCESSIBILITY TREE

### 5.1 Releases Hub Page — ARIA Structure

```html
<!-- Page landmark structure -->
<main role="main" aria-label="Releases">

  <!-- Breadcrumb -->
  <nav aria-label="Breadcrumb">
    <ol role="list">
      <li><a href="/project/{key}">Project Name</a></li>
      <li aria-current="page">Releases</li>
    </ol>
  </nav>

  <!-- Page heading -->
  <h1 id="releases-heading">Releases</h1>

  <!-- Search & Filter toolbar -->
  <div role="toolbar" aria-label="Version filters">

    <div role="search">
      <label for="version-search" class="visually-hidden">Search versions</label>
      <input
        id="version-search"
        type="text"
        role="searchbox"
        aria-label="Search versions"
        placeholder="Search versions"
        autocomplete="off"
      />
    </div>

    <div role="group" aria-label="Status filter">
      <button
        role="option"
        aria-selected="true"
        aria-label="Show all versions"
      >All</button>
      <button
        role="option"
        aria-selected="false"
        aria-label="Show unreleased versions"
      >Unreleased</button>
      <button
        role="option"
        aria-selected="false"
        aria-label="Show released versions"
      >Released</button>
      <button
        role="option"
        aria-selected="false"
        aria-label="Show archived versions"
      >Archived</button>
    </div>
  </div>

  <!-- Create version button -->
  <button
    type="button"
    aria-label="Create version"
    aria-haspopup="dialog"
  >Create version</button>

  <!-- Unreleased Section -->
  <section aria-labelledby="section-unreleased">
    <h2 id="section-unreleased">Unreleased</h2>

    <table
      role="table"
      aria-label="Unreleased versions"
      aria-describedby="section-unreleased"
      aria-rowcount="{totalUnreleasedCount}"
    >
      <thead>
        <tr role="row">
          <th role="columnheader" scope="col" aria-sort="none">Version</th>
          <th role="columnheader" scope="col">Progress</th>
          <th role="columnheader" scope="col" aria-sort="none">Start date</th>
          <th role="columnheader" scope="col" aria-sort="none">Release date</th>
          <th role="columnheader" scope="col">Description</th>
          <th role="columnheader" scope="col">
            <span class="visually-hidden">Actions</span>
          </th>
        </tr>
      </thead>

      <tbody>
        <tr
          role="row"
          aria-rowindex="{index}"
          aria-label="Version {versionName}"
          tabindex="0"
          draggable="true"
          aria-grabbed="false"
          aria-roledescription="Sortable version row"
        >
          <!-- Drag handle -->
          <td role="cell">
            <button
              aria-label="Drag to reorder {versionName}"
              aria-roledescription="Drag handle"
              tabindex="-1"
            >
              <svg aria-hidden="true" />  <!-- Drag icon -->
            </button>
          </td>

          <!-- Version name -->
          <td role="cell">
            <a
              href="/projects/{key}/versions/{id}"
              aria-label="{versionName}, unreleased"
            >{versionName}</a>
            <!-- Inline edit (when admin) -->
            <div
              role="group"
              aria-label="Edit version name"
            >
              <input
                type="text"
                aria-label="Version name"
                aria-invalid="{hasError}"
                aria-errormessage="name-error-{id}"
              />
              <button aria-label="Confirm">✓</button>
              <button aria-label="Cancel">✗</button>
              <div id="name-error-{id}" role="alert" aria-live="assertive">
                <!-- Error message injected here -->
              </div>
            </div>
          </td>

          <!-- Progress bar -->
          <td role="cell">
            <div
              role="progressbar"
              aria-label="Version progress: {doneCount} of {totalCount} issues done ({donePercent}%)"
              aria-valuenow="{donePercent}"
              aria-valuemin="0"
              aria-valuemax="100"
              tabindex="0"
            >
              <div aria-hidden="true" style="width: {donePercent}%"></div>
              <div aria-hidden="true" style="width: {inProgressPercent}%"></div>
            </div>
            <span class="visually-hidden">
              {doneCount} done, {inProgressCount} in progress, {todoCount} to do
            </span>
          </td>

          <!-- Start date -->
          <td role="cell" aria-label="Start date: {startDate || 'Not set'}">
            {startDate || '—'}
          </td>

          <!-- Release date -->
          <td role="cell" aria-label="Release date: {releaseDate || 'Not set'}{isOverdue ? ', overdue' : ''}">
            <span aria-hidden="{!isOverdue}">
              <svg aria-hidden="true" /> <!-- Warning icon -->
            </span>
            {releaseDate || '—'}
          </td>

          <!-- Description -->
          <td role="cell" aria-label="Description: {description || 'No description'}">
            {truncatedDescription || '—'}
          </td>

          <!-- Actions menu -->
          <td role="cell">
            <button
              aria-label="Actions for {versionName}"
              aria-haspopup="menu"
              aria-expanded="false"
              aria-controls="actions-menu-{id}"
            >•••</button>
          </td>
        </tr>
      </tbody>
    </table>
  </section>

  <!-- Released Section (same structure, no drag handles) -->
  <section aria-labelledby="section-released">
    <h2 id="section-released">Released</h2>
    <!-- Same table structure, drag handles removed -->
  </section>

  <!-- Archived Section -->
  <section aria-labelledby="section-archived">
    <h2 id="section-archived">Archived</h2>
    <!-- Same table structure, drag handles removed -->
  </section>

</main>
```

### 5.2 Actions Dropdown Menu — ARIA

```html
<div
  id="actions-menu-{id}"
  role="menu"
  aria-label="Actions for {versionName}"
  aria-orientation="vertical"
>
  <button role="menuitem" tabindex="-1" aria-label="Release {versionName}">
    Release
  </button>
  <button role="menuitem" tabindex="-1" aria-label="Edit {versionName}">
    Edit
  </button>
  <div role="separator" aria-hidden="true"></div>
  <button role="menuitem" tabindex="-1" aria-label="Merge {versionName}">
    Merge
  </button>
  <button role="menuitem" tabindex="-1" aria-label="Archive {versionName}">
    Archive
  </button>
  <div role="separator" aria-hidden="true"></div>
  <button
    role="menuitem"
    tabindex="-1"
    aria-label="Delete {versionName}"
    class="menu-item--danger"
  >
    Delete
  </button>
</div>
```

### 5.3 Create / Edit Version Modal — ARIA

```html
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="create-version-title"
  aria-describedby="create-version-desc"
>
  <h1 id="create-version-title">Create version</h1>

  <form aria-label="Create version form" novalidate>

    <!-- Name field -->
    <div role="group" aria-labelledby="label-name">
      <label id="label-name" for="version-name">
        Name
        <span aria-label="required">*</span>
      </label>
      <input
        id="version-name"
        type="text"
        required
        aria-required="true"
        aria-invalid="false"
        aria-describedby="name-hint name-error"
        maxlength="255"
        autocomplete="off"
      />
      <div id="name-hint" class="visually-hidden">
        Enter a unique name for this version, up to 255 characters
      </div>
      <div id="name-error" role="alert" aria-live="assertive" aria-atomic="true">
        <!-- Dynamically populated with error message -->
      </div>
    </div>

    <!-- Start date field -->
    <div role="group" aria-labelledby="label-start-date">
      <label id="label-start-date" for="start-date">Start date</label>
      <input
        id="start-date"
        type="text"
        role="combobox"
        aria-expanded="false"
        aria-haspopup="dialog"
        aria-controls="start-date-calendar"
        aria-invalid="false"
        aria-describedby="start-date-error"
        placeholder="d/MMM/yy"
        autocomplete="off"
        inputmode="none"
      />
      <button
        aria-label="Open calendar to choose start date"
        tabindex="-1"
      >
        <svg aria-hidden="true" /> <!-- Calendar icon -->
      </button>
      <div id="start-date-error" role="alert" aria-live="assertive" aria-atomic="true"></div>

      <!-- Calendar popup -->
      <div
        id="start-date-calendar"
        role="dialog"
        aria-modal="false"
        aria-label="Choose start date"
      >
        <div role="group" aria-label="Calendar navigation">
          <button aria-label="Previous month">←</button>
          <div aria-live="polite" aria-atomic="true">{Month Year}</div>
          <button aria-label="Next month">→</button>
        </div>
        <table role="grid" aria-label="{Month Year}">
          <thead>
            <tr>
              <th scope="col" abbr="Sunday" aria-label="Sunday">Su</th>
              <th scope="col" abbr="Monday" aria-label="Monday">Mo</th>
              <th scope="col" abbr="Tuesday" aria-label="Tuesday">Tu</th>
              <th scope="col" abbr="Wednesday" aria-label="Wednesday">We</th>
              <th scope="col" abbr="Thursday" aria-label="Thursday">Th</th>
              <th scope="col" abbr="Friday" aria-label="Friday">Fr</th>
              <th scope="col" abbr="Saturday" aria-label="Saturday">Sa</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td
                role="gridcell"
                tabindex="-1"
                aria-selected="false"
                aria-label="{full date, e.g., June 23, 2026}"
                aria-current="{isToday ? 'date' : undefined}"
                aria-disabled="{isDisabled}"
              >{day}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Release date field — same structure as start date -->

    <!-- Description field -->
    <div role="group" aria-labelledby="label-description">
      <label id="label-description" for="version-description">Description</label>
      <textarea
        id="version-description"
        aria-multiline="true"
        rows="3"
      ></textarea>
    </div>

    <!-- Footer buttons -->
    <div role="group" aria-label="Form actions">
      <button type="button" aria-label="Cancel creating version">Cancel</button>
      <button
        type="submit"
        aria-label="Save version"
        aria-disabled="{isSubmitting}"
      >
        {isSubmitting ? 'Saving...' : 'Save'}
      </button>
    </div>
  </form>

  <!-- Close button -->
  <button
    aria-label="Close create version dialog"
    type="button"
  >
    <svg aria-hidden="true" /> <!-- X icon -->
  </button>
</div>
```

### 5.4 Release Version Modal — ARIA

```html
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="release-modal-title"
>
  <h1 id="release-modal-title">Release {versionName}</h1>

  <!-- Unresolved issues warning -->
  <div role="alert" aria-label="Unresolved issues warning">
    <p>This version has unresolved issues.</p>
    <p aria-label="{count} unresolved issues">{count} unresolved issue(s)</p>
  </div>

  <!-- Radio group for unresolved issues -->
  <fieldset>
    <legend class="visually-hidden">Choose what to do with unresolved issues</legend>

    <div role="radiogroup" aria-label="Unresolved issue action">
      <label>
        <input
          type="radio"
          name="unresolvedAction"
          value="move"
          aria-label="Move unresolved issues to another version"
          checked
        />
        Move them to version:
      </label>

      <!-- Version picker dropdown -->
      <div
        role="combobox"
        aria-expanded="false"
        aria-haspopup="listbox"
        aria-label="Select target version"
        aria-controls="version-listbox"
      >
        <input
          role="searchbox"
          aria-autocomplete="list"
          aria-label="Search versions"
        />
        <ul id="version-listbox" role="listbox" aria-label="Available versions">
          <li role="option" aria-selected="false">{otherVersionName}</li>
        </ul>
      </div>

      <label>
        <input
          type="radio"
          name="unresolvedAction"
          value="ignore"
          aria-label="Ignore unresolved issues"
        />
        Ignore
      </label>
    </div>
  </fieldset>

  <!-- Release date -->
  <div role="group" aria-label="Release date">
    <label for="release-date-input">Release date</label>
    <input id="release-date-input" type="text" />
    <!-- Same date picker ARIA as section 5.3 -->
  </div>

  <!-- Footer -->
  <button type="button" aria-label="Cancel release">Cancel</button>
  <button
    type="button"
    aria-label="Release version {versionName}"
    aria-disabled="{isSubmitting}"
  >Release</button>
</div>
```

### 5.5 Delete Version Modal — ARIA

```html
<div
  role="alertdialog"
  aria-modal="true"
  aria-labelledby="delete-modal-title"
  aria-describedby="delete-modal-warning"
>
  <h1 id="delete-modal-title">Delete version: {versionName}</h1>

  <p id="delete-modal-warning">
    This action cannot be undone.
  </p>

  <!-- Fix version reassignment -->
  <fieldset aria-label="Fix version action">
    <legend>Fix version</legend>
    <div role="radiogroup">
      <label>
        <input type="radio" name="fixAction" value="move"
          aria-label="Move fix version to another version" />
        Move to:
      </label>
      <!-- version dropdown with combobox ARIA -->
      <label>
        <input type="radio" name="fixAction" value="remove"
          aria-label="Remove fix version from all issues" />
        Remove from all issues
      </label>
    </div>
  </fieldset>

  <!-- Affected version reassignment — same structure -->

  <!-- Footer -->
  <button type="button" aria-label="Cancel deletion">Cancel</button>
  <button
    type="button"
    aria-label="Permanently delete version {versionName}"
    class="button--danger"
  >Delete</button>
</div>
```

### 5.6 Keyboard Handlers — Complete Map

```typescript
const KEYBOARD_HANDLERS = {

  // ── Table Navigation ──
  table: {
    'ArrowDown':  'Move focus to next row',
    'ArrowUp':    'Move focus to previous row',
    'Enter':      'Navigate to version detail page (on version name)',
    'Space':      'Toggle row selection (if multi-select enabled)',
    'Tab':        'Move to next focusable cell element',
    'Shift+Tab':  'Move to previous focusable cell element',
    'Home':       'Move to first row in section',
    'End':        'Move to last row in section',
    'Escape':     'Clear selection / cancel inline edit',
  },

  // ── Drag & Drop ──
  dragDrop: {
    'Space':      'Pick up / drop the focused version row',
    'ArrowUp':    'Move grabbed item up one position',
    'ArrowDown':  'Move grabbed item down one position',
    'Escape':     'Cancel drag and return to original position',
    // Screen reader announcement on grab:
    announceGrab: 'You have lifted {versionName}. Current position: {index} of {total}. Use arrow keys to move, Space to drop, Escape to cancel.',
    announceMove: '{versionName} has been moved. New position: {index} of {total}.',
    announceDrop: '{versionName} has been dropped. Final position: {index} of {total}.',
    announceCancel: 'Reorder cancelled. {versionName} returned to position {index} of {total}.',
  },

  // ── Modal ──
  modal: {
    'Escape':     'Close modal without saving',
    'Tab':        'Cycle through focusable elements inside modal',
    'Shift+Tab':  'Reverse cycle through focusable elements',
    'Enter':      'Submit form (when focused on submit button)',
    // Focus trap: Tab on last element → first element; Shift+Tab on first → last
    focusTrap: true,
    initialFocus: 'First input field (version name)',
    returnFocus:  'Element that triggered the modal (create button / actions menu)',
  },

  // ── Actions Menu (dropdown) ──
  actionsMenu: {
    'Enter':      'Open menu / activate focused menu item',
    'Space':      'Open menu / activate focused menu item',
    'ArrowDown':  'Move to next menu item',
    'ArrowUp':    'Move to previous menu item',
    'Home':       'Move to first menu item',
    'End':        'Move to last menu item',
    'Escape':     'Close menu, return focus to trigger button',
    'Tab':        'Close menu, move focus to next element after trigger',
  },

  // ── Date Picker ──
  datePicker: {
    'Enter':      'Open calendar / select focused date',
    'Space':      'Select focused date',
    'ArrowLeft':  'Move to previous day',
    'ArrowRight': 'Move to next day',
    'ArrowUp':    'Move to same day previous week',
    'ArrowDown':  'Move to same day next week',
    'Home':       'Move to start of current week (Sunday)',
    'End':        'Move to end of current week (Saturday)',
    'PageUp':     'Move to previous month',
    'PageDown':   'Move to next month',
    'Shift+PageUp':  'Move to previous year',
    'Shift+PageDown': 'Move to next year',
    'Escape':     'Close calendar without selecting, return focus to input',
    'Backspace':  'Clear selected date',
    'Delete':     'Clear selected date',
  },

  // ── Inline Edit ──
  inlineEdit: {
    'Enter':      'Confirm edit (save)',
    'Escape':     'Cancel edit, restore previous value',
    'Tab':        'Confirm edit and move to next cell',
  },

  // ── Search Field ──
  search: {
    'Escape':     'Clear search text and blur',
    '/':          'Focus search field (global shortcut, when not in input)',
  },

  // ── Progress Bar (tooltip trigger) ──
  progressBar: {
    'Enter':      'Navigate to version detail page',
    'Space':      'Show progress tooltip',
    'Escape':     'Dismiss tooltip',
  },
};
```

### 5.7 Live Region Announcements

```typescript
const LIVE_REGION_ANNOUNCEMENTS = {

  // ── Version CRUD ──
  versionCreated:   'Version {name} has been created.',
  versionUpdated:   'Version {name} has been updated.',
  versionReleased:  'Version {name} has been released.',
  versionUnreleased:'Version {name} has been unreleased.',
  versionDeleted:   'Version {name} has been deleted.',
  versionMerged:    'Version {name} has been merged into {target}.',
  versionArchived:  'Version {name} has been archived.',
  versionUnarchived:'Version {name} has been unarchived.',

  // ── Validation Errors ──
  validationError:  'Error: {errorMessage}',

  // ── Search / Filter ──
  searchResults:    '{count} version(s) found.',
  filterApplied:    'Showing {filter} versions. {count} result(s).',

  // ── Loading ──
  pageLoading:      'Loading releases...',
  pageLoaded:       'Releases loaded. {unreleasedCount} unreleased, {releasedCount} released.',

  // ── Drag & Drop ──
  // (See dragDrop section above)
};

// Implementation: use aria-live="polite" region at page bottom
// <div aria-live="polite" aria-atomic="true" class="visually-hidden" id="sr-announcements"></div>

function announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const el = document.getElementById('sr-announcements')!;
  el.setAttribute('aria-live', priority);
  el.textContent = '';  // Clear first to force re-announcement
  requestAnimationFrame(() => {
    el.textContent = message;
  });
}
```

### 5.8 Focus Management Patterns

```typescript
const FOCUS_MANAGEMENT = {

  // Modal open → trap focus, set initial focus
  onModalOpen(modalElement: HTMLElement, initialFocusSelector: string): void {
    const firstFocusable = modalElement.querySelector(initialFocusSelector) as HTMLElement;
    firstFocusable?.focus();
    // Install focus trap
    trapFocus(modalElement);
  },

  // Modal close → return focus to trigger
  onModalClose(triggerElement: HTMLElement): void {
    triggerElement.focus();
  },

  // Delete row → focus moves to next row, or previous if last
  onRowDelete(deletedIndex: number, remainingRows: HTMLElement[]): void {
    if (remainingRows.length === 0) {
      // Focus "Create version" button
      document.querySelector('[aria-label="Create version"]')?.focus();
    } else {
      const nextIndex = Math.min(deletedIndex, remainingRows.length - 1);
      remainingRows[nextIndex]?.focus();
    }
  },

  // Inline edit confirm → focus stays on cell, exits edit mode
  onInlineEditConfirm(cellElement: HTMLElement): void {
    cellElement.focus();
  },

  // Inline edit cancel → focus stays on cell, exits edit mode
  onInlineEditCancel(cellElement: HTMLElement): void {
    cellElement.focus();
  },

  // Menu close → return focus to ••• trigger button
  onMenuClose(triggerButton: HTMLElement): void {
    triggerButton.focus();
  },

  // Date picker close → return focus to date input
  onDatePickerClose(dateInput: HTMLElement): void {
    dateInput.focus();
  },

  // After drag-and-drop → focus stays on moved row
  onDragComplete(movedRow: HTMLElement): void {
    movedRow.focus();
  },
};
```

### 5.9 Visually Hidden Utility (for screen reader text)

```css
.visually-hidden {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  padding: 0 !important;
  margin: -1px !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  white-space: nowrap !important;
  border: 0 !important;
}
```
