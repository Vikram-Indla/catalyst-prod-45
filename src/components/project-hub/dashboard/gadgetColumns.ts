/**
 * Per-gadget column registry — defines all available columns and their defaults.
 *
 * Each table-based gadget has a column registry entry. Non-table gadgets
 * (Items by Status, Scope Change, etc.) return null — column management
 * is not applicable to chart/KPI widgets.
 */
import type { GadgetType } from '@/hooks/useGadgetSettings';

export interface GadgetColumnDef {
  id: string;
  label: string;
  defaultVisible: boolean;
}

const QA_COLUMNS: GadgetColumnDef[] = [
  { id: 'priority', label: 'Priority', defaultVisible: true },
  { id: 'key', label: 'Key', defaultVisible: true },
  { id: 'title', label: 'Title', defaultVisible: true },
  { id: 'status', label: 'Status', defaultVisible: true },
  { id: 'assignee', label: 'Assignee', defaultVisible: true },
  { id: 'age', label: 'Age', defaultVisible: true },
  { id: 'reporter', label: 'Reporter', defaultVisible: false },
  { id: 'created', label: 'Created', defaultVisible: false },
  { id: 'updated', label: 'Updated', defaultVisible: false },
  { id: 'fixVersion', label: 'Fix version', defaultVisible: false },
  { id: 'labels', label: 'Labels', defaultVisible: false },
  { id: 'resolution', label: 'Resolution', defaultVisible: false },
];

const INCIDENT_COLUMNS: GadgetColumnDef[] = [
  { id: 'priority', label: 'Priority', defaultVisible: true },
  { id: 'key', label: 'Key', defaultVisible: true },
  { id: 'title', label: 'Title', defaultVisible: true },
  { id: 'status', label: 'Status', defaultVisible: true },
  { id: 'assignee', label: 'Assignee', defaultVisible: true },
  { id: 'started', label: 'Started', defaultVisible: true },
  { id: 'reporter', label: 'Reporter', defaultVisible: false },
  { id: 'severity', label: 'Severity', defaultVisible: false },
  { id: 'created', label: 'Created', defaultVisible: false },
  { id: 'updated', label: 'Updated', defaultVisible: false },
  { id: 'fixVersion', label: 'Fix version', defaultVisible: false },
  { id: 'resolution', label: 'Resolution', defaultVisible: false },
];

const DEMAND_COLUMNS: GadgetColumnDef[] = [
  { id: 'key', label: 'Key', defaultVisible: true },
  { id: 'summary', label: 'Summary', defaultVisible: true },
  { id: 'progress', label: 'Progress', defaultVisible: true },
  { id: 'target', label: 'Target', defaultVisible: true },
  { id: 'assignee', label: 'Assignee', defaultVisible: true },
  { id: 'status', label: 'Status', defaultVisible: false },
  { id: 'priority', label: 'Priority', defaultVisible: false },
];

const COLUMN_REGISTRY: Partial<Record<GadgetType, GadgetColumnDef[]>> = {
  qa: QA_COLUMNS,
  incidents: INCIDENT_COLUMNS,
  demand: DEMAND_COLUMNS,
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
