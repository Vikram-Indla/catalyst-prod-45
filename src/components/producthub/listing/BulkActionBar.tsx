/**
 * BulkActionBar — Multi-select action bar
 * Replaces filter bar when items are selected
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Archive, Trash2, RefreshCw, UserPlus } from 'lucide-react';

interface Props {
  selectedCount: number;
  onAction: (action: string, value?: unknown) => void;
  onCancel: () => void;
}

export function BulkActionBar({ selectedCount, onAction, onCancel }: Props) {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          className="h-11 flex items-center justify-between px-6 shrink-0"
          style={{ background: '#eff6ff', borderBottom: '1px solid #bfdbfe' }}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 44 }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.15 }}
        >
          <div className="flex items-center gap-3">
            <span className="text-[13px] font-semibold" style={{ color: '#1d4ed8' }}>
              {selectedCount} selected
            </span>
            <div className="w-px h-4 bg-blue-200" />
            <button type="button" onClick={() => onAction('status')} className="h-7 px-2.5 flex items-center gap-1.5 text-[12px] text-blue-700 rounded-md hover:bg-blue-100 transition-colors">
              <RefreshCw size={13} /> Change Status
            </button>
            <button type="button" onClick={() => onAction('assignee')} className="h-7 px-2.5 flex items-center gap-1.5 text-[12px] text-blue-700 rounded-md hover:bg-blue-100 transition-colors">
              <UserPlus size={13} /> Assign To
            </button>
            <button type="button" onClick={() => onAction('archive')} className="h-7 px-2.5 flex items-center gap-1.5 text-[12px] text-blue-700 rounded-md hover:bg-blue-100 transition-colors">
              <Archive size={13} /> Archive
            </button>
            <button type="button" onClick={() => onAction('delete')} className="h-7 px-2.5 flex items-center gap-1.5 text-[12px] rounded-md hover:bg-red-100 transition-colors" style={{ color: '#dc2626' }}>
              <Trash2 size={13} /> Delete
            </button>
          </div>
          <button type="button" onClick={onCancel} className="text-[12px] underline transition-colors" style={{ color: '#71717a' }}>
            Clear selection
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
