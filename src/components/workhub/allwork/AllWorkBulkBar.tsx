/**
 * AllWorkBulkBar — Fixed bottom bar when items selected (V12 compliant)
 */
import { X, Pencil, RefreshCw, Eye, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  selectedIds: string[];
  totalCount: number;
  onSelectAll: () => void;
  onClear: () => void;
  onDone: () => void;
}

export function AllWorkBulkBar({ selectedIds, totalCount, onSelectAll, onClear, onDone }: Props) {
  const handleDelete = () => {
    if (confirm(`Delete ${selectedIds.length} item(s)?`)) {
      toast.success(`${selectedIds.length} items deleted`);
      onDone();
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
      <div
        className="flex items-center gap-4 px-5 py-2.5 rounded-lg shadow-xl"
        style={{
          backgroundColor: '#1e1f21',
          color: 'var(--bg-app)',
          border: '1px solid #2E2E2E',
          borderRadius: 8,
        }}
        role="toolbar"
        aria-label="Bulk actions"
      >
        <span className="text-[13px] font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          {selectedIds.length} selected
        </span>

        <button
          onClick={onSelectAll}
          className="text-[12px] px-2 py-1 rounded hover:bg-white/10 transition-colors duration-[80ms] focus-visible:outline-2 focus-visible:outline-white"
          style={{ color: '#93c5fd', fontFamily: 'Inter, sans-serif' }}
        >
          Select all {totalCount}
        </button>

        <div className="w-px h-5" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />

        <button className="flex items-center gap-1.5 text-[12px] px-2 py-1 rounded hover:bg-white/10 transition-colors duration-[80ms]" aria-label="Edit fields">
          <Pencil className="w-3.5 h-3.5" />
          Edit fields
        </button>

        <button className="flex items-center gap-1.5 text-[12px] px-2 py-1 rounded hover:bg-white/10 transition-colors duration-[80ms]" aria-label="Change status">
          <RefreshCw className="w-3.5 h-3.5" />
          Change status
        </button>

        <button className="flex items-center gap-1.5 text-[12px] px-2 py-1 rounded hover:bg-white/10 transition-colors duration-[80ms]" aria-label="Watch items">
          <Eye className="w-3.5 h-3.5" />
          Watch
        </button>

        <button
          onClick={handleDelete}
          className="flex items-center gap-1.5 text-[12px] px-2 py-1 rounded hover:bg-red-500/20 transition-colors duration-[80ms]"
          style={{ color: '#fca5a5' }}
          aria-label="Delete selected items"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete
        </button>

        <div className="w-px h-5" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />

        <button onClick={onClear} className="p-1 rounded hover:bg-white/10 transition-colors duration-[80ms]" aria-label="Clear selection">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
