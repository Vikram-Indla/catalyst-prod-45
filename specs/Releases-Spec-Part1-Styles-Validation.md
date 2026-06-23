# Jira Releases → Catalyst Replication: Complete Specification
# Part 1: Computed Styles & Field Validation

---

## 1. COMPUTED STYLES

### 1.1 Release Modal (Create / Edit / Release / Delete / Merge)

```css
/* ── Modal Blanket (overlay) ── */
.modal-blanket {
  position: fixed;
  inset: 0;
  background: rgba(9, 30, 66, 0.54);        /* N900 at 54% — Jira uses this exact value */
  z-index: 510;
  animation: fadeIn 120ms ease-in;
}

/* ── Modal Dialog Container ── */
.modal-dialog {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 480px;                               /* "small" modal width in ADS */
  max-width: calc(100vw - 64px);
  max-height: calc(100vh - 64px);
  background: #FFFFFF;                        /* N0 */
  border-radius: 3px;                         /* ADS uses 3px, NOT 4px */
  box-shadow: 0 0 0 1px rgba(9, 30, 66, 0.08),
              0 2px 1px rgba(9, 30, 66, 0.08),
              0 0 20px -6px rgba(9, 30, 66, 0.31);
  z-index: 520;
  display: flex;
  flex-direction: column;
  animation: slideUp 200ms cubic-bezier(0.15, 1, 0.3, 1);
}

/* ── Modal Header ── */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 24px 8px 24px;
  min-height: 56px;
}

.modal-header h1 {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif;
  font-size: 20px;                            /* h500 heading token */
  font-weight: 500;
  line-height: 24px;
  color: #172B4D;                             /* N800 */
  margin: 0;
}

.modal-close-button {
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  background: transparent;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6B778C;                             /* N200 */
}

.modal-close-button:hover {
  background: #EBECF0;                        /* N30 */
  color: #172B4D;                             /* N800 */
}

.modal-close-button:active {
  background: #DFE1E6;                        /* N40 */
}

/* ── Modal Body ── */
.modal-body {
  padding: 4px 24px;
  overflow-y: auto;
  flex: 1 1 auto;
}

/* ── Modal Footer ── */
.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  padding: 16px 24px 24px 24px;
}

/* ── Animations ── */
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes slideUp {
  from { transform: translate(-50%, calc(-50% + 20px)); opacity: 0; }
  to   { transform: translate(-50%, -50%); opacity: 1; }
}

/* ── Responsive: Full-screen on mobile ── */
@media (max-width: 480px) {
  .modal-dialog {
    width: 100vw;
    height: 100vh;
    max-width: 100vw;
    max-height: 100vh;
    border-radius: 0;
    top: 0;
    left: 0;
    transform: none;
  }
}
```

**Modal Width Variants Used in Releases:**

| Modal Type | Width | ADS Size Token |
|---|---|---|
| Create Version | 480px | `small` |
| Edit Version | 480px | `small` |
| Release Version | 600px | `medium` |
| Delete Version | 400px | `small` |
| Merge Version | 600px | `medium` |
| Release Notes | 800px | `large` |

---

### 1.2 Releases Table

