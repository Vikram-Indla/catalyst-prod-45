/**
 * TableToolbar — floating bar that appears above the active table.
 *
 * Layout (left → right):
 *   [ Table options ▾ ] [ Alignment ▾ ] [ Distribute columns ] │ [ ⋯ ]
 *
 * Table options dropdown:
 *   ▢ Header row     (toggles data-header-row on the table)
 *   ▢ Header column  (toggles data-header-column)
 *   ▢ Numbered row   (toggles data-numbered-rows)
 *   Active = blue check + blue text + blue background.
 *
 * Alignment dropdown:
 *   [ ← ] [ = ] [ → ]   sets data-alignment on the wrapper (table
 *   shifts left/center/right when narrower than the editor).
 *
 * Distribute columns:
 *   Removes any explicit `colwidth` attrs from every cell so that
 *   `table-layout: fixed` distributes the remaining table width
 *   evenly across the columns.
 *
 * Ellipsis menu:
 *   Copy table     — selects the table and copies it as HTML.
 *   Delete table   — runs deleteTable command.
 *
 * Positioning mirrors ImageToolbar: track the table's DOM rect, render
 * the toolbar above it via document.body portal, re-measure on scroll
 * and resize.
 */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import type { Editor } from '@tiptap/react';
import { NodeSelection, type EditorState } from '@tiptap/pm/state';
import { PreferencesThinIcon } from './PreferencesThinIcon';
// eslint-disable-next-line no-restricted-imports
import AlignImageLeftIcon from '@atlaskit/icon/core/align-image-left';
// eslint-disable-next-line no-restricted-imports
import AlignImageCenterIcon from '@atlaskit/icon/core/align-image-center';
// eslint-disable-next-line no-restricted-imports
import AlignImageRightIcon from '@atlaskit/icon/core/align-image-right';
// eslint-disable-next-line no-restricted-imports
import DistributeColumnsIcon from '@atlaskit/icon/core/table-columns-distribute';
// eslint-disable-next-line no-restricted-imports
import ShowMoreHorizontalIcon from '@atlaskit/icon/core/show-more-horizontal';
// eslint-disable-next-line no-restricted-imports
import CopyIcon from '@atlaskit/icon/core/copy';
// eslint-disable-next-line no-restricted-imports
import DeleteIcon from '@atlaskit/icon/core/delete';
// eslint-disable-next-line no-restricted-imports
import CheckMarkIcon from '@atlaskit/icon/core/check-mark';
import { ChevronDownGlyph } from '../Toolbar/ChevronDownGlyph';

interface Props {
  editor: Editor;
  containerRef: RefObject<HTMLElement | null>;
}

type Alignment = 'left' | 'center' | 'right';
interface TableAttrs {
  width?: number | null;
  headerRow?: boolean;
  headerColumn?: boolean;
  numberedRows?: boolean;
  alignment?: Alignment;
}

interface ActiveTable {
  pos: number;
  rect: DOMRect;
  attrs: TableAttrs;
}

const TOOLBAR_GAP = 8;
const ICON_COLOR = 'var(--ds-text)';
const ICON_COLOR_ACTIVE = 'var(--ds-text-information)';

function findTableAt(state: EditorState) {
  const { $from } = state.selection;
  for (let d = $from.depth; d >= 0; d--) {
    const node = $from.node(d);
    if (node.type.name === 'table') {
      return { node, pos: $from.before(d) };
    }
  }
  return null;
}

