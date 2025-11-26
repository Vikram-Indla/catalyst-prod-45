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
import { ArrowUp, ArrowDown, ArrowUpToLine, ArrowDownToLine } from 'lucide-react';

interface ForecastContextMenuProps {
  children: React.ReactNode;
  onMoveToTop: () => void;
  onMoveToBottom: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export function ForecastContextMenu({
  children,
  onMoveToTop,
  onMoveToBottom,
  onMoveUp,
  onMoveDown,
}: ForecastContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <ArrowUp className="mr-2 h-4 w-4" />
            Move
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem onClick={onMoveToTop}>
              <ArrowUpToLine className="mr-2 h-4 w-4" />
              Move to Top
            </ContextMenuItem>
            <ContextMenuItem onClick={onMoveUp}>
              <ArrowUp className="mr-2 h-4 w-4" />
              Move Up
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={onMoveDown}>
              <ArrowDown className="mr-2 h-4 w-4" />
              Move Down
            </ContextMenuItem>
            <ContextMenuItem onClick={onMoveToBottom}>
              <ArrowDownToLine className="mr-2 h-4 w-4" />
              Move to Bottom
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
      </ContextMenuContent>
    </ContextMenu>
  );
}