```css
/* ── Table Container ── */
.releases-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed;
}

/* ── Table Header ── */
.releases-table thead th {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 12px;
  font-weight: 600;
  line-height: 16px;
  letter-spacing: -0.003em;
  color: #6B778C;                             /* N200 */
  text-transform: uppercase;
  padding: 8px 8px 8px 0;
  text-align: left;
  border-bottom: 2px solid #DFE1E6;          /* N40 */
  white-space: nowrap;
  vertical-align: middle;
  user-select: none;
}

/* ── Column Widths (fixed layout) ── */
.releases-table th:nth-child(1) { width: 24%;  }  /* Version name */
.releases-table th:nth-child(2) { width: 34%;  }  /* Progress bar */
.releases-table th:nth-child(3) { width: 12%;  }  /* Start date */
.releases-table th:nth-child(4) { width: 12%;  }  /* Release date */
.releases-table th:nth-child(5) { width: 14%;  }  /* Description */
.releases-table th:nth-child(6) { width: 4%;   }  /* Actions (•••) */

/* ── Table Row ── */
.releases-table tbody tr {
  border-bottom: 1px solid #EBECF0;          /* N30 */
  cursor: pointer;
  transition: background-color 80ms ease-out;
}

.releases-table tbody tr:hover {
  background-color: #F4F5F7;                 /* N20 */
}

.releases-table tbody tr:active {
  background-color: #EBECF0;                 /* N30 */
}

/* ── Table Cell ── */
.releases-table tbody td {
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  color: #172B4D;                             /* N800 */
  padding: 12px 8px 12px 0;
  vertical-align: middle;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Version Name Link ── */
.releases-table .version-name-link {
  color: #0052CC;                             /* B400 */
  font-weight: 500;
  text-decoration: none;
}

.releases-table .version-name-link:hover {
  color: #0065FF;                             /* B300 */
  text-decoration: underline;
}

.releases-table .version-name-link:active {
  color: #0747A6;                             /* B500 */
}

/* ── Date Cell — Overdue Styling ── */
.releases-table .date-cell--overdue {
  color: #DE350B;                             /* R400 */
  font-weight: 500;
}

/* ── Section Header Row (Unreleased / Released / Archived) ── */
.releases-section-header {
  font-size: 11px;
  font-weight: 700;
  line-height: 16px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #6B778C;                             /* N200 */
  padding: 24px 0 8px 0;
  border-bottom: 2px solid #DFE1E6;          /* N40 */
  background: #FAFBFC;                        /* N10 */
}

/* ── Drag Handle (visible on row hover) ── */
.drag-handle {
  width: 24px;
  height: 24px;
  cursor: grab;
  color: #A5ADBA;                             /* N80 */
  opacity: 0;
  transition: opacity 100ms ease-out;
}

.releases-table tbody tr:hover .drag-handle {
  opacity: 1;
}

.drag-handle:active {
  cursor: grabbing;
}

/* ── Drag Preview (ghost row) ── */
.drag-preview {
  background: #FFFFFF;
  box-shadow: 0 4px 8px -2px rgba(9, 30, 66, 0.25),
              0 0 1px rgba(9, 30, 66, 0.31);
  border-radius: 3px;
  opacity: 0.9;
  pointer-events: none;
}

/* ── Drop Indicator Line ── */
.drop-indicator {
  height: 2px;
  background: #4C9AFF;                        /* B200 */
  border-radius: 1px;
  position: absolute;
  left: 0;
  right: 0;
}

/* ── Empty Table State ── */
.releases-table-empty {
  text-align: center;
  padding: 48px 24px;
}

.releases-table-empty img {
  width: 160px;
  height: 160px;
  margin-bottom: 16px;
}

.releases-table-empty h3 {
  font-size: 16px;
  font-weight: 500;
  color: #172B4D;                             /* N800 */
  margin-bottom: 8px;
}

.releases-table-empty p {
  font-size: 14px;
  color: #6B778C;                             /* N200 */
  max-width: 460px;
  margin: 0 auto;
}
```

---

### 1.3 Lozenges (Status Badges)

```css
/* ── Base Lozenge ── */
.lozenge {
  display: inline-flex;
  align-items: center;
  max-width: 200px;
  padding: 2px 4px;
  border-radius: 3px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 11px;
  font-weight: 700;
  line-height: 16px;
  letter-spacing: 0;
  text-transform: uppercase;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: top;
}

/* ── Lozenge Variants (Subtle — default in Releases) ── */

/* UNRELEASED — Blue subtle */
.lozenge--unreleased {
  background: #DEEBFF;                        /* B50 */
  color: #0747A6;                             /* B500 */
}

/* RELEASED — Green subtle */
.lozenge--released {
  background: #E3FCEF;                        /* G50 */
  color: #006644;                             /* G500 */
}

/* OVERDUE — Red subtle */
.lozenge--overdue {
  background: #FFEBE6;                        /* R50 */
  color: #BF2600;                             /* R500 */
}

/* ARCHIVED — Grey subtle */
.lozenge--archived {
  background: #DFE1E6;                        /* N40 */
  color: #42526E;                             /* N500 */
}

/* ── Lozenge Variants (Bold — used in Release Detail header) ── */

/* UNRELEASED — Blue bold */
.lozenge-bold--unreleased {
  background: #0052CC;                        /* B400 */
  color: #FFFFFF;                             /* N0 */
}

/* RELEASED — Green bold */
.lozenge-bold--released {
  background: #00875A;                        /* G400 */
  color: #FFFFFF;
}

/* OVERDUE — Red bold */
.lozenge-bold--overdue {
  background: #DE350B;                        /* R400 */
  color: #FFFFFF;
}

/* ── Issue Status Lozenges (inside Release Detail issues tab) ── */

/* To Do — default */
.lozenge--todo {
  background: #DFE1E6;                        /* N40 */
  color: #42526E;                             /* N500 */
}

/* In Progress — blue bold */
.lozenge--inprogress {
  background: #0052CC;                        /* B400 */
  color: #FFFFFF;
}

/* Done — green bold */
.lozenge--done {
  background: #00875A;                        /* G400 */
  color: #FFFFFF;
}
```

