// ============================================================
// IDEA CARD REBUILT - Grid View with Full Features
// ============================================================

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Zap, Box, Tag, Link2, ThumbsUp, MessageCircle, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ImprovementIdea } from "@/types/improvement-ideas";
import { IDEA_CATEGORY_LABELS } from "@/types/improvement-ideas";

interface IdeaCardRebuiltProps {
  idea: ImprovementIdea;
  onClick?: () => void;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
  className?: string;
}

const statusColors: Record<string, string> = {
  submitted: "bg-blue-100 text-blue-700 border-blue-200",
  under_review: "bg-amber-100 text-amber-700 border-amber-200",
  triaged: "bg-indigo-100 text-indigo-700 border-indigo-200",
  scoring: "bg-purple-100 text-purple-700 border-purple-200",
  quick_win_approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
  approved: "bg-green-100 text-green-700 border-green-200",
  converted: "bg-teal-100 text-teal-800 border-teal-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
  deferred: "bg-slate-100 text-slate-600 border-slate-200",
};

const typeConfig = {
  quick_win: { 
    icon: Zap, 
    label: "Quick Win", 
    colors: "bg-green-100 text-green-700 border-green-200" 
  },
  strategic: { 
    icon: Box, 
    label: "Strategic", 
    colors: "bg-blue-100 text-blue-600 border-blue-200" 
  },
  standard: { 
    icon: null, 
    label: "Standard", 
    colors: "bg-slate-100 text-slate-600 border-slate-200" 
  }
};

export function IdeaCardRebuilt({ idea, onClick, selected, onSelect, className }: IdeaCardRebuiltProps) {
  const score = idea.impact_score?.calculated_score ?? 0;
  const displayScore = score > 5 ? score / 20 : score; // Normalize if score is /100
  const TypeIcon = typeConfig[idea.idea_type]?.icon;

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <Card 
      onClick={onClick}
      className={cn(
        "bg-white rounded-xl border overflow-hidden cursor-pointer group relative",
        "hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-0.5",
        "transition-all duration-200",
        selected && "ring-2 ring-blue-500 border-blue-500",
        className
      )}
    >
      {/* Selection Checkbox */}
      {onSelect && (
        <div 
          className="absolute top-4 left-4 z-10"
          onClick={handleCheckboxClick}
        >
          <Checkbox
            checked={selected}
            onCheckedChange={(checked) => onSelect(!!checked)}
            className="h-4 w-4 border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
          />
        </div>
      )}

      {/* Header */}
      <div className="p-5 pb-3">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge 
              variant="outline"
              className={cn(
                "text-[10px] font-medium border",
                statusColors[idea.status] || statusColors.submitted
              )}
            >
              {idea.status.replace(/_/g, ' ')}
            </Badge>
            
            {idea.idea_type !== 'standard' && (
              <Badge 
                variant="outline"
                className={cn(
                  "text-[10px] font-medium border gap-1",
                  typeConfig[idea.idea_type]?.colors
                )}
              >
                {TypeIcon && <TypeIcon className="w-3 h-3" />}
                {typeConfig[idea.idea_type]?.label}
              </Badge>
            )}
          </div>
          
          <span className="text-xs font-mono text-slate-400 shrink-0">{idea.code}</span>
        </div>

        <h3 className="text-[15px] font-semibold text-slate-900 leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors mb-2">
          {idea.title}
        </h3>

        <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">
          {idea.description}
        </p>
      </div>

      {/* IMPACT Bar */}
      <div className="px-5 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            IMPACT
          </span>
          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full rounded-full transition-all",
                displayScore >= 4 ? "bg-emerald-500" :
                displayScore >= 3 ? "bg-blue-500" :
                displayScore >= 2 ? "bg-amber-500" :
                "bg-slate-300"
              )}
              style={{ width: `${(displayScore / 5) * 100}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-slate-700 min-w-[28px] text-right">
            {displayScore.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
        {idea.initiative ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 rounded-md text-xs font-medium text-blue-600 max-w-[140px] truncate">
            <Link2 className="w-3 h-3 shrink-0" />
            {idea.initiative.title}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-md text-xs font-medium text-slate-600 max-w-[140px] truncate">
            <Tag className="w-3 h-3 shrink-0" />
            {IDEA_CATEGORY_LABELS[idea.category]}
          </span>
        )}

        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <ThumbsUp className="w-3.5 h-3.5 text-emerald-500" />
            <span className="font-medium">{idea.for_votes || 0}</span>
          </span>
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <MessageCircle className="w-3.5 h-3.5" />
            {(idea as any).comments_count || 0}
          </span>
        </div>
      </div>
    </Card>
  );
}
