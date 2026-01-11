// ============================================================
// IDEA CARD COMPONENT - Grid View
// ============================================================

import { ThumbsUp, ThumbsDown, MessageSquare, Target, Clock, User } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import type { ImprovementIdea } from '@/types/improvement-ideas';
import { IDEA_CATEGORY_LABELS, IDEA_STATUS_LABELS } from '@/types/improvement-ideas';

interface IdeaCardProps {
  idea: ImprovementIdea;
  onClick?: () => void;
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  under_review: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  triaged: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  scoring: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  quick_win_approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  linked: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  deferred: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  converted: 'bg-primary/10 text-primary',
  archived: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
};

const categoryColors: Record<string, string> = {
  licensing_improvement: 'border-blue-500',
  compliance_automation: 'border-purple-500',
  investor_experience: 'border-amber-500',
  process_optimization: 'border-emerald-500',
  digital_service: 'border-cyan-500',
  integration: 'border-indigo-500',
  data_quality: 'border-teal-500',
  accessibility: 'border-pink-500',
  security_enhancement: 'border-red-500',
  reporting_analytics: 'border-orange-500',
  mobile_capability: 'border-sky-500',
  other: 'border-gray-400',
};

export function IdeaCard({ idea, onClick }: IdeaCardProps) {
  const score = idea.impact_score?.calculated_score;
  const timeAgo = formatDistanceToNow(new Date(idea.created_at), { addSuffix: true });

  return (
    <Card 
      className={cn(
        "group cursor-pointer hover:shadow-md transition-all duration-200",
        "border-l-4",
        categoryColors[idea.category] || 'border-l-gray-400'
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <Badge 
            variant="secondary" 
            className={cn("text-[10px] shrink-0", statusColors[idea.status])}
          >
            {IDEA_STATUS_LABELS[idea.status]}
          </Badge>
          <span className="text-[10px] text-muted-foreground">{idea.code}</span>
        </div>
        <h3 className="font-medium text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
          {idea.title}
        </h3>
      </CardHeader>

      <CardContent className="pb-3">
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
          {idea.description}
        </p>
        
        <Badge variant="outline" className="text-[10px]">
          {IDEA_CATEGORY_LABELS[idea.category]}
        </Badge>
      </CardContent>

      <CardFooter className="pt-0 border-t bg-muted/30">
        <div className="flex items-center justify-between w-full py-2">
          {/* Votes */}
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-xs">
              <ThumbsUp className="h-3.5 w-3.5 text-emerald-600" />
              <span className="font-medium">{idea.for_votes}</span>
            </span>
            <span className="flex items-center gap-1 text-xs">
              <ThumbsDown className="h-3.5 w-3.5 text-red-500" />
              <span className="font-medium">{idea.against_votes}</span>
            </span>
          </div>

          {/* Impact Score */}
          {score !== undefined && score !== null && (
            <div className="flex items-center gap-1 text-xs">
              <Target className="h-3.5 w-3.5 text-primary" />
              <span className="font-medium">{score.toFixed(1)}</span>
            </div>
          )}

          {/* Time */}
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            {timeAgo}
          </span>
        </div>
      </CardFooter>
    </Card>
  );
}
