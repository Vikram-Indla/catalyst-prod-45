/**
 * ProductNativeBoardPage — /product-hub/:key/boards/:boardId
 *
 * 2026-06-15: switched from the OLD project-hub KanbanBoardPage to the NEW
 * features/kanban-board KanbanPage with mode='product'. The NEW surface has
 * smart-positioned dropdowns, the canonical InlineCreateCard, board-health
 * portal, the full ⋯ menu, and standup support — all driven from the same
 * data shape via the useKanbanData / useKanbanMutations mode switch.
 *
 * Data adapter:
 *   - cards from business_requests (filtered by product_id)
 *   - columns from Business Request workflow statuses (process_step)
 *   - mutations write business_requests / business_request_relations
 *
 * The OLD KanbanBoardPage is deliberately not removed — Vikram wants to test
 * the new one before retiring the legacy product branch.
 */
import KanbanPage from '../../features/kanban-board/KanbanPage';

export default function ProductNativeBoardPage() {
  return <KanbanPage mode="product" />;
}
