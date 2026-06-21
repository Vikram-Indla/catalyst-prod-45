/**
 * TestHub BoardPage — /testhub/board
 *
 * 2026-06-21: mounts the canonical KanbanPage with mode='test'. Same UI
 * shell as project / product / incident / tasks / release boards — per
 * CLAUDE.md "ADOPT CANONICAL COMPONENTS — DO NOT REIMPLEMENT".
 *
 * Internally:
 *   - columns: TEST_BOARD_COLUMNS (DRAFT / IN REVIEW / APPROVED / DEPRECATED)
 *   - cards:   tm_test_cases scoped to first active TM project
 *   - mutations: tm_test_cases status / title / assignee / create / delete
 *   - card click → /testhub/repository?case=<id> (CaseDrawer)
 */
import KanbanPage from '../../features/kanban-board/KanbanPage';

export default function BoardPage() {
  return <KanbanPage mode="test" keyOverride="TESTHUB" />;
}
