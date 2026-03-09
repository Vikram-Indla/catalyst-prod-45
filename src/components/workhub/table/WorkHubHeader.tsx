/**
 * WorkHubHeader — Sticky column headers with sort, resize handles
 * 40px height, bg=#F8FAFC, 12px/700/UPPERCASE/0.03em
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
    const onMove = (e: MouseEvent) => {
      const col = columns.find(c => c.id === columnId);
      const minW = col?.minWidth || 60;
      const newWidth = Math.max(minW, startWidth + (e.clientX - startX));
      onColumnResize(columnId, newWidth);
    };
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [columns, onColumnResize]);

  const visibleCols = columns.filter(c => c.visible);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', height: 40,
      background: '#F8FAFC', borderBottom: '0.75px solid rgba(15,23,42,0.06)',
      position: 'sticky', top: 0, zIndex: 20, flexShrink: 0,
    }}>
      {/* Checkbox col */}
      <div style={{ width: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <input type="checkbox" checked={allSelected} onChange={e => onSelectAll(e.target.checked)}
          style={{ width: 18, height: 18, accentColor: '#2563EB', cursor: 'pointer' }} />
      </div>

      {visibleCols.map(col => (
        <div key={col.id} style={{
          width: col.width, minWidth: col.minWidth, position: 'relative', display: 'flex', alignItems: 'center',
          padding: '10px 12px', userSelect: 'none', flexShrink: 0,
        }}>
          <button
            onClick={() => col.sortable && onSort(col.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none',
              cursor: col.sortable ? 'pointer' : 'default', padding: 0,
              fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em',
              color: '#64748B', fontFamily: 'Inter, sans-serif',
            }}
          >
            {col.label}
            {sort?.column === col.id && (
              sort.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
            )}
          </button>

          {/* Resize handle */}
          {col.resizable && (
            <div
              onMouseDown={e => { e.preventDefault(); handleResizeStart(col.id, e.clientX, col.width); }}
              style={{
                position: 'absolute', right: 0, top: 0, bottom: 0, width: 4,
                cursor: 'col-resize', background: 'transparent',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(37,99,235,0.3)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            />
          )}
        </div>
      ))}
    </div>
  );
}
