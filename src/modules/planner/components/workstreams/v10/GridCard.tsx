// ============================================================
// WORKSTREAMS V10 GRID CARD
// High-density card for grid view with health indicators
// ============================================================

import { cn } from '@/lib/utils';
import { Users, Calendar, TrendingUp } from 'lucide-react';
import { WorkstreamDataV10 } from './types';
import { HealthBadge, TrendIndicator } from './HealthBadge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';

interface GridCardProps {
  workstream: WorkstreamDataV10;
  isSelected?: boolean;
  onClick?: () => void;
  onDoubleClick?: () => void;
}

export function GridCard({ workstream, isSelected, onClick, onDoubleClick }: GridCardProps) {
  const {
    name,
    code,
    color,
    task_count,
    overdue_count,
    completed_count,
    progress,
    members,
    health,
    healthTrend,
    lead,
    due_date,
    isLocked,
  } = workstream;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onClick?.();
        if (e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={cn(
        'group relative rounded-lg border bg-card p-4 cursor-pointer transition-all duration-200',
        'hover:shadow-md hover:border-primary/30',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        isSelected && 'ring-2 ring-primary border-primary',
        isLocked && 'opacity-60'
      )}
    >
      {/* Color accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
        style={{ backgroundColor: color }}
      />

      {/* Header */}
      <div className="flex items-start justify-between mb-3 pl-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded"
              style={{ backgroundColor: `${color}20`, color }}
            >
              {code}
            </span>
            <TrendIndicator trend={healthTrend} />
          </div>
          <h3 className="font-semibold text-sm mt-1 truncate text-foreground">
            {name}
          </h3>
        </div>
        <HealthBadge health={health} size="sm" />
      </div>

      {/* Progress bar */}
      <div className="mb-3 pl-2">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
          <span>{completed_count} of {task_count} tasks</span>
          <span className="font-medium">{progress}%</span>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground mb-3 pl-2">
        {overdue_count > 0 && (
          <span className="text-destructive font-medium">
            {overdue_count} overdue
          </span>
        )}
        {due_date && (
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {format(new Date(due_date), 'MMM d')}
          </span>
        )}
      </div>

      {/* Footer: Lead + Members */}
      <div className="flex items-center justify-between pt-2 border-t border-border/50 pl-2">
        {/* Lead */}
        <div className="flex items-center gap-2">
          {lead ? (
            <>
              <Avatar className="w-5 h-5">
                <AvatarImage src={lead.avatar_url || undefined} />
                <AvatarFallback
                  className="text-[8px] font-medium"
                  style={{ backgroundColor: lead.color, color: '#fff' }}
                >
                  {lead.initials}
                </AvatarFallback>
              </Avatar>
              <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">
                {lead.full_name || 'Lead'}
              </span>
            </>
          ) : (
            <span className="text-[10px] text-muted-foreground italic">No lead</span>
          )}
        </div>

        {/* Member avatars */}
        <div className="flex items-center">
          <div className="flex -space-x-1.5">
            {members.slice(0, 3).map((member) => (
              <Avatar key={member.id} className="w-5 h-5 border border-background">
                <AvatarImage src={member.avatar_url || undefined} />
                <AvatarFallback
                  className="text-[8px] font-medium"
                  style={{ backgroundColor: member.color, color: '#fff' }}
                >
                  {member.initials}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
          {members.length > 3 && (
            <span className="text-[10px] text-muted-foreground ml-1">
              +{members.length - 3}
            </span>
          )}
          {members.length === 0 && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Users className="w-3 h-3" />
              0
            </span>
          )}
        </div>
      </div>

      {/* Locked overlay */}
      {isLocked && (
        <div className="absolute inset-0 bg-background/50 rounded-lg flex items-center justify-center">
          <span className="text-xs text-muted-foreground">Locked</span>
        </div>
      )}
    </div>
  );
}

export default GridCard;
