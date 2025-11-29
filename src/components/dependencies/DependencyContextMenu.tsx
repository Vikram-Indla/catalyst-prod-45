import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Copy, Edit, Trash2, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface DependencyContextMenuProps {
  children: React.ReactNode;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onMarkComplete?: () => void;
  onMarkBlocked?: () => void;
  onChangeStatus?: (status: string) => void;
}

export function DependencyContextMenu({
  children,
  onEdit,
  onDuplicate,
  onDelete,
  onMarkComplete,
  onMarkBlocked,
  onChangeStatus,
}: DependencyContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        {onEdit && (
          <ContextMenuItem onClick={onEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Dependency
          </ContextMenuItem>
        )}
        
        {onDuplicate && (
          <ContextMenuItem onClick={onDuplicate}>
            <Copy className="mr-2 h-4 w-4" />
            Duplicate
          </ContextMenuItem>
        )}

        {(onEdit || onDuplicate) && <ContextMenuSeparator />}

        {onChangeStatus && (
          <>
            <ContextMenuItem onClick={() => onChangeStatus('pending_commit')}>
              <Clock className="mr-2 h-4 w-4" />
              Mark as Pending Commit
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onChangeStatus('committed')}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Mark as Committed
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onChangeStatus('in_progress')}>
              <Clock className="mr-2 h-4 w-4" />
              Mark as In Progress
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onChangeStatus('delivered')}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Mark as Delivered
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onChangeStatus('done')}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Mark as Done
            </ContextMenuItem>
            {onMarkBlocked && (
              <ContextMenuItem onClick={onMarkBlocked}>
                <XCircle className="mr-2 h-4 w-4" />
                Mark as Blocked
              </ContextMenuItem>
            )}
            <ContextMenuSeparator />
          </>
        )}

        {onDelete && (
          <ContextMenuItem onClick={onDelete} className="text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
