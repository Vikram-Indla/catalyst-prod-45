import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { 
  ExternalLink, 
  Copy, 
  ArrowUp, 
  ArrowDown, 
  MoveUp, 
  MoveDown,
  Trash2,
  Archive,
  Calendar
} from 'lucide-react';
import { ReactNode } from 'react';

interface BacklogContextMenuProps {
  children: ReactNode;
  itemId: string;
  onOpen?: () => void;
  onDuplicate?: () => void;
  onMoveToTop?: () => void;
  onMoveToBottom?: () => void;
  onMoveToPI?: (piId: string) => void;
  onDelete?: () => void;
  onPark?: () => void;
  availablePIs?: Array<{ id: string; name: string }>;
}

export function BacklogContextMenu({
  children,
  itemId,
  onOpen,
  onDuplicate,
  onMoveToTop,
  onMoveToBottom,
  onMoveToPI,
  onDelete,
  onPark,
  availablePIs = [],
}: BacklogContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem onClick={onOpen}>
          <ExternalLink className="mr-2 h-4 w-4" />
          Open
        </ContextMenuItem>
        
        <ContextMenuItem onClick={onDuplicate}>
          <Copy className="mr-2 h-4 w-4" />
          Duplicate
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem onClick={onMoveToTop}>
          <MoveUp className="mr-2 h-4 w-4" />
          Move to Top
        </ContextMenuItem>

        <ContextMenuItem onClick={onMoveToBottom}>
          <MoveDown className="mr-2 h-4 w-4" />
          Move to Bottom
        </ContextMenuItem>

        {availablePIs.length > 0 && (
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <Calendar className="mr-2 h-4 w-4" />
              Move to PI
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-48">
              {availablePIs.map((pi) => (
                <ContextMenuItem
                  key={pi.id}
                  onClick={() => onMoveToPI?.(pi.id)}
                >
                  {pi.name}
                </ContextMenuItem>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}

        <ContextMenuSeparator />

        <ContextMenuItem onClick={onPark}>
          <Archive className="mr-2 h-4 w-4" />
          Move to Parking Lot
        </ContextMenuItem>

        <ContextMenuItem onClick={onDelete} className="text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
