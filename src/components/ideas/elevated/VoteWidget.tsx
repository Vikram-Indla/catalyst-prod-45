// ============================================================
// VOTE WIDGET - Interactive Voting with Visual Feedback
// ============================================================

import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface VoteWidgetProps {
  forVotes: number;
  againstVotes: number;
  onVote?: (type: 'for' | 'against') => void;
  disabled?: boolean;
  userVote?: 'for' | 'against' | null;
  size?: 'sm' | 'md' | 'lg';
  showBar?: boolean;
  className?: string;
}

export function VoteWidget({
  forVotes,
  againstVotes,
  onVote,
  disabled = false,
  userVote = null,
  size = 'md',
  showBar = true,
  className,
}: VoteWidgetProps) {
  const [isVoting, setIsVoting] = useState(false);
  const total = forVotes + againstVotes;
  const percentage = total > 0 ? Math.round((forVotes / total) * 100) : 50;

  const handleVote = async (type: 'for' | 'against') => {
    if (disabled || isVoting || !onVote) return;
    setIsVoting(true);
    try {
      await onVote(type);
    } finally {
      setIsVoting(false);
    }
  };

  const sizeConfig = {
    sm: { btn: 'px-2 py-1 text-xs gap-1', icon: 'w-3 h-3', bar: 'w-16 h-1.5' },
    md: { btn: 'px-4 py-2 text-sm gap-2', icon: 'w-4 h-4', bar: 'w-24 h-2' },
    lg: { btn: 'px-5 py-2.5 text-base gap-2', icon: 'w-5 h-5', bar: 'w-28 h-2' },
  };

  const config = sizeConfig[size];

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <button
        onClick={() => handleVote('for')}
        disabled={disabled || isVoting}
        className={cn(
          "inline-flex items-center font-semibold rounded-lg transition-all duration-150",
          config.btn,
          userVote === 'for'
            ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30"
            : "bg-emerald-100 text-emerald-700 border-2 border-emerald-500 hover:bg-emerald-500 hover:text-white hover:-translate-y-0.5 hover:shadow-md hover:shadow-emerald-500/30",
          (disabled || isVoting) && "opacity-50 cursor-not-allowed"
        )}
      >
        <ThumbsUp className={config.icon} />
        {forVotes}
      </button>

      <button
        onClick={() => handleVote('against')}
        disabled={disabled || isVoting}
        className={cn(
          "inline-flex items-center font-semibold rounded-lg transition-all duration-150",
          config.btn,
          userVote === 'against'
            ? "bg-red-500 text-white"
            : "bg-white text-slate-500 border-2 border-slate-200 hover:border-red-500 hover:text-red-600",
          (disabled || isVoting) && "opacity-50 cursor-not-allowed"
        )}
      >
        <ThumbsDown className={config.icon} />
        {againstVotes}
      </button>

      {showBar && total > 0 && (
        <div className="flex items-center gap-2">
          <div className={cn("bg-slate-200 rounded-full overflow-hidden", config.bar)}>
            <div 
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-emerald-600">
            {percentage}%
          </span>
        </div>
      )}
    </div>
  );
}

// Compact vote display for cards
export function VoteCount({ 
  forVotes, 
  againstVotes 
}: { 
  forVotes: number; 
  againstVotes: number; 
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex items-center gap-1 text-sm font-semibold text-emerald-600">
        <ThumbsUp className="w-4 h-4" />
        {forVotes}
      </span>
      <span className="flex items-center gap-1 text-sm font-semibold text-slate-400">
        <ThumbsDown className="w-4 h-4" />
        {againstVotes}
      </span>
    </div>
  );
}
