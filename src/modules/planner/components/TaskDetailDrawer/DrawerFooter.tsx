// ============================================================
// MODAL FOOTER V2 - ENTERPRISE CLEAN
// Created/Updated timestamps + Save indicator
// ============================================================

import { formatDistanceToNow, format } from 'date-fns';
import { Loader2, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface DrawerFooterProps {
  task: any;
  onDelete: () => void;
  onDuplicate: () => void;
  saveStatus?: SaveStatus;
}

export function DrawerFooter({ task, saveStatus = 'idle' }: DrawerFooterProps) {
  return (
    <div className="flex items-center justify-between w-full">
      {/* Left side: Save indicator */}
      <div className="flex items-center">
        {saveStatus === 'saving' && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Saving...</span>
          </div>
        )}
        {saveStatus === 'saved' && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-600">
            <Check className="w-3 h-3" />
            <span>Saved</span>
          </div>
        )}
        {saveStatus === 'error' && (
          <div className="flex items-center gap-1.5 text-xs text-destructive">
            <AlertCircle className="w-3 h-3" />
            <span>Failed to save</span>
          </div>
        )}
      </div>
      
      {/* Right side: Timestamps */}
      <span className="task-modal__footer-meta">
        Created <strong>{format(new Date(task.created_at), 'MMM d, yyyy')}</strong>
        {' · '}
        Updated <strong>{formatDistanceToNow(new Date(task.updated_at), { addSuffix: true })}</strong>
      </span>
    </div>
  );
}
