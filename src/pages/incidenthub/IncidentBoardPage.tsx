/**
 * IncidentBoardPage — /incident-hub/board
 *
 * 2026-06-16: mounts the canonical KanbanPage with mode='incident'.
 * Same UI shell as /project-hub/:key/boards/:boardId and
 * /product-hub/:key/boards/:boardId — per CLAUDE.md "ADOPT CANONICAL
 * COMPONENTS — DO NOT REIMPLEMENT".
 *
 * Internally:
 *   - columns: Production Incident workflow statuses (useTypeWorkflow('BAU','Production Incident'))
 *   - cards:   ph_issues filtered by issue_type='Production Incident' (all projects)
 *   - mutations: no-op (incidents are Jira-sourced, read-only — every
 *                write rejects with the canonical "use Jira" error)
 */
import KanbanPage from '../../features/kanban-board/KanbanPage';

export default function IncidentBoardPage() {
  /* keyOverride='INCIDENTS' is a sentinel — useKanbanData ignores the key
     in incident mode (queries ph_issues by issue_type instead), but
     several KanbanPage internals reference key.toUpperCase() for inline
     create / standup setup, so we pass a stable string to avoid crashes. */
  return <KanbanPage mode="incident" keyOverride="INCIDENTS" />;
}
