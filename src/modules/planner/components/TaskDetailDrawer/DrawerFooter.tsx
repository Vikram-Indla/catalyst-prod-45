// ============================================================
// DRAWER FOOTER - POLISHED
// Visible Duplicate/Delete buttons, proper meta display
// ============================================================

import { formatDistanceToNow, format } from 'date-fns';
import { Trash2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DrawerFooterProps {
  task: any;
  onDelete: () => void;
  onDuplicate: () => void;
}

export function DrawerFooter({ task, onDelete, onDuplicate }: DrawerFooterProps) {
  return (
    <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
      {/* Meta */}
      <div className="text-[11px] text-gray-400 leading-relaxed">
        <div>
          Created <span className="text-gray-600 font-medium">{format(new Date(task.created_at), 'MMM d, yyyy')}</span>
        </div>
        <div>
          Updated <span className="text-gray-600 font-medium">{formatDistanceToNow(new Date(task.updated_at), { addSuffix: true })}</span>
        </div>
      </div>

      {/* Actions - Visible buttons, NOT a menu */}
      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="h-7 text-xs"
          onClick={onDuplicate}
        >
          <Copy className="w-3.5 h-3.5 mr-1.5" />
          Duplicate
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
          onClick={onDelete}
        >
          <Trash2 className="w-3.5 h-3.5 mr-1.5" />
          Delete
        </Button>
      </div>
    </div>
  );
}
