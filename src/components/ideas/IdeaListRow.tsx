// ============================================================
// IDEA LIST ROW COMPONENT - List View
// ============================================================

import { ThumbsUp, ThumbsDown, Target, Clock, ChevronRight, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import type { ImprovementIdea } from '@/types/improvement-ideas';
import { IDEA_CATEGORY_LABELS, IDEA_STATUS_LABELS } from '@/types/improvement-ideas';

interface IdeaListRowProps {
  idea: ImprovementIdea;
  onClick?: () => void;
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  under_review: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  scoring: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  deferred: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  converted: 'bg-primary/10 text-primary',
  archived: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
};

export function IdeaListRow({ idea, onClick }: IdeaListRowProps) {
  const score = idea.impact_score?.calculated_score;
  const timeAgo = formatDistanceToNow(new Date(idea.created_at), { addSuffix: true });

  return (
    <div 
      className={cn(
        "flex items-center gap-4 p-4 rounded-lg border bg-card",
        "hover:bg-muted/50 hover:border-primary/30 cursor-pointer transition-colors",
        "group"
      )}
      onClick={onClick}
    >
      {/* Code & Status */}
      <div className="w-32 shrink-0">
        <span className="text-xs text-muted-foreground font-mono">{idea.code}</span>
        <div className="mt-1">
          <Badge 
            variant="secondary" 
            className={cn("text-[10px]", statusColors[idea.status])}
          >
            {IDEA_STATUS_LABELS[idea.status]}
          </Badge>
        </div>
      </div>

      {/* Title & Description */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm text-foreground truncate group-hover:text-primary transition-colors">
          {idea.title}
        </h4>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {idea.description}
        </p>
      </div>

      {/* Category */}
      <div className="hidden md:block w-40 shrink-0">
        <Badge variant="outline" className="text-[10px]">
          {IDEA_CATEGORY_LABELS[idea.category]}
        </Badge>
      </div>

      {/* Votes */}
      <div className="flex items-center gap-4 shrink-0">
        <span className="flex items-center gap-1 text-xs">
          <ThumbsUp className="h-3.5 w-3.5 text-emerald-600" />
          <span className="font-medium w-6 text-right">{idea.for_votes}</span>
        </span>
        <span className="flex items-center gap-1 text-xs">
          <ThumbsDown className="h-3.5 w-3.5 text-red-500" />
          <span className="font-medium w-6 text-right">{idea.against_votes}</span>
        </span>
      </div>

      {/* Score */}
      <div className="w-16 shrink-0 text-center">
        {score !== undefined && score !== null ? (
          <div className="flex items-center justify-center gap-1 text-xs">
            <Target className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium">{score.toFixed(1)}</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </div>

      {/* Submitter */}
      <div className="hidden lg:flex items-center gap-1.5 w-32 shrink-0">
        <User className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground truncate">
          {idea.is_anonymous ? 'Anonymous' : (idea.submitter_name || 'Unknown')}
        </span>
      </div>

      {/* Time */}
      <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground w-24 shrink-0">
        <Clock className="h-3 w-3" />
        <span className="truncate">{timeAgo}</span>
      </div>

      {/* Chevron */}
      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </div>
  );
}
