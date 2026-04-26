// @ts-nocheck
/**
 * ResizableDynamicTable — drop-in wrapper around Atlaskit DynamicTable that
 * adds drag-to-resize column handles, persisting per-column widths in
 * localStorage keyed by `widgetKey`.
 *
 * Why DOM injection? DynamicTable's `head.cells[].width` only accepts a 0–100
 * percentage, which is awkward for pixel-precision resize. Instead we let
 * DynamicTable render normally, then on every render we ensure the underlying
 * <table> has `table-layout: fixed` + a <colgroup> whose <col> widths drive
 * column sizing. This keeps the table inside the existing horizontal-scroll
 * container while honouring user-chosen pixel widths.
 *
 * Persistence is local-only by design — column widths are a per-user UI
 * preference, not collaborative data, and writing to a Supabase table on
 * every drag adds latency without benefit. Fall back to defaults if storage
 * is unavailable (incognito, quota exceeded, etc.).
 */
import { useEffect, useRef, useState, useCallback, useLayoutEffect } from 'react';
import { DynamicTable } from '@/components/ads';
import { token } from '@atlaskit/tokens';

const STORAGE_PREFIX = 'cat-dash-cols:';

interface ResizableHeaderCellProps {
  width: number;
  onResize: (px: number) => void;
  children: React.ReactNode;
}

function ResizableHeaderCell({ width, onResize, children }: ResizableHeaderCellProps) {
  const startX = useRef(0);
  const startWidth = useRef(width);
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startX.current = e.clientX;
    startWidth.current = width;
    setDragging(true);

    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX.current;
      onResize(startWidth.current + delta);
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setDragging(false);
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const handleColor = dragging
    ? token('color.border.brand', '#0C66E4')
    : hovered
      ? token('color.border', '#DFE1E6')
      : 'transparent';

  return (
    <span
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        width: '100%',
        height: '100%',
        paddingRight: 8,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {children}
      </span>
      <span
        role="separator"
        aria-orientation="vertical"
        onMouseDown={handleMouseDown}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          top: -6,
          bottom: -6,
          right: -8,
          width: 8,
          cursor: 'col-resize',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          zIndex: 5,
        }}
      >
        <span
          style={{
            width: 2,
            height: 16,
            background: handleColor,
            borderRadius: 1,
            transition: 'background 100ms ease',
          }}
        />
      </span>
    </span>
  );
}

interface ResizableDynamicTableProps {
  widgetKey: string;
  head: { cells: Array<{ key: string; content: React.ReactNode; isSortable?: boolean }> };
  rows: Array<{ key: string; cells: Array<{ key: string; content: React.ReactNode }> }>;
  defaultWidths: Record<string, number>;
  minWidths?: Record<string, number>;
  ariaLabel?: string;
  rowsPerPage?: number;
}

export function ResizableDynamicTable({
  widgetKey,
  head,
  rows,
  defaultWidths,
  minWidths,
  ariaLabel,
  rowsPerPage = 0,
}: ResizableDynamicTableProps) {
  const storageKey = `${STORAGE_PREFIX}${widgetKey}`;

  const [widths, setWidths] = useState<Record<string, number>>(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;
      if (raw) return { ...defaultWidths, ...JSON.parse(raw) };
    } catch {
      /* localStorage unavailable */
    }
    return defaultWidths;
  });

  const containerRef = useRef<HTMLDivElement>(null);

  // Apply widths via injected <colgroup> after every render. useLayoutEffect
  // so the user never sees a flash of un-sized columns between DynamicTable
  // mounting its table and us pinning column widths.
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const table = container.querySelector('table');
    if (!table) return;
    (table as HTMLTableElement).style.tableLayout = 'fixed';
    (table as HTMLTableElement).style.width = '100%';
    (table as HTMLTableElement).style.minWidth = 'unset';

    const keys = head.cells.map((c) => c.key);
    let colgroup = table.querySelector(':scope > colgroup') as HTMLTableColElement | null;
    if (!colgroup) {
      colgroup = document.createElement('colgroup');
      table.insertBefore(colgroup, table.firstChild);
    }
    while (colgroup.children.length < keys.length) {
      colgroup.appendChild(document.createElement('col'));
    }
    while (colgroup.children.length > keys.length) {
      colgroup.removeChild(colgroup.lastChild!);
    }
    keys.forEach((key, i) => {
      const col = colgroup!.children[i] as HTMLElement;
      const px = widths[key] ?? defaultWidths[key] ?? 100;
      col.style.width = `${px}px`;
    });
  });

  const setWidth = useCallback(
    (key: string, px: number) => {
      const min = minWidths?.[key] ?? 60;
      const clamped = Math.max(min, px);
      setWidths((prev) => {
        const next = { ...prev, [key]: clamped };
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          /* quota exceeded */
        }
        return next;
      });
    },
    [storageKey, minWidths],
  );

  // Reset to defaults via double-click on any handle — Atlaskit-canonical
  // pattern. Exposed through window for now (no Reset menu yet).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    (window as any).__catalystResetDashCols = (key: string) => {
      try {
        localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
      } catch {
        /* noop */
      }
    };
  }, []);

  const wrappedHead = {
    cells: head.cells.map((cell) => ({
      ...cell,
      content: (
        <ResizableHeaderCell
          width={widths[cell.key] ?? defaultWidths[cell.key] ?? 100}
          onResize={(px) => setWidth(cell.key, px)}
        >
          {cell.content}
        </ResizableHeaderCell>
      ),
    })),
  };

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <DynamicTable
        head={wrappedHead}
        rows={rows}
        aria-label={ariaLabel}
        rowsPerPage={rowsPerPage}
      />
    </div>
  );
}
