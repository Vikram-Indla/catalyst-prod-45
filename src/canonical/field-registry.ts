/**
 * Canonical Field Registry
 *
 * Single source of truth for field identifiers used across all hub surfaces:
 * ProjectHub (Backlog, Kanban, AllWork), ReleaseHub, TestHub, IncidentHub, etc.
 *
 * ── HOW TO USE ──
 *
 * 1. Every cell renderer factory exported from JiraTable/cells.tsx and
 *    JiraTable/editors.tsx is bound to one FIELD_ID constant here.
 *
 * 2. When building a new hub table, reference FIELD_ID constants in column
 *    schema `id` fields — not bare strings — so fields are addressable and
 *    diffable across surfaces:
 *
 *      const columns: Column<MyRow>[] = [
 *        { id: FIELD_ID.KEY,      label: 'Key',    cell: makeKeyCell(...) },
 *        { id: FIELD_ID.ASSIGNEE, label: 'Assignee', cell: makeAssigneeCell(...) },
 *      ];
 *
 * 3. Column visibility state, URL persistence, and analytics all key off
 *    these IDs — using the same constant across hubs means preferences,
 *    column order, and event names are automatically consistent.
 *
 * ── FIELD RENDER MODES ──
 *
 * Each canonical field supports three render modes. The factory functions in
 * cells.tsx/editors.tsx are the "table-cell" mode. Card surfaces (Kanban,
 * AllWork card list) should use the same underlying data shape but lay out
 * differently — use FieldRenderMode to communicate intent:
 *
 *   'table-cell'   — Full-width TD cell in a JiraTable row
 *   'card-badge'   — Compact badge on a Kanban card (avatar, priority bars)
 *   'card-inline'  — Inline label+value in an AllWork card row
 *
 * ── ATLASKIT COMPLIANCE ──
 *
 * All canonical fields MUST:
 *   1. Use @atlaskit/tokens token() for every color/spacing value.
 *   2. Use @atlaskit/* component primitives (Avatar, Icon, Lozenge) — no Lucide.
 *   3. Never hardcode hex values. Exception: Jira-parity overrides that are
 *      DOM-probed and annotated with a dated measurement comment.
 *   4. Annotate non-compliant bypasses with: // ADS-ISSUE: <reason> — <date>
 *
 * ── CHANGE PROPAGATION GATE ──
 *
 * When a field changes structurally (new sub-element, new interactive state,
 * new prop), the change MUST be:
 *   1. Reflected in the canonical cells.tsx/editors.tsx factory.
 *   2. Grepped across all render sites: grep -r "FIELD_ID.<NAME>" src/
 *   3. Validated via jira-compare on the affected hub before merge.
 *
 * Layout-only or token-only changes can be made directly to the factory.
 * Structural changes (new prop, new interactive behavior) require the above gate.
 */

// ─── Field IDs ───────────────────────────────────────────────────────────────

/**
 * Stable string identifiers for every canonical work-item field.
 *
 * Structural column IDs use the `__` prefix convention (see JiraTable):
 *   __checkbox, __caret, __actions — these are layout primitives, not fields.
 *
 * Data field IDs use the `f:` prefix to distinguish them from column structure
 * and prevent collisions with ad-hoc string keys in older code.
 */
export const FIELD_ID = {
  // ── Identity ──
  KEY:       'f:key',
  SUMMARY:   'f:summary',
  TYPE:      'f:type',

  // ── Workflow ──
  STATUS:    'f:status',
  PRIORITY:  'f:priority',

  // ── People ──
  ASSIGNEE:  'f:assignee',
  REPORTER:  'f:reporter',
  WATCHERS:  'f:watchers',

  // ── Relationships ──
  PARENT:    'f:parent',
  LABELS:    'f:labels',
  EPIC_LINK: 'f:epic_link',

  // ── Dates ──
  CREATED:   'f:created',
  UPDATED:   'f:updated',
  DUE_DATE:  'f:due_date',

  // ── Meta ──
  COMMENTS:  'f:comments',

  // ── Structural (layout primitives, not data fields) ──
  __CHECKBOX: '__checkbox',
  __CARET:    '__caret',
  __DRAG:     '__drag',
  __ACTIONS:  '__actions',
} as const;

