/**
 * Per-gadget column registry — defines all available columns and their defaults.
 *
 * Each table-based gadget has a column registry entry. Non-table gadgets
 * (Items by Status, Scope Change, etc.) return null — column management
 * is not applicable to chart/KPI widgets.
 *
 * `defaultWidth` / `minWidth` are consumed by widgets via getWidthsForGadget()
 * and passed straight to ResizableDynamicTable. Keeping widths here means a
 * new column always ships with sane sizing — no risk of the widget rendering
 * an unmeasured column with auto-fit chrome that mismatches sibling columns.
 */
import type { GadgetType } from '@/hooks/useGadgetSettings';

export interface GadgetColumnDef {
  id: string;
  label: string;
  defaultVisible: boolean;
  defaultWidth: number;
  minWidth: number;
}

const QA_COLUMNS: GadgetColumnDef[] = [
  { id: 'priority',   label: 'Priority',    defaultVisible: true,  defaultWidth: 64,  minWidth: 48  },
  { id: 'key',        label: 'Key',         defaultVisible: true,  defaultWidth: 170, minWidth: 120 },
  { id: 'title',      label: 'Title',       defaultVisible: true,  defaultWidth: 700, minWidth: 240 },
  { id: 'status',     label: 'Status',      defaultVisible: true,  defaultWidth: 140, minWidth: 100 },
  { id: 'assignee',   label: 'Assignee',    defaultVisible: true,  defaultWidth: 180, minWidth: 110 },
  { id: 'age',        label: 'Age',         defaultVisible: true,  defaultWidth: 120, minWidth: 80  },
  { id: 'reporter',   label: 'Reporter',    defaultVisible: false, defaultWidth: 180, minWidth: 110 },
  { id: 'created',    label: 'Created',     defaultVisible: false, defaultWidth: 130, minWidth: 96  },
  { id: 'updated',    label: 'Updated',     defaultVisible: false, defaultWidth: 130, minWidth: 96  },
  { id: 'fixVersion', label: 'Fix version', defaultVisible: false, defaultWidth: 160, minWidth: 100 },
  { id: 'labels',     label: 'Labels',      defaultVisible: false, defaultWidth: 200, minWidth: 120 },
  { id: 'resolution', label: 'Resolution',  defaultVisible: false, defaultWidth: 140, minWidth: 96  },
];

const INCIDENT_COLUMNS: GadgetColumnDef[] = [
  { id: 'priority',   label: 'Priority',    defaultVisible: true,  defaultWidth: 64,  minWidth: 48  },
  { id: 'key',        label: 'Key',         defaultVisible: true,  defaultWidth: 170, minWidth: 120 },
  { id: 'title',      label: 'Title',       defaultVisible: true,  defaultWidth: 700, minWidth: 240 },
  { id: 'status',     label: 'Status',      defaultVisible: true,  defaultWidth: 140, minWidth: 100 },
  { id: 'assignee',   label: 'Assignee',    defaultVisible: true,  defaultWidth: 180, minWidth: 110 },
  { id: 'started',    label: 'Started',     defaultVisible: true,  defaultWidth: 120, minWidth: 80  },
  { id: 'reporter',   label: 'Reporter',    defaultVisible: false, defaultWidth: 180, minWidth: 110 },
  { id: 'severity',   label: 'Severity',    defaultVisible: false, defaultWidth: 120, minWidth: 80  },
  { id: 'created',    label: 'Created',     defaultVisible: false, defaultWidth: 130, minWidth: 96  },
  { id: 'updated',    label: 'Updated',     defaultVisible: false, defaultWidth: 130, minWidth: 96  },
  { id: 'fixVersion', label: 'Fix version', defaultVisible: false, defaultWidth: 160, minWidth: 100 },
  { id: 'resolution', label: 'Resolution',  defaultVisible: false, defaultWidth: 140, minWidth: 96  },
];

const DEMAND_COLUMNS: GadgetColumnDef[] = [
  { id: 'key',      label: 'Key',      defaultVisible: true,  defaultWidth: 170, minWidth: 120 },
  { id: 'summary',  label: 'Summary',  defaultVisible: true,  defaultWidth: 700, minWidth: 240 },
  { id: 'progress', label: 'Progress', defaultVisible: true,  defaultWidth: 160, minWidth: 100 },
  { id: 'target',   label: 'Target',   defaultVisible: true,  defaultWidth: 120, minWidth: 80  },
  { id: 'assignee', label: 'Assignee', defaultVisible: true,  defaultWidth: 180, minWidth: 110 },
  { id: 'status',   label: 'Status',   defaultVisible: false, defaultWidth: 140, minWidth: 100 },
  { id: 'priority', label: 'Priority', defaultVisible: false, defaultWidth: 64,  minWidth: 48  },
];

