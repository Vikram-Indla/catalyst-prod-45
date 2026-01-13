// ============================================================
// CHECKLIST INDICATOR COMPONENT
// Shows checklist progress on task cards
// ============================================================

import { CheckSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ChecklistIndicatorProps {
  storyId: string;
  className?: string;
}

interface ChecklistStats {
  total: number;
  completed: number;
}

export function ChecklistIndicator({ storyId, className }: ChecklistIndicatorProps) {
  const { data: stats } = useQuery({
    queryKey: ['checklist-stats', storyId],
    queryFn: async (): Promise<ChecklistStats> => {
      const { data, error } = await supabase
        .from('planner_checklist_items')
        .select('is_completed, is_header')
        .eq('story_id', storyId);

      if (error) {
        console.error('Error fetching checklist stats:', error);
        return { total: 0, completed: 0 };
      }

      // Only count non-header items
      const completableItems = data.filter(item => !item.is_header);
      const completedItems = completableItems.filter(item => item.is_completed);

      return {
        total: completableItems.length,
        completed: completedItems.length,
      };
    },
    staleTime: 30000, // Cache for 30 seconds
  });

  // Don't show if no checklist items
  if (!stats || stats.total === 0) {
    return null;
  }

  const isComplete = stats.completed === stats.total;

  return (
    <div className={cn(
      "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium",
      isComplete 
        ? "bg-emerald-500/10 text-emerald-600" 
        : "bg-primary/10 text-primary",
      className
    )}>
      <CheckSquare className="w-3.5 h-3.5" />
      <span>{stats.completed} of {stats.total}</span>
    </div>
  );
}
