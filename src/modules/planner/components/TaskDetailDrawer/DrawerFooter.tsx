// ============================================================
// DRAWER FOOTER V2 - ENTERPRISE CLEAN
// Created/Updated timestamps - integrated into modal footer
// ============================================================

import { formatDistanceToNow, format } from 'date-fns';

interface DrawerFooterProps {
  task: any;
  onDelete: () => void;
  onDuplicate: () => void;
}

export function DrawerFooter({ task }: DrawerFooterProps) {
  return (
    <div className="task-modal__footer-meta">
      <span>
        Created <strong>{format(new Date(task.created_at), 'MMM d, yyyy')}</strong>
        {' · '}
        Updated <strong>{formatDistanceToNow(new Date(task.updated_at), { addSuffix: false })}</strong>
      </span>
    </div>
  );
}