/**
 * Overdue + OnHold widgets use bespoke row layouts (OverdueRow / OnHoldRow),
 * not ResizableDynamicTable. defaultWidth/minWidth on these entries are
 * informational only — the row component does not consume them. The picker
 * still drives which optional fields render on each row.
 */
const OVERDUE_COLUMNS: GadgetColumnDef[] = [
  { id: 'type',     label: 'Type',         defaultVisible: true,  defaultWidth: 0, minWidth: 0 },
  { id: 'key',      label: 'Key',          defaultVisible: true,  defaultWidth: 0, minWidth: 0 },
  { id: 'summary',  label: 'Summary',      defaultVisible: true,  defaultWidth: 0, minWidth: 0 },
  { id: 'assignee', label: 'Assignee',     defaultVisible: true,  defaultWidth: 0, minWidth: 0 },
  { id: 'days',     label: 'Days overdue', defaultVisible: true,  defaultWidth: 0, minWidth: 0 },
  { id: 'dueDate',  label: 'Due date',     defaultVisible: false, defaultWidth: 0, minWidth: 0 },
];

const ONHOLD_COLUMNS: GadgetColumnDef[] = [
  { id: 'type',     label: 'Type',     defaultVisible: true,  defaultWidth: 0, minWidth: 0 },
  { id: 'key',      label: 'Key',      defaultVisible: true,  defaultWidth: 0, minWidth: 0 },
  { id: 'summary',  label: 'Summary',  defaultVisible: true,  defaultWidth: 0, minWidth: 0 },
  { id: 'assignee', label: 'Assignee', defaultVisible: true,  defaultWidth: 0, minWidth: 0 },
  { id: 'reason',   label: 'Reason',   defaultVisible: true,  defaultWidth: 0, minWidth: 0 },
];

const COLUMN_REGISTRY: Partial<Record<GadgetType, GadgetColumnDef[]>> = {
  qa: QA_COLUMNS,
  incidents: INCIDENT_COLUMNS,
  demand: DEMAND_COLUMNS,
  overdue: OVERDUE_COLUMNS,
  onhold: ONHOLD_COLUMNS,
};

export function getColumnsForGadget(gadgetType: GadgetType): GadgetColumnDef[] | null {
  return COLUMN_REGISTRY[gadgetType] ?? null;
}

export function getDefaultColumns(gadgetType: GadgetType): string[] {
  const defs = COLUMN_REGISTRY[gadgetType];
  if (!defs) return [];
  return defs.filter((c) => c.defaultVisible).map((c) => c.id);
}

export function resolveColumns(gadgetType: GadgetType, savedColumns: string[] | null): string[] {
  const defs = COLUMN_REGISTRY[gadgetType];
  if (!defs) return [];
  if (!savedColumns) return getDefaultColumns(gadgetType);
  return savedColumns.filter((id) => defs.some((d) => d.id === id));
}

/** All column ids for a gadget — used by solo mode to show the full set. */
export function getAllColumnIds(gadgetType: GadgetType): string[] {
  const defs = COLUMN_REGISTRY[gadgetType];
  if (!defs) return [];
  return defs.map((d) => d.id);
}

/**
 * Build {defaultWidths, minWidths} maps for ResizableDynamicTable from the
 * gadget's registry. Includes every column (visible + hidden) so toggling a
 * column on never produces an unmeasured column.
 */
export function getWidthsForGadget(
  gadgetType: GadgetType,
): { defaultWidths: Record<string, number>; minWidths: Record<string, number> } {
  const defs = COLUMN_REGISTRY[gadgetType];
  if (!defs) return { defaultWidths: {}, minWidths: {} };
  const defaultWidths: Record<string, number> = {};
  const minWidths: Record<string, number> = {};
  for (const d of defs) {
    defaultWidths[d.id] = d.defaultWidth;
    minWidths[d.id] = d.minWidth;
  }
  return { defaultWidths, minWidths };
}
