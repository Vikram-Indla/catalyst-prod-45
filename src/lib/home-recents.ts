/**
 * Home sidebar "Recent" per-space display fold.
 *
 * The recent-history store keeps up to 16 visited locations (RECENT_LIMIT).
 * A hot space (e.g. a product the user is living in) can contribute many of
 * those rows, flooding the rail and killing scannability. This helper folds
 * each space group down to a fixed visible count, reporting how many rows are
 * hidden so the UI can offer a "+N more" / "Show less" toggle.
 *
 * Nothing is dropped from history — this is a display cap only.
 */

/** Max recent rows shown per space group before the "+N more" fold. */
export const MAX_VISIBLE_PER_GROUP = 3;

export interface SlicedGroup<T> {
  visible: T[];
  hiddenCount: number;
}

/**
 * Fold a single space group's rows to the visible cap.
 * @param items   the group's rows, newest-first
 * @param showAll when true the group is unfolded — every row visible, 0 hidden
 */
export function sliceVisible<T>(items: T[], showAll: boolean): SlicedGroup<T> {
  if (showAll || items.length <= MAX_VISIBLE_PER_GROUP) {
    return { visible: items, hiddenCount: 0 };
  }
  return {
    visible: items.slice(0, MAX_VISIBLE_PER_GROUP),
    hiddenCount: items.length - MAX_VISIBLE_PER_GROUP,
  };
}
