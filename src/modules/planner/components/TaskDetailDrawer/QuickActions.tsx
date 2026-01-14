// ============================================================
// QUICK ACTIONS BAR - POLISHED
// Move, Copy link, Pin buttons with keyboard hints
// ============================================================

import { ArrowRight, Link2, Star } from 'lucide-react';
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
    <div className="flex items-center gap-1.5 px-6 py-2.5 bg-gray-50 border-b border-gray-100">
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs font-medium"
      >
        <ArrowRight className="w-3.5 h-3.5 mr-1.5" />
        Move to
        <kbd className="ml-2 px-1.5 py-0.5 bg-gray-100 rounded text-[10px] text-gray-400 font-mono">M</kbd>
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={copyLink}
        className="h-7 text-xs font-medium"
      >
        <Link2 className="w-3.5 h-3.5 mr-1.5" />
        Copy link
        <kbd className="ml-2 px-1.5 py-0.5 bg-gray-100 rounded text-[10px] text-gray-400 font-mono">C</kbd>
      </Button>
      
      <div className="w-px h-5 bg-gray-200 mx-1" />
      
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs font-medium"
      >
        <Star className="w-3.5 h-3.5 mr-1.5" />
        Pin
        <kbd className="ml-2 px-1.5 py-0.5 bg-gray-100 rounded text-[10px] text-gray-400 font-mono">P</kbd>
      </Button>
    </div>
  );
}
