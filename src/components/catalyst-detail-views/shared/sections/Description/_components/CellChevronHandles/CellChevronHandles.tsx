/**
 * CellChevronHandles — Notion/Jira-style per-cell chevron button.
 *
 * Behaviour:
 *   - Hover any table cell → a small gray-bordered chevron-down button
 *     appears in that cell's top-right corner (gray border, gray bg,
 *     gray glyph).
 *   - Hover the chevron itself → border + bg + glyph all turn blue.
 *   - Click the chevron → opens CellMenu, anchored to the chevron.
 *
 * Implementation: ONE chevron rendered in the container, positioned
 * absolutely over whichever cell is currently hovered. Tracks the
 * hovered cell via a single mousemove listener on the editor body.
 */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import type { Editor } from '@tiptap/react';
// eslint-disable-next-line no-restricted-imports
import ChevronDownIcon from '@atlaskit/icon/utility/chevron-down';
import { findTableFromDom, cellCoords } from '../TableInteractions/tableHelpers';
import { CellMenu } from '../TableInteractions/CellMenu';

interface Props {
  editor: Editor;
  containerRef: RefObject<HTMLElement | null>;
}

interface HoveredCell {
  tablePos: number;
  table: HTMLTableElement;
  cell: HTMLElement;
  row: number;
  col: number;
  /** Container-space rect of the cell — used to position the chevron. */
  rect: { top: number; left: number; right: number; height: number };
}

interface OpenMenu {
  tablePos: number;
  row: number;
  col: number;
  anchorRect: DOMRect;
}

const CHEVRON_SIZE = 16;
const IDLE_BG = 'var(--ds-background-neutral)';
const IDLE_BORDER = 'var(--ds-border)';
const IDLE_GLYPH = 'var(--ds-text-subtlest)';
const ACTIVE_BG = 'var(--ds-background-information)';
const ACTIVE_BORDER = 'var(--ds-link)';
const ACTIVE_GLYPH = 'var(--ds-link)';

