import { motion, AnimatePresence } from 'framer-motion';
import { Archive, Trash2 } from 'lucide-react';

interface BulkActionBarProps {
  selectedCount: number;
  onAction: (action: string, value?: any) => void;
  onCancel: () => void;
}

const ACTIONS = [
  { id: 'status', label: 'Status ▾' },
  { id: 'assignee', label: 'Assignee ▾' },
  { id: 'quarter', label: 'Quarter ▾' },
  { id: 'archive', label: 'Archive', icon: Archive },
];

export function BulkActionBar({ selectedCount, onAction, onCancel }: BulkActionBarProps) {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          className="fixed bottom-0 left-[240px] right-0 h-[52px] bg-zinc-900 z-40 flex items-center justify-between px-5"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {/* Left: count */}
          <span className="text-[13px] font-medium text-white">
            {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
          </span>

          {/* Center: actions */}
          <div className="flex items-center gap-2">
            {ACTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => onAction(id)}
                className="h-8 px-3 flex items-center gap-1.5 text-xs font-medium text-white border border-white/20 rounded-md hover:bg-white/10 transition-colors"
              >
                {Icon && <Icon size={14} />}
                {label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onAction('delete')}
              className="h-8 px-3 flex items-center gap-1.5 text-xs font-medium text-red-300 border border-red-500/50 rounded-md hover:bg-red-900/20 transition-colors"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>

          {/* Right: cancel */}
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-zinc-400 hover:text-white px-3 transition-colors"
          >
            Cancel
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