export function TableToolbar({ editor, containerRef }: Props) {
  const [active, setActive] = useState<ActiveTable | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);

  const measure = useCallback(() => {
    const found = findTableAt(editor.state);
    if (!found) {
      setActive((prev) => (prev === null ? prev : null));
      return;
    }
    const rendered = editor.view.nodeDOM(found.pos) as HTMLElement | null;
    if (!rendered) {
      setActive((prev) => (prev === null ? prev : null));
      return;
    }
    const tableEl =
      rendered.tagName === 'TABLE'
        ? rendered
        : (rendered.querySelector('table') as HTMLElement | null);
    if (!tableEl) {
      setActive((prev) => (prev === null ? prev : null));
      return;
    }
    const raw = tableEl.getBoundingClientRect();
    // Round rect coords to whole pixels so sub-pixel jitter doesn't
    // produce a fresh state object on every measure call.
    const rect = {
      top: Math.round(raw.top),
      left: Math.round(raw.left),
      width: Math.round(raw.width),
      height: Math.round(raw.height),
      bottom: Math.round(raw.bottom),
      right: Math.round(raw.right),
      x: Math.round(raw.x),
      y: Math.round(raw.y),
      toJSON: raw.toJSON,
    } as DOMRect;
    const attrs = found.node.attrs as TableAttrs;
    setActive((prev) => {
      if (
        prev &&
        prev.pos === found.pos &&
        prev.rect.top === rect.top &&
        prev.rect.left === rect.left &&
        prev.rect.width === rect.width &&
        prev.rect.height === rect.height &&
        prev.attrs.headerRow === attrs.headerRow &&
        prev.attrs.headerColumn === attrs.headerColumn &&
        prev.attrs.numberedRows === attrs.numberedRows &&
        prev.attrs.alignment === attrs.alignment &&
        prev.attrs.width === attrs.width
      ) {
        return prev;
      }
      return { pos: found.pos, rect, attrs };
    });
  }, [editor]);

  // No runs-every-render useLayoutEffect here — that pattern combined
  // with sub-pixel getBoundingClientRect jitter trips an infinite loop
  // with the pos useLayoutEffect below. The listeners cover initial
  // mount + every editor change.
  useEffect(() => {
    measure();
    editor.on('selectionUpdate', measure);
    editor.on('transaction', measure);
    return () => {
      editor.off('selectionUpdate', measure);
      editor.off('transaction', measure);
    };
  }, [editor, measure]);

  useEffect(() => {
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
  }, [measure]);

  // Position the toolbar above the table after each rect change. Run
  // in a layout effect so we measure the toolbar's own size against
  // the active table rect.
  useLayoutEffect(() => {
    if (!active || !toolbarRef.current) {
      setPos((prev) => (prev === null ? prev : null));
      return;
    }
    const toolbarRect = toolbarRef.current.getBoundingClientRect();
    // Prefer BELOW the table — only flip to above when there's not
    // enough room below the table within the viewport.
    const spaceBelow = window.innerHeight - active.rect.bottom - TOOLBAR_GAP;
    const fitsBelow = spaceBelow >= toolbarRect.height;
    const top = fitsBelow
      ? active.rect.bottom + TOOLBAR_GAP
      : Math.max(8, active.rect.top - toolbarRect.height - TOOLBAR_GAP);
    const left = Math.max(
      8,
      active.rect.left + active.rect.width / 2 - toolbarRect.width / 2,
    );
    setPos((prev) => {
      if (prev && prev.top === top && prev.left === left) return prev;
      return { top, left };
    });
  }, [active]);

  if (!active || !editor.isEditable) return null;

  return createPortal(
    <div
      ref={toolbarRef}
      role="toolbar"
      aria-label="Table options"
      onMouseDown={(e) => e.preventDefault()}
      style={{
        position: 'fixed',
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        padding: 4,
        background: 'var(--ds-surface-overlay)',
        border: '1px solid var(--ds-border)',
        borderRadius: 6,
        boxShadow: '0 4px 12px var(--ds-shadow-raised, rgba(9,30,66,0.15))',
        zIndex: 2147483600,
        visibility: pos ? 'visible' : 'hidden',
      }}
    >
      <TableOptionsButton editor={editor} active={active} />
      <AlignmentButton editor={editor} active={active} />
      <DistributeColumnsButton editor={editor} active={active} />
      <Divider />
      <EllipsisButton editor={editor} active={active} />
    </div>,
    document.body,
  );
}

/* ──────────────────────────── helpers ──────────────────────────── */

function Divider() {
  return (
    <span
      aria-hidden
      style={{
        width: 1,
        alignSelf: 'stretch',
        background: 'var(--ds-border)',
        margin: '4px 4px',
      }}
    />
  );
}

interface IconBtnProps {
  label: string;
  onClick: (e: React.MouseEvent) => void;
  children: ReactNode;
  active?: boolean;
  rightSlot?: ReactNode;
  innerRef?: React.Ref<HTMLButtonElement>;
}

function IconBtn({
  label,
  onClick,
  children,
  active = false,
  rightSlot,
  innerRef,
}: IconBtnProps) {
  return (
    <button
      ref={innerRef}
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      onMouseDown={(e) => e.preventDefault()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        minWidth: 28,
        height: 28,
        padding: '0 4px',
        border: 'none',
        borderRadius: 4,
        background: active
          ? 'var(--ds-background-selected)'
          : 'transparent',
        color: active ? ICON_COLOR_ACTIVE : ICON_COLOR,
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background =
            'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'transparent';
        }
      }}
    >
      {children}
      {rightSlot}
    </button>
  );
}

