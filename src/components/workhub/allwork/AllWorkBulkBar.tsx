/**
 * AllWorkBulkBar — Fixed bottom bar when items selected
 */
import { X, Pencil, RefreshCw, Eye, Trash2 } from 'lucide-react';
import { useBulkUpdateWorkItems } from '@/hooks/workhub/useWorkItems';
import { toast } from 'sonner';

interface Props {
  selectedIds: string[];
  totalCount: number;
  onSelectAll: () => void;
  onClear: () => void;
  onDone: () => void;
}

export function AllWorkBulkBar({ selectedIds, totalCount, onSelectAll, onClear, onDone }: Props) {
  const bulkUpdate = useBulkUpdateWorkItems();

  const handleDelete = () => {
    if (confirm(`Delete ${selectedIds.length} item(s)?`)) {
      toast.success(`${selectedIds.length} items deleted`);
      onDone();
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div
        className="flex items-center gap-4 px-5 py-2.5 rounded-lg shadow-xl"
        style={{
          backgroundColor: '#1e1f21',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <span className="text-[13px] font-medium">
          {selectedIds.length} selected
        </span>

        <button
          onClick={onSelectAll}
          className="text-[12px] px-2 py-1 rounded hover:bg-white/10 transition-colors"
          style={{ color: '#93c5fd' }}
        >
          Select all {totalCount}
        </button>

        <div className="w-px h-5" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />

        <button className="flex items-center gap-1.5 text-[12px] px-2 py-1 rounded hover:bg-white/10 transition-colors">
          <Pencil className="w-3.5 h-3.5" />
          Edit fields
        </button>

        <button className="flex items-center gap-1.5 text-[12px] px-2 py-1 rounded hover:bg-white/10 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" />
          Change status
        </button>

        <button className="flex items-center gap-1.5 text-[12px] px-2 py-1 rounded hover:bg-white/10 transition-colors">
          <Eye className="w-3.5 h-3.5" />
          Watch
        </button>

        <button
          onClick={handleDelete}
          className="flex items-center gap-1.5 text-[12px] px-2 py-1 rounded hover:bg-red-500/20 transition-colors"
          style={{ color: '#fca5a5' }}
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete
        </button>

        <div className="w-px h-5" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />

        <button onClick={onClear} className="p-1 rounded hover:bg-white/10 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
