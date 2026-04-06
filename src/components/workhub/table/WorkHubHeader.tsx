/**
 * WorkHubHeader — Sticky column headers (Stage E: polished)
 * 40px height, bg=#1A1A1A, 12px/700/UPPERCASE/0.03em, resize handles, aria-sort
 */
import { useCallback } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import type { SortConfig, ColumnConfig } from '@/types/workhub';

interface WorkHubHeaderProps {
  columns: ColumnConfig[];
  sort: SortConfig | null;
  onSort: (column: string) => void;
  allSelected: boolean;
  onSelectAll: (checked: boolean) => void;
  onColumnResize: (columnId: string, width: number) => void;
}

export default function WorkHubHeader({ columns, sort, onSort, allSelected, onSelectAll, onColumnResize }: WorkHubHeaderProps) {
  const handleResizeStart = useCallback((columnId: string, startX: number, startWidth: number) => {
    let rafId: number;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const col = columns.find(c => c.id === columnId);
        const minW = col?.minWidth || 60;
        onColumnResize(columnId, Math.max(minW, startWidth + (e.clientX - startX)));
      });
    };
    const onUp = () => { cancelAnimationFrame(rafId); document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [columns, onColumnResize]);

  const visibleCols = columns.filter(c => c.visible);

  return (
    <div role="row" style={{
      display: 'flex', alignItems: 'center', height: 40,
      background: 'var(--bg-1)', borderBottom: '0.75px solid var(--bd-subtle, rgba(255,255,255,0.05))',
      position: 'sticky', top: 0, zIndex: 20, flexShrink: 0,
    }}>
      <div style={{ width: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} role="columnheader">
        <input type="checkbox" checked={allSelected} onChange={e => onSelectAll(e.target.checked)}
          aria-label="Select all items" style={{ width: 18, height: 18, accentColor: 'var(--cp-blue)', cursor: 'pointer' }} />
      </div>

      {visibleCols.map(col => {
        const isActive = sort?.column === col.id;
        const ariaSortVal = isActive ? (sort!.direction === 'asc' ? 'ascending' : 'descending') : 'none';
        return (
          <div key={col.id} role="columnheader" aria-sort={col.sortable ? ariaSortVal as any : undefined} style={{
            width: col.width, minWidth: col.minWidth, position: 'relative', display: 'flex', alignItems: 'center',
            padding: '10px 12px', userSelect: 'none', flexShrink: 0,
          }}>
            <button onClick={() => col.sortable && onSort(col.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none',
                cursor: col.sortable ? 'pointer' : 'default', padding: 0,
                fontSize: 11, fontWeight: 650, textTransform: 'uppercase', letterSpacing: '0.06em',
                color: isActive ? 'var(--cp-blue)' : 'var(--fg-3)', fontFamily: 'Geist, -apple-system, sans-serif',
              }}>
              {col.label}
              {isActive && (sort!.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
            </button>

            {col.resizable && (
              <div onMouseDown={e => { e.preventDefault(); handleResizeStart(col.id, e.clientX, col.width); }}
                style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 4, cursor: 'col-resize', background: 'transparent' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(37,99,235,0.3)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')} />
            )}
          </div>
        );
      })}
    </div>
  );
}
