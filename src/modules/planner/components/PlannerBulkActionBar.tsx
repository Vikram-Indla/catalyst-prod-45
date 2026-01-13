import { X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface PlannerBulkActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkDelete: () => void;
}

export function PlannerBulkActionBar({
  selectedCount,
  onClearSelection,
  onBulkDelete,
}: PlannerBulkActionBarProps) {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="flex items-center gap-3 px-4 py-2.5 bg-surface-0 border border-border-default rounded-lg shadow-lg">
            {/* Selection Count */}
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs font-semibold bg-primary text-primary-foreground rounded">
                {selectedCount}
              </span>
              <span className="text-sm text-foreground">
                task{selectedCount > 1 ? 's' : ''} selected
              </span>
            </div>

            {/* Divider */}
            <div className="w-px h-6 bg-border-default" />

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={onBulkDelete}
                className="h-8 gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            </div>

            {/* Divider */}
            <div className="w-px h-6 bg-border-default" />

            {/* Clear Selection */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
              Clear
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default PlannerBulkActionBar;
