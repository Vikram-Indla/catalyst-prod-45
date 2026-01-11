// ============================================================
// ACTIVITY FEED - Real-time Updates
// ============================================================

import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
  id: string;
  user: {
    name: string;
    initials: string;
  };
  action: string;
  target?: string;
  targetLink?: string;
  badge?: {
    label: string;
    variant: 'converted' | 'voted' | 'commented' | 'created';
  };
  timestamp: Date;
}

interface ActivityFeedProps {
  items: ActivityItem[];
  loading?: boolean;
  className?: string;
}

const badgeVariants = {
  converted: 'bg-emerald-100 text-emerald-700',
  voted: 'bg-blue-100 text-blue-700',
  commented: 'bg-slate-100 text-slate-600',
  created: 'bg-amber-100 text-amber-700',
};

export function ActivityFeed({ items, loading = false, className }: ActivityFeedProps) {
  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-slate-200" />
            <div className="flex-1">
              <div className="h-4 w-3/4 bg-slate-200 rounded mb-2" />
              <div className="h-3 w-16 bg-slate-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={cn("text-center py-8", className)}>
        <p className="text-sm text-slate-500">No recent activity</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-0", className)}>
      {items.map((item) => (
        <div 
          key={item.id}
          className="flex gap-3 px-6 py-4 border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-colors"
        >
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center text-white text-xs font-semibold shrink-0">
            {item.user.initials}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-700 leading-snug">
              <strong className="font-semibold text-slate-900">{item.user.name}</strong>
              {' '}{item.action}
              {item.target && (
                <>
                  {' '}
                  <span className="text-blue-600 font-medium">{item.target}</span>
                </>
              )}
              {item.badge && (
                <span className={cn(
                  "inline-flex items-center gap-1 ml-2 px-2 py-0.5 text-[11px] font-semibold rounded",
                  badgeVariants[item.badge.variant]
                )}>
                  {item.badge.label}
                </span>
              )}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              {formatDistanceToNow(item.timestamp, { addSuffix: true })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
