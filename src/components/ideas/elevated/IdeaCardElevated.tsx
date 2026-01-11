// ============================================================
// IDEA CARD ELEVATED - Grid View with Full Features
// ============================================================

import { MessageSquare, Clock, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { TypeBadge, IdeaType } from './TypeBadge';
import { StatusBadge } from './StatusBadge';
import { ImpactBar } from './ImpactBar';
import { VoteCount } from './VoteWidget';
import type { ImprovementIdea } from '@/types/improvement-ideas';
import { IDEA_CATEGORY_LABELS } from '@/types/improvement-ideas';

interface IdeaCardElevatedProps {
  idea: ImprovementIdea;
  onClick?: () => void;
  className?: string;
}

// Helper to determine idea type
function getIdeaType(idea: ImprovementIdea): IdeaType {
  if (idea.idea_type === 'quick_win' || idea.status === 'quick_win_approved') {
    return 'quick_win';
  }
  if (idea.idea_type === 'strategic' || idea.initiative_id) {
    return 'strategic';
  }
  return 'standard';
}

export function IdeaCardElevated({ idea, onClick, className }: IdeaCardElevatedProps) {
  const score = idea.impact_score?.calculated_score ?? 0;
  const displayScore = score > 5 ? score / 20 : score; // Normalize if score is /100
  const timeAgo = formatDistanceToNow(new Date(idea.created_at), { addSuffix: true });
  const ideaType = getIdeaType(idea);

  return (
    <div 
      onClick={onClick}
      className={cn(
        "bg-white rounded-xl border border-slate-200 overflow-hidden cursor-pointer",
        "hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-0.5",
        "transition-all duration-200 group",
        className
      )}
    >
      {/* Header */}
      <div className="p-5 pb-3">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <StatusBadge status={idea.status} size="sm" />
            {ideaType !== 'standard' && (
              <TypeBadge type={ideaType} size="sm" />
            )}
          </div>
          <span className="text-xs font-mono text-slate-400">{idea.code}</span>
        </div>

        <h3 className="text-[15px] font-semibold text-slate-900 leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors mb-2">
          {idea.title}
        </h3>

        <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">
          {idea.description}
        </p>
      </div>

      {/* Impact Bar */}
      <div className="px-5 pb-4">
        <ImpactBar score={displayScore} size="sm" />
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-md text-xs font-medium text-slate-600">
          {IDEA_CATEGORY_LABELS[idea.category]}
        </span>

        <div className="flex items-center gap-4">
          <VoteCount forVotes={idea.for_votes} againstVotes={idea.against_votes} />
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <MessageSquare className="w-3.5 h-3.5" />
            {(idea as any).comments_count || 0}
          </span>
        </div>
      </div>
    </div>
  );
}

// List row variant
export function IdeaListRowElevated({ idea, onClick, className }: IdeaCardElevatedProps) {
  const score = idea.impact_score?.calculated_score ?? 0;
  const displayScore = score > 5 ? score / 20 : score;
  const timeAgo = formatDistanceToNow(new Date(idea.created_at), { addSuffix: true });
  const ideaType = getIdeaType(idea);
  
  const submitterName = idea.is_anonymous 
    ? 'Anonymous' 
    : idea.submitter?.full_name || idea.submitter_name || 'Unknown';

  return (
    <div 
      onClick={onClick}
      className={cn(
        "bg-white rounded-xl border border-slate-200 p-4",
        "hover:border-blue-500 hover:shadow-md hover:bg-slate-50 cursor-pointer",
        "transition-all duration-150",
        className
      )}
    >
      <div className="flex items-center gap-4">
        {/* Type Badge */}
        {ideaType !== 'standard' && (
          <TypeBadge type={ideaType} size="sm" className="shrink-0" />
        )}

        {/* Title & Code */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h4 className="text-sm font-semibold text-slate-900 truncate">
              {idea.title}
            </h4>
          </div>
          <span className="text-xs font-mono text-slate-400">{idea.code}</span>
        </div>

        {/* Status */}
        <StatusBadge status={idea.status} size="sm" />

        {/* Impact */}
        <div className="flex items-center gap-2 w-32">
          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 rounded-full"
              style={{ width: `${(displayScore / 5) * 100}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-slate-700 w-8 text-right">
            {displayScore.toFixed(1)}
          </span>
        </div>

        {/* Votes */}
        <VoteCount forVotes={idea.for_votes} againstVotes={idea.against_votes} />

        {/* Submitter */}
        <div className="flex items-center gap-2 w-36">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center text-white text-[10px] font-semibold shrink-0">
            {submitterName.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm text-slate-600 truncate">{submitterName}</span>
        </div>

        {/* Date */}
        <span className="text-sm text-slate-500 w-24 text-right shrink-0">
          {timeAgo}
        </span>
      </div>
    </div>
  );
}
