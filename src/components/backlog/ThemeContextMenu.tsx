import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { ReactNode } from 'react';

interface ThemeContextMenuProps {
  children: ReactNode;
  onOpen: () => void;
  onDuplicate: () => void;
  onMoveToTop: () => void;
  onMoveToBottom: () => void;
  onMoveToPosition: () => void;
  onMoveToPI: () => void;
  onMoveToUnassigned: () => void;
  onDelete: () => void;
}

export function ThemeContextMenu({
  children,
  onOpen,
  onDuplicate,
  onMoveToTop,
  onMoveToBottom,
  onMoveToPosition,
  onMoveToPI,
  onMoveToUnassigned,
  onDelete,
}: ThemeContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56 bg-popover">
        <ContextMenuItem onClick={onOpen}>
          Open
        </ContextMenuItem>
        <ContextMenuItem onClick={onDuplicate}>
          Duplicate
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onMoveToTop}>
          Move To Top
        </ContextMenuItem>
        <ContextMenuItem onClick={onMoveToBottom}>
          Move To Bottom
        </ContextMenuItem>
        <ContextMenuItem onClick={onMoveToPosition}>
          Move To Position...
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onMoveToPI}>
          Move To PI...
        </ContextMenuItem>
        <ContextMenuItem onClick={onMoveToUnassigned}>
          Move To Unassigned Backlog
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onDelete} className="text-destructive">
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
