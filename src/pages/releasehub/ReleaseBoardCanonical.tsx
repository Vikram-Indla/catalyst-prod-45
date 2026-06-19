/**
 * ReleaseBoardCanonical — /release-hub/release-kanban
 *
 * 2026-06-19: mounts the canonical KanbanPage with mode='release'. Same UI
 * shell as /project-hub/:key/boards, /product-hub/:key/boards/:boardId,
 * /incident-hub/board, /tasks/board — per CLAUDE.md "ADOPT CANONICAL
 * COMPONENTS — DO NOT REIMPLEMENT".
 *
 * Internally:
 *   - columns: RELEASE_BOARD_COLUMNS (9-stage release lifecycle)
 *   - cards:   rh_releases (cancelled rows hidden)
 *   - mutations: rh_releases writes (status guarded by validateReleaseTransition)
 *   - card click → /release-hub/:id detail
 */
import KanbanPage from '../../features/kanban-board/KanbanPage';

export default function ReleaseBoardCanonical() {
  /* keyOverride='RELEASES' is a sentinel — useKanbanData ignores the key
     in release mode (queries rh_releases directly), but several KanbanPage
     internals reference key.toUpperCase() for inline create / standup setup,
     so we pass a stable string to avoid crashes. */
  return <KanbanPage mode="release" keyOverride="RELEASES" />;
}
