/**
 * ProductNativeBoardPage — /product-hub/:key/boards
 *
 * Thin wrapper: delegates entirely to KanbanBoardPage with mode="product".
 * Data layer differences (business_requests, process_step, etc.) are handled
 * inside KanbanBoardPage via the isProduct branch.
 */
import KanbanBoardPage from '../project-hub/KanbanBoardPage';

export default function ProductNativeBoardPage() {
  return <KanbanBoardPage mode="product" />;
}
