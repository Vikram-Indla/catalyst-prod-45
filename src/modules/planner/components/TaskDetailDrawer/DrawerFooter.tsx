// ============================================================
// MODAL FOOTER V2 - ENTERPRISE CLEAN
// Created/Updated timestamps + Save indicator
// ============================================================

import { formatDistanceToNow, format } from 'date-fns';
import { SavingIndicator, SaveStatus } from './SavingIndicator';

export type { SaveStatus };

interface DrawerFooterProps {
  task: any;
  onDelete: () => void;
  onDuplicate: () => void;
  saveStatus?: SaveStatus;
}

export function DrawerFooter({ task, saveStatus = 'idle' }: DrawerFooterProps) {
  return (
    <div className="flex items-center justify-between w-full">
      {/* Left side: Timestamps */}
      <span className="task-modal__footer-meta">
        Created <strong>{format(new Date(task.created_at), 'MMM d, yyyy')}</strong>
        {' · '}
        Updated <strong>{formatDistanceToNow(new Date(task.updated_at), { addSuffix: true })}</strong>
      </span>
      
      {/* Right side: Save indicator */}
      <SavingIndicator status={saveStatus} />
    </div>
  );
}