export type FieldId = typeof FIELD_ID[keyof typeof FIELD_ID];

// ─── Field Render Modes ────────────────────────────────────────────────────

/**
 * A field's render mode determines layout, density, and which sub-elements
 * are shown. The data shape and edit behavior are identical across modes.
 */
export type FieldRenderMode =
  | 'table-cell'   // Full JiraTable TD — label+value, inline edit, hover actions
  | 'card-badge'   // Kanban card chip — icon+value only, compact
  | 'card-inline'; // AllWork list card — label: value in a flex row

// ─── ADS Compliance Tiers ──────────────────────────────────────────────────

/**
 * Compliance tier for each field's current implementation.
 * Used as metadata in field manifests and audit tooling.
 *
 *   'compliant'   — 100% @atlaskit/tokens + @atlaskit/* primitives
 *   'bypass'      — Has a dated Jira-parity DOM-probe override (acceptable)
 *   'non-compliant' — Has undated hardcoded values or Lucide icons (must fix)
 */
export type AdsComplianceTier = 'compliant' | 'bypass' | 'non-compliant';

// ─── Field Manifest ────────────────────────────────────────────────────────

/**
 * Static metadata for one canonical field.
 * Consumed by audit tooling and handoff documentation generators.
 */
export interface FieldManifest {
  id: FieldId;
  /** Human-readable label used in column pickers and documentation. */
  label: string;
  /** Which render modes this field supports. */
  modes: FieldRenderMode[];
  /** Whether the field supports inline editing. */
  editable: boolean;
  /** ADS compliance status of the current implementation. */
  adsCompliance: AdsComplianceTier;
  /** Which hub surfaces currently consume this field. */
  usedBy: HubSurface[];
  /**
   * Cell factory function name in cells.tsx (read mode) and
   * editors.tsx (write mode). Used to grep for render sites.
   */
  cellFactory: string;
  editFactory?: string;
}

export type HubSurface =
  | 'project-backlog'
  | 'project-kanban'
  | 'project-allwork'
  | 'release-hub'
  | 'test-hub'
  | 'incident-hub';

// ─── Field Manifest Registry ───────────────────────────────────────────────

/**
 * Complete registry of all canonical fields.
 * Extend this when adding a new field — never add a field to a hub table
 * without a FIELD_MANIFESTS entry.
 */
