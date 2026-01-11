// ============================================================
// TOP IDEAS LIST COMPONENT
// ============================================================

import { ThumbsUp, ArrowUpRight, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { ImprovementIdea } from '@/types/improvement-ideas';
import { IDEA_CATEGORY_LABELS, IDEA_STATUS_LABELS } from '@/types/improvement-ideas';

interface TopIdeasListProps {
  ideas: ImprovementIdea[];
  loading?: boolean;
  onIdeaClick?: (id: string) => void;
}

const statusColors: Record<string, string> = {
  submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  under_review: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  scoring: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  deferred: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  converted: 'bg-primary/10 text-primary',
};

export function TopIdeasList({ ideas, loading = false, onIdeaClick }: TopIdeasListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-3 rounded-lg border">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (ideas.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No ideas yet. Be the first to submit!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {ideas.map((idea, index) => (
        <div
          key={idea.id}
          onClick={() => onIdeaClick?.(idea.id)}
          className={cn(
            "flex items-center gap-4 p-3 rounded-lg border bg-card",
            "hover:bg-muted/50 hover:border-primary/30 cursor-pointer transition-colors",
            "group"
          )}
        >
          {/* Rank Badge */}
          <div className={cn(
            "h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0",
            index === 0 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
            index === 1 ? "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300" :
            index === 2 ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
            "bg-muted text-muted-foreground"
          )}>
            {index + 1}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm text-foreground truncate group-hover:text-primary transition-colors">
              {idea.title}
            </h4>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">
                {IDEA_CATEGORY_LABELS[idea.category]}
              </span>
              <span className="text-muted-foreground">·</span>
              <Badge 
                variant="secondary" 
                className={cn("text-[10px] px-1.5 py-0", statusColors[idea.status])}
              >
                {IDEA_STATUS_LABELS[idea.status]}
              </Badge>
            </div>
          </div>

          {/* Votes */}
          <div className="flex items-center gap-1.5 text-sm shrink-0">
            <ThumbsUp className="h-4 w-4 text-emerald-600" />
            <span className="font-medium text-foreground">{idea.for_votes}</span>
          </div>

          {/* Arrow */}
          <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </div>
      ))}
    </div>
  );
}
