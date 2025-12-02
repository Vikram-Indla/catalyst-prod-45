import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Copy,
  ArrowUp,
  ArrowDown,
  Move,
  Calendar,
  Trash2,
  Archive,
  ParkingCircle
} from 'lucide-react';

interface Epic {
  id: string;
  name: string;
  state?: string;
  deleted_at?: string | null;
  parked_at?: string | null;
}

interface EpicContextMenuProps {
  epic: Epic;
  children: React.ReactNode;
  onDuplicate: (epic: Epic) => void;
  onMoveToTop: (epic: Epic) => void;
  onMoveToBottom: (epic: Epic) => void;
  onMoveToPosition: (epic: Epic) => void;
  onMoveToPI: (epic: Epic) => void;
  onRecycleBin: (epic: Epic) => void;
  onParkingLot: (epic: Epic) => void;
}

export function EpicContextMenu({
  epic,
  children,
  onDuplicate,
  onMoveToTop,
  onMoveToBottom,
  onMoveToPosition,
  onMoveToPI,
  onRecycleBin,
  onParkingLot
}: EpicContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56 bg-popover">
        <ContextMenuItem onSelect={() => onDuplicate(epic)}>
          <Copy className="h-4 w-4 mr-2" />
          Duplicate Epic
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={() => onMoveToTop(epic)}>
          <ArrowUp className="h-4 w-4 mr-2" />
          Move to Top
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => onMoveToBottom(epic)}>
          <ArrowDown className="h-4 w-4 mr-2" />
          Move to Bottom
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => onMoveToPosition(epic)}>
          <Move className="h-4 w-4 mr-2" />
          Move to Position...
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={() => onMoveToPI(epic)}>
          <Calendar className="h-4 w-4 mr-2" />
          Move to PI...
        </ContextMenuItem>
        <ContextMenuSeparator />
        {!epic.parked_at ? (
          <ContextMenuItem onSelect={() => onParkingLot(epic)}>
            <ParkingCircle className="h-4 w-4 mr-2" />
            Move to Parking Lot
          </ContextMenuItem>
        ) : (
          <ContextMenuItem onSelect={() => onParkingLot(epic)}>
            <Archive className="h-4 w-4 mr-2" />
            Remove from Parking Lot
          </ContextMenuItem>
        )}
        {!epic.deleted_at && (
          <ContextMenuItem onSelect={() => onRecycleBin(epic)} className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Move to Recycle Bin
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
