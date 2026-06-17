/**
 * TasksBoardCanonical — Tasks Hub board mounted on the canonical KanbanPage.
 *
 * 2026-06-17: replaces the PragmaticBoard-based TasksBoardView with the
 * same component project / product / incident hubs use. Per CLAUDE.md
 * "ADOPT CANONICAL COMPONENTS — DO NOT REIMPLEMENT".
 *
 * Internally:
 *   - columns: task_statuses rows (id, name, slug)
 *   - cards:   `tasks` rows (cross-workstream, deleted_at IS NULL)
 *   - mutations: writes to `tasks` table; flag/parent/link are no-ops
 *     (no schema for them on tasks today)
 */
import KanbanPage from '../../../features/kanban-board/KanbanPage';

export default function TasksBoardCanonical() {
  /* keyOverride='TASKS' is a sentinel — useKanbanData ignores the key in
     tasks mode (queries tasks table directly), but several KanbanPage
     internals reference key.toUpperCase() for inline create / standup
     setup, so we pass a stable string to avoid crashes. */
  return <KanbanPage mode="tasks" keyOverride="TASKS" />;
}
