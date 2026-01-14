// ============================================================
// DRAWER FOOTER COMPONENT
// Created/updated meta + Delete/Duplicate actions
// ============================================================

import { formatDistanceToNow, format } from 'date-fns';
import { Trash2, Copy, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DrawerFooterProps {
  task: any;
  onDelete: () => void;
  onDuplicate: () => void;
}

export function DrawerFooter({ task, onDelete, onDuplicate }: DrawerFooterProps) {
  return (
    <div className="px-5 py-4 border-t border-border bg-muted/20">
      <div className="flex items-center justify-between">
        {/* Meta info */}
        <div className="text-xs text-muted-foreground space-y-0.5">
          <div>
            Created {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
          </div>
          <div>
            Updated {formatDistanceToNow(new Date(task.updated_at), { addSuffix: true })}
          </div>
        </div>
        
        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="w-4 h-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
