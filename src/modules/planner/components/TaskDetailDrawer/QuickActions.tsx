// ============================================================
// QUICK ACTIONS BAR
// Move, Copy link, Pin buttons with keyboard hints
// ============================================================

import { ArrowRightLeft, Link2, Pin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface QuickActionsProps {
  taskId: string;
  taskKey: string;
}

export function QuickActions({ taskId, taskKey }: QuickActionsProps) {
  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/planner/task/${taskKey}`);
    toast.success('Link copied!');
  };

  return (
    <div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-muted/30">
      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowRightLeft className="w-3.5 h-3.5 mr-1.5" />
        Move to
        <kbd className="ml-2 px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">M</kbd>
      </Button>
      
      <div className="w-px h-4 bg-border" />
      
      <Button
        variant="ghost"
        size="sm"
        onClick={copyLink}
        className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground"
      >
        <Link2 className="w-3.5 h-3.5 mr-1.5" />
        Copy link
        <kbd className="ml-2 px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">C</kbd>
      </Button>
      
      <div className="w-px h-4 bg-border" />
      
      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground"
      >
        <Pin className="w-3.5 h-3.5 mr-1.5" />
        Pin
        <kbd className="ml-2 px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">P</kbd>
      </Button>
    </div>
  );
}
