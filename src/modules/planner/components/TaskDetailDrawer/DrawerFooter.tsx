// ============================================================
// MODAL FOOTER V2 - ENTERPRISE CLEAN
// Created/Updated timestamps + help button
// ============================================================

import { formatDistanceToNow, format } from 'date-fns';

interface DrawerFooterProps {
  task: any;
  onDelete: () => void;
  onDuplicate: () => void;
}

export function DrawerFooter({ task }: DrawerFooterProps) {
  return (
    <span className="task-modal__footer-meta">
      Created <strong>{format(new Date(task.created_at), 'MMM d, yyyy')}</strong>
      {' · '}
      Updated <strong>{formatDistanceToNow(new Date(task.updated_at), { addSuffix: true })}</strong>
    </span>
  );
}
