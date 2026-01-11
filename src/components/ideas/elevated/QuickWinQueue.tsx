// ============================================================
// QUICK WIN QUEUE - Hero Action Center
// ============================================================

import { Zap, Star, ThumbsUp, Tag, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface QuickWinItem {
  id: string;
  title: string;
  category: string;
  votes: number;
  impactScore: number;
}

interface QuickWinQueueProps {
  items: QuickWinItem[];
  loading?: boolean;
  onApprove?: (id: string) => void;
  onViewAll?: () => void;
  onItemClick?: (id: string) => void;
  className?: string;
}

export function QuickWinQueue({
  items,
  loading = false,
  onApprove,
  onViewAll,
  onItemClick,
  className,
}: QuickWinQueueProps) {
  if (loading) {
    return (
      <div className={cn("bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-xl overflow-hidden", className)}>
        <div className="bg-gradient-to-r from-emerald-500 to-green-600 px-6 py-5">
          <Skeleton className="h-6 w-48 bg-white/20" />
        </div>
        <div className="p-4 space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full bg-emerald-100" />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={cn("bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-xl overflow-hidden", className)}>
        <div className="bg-gradient-to-r from-emerald-500 to-green-600 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-semibold text-white">Quick Wins Ready for Approval</span>
          </div>
        </div>
        <div className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-100 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-emerald-400" />
          </div>
          <h3 className="text-base font-semibold text-slate-700 mb-1">All caught up!</h3>
          <p className="text-sm text-slate-500">No quick wins pending approval</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-xl overflow-hidden", className)}>
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-green-600 px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-semibold text-white">Quick Wins Ready for Approval</span>
          <span className="px-2.5 py-0.5 bg-white/20 text-white text-xs font-semibold rounded-full">
            {items.length} pending
          </span>
        </div>
        {onViewAll && (
          <button 
            onClick={onViewAll}
            className="text-white text-sm font-semibold flex items-center gap-1 hover:gap-2 transition-all"
          >
            View all <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Items */}
      <div>
        {items.slice(0, 5).map((item, index) => (
          <div 
            key={item.id}
            onClick={() => onItemClick?.(item.id)}
            className="flex items-center px-6 py-4 border-b border-emerald-100 last:border-b-0 hover:bg-white/50 transition-colors cursor-pointer"
          >
            {/* Rank */}
            <div className="w-7 h-7 rounded-full bg-white border-2 border-emerald-500 flex items-center justify-center text-xs font-bold text-emerald-600 mr-4 shrink-0">
              {index + 1}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-slate-900 truncate mb-1">
                {item.title}
              </h4>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  {item.category}
                </span>
                <span className="flex items-center gap-1">
                  <ThumbsUp className="w-3 h-3" />
                  {item.votes} votes
                </span>
              </div>
            </div>

            {/* Score & Action */}
            <div className="flex items-center gap-3 ml-4">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full border border-emerald-200">
                <Star className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-sm font-bold text-emerald-600">{item.impactScore.toFixed(1)}</span>
              </div>
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onApprove?.(item.id);
                }}
                className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold shadow-md shadow-emerald-500/25 hover:-translate-y-0.5 transition-all"
              >
                Approve & Create BR
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
