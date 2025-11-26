import { useState } from 'react';
import { Zap, MessageSquare, Star, Grid, BarChart2, FileText, Link, FileSignature, Activity, ChevronDown } from 'lucide-react';

interface QuickActionsProps {
  discussionCount: number;
}

export function QuickActions({ discussionCount }: QuickActionsProps) {
  const [showMore, setShowMore] = useState(false);

  const actions = [
    { id: 'discussions', label: 'Discussions', icon: <MessageSquare className="w-4 h-4" />, badge: discussionCount },
    { id: 'subscribe', label: 'Subscribe', icon: <Star className="w-4 h-4" /> },
    { id: 'update-process', label: 'Update child process steps', icon: <Grid className="w-4 h-4" /> },
    { id: 'responsibility', label: 'Responsibility Matrix', icon: <BarChart2 className="w-4 h-4" /> },
    { id: 'trace', label: 'Trace This Epic', icon: <FileText className="w-4 h-4" /> },
    { id: 'status', label: 'Status Report', icon: <FileSignature className="w-4 h-4" /> },
    { id: 'requirement', label: 'Requirement Hierarchy', icon: <Link className="w-4 h-4" /> },
    { id: 'audit', label: 'Audit Log', icon: <Activity className="w-4 h-4" /> },
  ];

  const visibleActions = showMore ? actions : actions.slice(0, 5);

  return (
    <div className="flex flex-col gap-1 pt-4 border-t border-border">
      <button className="flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded text-sm font-medium transition-colors mb-3">
        <Zap className="w-4 h-4" />
        Fast Edit
      </button>

      {visibleActions.map((action) => (
        <button
          key={action.id}
          className="flex items-center justify-between py-2 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <div className="flex items-center gap-2">
            {action.icon}
            <span>{action.label}</span>
          </div>
          {action.badge && action.badge > 0 && (
            <div className="w-[18px] h-[18px] bg-destructive rounded-full flex items-center justify-center text-[10px] text-destructive-foreground">
              {action.badge}
            </div>
          )}
        </button>
      ))}

      {!showMore && (
        <button
          onClick={() => setShowMore(true)}
          className="flex items-center gap-1 py-2 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <ChevronDown className="w-4 h-4" />
          Show More
        </button>
      )}
    </div>
  );
}