export function CellChevronHandles({ editor, containerRef }: Props) {
  const [hovered, setHovered] = useState<HoveredCell | null>(null);
  const [chevronHover, setChevronHover] = useState(false);
  const [menu, setMenu] = useState<OpenMenu | null>(null);
  /** Live ref to the chevron button so the menu can anchor to it
   *  even after the hovered cell changes. */
  const chevronRef = useRef<HTMLButtonElement | null>(null);

  // Track which cell the cursor is over by listening to mousemove
  // on the editor body. One handler covers every table in the doc.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onMove = (e: MouseEvent) => {
      // Don't update while a menu is open — keep the chevron pinned to
      // the cell that opened it.
      if (menu) return;

      const target = document.elementFromPoint(e.clientX, e.clientY);
      if (!(target instanceof HTMLElement)) {
        setHovered(null);
        return;
      }
      // If the cursor is over the chevron button itself (it sits
      // ABOVE the cell DOM in z-order so elementFromPoint hits it),
      // keep the current hover state — otherwise the chevron would
      // unmount → cursor returns to cell → remount → unmount …
      // blinking on every mousemove tick.
      if (
        chevronRef.current &&
        (target === chevronRef.current || chevronRef.current.contains(target))
      ) {
        return;
      }
      // Walk up to find a <td> or <th>.
      let el: HTMLElement | null = target;
      while (el && el !== container) {
        if (el.tagName === 'TD' || el.tagName === 'TH') break;
        el = el.parentElement;
      }
      if (!el || (el.tagName !== 'TD' && el.tagName !== 'TH')) {
        setHovered(null);
        return;
      }
      const cellEl = el;
      const info = findTableFromDom(editor, cellEl);
      if (!info) {
        setHovered(null);
        return;
      }
      const coords = cellCoords(info.tableDom, cellEl);
      if (!coords) {
        setHovered(null);
        return;
      }
      const cellRect = cellEl.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const rect = {
        top: cellRect.top - containerRect.top + container.scrollTop,
        left: cellRect.left - containerRect.left + container.scrollLeft,
        right: cellRect.right - containerRect.left + container.scrollLeft,
        height: cellRect.height,
      };
      setHovered((prev) => {
        if (
          prev &&
          prev.cell === cellEl &&
          prev.rect.top === rect.top &&
          prev.rect.right === rect.right
        ) {
          return prev;
        }
        return {
          tablePos: info.tablePos,
          table: info.tableDom,
          cell: cellEl,
          row: coords.row,
          col: coords.col,
          rect,
        };
      });
    };

    const onLeave = (e: MouseEvent) => {
      if (menu) return;
      // Only clear if cursor truly left the container.
      const r = container.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      ) {
        setHovered(null);
      }
    };

    container.addEventListener('mousemove', onMove);
    container.addEventListener('mouseleave', onLeave);
    return () => {
      container.removeEventListener('mousemove', onMove);
      container.removeEventListener('mouseleave', onLeave);
    };
  }, [containerRef, editor, menu]);

  const closeMenu = useCallback(() => {
    setMenu(null);
    setChevronHover(false);
  }, []);

  // Outside-click dismissal: while a menu is open, any mousedown that
  // is NOT inside the menu portal (data-catalyst-table-menu) AND NOT
  // on the chevron button itself closes the menu. Capture phase so we
  // beat the editor's own selection handling.
  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Element | null;
      if (!t) return;
      if (
        chevronRef.current &&
        (t === chevronRef.current || chevronRef.current.contains(t))
      ) {
        // Click on the chevron itself — its onClick toggles. Don't
        // also close here, or the toggle would close-then-reopen.
        return;
      }
      if (t.closest?.('[data-catalyst-table-menu]')) return;
      closeMenu();
    };
    document.addEventListener('mousedown', onDown, true);
    return () => document.removeEventListener('mousedown', onDown, true);
  }, [menu, closeMenu]);

  if (!editor.isEditable) return null;

  // Decide whether to show the chevron. Shown if (a) the user is
  // hovering a cell OR (b) a menu is open (keep the chevron visible
  // anchored to its cell).
  const visible = hovered || menu;
  if (!visible) return null;

  // Where to draw the chevron. If a menu is open, anchor to the
  // menu's cell coordinates (the hovered state may have moved on).
  const drawCell = menu
    ? hovered && hovered.row === menu.row && hovered.col === menu.col
      ? hovered
      : null
    : hovered;
  if (!drawCell) {
    // Menu is open but cell info is gone — render only the menu.
    return menu ? (
      <CellMenu
        editor={editor}
        tablePos={menu.tablePos}
        row={menu.row}
        col={menu.col}
        anchorRect={menu.anchorRect}
        onClose={closeMenu}
      />
    ) : null;
  }

  const isActive = chevronHover || !!menu;
  // Position: top-right corner of the cell with a 4px inset.
  const top = drawCell.rect.top + 4;
  const left = drawCell.rect.right - CHEVRON_SIZE - 4;

  return (
    <>
      <button
        ref={chevronRef}
        type="button"
        onMouseEnter={() => setChevronHover(true)}
        onMouseLeave={() => setChevronHover(false)}
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => {
          e.stopPropagation();
          // Toggle: if a menu is already open from a previous click,
          // close it. Otherwise open at the chevron's current rect.
          if (menu) {
            closeMenu();
            return;
          }
          const btn = e.currentTarget;
          const rect = btn.getBoundingClientRect();
          setMenu({
            tablePos: drawCell.tablePos,
            row: drawCell.row,
            col: drawCell.col,
            anchorRect: rect,
          });
        }}
        aria-label="Cell options"
        style={{
          position: 'absolute',
          top,
          left,
          width: CHEVRON_SIZE,
          height: CHEVRON_SIZE,
          padding: 0,
          borderRadius: 3,
          border: `1px solid ${isActive ? ACTIVE_BORDER : IDLE_BORDER}`,
          background: isActive ? ACTIVE_BG : IDLE_BG,
          color: isActive ? ACTIVE_GLYPH : IDLE_GLYPH,
          cursor: 'pointer',
          zIndex: 7,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          transition: 'background-color 80ms ease, border-color 80ms ease, color 80ms ease',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            lineHeight: 0,
          }}
        >
          <ChevronDownIcon label="" color="currentColor" />
        </span>
      </button>
      {menu && (
        <CellMenu
          editor={editor}
          tablePos={menu.tablePos}
          row={menu.row}
          col={menu.col}
          anchorRect={menu.anchorRect}
          onClose={closeMenu}
        />
      )}
    </>
  );
}
