/**
 * Enum bridges — TestHub (P1-S5 / D-PIN-6). One canonical mapping per
 * entity between the DB enum vocabulary and the UI label vocabulary.
 * Raw status string literals are banned outside this file — every
 * consumer imports from here so the two vocabularies can never drift
 * out of sync again (VER-008 / PLN-008: the old cycle-status code had
 * 'draft'/'planned' and 'active'/'in_progress' as silent duplicate
 * synonyms because two different files each hand-rolled their own map).
 */

/** DB enum (tm_cycle_status) — collapsed 7→4 in P1-S5, matches the FSM trigger exactly. */
export type DbCycleStatus = 'planned' | 'active' | 'completed' | 'archived';

/** UI-facing cycle status label. */
export type CycleStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

const CYCLE_DB_TO_UI: Record<DbCycleStatus, CycleStatus> = {
  planned: 'PLANNED',
  active: 'IN_PROGRESS',
  completed: 'COMPLETED',
  archived: 'CANCELLED',
};

const CYCLE_UI_TO_DB: Record<CycleStatus, DbCycleStatus> = {
  PLANNED: 'planned',
  IN_PROGRESS: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'archived',
};

export function cycleStatusFromDb(status: string | null): CycleStatus {
  if (status && status in CYCLE_DB_TO_UI) return CYCLE_DB_TO_UI[status as DbCycleStatus];
  return 'PLANNED';
}

export function cycleStatusToDb(status: CycleStatus): DbCycleStatus {
  return CYCLE_UI_TO_DB[status] ?? 'planned';
}