interface DropdownProps {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  children: ReactNode;
  minWidth?: number;
}

function Dropdown({
  open,
  anchorRef,
  onClose,
  children,
  minWidth = 200,
}: DropdownProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null,
  );

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;
    const r = anchorRef.current.getBoundingClientRect();
    setCoords({ top: r.bottom + 4, left: r.left });
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (
        ref.current?.contains(e.target as Node) ||
        anchorRef.current?.contains(e.target as Node)
      ) {
        return;
      }
      onClose();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, onClose, anchorRef]);

  if (!open || !coords) return null;

  return createPortal(
    <div
      ref={ref}
      onMouseDown={(e) => e.preventDefault()}
      style={{
        position: 'fixed',
        top: coords.top,
        left: coords.left,
        minWidth,
        background: 'var(--ds-surface-overlay)',
        border: '1px solid var(--ds-border)',
        borderRadius: 6,
        boxShadow: '0 6px 20px var(--ds-shadow-raised, rgba(9,30,66,0.18))',
        padding: 4,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        zIndex: 2147483647,
      }}
    >
      {children}
    </div>,
    document.body,
  );
}

interface MenuItemProps {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  /** Reserve the leading 16px slot for a check indicator. */
  showCheckSlot?: boolean;
}

function MenuItem({
  label,
  icon,
  onClick,
  active = false,
  danger = false,
  showCheckSlot = false,
}: MenuItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseDown={(e) => e.preventDefault()}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        padding: '7px 10px',
        border: 'none',
        borderRadius: 4,
        background: active
          ? 'var(--ds-background-selected)'
          : 'transparent',
        color: danger
          ? 'var(--ds-text-danger)'
          : active
            ? ICON_COLOR_ACTIVE
            : 'var(--ds-text)',
        fontSize: 'var(--ds-font-size-300)',
        fontWeight: active ? 500 : 400,
        cursor: 'pointer',
        textAlign: 'start',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background =
            'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'transparent';
        }
      }}
    >
      {showCheckSlot && (
        <span
          style={{
            width: 16,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: active ? ICON_COLOR_ACTIVE : 'transparent',
          }}
        >
          {active ? <CheckMarkIcon label="" /> : null}
        </span>
      )}
      {icon ? (
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
          {icon}
        </span>
      ) : null}
      <span style={{ flex: 1 }}>{label}</span>
    </button>
  );
}

/* ────────────────── tool: Table options ────────────────── */