---

### 1.4 Progress Bar

```css
/* ── Progress Bar Container ── */
.release-progress-bar {
  display: flex;
  width: 100%;
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
  background: #DFE1E6;                        /* N40 — empty track color */
  cursor: pointer;
}

/* ── Segments (rendered as inline-flex children) ── */
.release-progress-bar__segment {
  height: 100%;
  min-width: 0;
  transition: width 300ms cubic-bezier(0.25, 0.1, 0.25, 1);
}

/* Done segment — green */
.release-progress-bar__segment--done {
  background: #00875A;                        /* G400 */
}

/* In Progress segment — blue */
.release-progress-bar__segment--inprogress {
  background: #0052CC;                        /* B400 */
}

/* To Do segment — grey (track background covers this) */
.release-progress-bar__segment--todo {
  background: #DFE1E6;                        /* N40 */
}

/* ── Segment border separators ── */
.release-progress-bar__segment + .release-progress-bar__segment {
  border-left: 1px solid #FFFFFF;
}

/* ── Tooltip on hover (shows counts) ── */
/* Tooltip text format: "Done: 12 of 30 issues (40%)" */
.release-progress-tooltip {
  font-size: 12px;
  line-height: 16px;
  padding: 4px 8px;
  background: #172B4D;                        /* N800 */
  color: #FFFFFF;
  border-radius: 3px;
  box-shadow: 0 4px 8px -2px rgba(9, 30, 66, 0.25);
  white-space: nowrap;
  pointer-events: none;
}

/* ── Progress Label (right of bar) ── */
.release-progress-label {
  font-size: 12px;
  font-weight: 400;
  line-height: 16px;
  color: #6B778C;                             /* N200 */
  margin-left: 8px;
  white-space: nowrap;
}

/* ── Large Progress Bar (Release Detail page header) ── */
.release-progress-bar--large {
  height: 12px;
  border-radius: 6px;
  margin-bottom: 8px;
}

/* ── Segmented Legend (below bar on detail page) ── */
.release-progress-legend {
  display: flex;
  gap: 16px;
  margin-top: 8px;
}

.release-progress-legend__item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #6B778C;                             /* N200 */
}

.release-progress-legend__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.release-progress-legend__dot--done       { background: #00875A; }
.release-progress-legend__dot--inprogress { background: #0052CC; }
.release-progress-legend__dot--todo       { background: #DFE1E6; }
```

**Progress Bar Calculation Logic:**

```typescript
interface ProgressData {
  done: number;
  inProgress: number;
  toDo: number;
}

function computeSegmentWidths(data: ProgressData): { done: string; inProgress: string; toDo: string } {
  const total = data.done + data.inProgress + data.toDo;
  if (total === 0) {
    return { done: '0%', inProgress: '0%', toDo: '100%' };
  }
  const doneW = Math.round((data.done / total) * 100);
  const inProgressW = Math.round((data.inProgress / total) * 100);
  const toDoW = 100 - doneW - inProgressW;  // remainder to avoid rounding gaps
  return {
    done: `${doneW}%`,
    inProgress: `${inProgressW}%`,
    toDo: `${toDoW}%`,
  };
}
```

---

### 1.5 Date Picker