export const FIELD_MANIFESTS: Record<string, FieldManifest> = {
  [FIELD_ID.KEY]: {
    id: FIELD_ID.KEY,
    label: 'Key',
    modes: ['table-cell', 'card-badge', 'card-inline'],
    editable: false,
    adsCompliance: 'compliant',
    usedBy: ['project-backlog', 'project-allwork', 'project-kanban'],
    cellFactory: 'makeKeyCell',
    // card-badge: WorkItemCard footer button (tk.textMuted, KANBAN_TOKENS)
    // card-inline: WorkListPanel key span (WorkItemTypeIcon + jiraKey)
  },
  [FIELD_ID.SUMMARY]: {
    id: FIELD_ID.SUMMARY,
    label: 'Summary',
    modes: ['table-cell', 'card-inline'],
    editable: true,
    adsCompliance: 'compliant',
    usedBy: ['project-backlog', 'project-allwork'],
    cellFactory: 'makeSummaryCell',
    editFactory: 'makeSummaryInlineEditCell',
  },
  [FIELD_ID.TYPE]: {
    id: FIELD_ID.TYPE,
    label: 'Type',
    modes: ['table-cell', 'card-badge', 'card-inline'],
    editable: false,
    adsCompliance: 'compliant',
    usedBy: ['project-backlog', 'project-allwork', 'project-kanban'],
    cellFactory: 'makeTypeIconCell',
    // card-badge: WorkItemCard footer JiraIssueTypeIcon (controlled by vf.workType)
    // card-inline: WorkListPanel WorkItemTypeIcon inline with key
  },
  [FIELD_ID.STATUS]: {
    id: FIELD_ID.STATUS,
    label: 'Status',
    modes: ['table-cell', 'card-badge', 'card-inline'],
    editable: true,
    // StatusPill uses DOM-probed Jira hex (not ADS tokens) — intentional bypass.
    // Measurement: 2026-05-07 digital-transformation.atlassian.net
    adsCompliance: 'bypass',
    usedBy: ['project-backlog', 'project-allwork', 'project-kanban'],
    cellFactory: 'makeStatusCell',
    editFactory: 'makeStatusEditCell',
  },
  [FIELD_ID.PRIORITY]: {
    id: FIELD_ID.PRIORITY,
    label: 'Priority',
    modes: ['table-cell', 'card-badge'],
    editable: true,
    adsCompliance: 'compliant',
    usedBy: ['project-backlog', 'project-allwork', 'project-kanban'],
    cellFactory: 'makePriorityCell',
    editFactory: 'makePriorityEditCell',
    // card-badge: WorkItemCard PriorityIcon (bespoke SVG directional chevrons —
    // surface-override: Jira Kanban uses chevrons, not the 4-bar table style)
  },
  [FIELD_ID.ASSIGNEE]: {
    id: FIELD_ID.ASSIGNEE,
    label: 'Assignee',
    modes: ['table-cell', 'card-badge', 'card-inline'],
    editable: true,
    adsCompliance: 'compliant',
    usedBy: ['project-backlog', 'project-allwork', 'project-kanban'],
    cellFactory: 'makeAssigneeCell',
    editFactory: 'makeAssigneeEditCell',
    // card-badge: WorkItemCard KanbanAvatar (avatar-only, no name text, density-aware)
    //   editable via AssigneePickerPopover when onChangeAssignee is wired
    // card-inline: WorkListPanel WorkCardAssigneePicker (avatar-only, interactive)
  },
  [FIELD_ID.PARENT]: {
    id: FIELD_ID.PARENT,
    label: 'Parent',
    modes: ['table-cell'],
    editable: true,
    // Parent chip uses DOM-probed '#B3DF72' bg — intentional Jira-parity bypass.
    // Measurement: 2026-04-26 digital-transformation.atlassian.net
    adsCompliance: 'bypass',
    usedBy: ['project-backlog', 'project-allwork'],
    cellFactory: 'makeParentCell',
    editFactory: 'makeParentEditCell',
  },
  [FIELD_ID.LABELS]: {
    id: FIELD_ID.LABELS,
    label: 'Labels',
    modes: ['table-cell'],
    editable: true,
    adsCompliance: 'compliant',
    usedBy: ['project-backlog'],
    cellFactory: 'makeLabelsCell',
    editFactory: 'makeLabelsEditCell',
  },
  [FIELD_ID.CREATED]: {
    id: FIELD_ID.CREATED,
    label: 'Created',
    modes: ['table-cell'],
    editable: false,
    adsCompliance: 'compliant',
    usedBy: ['project-backlog', 'project-allwork'],
    cellFactory: 'makeDateCell',
  },
  [FIELD_ID.UPDATED]: {
    id: FIELD_ID.UPDATED,
    label: 'Updated',
    modes: ['table-cell'],
    editable: false,
    adsCompliance: 'compliant',
    usedBy: ['project-backlog', 'project-allwork'],
    cellFactory: 'makeDateCell',
  },
  [FIELD_ID.DUE_DATE]: {
    id: FIELD_ID.DUE_DATE,
    label: 'Due Date',
    modes: ['table-cell'],
    editable: true,
    adsCompliance: 'compliant',
    usedBy: ['project-backlog'],
    cellFactory: 'makeDateCell',
    editFactory: 'makeDateEditCell',
  },
  [FIELD_ID.EPIC_LINK]: {
    id: FIELD_ID.EPIC_LINK,
    label: 'Epic / Parent',
    modes: ['card-badge'],
    editable: false,
    adsCompliance: 'compliant',
    usedBy: ['project-kanban'],
    cellFactory: 'makeParentCell',
    // card-badge: WorkItemCard epic chip (tk.epicLozengeBg / tk.epicLozengeText from KANBAN_TOKENS)
    // controlled by vf.epic — shows parentSummary or first label
  },
  [FIELD_ID.COMMENTS]: {
    id: FIELD_ID.COMMENTS,
    label: 'Comments',
    modes: ['table-cell'],
    editable: false,
    adsCompliance: 'compliant',
    usedBy: ['project-backlog', 'project-allwork'],
    cellFactory: 'makeCommentsCell',
  },
};
