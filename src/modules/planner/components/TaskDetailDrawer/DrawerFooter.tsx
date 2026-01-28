// ============================================================
// DRAWER FOOTER - MATCHES REFERENCE
// Created/Updated timestamps on left, action icons on right
// ============================================================

import { formatDistanceToNow, format } from 'date-fns';
import { Monitor, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DrawerFooterProps {
  task: any;
  onDelete: () => void;
  onDuplicate: () => void;
}

export function DrawerFooter({ task }: DrawerFooterProps) {
  return (
    <div className="px-6 py-3 border-t border-border bg-muted/20 flex items-center justify-between">
      {/* Timestamps */}
      <div className="text-xs text-muted-foreground leading-relaxed">
        <div>
          <span className="text-muted-foreground">Created </span>
          <span className="text-foreground">{format(new Date(task.created_at), 'MMM d, yyyy')}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Updated </span>
          <span className="text-foreground">{formatDistanceToNow(new Date(task.updated_at), { addSuffix: false })}</span>
        </div>
      </div>

      {/* Action Icons */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 rounded-lg hover:bg-muted text-muted-foreground"
          title="Open in desktop"
        >
          <Monitor className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 rounded-lg hover:bg-muted text-muted-foreground"
          title="Help"
        >
          <HelpCircle className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
