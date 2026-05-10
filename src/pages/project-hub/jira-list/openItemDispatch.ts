/**
 * openItemDispatch — routing helper for ProjectAllWorkView's onOpenItem.
 *
 * jira-compare 2026-05-10 — N1 (P0) fix: the parent crumb of a Defect (and
 * any other detail whose parent is an Epic/Feature/Task) silently no-oped
 * because the AllWork items list excludes those types (CLAUDE.md
 * 2026-04-28). selectItem(parentEpicKey) → activeItem stays undefined →
 * panel doesn't swap.
 *
 * Dispatch: if the target is in `items`, stay in the in-place panel
 * (preserves subtask-click UX); otherwise fall through to the overlay
 * router, which resolves the issue type from ph_issues itself.
 */
export function makeOpenItemHandler(
  items: ReadonlyArray<{ id: string }>,
  selectItem: (id: string) => void,
  setOverlayItemId: (id: string) => void,
): (id: string) => void {
  return (id: string) => {
    if (items.some((i) => i.id === id)) selectItem(id);
    else setOverlayItemId(id);
  };
}