function TableOptionsButton({
  editor,
  active,
}: {
  editor: Editor;
  active: ActiveTable;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  const toggleAttr = (key: 'headerRow' | 'headerColumn' | 'numberedRows') => {
    const current = active.attrs[key] ?? false;
    editor
      .chain()
      .command(({ tr, state }) => {
        const node = state.doc.nodeAt(active.pos);
        if (!node || node.type.name !== 'table') return false;
        tr.setNodeMarkup(active.pos, undefined, {
          ...node.attrs,
          [key]: !current,
        });
        return true;
      })
      .run();
  };

  return (
    <>
      <IconBtn
        innerRef={btnRef}
        label="Table options"
        onClick={() => setOpen((v) => !v)}
        active={open}
        rightSlot={<ChevronDownGlyph />}
      >
        <PreferencesThinIcon />
        <span
          style={{
            fontSize: 'var(--ds-font-size-300)',
            fontWeight: 500,
            marginInlineStart: 4,
            color: 'inherit',
          }}
        >
          Table options
        </span>
      </IconBtn>
      <Dropdown
        open={open}
        anchorRef={btnRef}
        onClose={() => setOpen(false)}
        minWidth={200}
      >
        <MenuItem
          label="Header row"
          active={active.attrs.headerRow ?? true}
          onClick={() => toggleAttr('headerRow')}
          showCheckSlot
        />
        <MenuItem
          label="Header column"
          active={active.attrs.headerColumn ?? false}
          onClick={() => toggleAttr('headerColumn')}
          showCheckSlot
        />
        <MenuItem
          label="Numbered row"
          active={active.attrs.numberedRows ?? false}
          onClick={() => toggleAttr('numberedRows')}
          showCheckSlot
        />
      </Dropdown>
    </>
  );
}

/* ────────────────── tool: Alignment ────────────────── */

function AlignmentButton({
  editor,
  active,
}: {
  editor: Editor;
  active: ActiveTable;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const current = (active.attrs.alignment ?? 'left') as Alignment;

  const setAlign = (a: Alignment) => {
    editor
      .chain()
      .command(({ tr, state }) => {
        const node = state.doc.nodeAt(active.pos);
        if (!node || node.type.name !== 'table') return false;
        tr.setNodeMarkup(active.pos, undefined, {
          ...node.attrs,
          alignment: a,
        });
        return true;
      })
      .run();
    setOpen(false);
  };

  const CurrentIcon =
    current === 'center'
      ? AlignImageCenterIcon
      : current === 'right'
        ? AlignImageRightIcon
        : AlignImageLeftIcon;

  return (
    <>
      <IconBtn
        innerRef={btnRef}
        label="Alignment options"
        onClick={() => setOpen((v) => !v)}
        active={open}
        rightSlot={<ChevronDownGlyph />}
      >
        <CurrentIcon label="" />
      </IconBtn>
      <Dropdown
        open={open}
        anchorRef={btnRef}
        onClose={() => setOpen(false)}
        minWidth={140}
      >
        <div style={{ display: 'flex', gap: 2, padding: 2 }}>
          <IconBtn
            label="Align left"
            onClick={() => setAlign('left')}
            active={current === 'left'}
          >
            <AlignImageLeftIcon label="" />
          </IconBtn>
          <IconBtn
            label="Align center"
            onClick={() => setAlign('center')}
            active={current === 'center'}
          >
            <AlignImageCenterIcon label="" />
          </IconBtn>
          <IconBtn
            label="Align right"
            onClick={() => setAlign('right')}
            active={current === 'right'}
          >
            <AlignImageRightIcon label="" />
          </IconBtn>
        </div>
      </Dropdown>
    </>
  );
}

/* ────────────────── tool: Distribute columns ────────────────── */

function DistributeColumnsButton({
  editor,
  active,
}: {
  editor: Editor;
  active: ActiveTable;
}) {
  const onClick = () => {
    editor
      .chain()
      .command(({ tr, state }) => {
        const table = state.doc.nodeAt(active.pos);
        if (!table || table.type.name !== 'table') return false;
        // Walk every cell in every row, strip the colwidth attr so
        // `table-layout: fixed` distributes the table width evenly.
        let rowOffset = 0;
        table.forEach((row, rowOff) => {
          rowOffset = rowOff;
          const rowStart = active.pos + 1 + rowOffset;
          row.forEach((cell, cellOff) => {
            const cellPos = rowStart + 1 + cellOff;
            if (cell.attrs.colwidth != null) {
              tr.setNodeMarkup(cellPos, undefined, {
                ...cell.attrs,
                colwidth: null,
              });
            }
          });
        });
        return true;
      })
      .run();
  };

  return (
    <IconBtn label="Distribute columns" onClick={onClick}>
      <DistributeColumnsIcon label="" />
    </IconBtn>
  );
}

/* ────────────────── tool: Ellipsis (Copy / Delete) ────────────────── */

function EllipsisButton({
  editor,
  active,
}: {
  editor: Editor;
  active: ActiveTable;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  const copyTable = async () => {
    const view = editor.view;
    const tableNode = view.state.doc.nodeAt(active.pos);
    if (!tableNode) return;
    const sel = NodeSelection.create(view.state.doc, active.pos);
    view.dispatch(view.state.tr.setSelection(sel));
    // Use the browser clipboard if available.
    const dom = view.nodeDOM(active.pos) as HTMLElement | null;
    if (dom && navigator.clipboard) {
      const tableEl = dom.tagName === 'TABLE' ? dom : dom.querySelector('table');
      if (tableEl) {
        try {
          await navigator.clipboard.writeText(tableEl.outerHTML);
        } catch {
          /* clipboard write may fail in restricted contexts */
        }
      }
    }
    setOpen(false);
  };

  const deleteTable = () => {
    editor.chain().focus().deleteTable().run();
    setOpen(false);
  };

  return (
    <>
      <IconBtn
        innerRef={btnRef}
        label="More options"
        onClick={() => setOpen((v) => !v)}
        active={open}
      >
        <ShowMoreHorizontalIcon label="" />
      </IconBtn>
      <Dropdown
        open={open}
        anchorRef={btnRef}
        onClose={() => setOpen(false)}
        minWidth={160}
      >
        <MenuItem
          label="Copy"
          icon={<CopyIcon label="" />}
          onClick={copyTable}
        />
        <MenuItem
          label="Delete"
          icon={<DeleteIcon label="" />}
          onClick={deleteTable}
        />
      </Dropdown>
    </>
  );
}