```css
/* ── Date Picker Trigger (inline in form) ── */
.datepicker-trigger {
  display: flex;
  align-items: center;
  height: 40px;
  padding: 8px 6px;
  background: #FAFBFC;                        /* N10 */
  border: 2px solid #DFE1E6;                  /* N40 */
  border-radius: 3px;
  font-size: 14px;
  color: #172B4D;                             /* N800 */
  cursor: pointer;
  transition: background-color 100ms ease-out,
              border-color 100ms ease-out;
}

.datepicker-trigger:hover {
  background: #EBECF0;                        /* N30 */
}

.datepicker-trigger:focus,
.datepicker-trigger--open {
  border-color: #4C9AFF;                      /* B200 */
  background: #FFFFFF;
  outline: none;
  box-shadow: none;                           /* Jira uses border, not ring */
}

.datepicker-trigger--invalid {
  border-color: #DE350B;                      /* R400 */
}

.datepicker-trigger__icon {
  width: 20px;
  height: 20px;
  color: #6B778C;                             /* N200 */
  margin-right: 4px;
  flex-shrink: 0;
}

.datepicker-trigger__placeholder {
  color: #7A869A;                             /* N100 */
}

.datepicker-trigger__clear {
  margin-left: auto;
  width: 16px;
  height: 16px;
  color: #6B778C;
  cursor: pointer;
  opacity: 0;
  transition: opacity 80ms;
}

.datepicker-trigger:hover .datepicker-trigger__clear {
  opacity: 1;
}

/* ── Date Picker Calendar Popup ── */
.datepicker-popup {
  position: absolute;
  z-index: 600;
  width: 280px;
  background: #FFFFFF;
  border-radius: 3px;
  box-shadow: 0 4px 8px -2px rgba(9, 30, 66, 0.25),
              0 0 1px rgba(9, 30, 66, 0.31);
  padding: 16px;
  animation: fadeIn 120ms ease-in;
}

/* ── Calendar Navigation ── */
.datepicker-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.datepicker-nav__month-label {
  font-size: 14px;
  font-weight: 600;
  color: #172B4D;
}

.datepicker-nav__arrow {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 50%;
  cursor: pointer;
  color: #6B778C;
}

.datepicker-nav__arrow:hover {
  background: #EBECF0;
  color: #172B4D;
}

/* ── Day Grid ── */
.datepicker-weekday-header {
  font-size: 11px;
  font-weight: 600;
  color: #6B778C;
  text-align: center;
  padding: 4px 0;
  text-transform: uppercase;
}

.datepicker-day {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #172B4D;
  border-radius: 50%;
  cursor: pointer;
  border: none;
  background: transparent;
}

.datepicker-day:hover {
  background: #EBECF0;                        /* N30 */
}

.datepicker-day--selected {
  background: #0052CC;                        /* B400 */
  color: #FFFFFF;
}

.datepicker-day--selected:hover {
  background: #0065FF;                        /* B300 */
}

.datepicker-day--today {
  font-weight: 700;
  color: #0052CC;                             /* B400 */
}

.datepicker-day--today.datepicker-day--selected {
  color: #FFFFFF;
}

.datepicker-day--disabled {
  color: #C1C7D0;                             /* N60 */
  cursor: not-allowed;
}

.datepicker-day--outside-month {
  color: #C1C7D0;                             /* N60 */
}
```

---

## 2. FIELD VALIDATION RULES

### 2.1 Version Name

| Rule | Constraint | Error Message (Exact Copy) |
|---|---|---|
| Required | Cannot be empty/whitespace only | `"You must specify a version name"` |
| Max length | 255 characters | `"The version name must not exceed 255 characters"` |
| Uniqueness | Unique within the project (case-sensitive) | `"A version with this name already exists in this project."` |
| Trimming | Leading/trailing whitespace trimmed before save | (No error — auto-trimmed) |
| Allowed characters | Any Unicode characters including `/`, `.`, `-`, spaces | (No error — all allowed) |
| Forbidden | Only the empty string after trimming | `"You must specify a version name"` |

**Validation Trigger Timing:**
- Name field validates on **blur** (not on each keystroke)
- Uniqueness check: **async API call** on blur — `GET /rest/api/3/project/{projectIdOrKey}/versions` then client-side filter
- Submit button validates **all fields** again before POST

