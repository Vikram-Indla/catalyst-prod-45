// ============================================================
// WORKSTREAMS V10 GRID CARD
// Matches GOD-TIER spec: Lead section, Team avatars, stats, action buttons
// ============================================================

import { cn } from '@/lib/utils';
import { ChevronDown, MoreVertical } from 'lucide-react';
import { WorkstreamDataV10 } from './types';
import { HealthBadge, TrendIndicator } from './HealthBadge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface GridCardProps {
  workstream: WorkstreamDataV10;
  isSelected?: boolean;
  onClick?: () => void;
  onDoubleClick?: () => void;
  onViewTasks?: () => void;
  onViewBoard?: () => void;
  onManageMembers?: () => void;
  onChangeLead?: () => void;
}

export function GridCard({
  workstream,
  isSelected,
  onClick,
  onDoubleClick,
  onViewTasks,
  onViewBoard,
  onManageMembers,
  onChangeLead,
}: GridCardProps) {
  const {
    name,
    code,
    color,
    task_count,
    overdue_count,
    progress,
    members,
    health,
    healthTrend,
    lead,
    isLocked,
  } = workstream;

  // Filter non-lead members
  const teamMembers = members.filter(m => m.role !== 'lead');

  if (isLocked) {
    return (
      <div
        className={cn(
          'rounded-xl border bg-card p-5 cursor-pointer transition-all duration-200',
          'border-slate-200 dark:border-slate-700 opacity-60'
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="font-semibold text-base text-foreground">{name}</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs text-muted-foreground">
            🔒 Locked
          </div>
        </div>
        <div className="text-xs text-muted-foreground mb-4">{code}</div>

        {/* Locked content */}
        <div className="text-center py-8">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <span className="text-2xl">🔒</span>
          </div>
          <p className="text-sm text-muted-foreground mb-1">You're not a member</p>
          <p className="text-xs text-muted-foreground">
            Lead: {lead?.full_name || 'Unassigned'} · {task_count} Tasks
          </p>
        </div>

        <Button variant="outline" className="w-full mt-4">
          Request Access
        </Button>
      </div>
    );
  }

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
        'group rounded-xl border bg-card p-5 cursor-pointer transition-all duration-200',
        'hover:shadow-lg hover:border-primary/30',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        isSelected && 'ring-2 ring-primary border-primary',
        'border-slate-200 dark:border-slate-700'
      )}
      aria-label={`Workstream: ${name}`}
    >
      {/* Header: Name + Health Badge */}
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: color }}
          />
          <span className="font-semibold text-base text-foreground">{name}</span>
        </div>
        <div className="flex items-center gap-1">
          <HealthBadge health={health} size="sm" />
          <TrendIndicator trend={healthTrend} />
        </div>
      </div>

      {/* Code */}
      <div className="text-xs text-muted-foreground mb-4 pl-4">{code}</div>

      {/* Divider */}
      <div className="border-t border-slate-100 dark:border-slate-800 -mx-5 mb-4" />

      {/* Lead Section */}
      <div className="mb-4">
        <p className="text-xs text-muted-foreground mb-2">Lead</p>
        <div
          className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onChangeLead?.();
          }}
        >
          {lead ? (
            <div className="flex items-center gap-2">
              <Avatar className="w-7 h-7">
                <AvatarImage src={lead.avatar_url || undefined} />
                <AvatarFallback
                  className="text-xs font-medium text-white"
                  style={{ backgroundColor: lead.color }}
                >
                  {lead.initials}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-foreground">
                {lead.full_name || 'Unknown'}
              </span>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground italic">Unassigned</span>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onChangeLead?.();
            }}
          >
            {lead ? 'Change' : 'Assign'}
            <ChevronDown className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Team Section */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-muted-foreground">Team</p>
        </div>
        <div className="flex items-center justify-between">
          {teamMembers.length > 0 ? (
            <div className="flex -space-x-2">
              {teamMembers.slice(0, 4).map((member) => (
                <Avatar key={member.id} className="w-7 h-7 border-2 border-background">
                  <AvatarImage src={member.avatar_url || undefined} />
                  <AvatarFallback
                    className="text-xs font-medium text-white"
                    style={{ backgroundColor: member.color }}
                  >
                    {member.initials}
                  </AvatarFallback>
                </Avatar>
              ))}
              {teamMembers.length > 4 && (
                <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-background flex items-center justify-center text-xs font-medium text-muted-foreground">
                  +{teamMembers.length - 4}
                </div>
              )}
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">No members</span>
          )}
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs text-primary"
            onClick={(e) => {
              e.stopPropagation();
              onManageMembers?.();
            }}
          >
            {teamMembers.length > 0 ? 'Manage →' : 'Add →'}
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
          <p className="text-lg font-bold text-foreground">{task_count}</p>
          <p className="text-[10px] uppercase text-muted-foreground tracking-wide">Tasks</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
          <p className={cn(
            'text-lg font-bold',
            overdue_count > 0 ? 'text-red-500' : 'text-foreground'
          )}>
            {overdue_count}
          </p>
          <p className="text-[10px] uppercase text-muted-foreground tracking-wide">Overdue</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
          <p className="text-lg font-bold text-foreground">{progress}%</p>
          <p className="text-[10px] uppercase text-muted-foreground tracking-wide">Progress</p>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center gap-2">
        <Button
          className="flex-1 h-9"
          onClick={(e) => {
            e.stopPropagation();
            onViewTasks?.();
          }}
        >
          Tasks
        </Button>
        <Button
          variant="outline"
          className="flex-1 h-9"
          onClick={(e) => {
            e.stopPropagation();
            onViewBoard?.();
          }}
        >
          Board
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Edit</DropdownMenuItem>
            <DropdownMenuItem>Archive</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export default GridCard;
