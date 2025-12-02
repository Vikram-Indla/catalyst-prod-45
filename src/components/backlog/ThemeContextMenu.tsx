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
        <ContextMenuItem onSelect={onOpen}>
          Open
        </ContextMenuItem>
        <ContextMenuItem onSelect={onDuplicate}>
          Duplicate
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={onMoveToTop}>
          Move To Top
        </ContextMenuItem>
        <ContextMenuItem onSelect={onMoveToBottom}>
          Move To Bottom
        </ContextMenuItem>
        <ContextMenuItem onSelect={onMoveToPosition}>
          Move To Position...
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={onMoveToPI}>
          Move To PI...
        </ContextMenuItem>
        <ContextMenuItem onSelect={onMoveToUnassigned}>
          Move To Unassigned Backlog
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={onDelete} className="text-destructive">
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