```typescript
// Catalyst Implementation
interface VersionNameValidation {
  validate(name: string, existingNames: string[]): ValidationResult;
}

interface ValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

function validateVersionName(
  rawName: string,
  existingNames: string[],
  currentVersionId?: string  // for edit — exclude self from uniqueness check
): ValidationResult {
  const name = rawName.trim();

  if (name.length === 0) {
    return { isValid: false, errorMessage: 'You must specify a version name' };
  }

  if (name.length > 255) {
    return { isValid: false, errorMessage: 'The version name must not exceed 255 characters' };
  }

  const isDuplicate = existingNames.some(
    existing => existing === name  // case-sensitive comparison
  );

  if (isDuplicate) {
    return {
      isValid: false,
      errorMessage: 'A version with this name already exists in this project.',
    };
  }

  return { isValid: true };
}
```

### 2.2 Start Date

| Rule | Constraint | Error Message |
|---|---|---|
| Optional | Field can be left blank | — |
| Format | ISO 8601 date (`YYYY-MM-DD`), display in user locale | `"The date you entered is not valid."` |
| Before release date | If release date is set, start ≤ release | `"The start date must be before the release date."` |
| Manual input | Typing accepts `DD/MMM/YY` and auto-parses | `"The date you entered is not valid."` |
| Past dates | Allowed — no restriction on past start dates | — |
| Far future | No max date boundary enforced | — |

### 2.3 Release Date

| Rule | Constraint | Error Message |
|---|---|---|
| Optional | Field can be left blank | — |
| Format | ISO 8601 date (`YYYY-MM-DD`) | `"The date you entered is not valid."` |
| After start date | If start date is set, release ≥ start | `"The release date must be after the start date."` |
| Overdue calculation | If release date < today AND version is unreleased → mark as overdue | (Visual indicator, no error) |
| Past dates | Allowed — user can set past release date | — |

### 2.4 Description

| Rule | Constraint | Error Message |
|---|---|---|
| Optional | Field can be left blank | — |
| Max length | No enforced limit in Jira (stored as text) | — |
| Format | Plain text only — no markdown/rich text | — |
| Display | Truncated to single line in table with ellipsis | — |

### 2.5 Cross-Field Validation Matrix

```typescript
function validateVersionForm(form: VersionFormData, existingVersions: Version[]): FormErrors {
  const errors: FormErrors = {};

  // Name
  const nameResult = validateVersionName(
    form.name,
    existingVersions
      .filter(v => v.id !== form.editingVersionId)
      .map(v => v.name)
  );
  if (!nameResult.isValid) errors.name = nameResult.errorMessage;

  // Date cross-validation
  if (form.startDate && form.releaseDate) {
    const start = new Date(form.startDate);
    const release = new Date(form.releaseDate);
    if (start > release) {
      errors.startDate = 'The start date must be before the release date.';
    }
  }

  // Date format validation
  if (form.startDate && !isValidISODate(form.startDate)) {
    errors.startDate = 'The date you entered is not valid.';
  }
  if (form.releaseDate && !isValidISODate(form.releaseDate)) {
    errors.releaseDate = 'The date you entered is not valid.';
  }

  return errors;
}

function isValidISODate(dateStr: string): boolean {
  const d = new Date(dateStr);
  return !isNaN(d.getTime()) && /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}
```

### 2.6 Release Action Validation

| Action | Pre-condition | Error / Warning |
|---|---|---|
| Release | Version must be `unreleased` | Button hidden if already released |
| Release with unresolved issues | Issues exist with status ≠ Done | Modal shows: `"This version has {n} unresolved issue(s). You can move them to another version or ignore them."` |
| Unrelease | Version must be `released` | Button hidden if unreleased |
| Delete with issues | Issues have this as fixVersion | Modal shows: `"There are {n} issue(s) with this fix version. Choose what to do with them:"` with radio options |
| Merge | Requires ≥ 2 versions in project | Menu item disabled if only 1 version |
| Archive | Must be released | `"Only released versions can be archived."` |

### 2.7 Delete Version — Issue Reassignment Validation

```typescript
interface DeleteVersionOptions {
  moveFixIssuesToVersionId: string | null;      // null = "Remove fix version"
  moveAffectedIssuesToVersionId: string | null;  // null = "Remove affected version"
}

// Radio button options presented in delete modal:
// Option 1: "Move issues to version: [dropdown]"
// Option 2: "Remove fix version from all issues"
// Dropdown excludes: the version being deleted + archived versions
```
