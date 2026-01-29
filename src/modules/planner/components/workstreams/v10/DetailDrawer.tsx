// ============================================================
// WORKSTREAMS V10 DETAIL DRAWER
// GOD-TIER spec: Health banner, rich description, team cards,
// work summary, recent tasks, activity feed, footer nav
// ============================================================

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { 
  X, 
  Pencil, 
  MoreVertical, 
  Check, 
  Crown, 
  UserPlus,
  List,
  LayoutGrid,
  Calendar,
  TrendingDown,
  TrendingUp,
  Minus,
  AlertTriangle,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { WorkstreamDataV10, WorkstreamActivity, HealthStatus, HealthTrend } from './types';
import { ActivityFeed } from './ActivityFeed';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { format, formatDistanceToNow } from 'date-fns';

interface DetailDrawerProps {
  workstream: WorkstreamDataV10 | null;
  activities: WorkstreamActivity[];
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onAddMember?: () => void;
  onRemoveMember?: (memberId: string) => void;
  onViewTasks?: () => void;
  onViewBoard?: () => void;
  onViewCalendar?: () => void;
}

function HealthBanner({ health, trend, overdueCount, progress }: {
  health: HealthStatus;
  trend: HealthTrend;
  overdueCount: number;
  progress: number;
}) {
  const config = {
    healthy: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      text: 'text-green-700 dark:text-green-400',
      icon: CheckCircle2,
      label: 'On Track',
    },
    'at-risk': {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-200 dark:border-amber-800',
      text: 'text-amber-700 dark:text-amber-400',
      icon: AlertTriangle,
      label: 'At Risk',
    },
    critical: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-700 dark:text-red-400',
      icon: AlertCircle,
      label: 'Critical',
    },
    locked: {
      bg: 'bg-slate-50 dark:bg-slate-800',
      border: 'border-slate-200 dark:border-slate-700',
      text: 'text-slate-600 dark:text-slate-400',
      icon: AlertCircle,
      label: 'Locked',
    },
  };

  const c = config[health];
  const Icon = c.icon;

  const trendText = trend === 'up' ? 'Improving trend' : trend === 'down' ? 'Declining trend' : 'Stable trend';
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <div className={cn('rounded-lg p-4 border', c.bg, c.border)}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={cn('w-4 h-4', c.text)} />
        <span className={cn('font-semibold', c.text)}>{c.label}</span>
        <TrendIcon className={cn('w-3 h-3 ml-1', 
          trend === 'up' ? 'text-green-500' : 
          trend === 'down' ? 'text-red-500' : 
          'text-slate-400'
        )} />
      </div>
      <p className="text-sm text-muted-foreground">
        {overdueCount} overdue · {progress}% completion · {trendText}
      </p>
    </div>
  );
}

export function DetailDrawer({
  workstream,
  activities,
  isOpen,
  onClose,
  onEdit,
  onAddMember,
  onRemoveMember,
  onViewTasks,
  onViewBoard,
  onViewCalendar,
}: DetailDrawerProps) {
  if (!workstream) return null;

  const {
    name,
    code,
    color,
    description,
    task_count,
    overdue_count,
    completed_count,
    in_progress_count,
    backlog_count,
    progress,
    members,
    health,
    healthTrend,
    lead,
    created_at,
  } = workstream;

  // Get non-lead members
  const teamMembers = members.filter(m => m.role !== 'lead');

  // Recent tasks (mock for now - would come from actual data)
  const recentTasks = [
    { key: 'PLN-56', title: 'Delete', status: 'Backlog', dueDate: null, isOverdue: false },
    { key: 'PLN-46', title: 'User Feedback Analysis...', status: 'Planned', dueDate: 'Jan 27', isOverdue: true },
  ];

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[420px] sm:w-[480px] p-0 flex flex-col">
        {/* Header */}
        <div className="p-4 pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: color }}
              />
              <h2 className="text-xl font-semibold text-foreground">{name}</h2>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
                <Pencil className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {code} · Created {created_at ? format(new Date(created_at), 'MMM d, yyyy') : 'Unknown'}
          </p>
        </div>

        {/* Scrollable Content */}
        <ScrollArea className="flex-1">
          <div className="px-4 pb-4 space-y-5">
            {/* Health Banner */}
            <HealthBanner 
              health={health} 
              trend={healthTrend} 
              overdueCount={overdue_count}
              progress={progress}
            />

            {/* Save Status */}
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <Check className="w-4 h-4" />
              All changes saved
            </div>

            <Separator />

            {/* Description */}
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-2">
                Description
              </p>
              <div className="rounded-lg border p-3 bg-muted/30">
                {/* Simple toolbar mock */}
                <div className="flex items-center gap-1 mb-2 pb-2 border-b">
                  <button className="px-2 py-1 text-sm font-bold hover:bg-muted rounded">B</button>
                  <button className="px-2 py-1 text-sm italic hover:bg-muted rounded">I</button>
                  <button className="px-2 py-1 text-sm underline hover:bg-muted rounded">U</button>
                  <button className="px-2 py-1 text-sm hover:bg-muted rounded">🔗</button>
                </div>
                <div className="text-sm text-foreground min-h-[60px]">
                  {description || (
                    <span className="text-muted-foreground italic">Add a description...</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2">Auto-saved</p>
              </div>
            </div>

            {/* Team Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                  Team
                </p>
                <span className="text-xs text-muted-foreground">
                  {members.length} member{members.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Lead Card */}
              {lead ? (
                <div className="rounded-lg border bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800 p-3 mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                      <Crown className="w-3 h-3" />
                      LEAD
                    </div>
                    <Button variant="ghost" size="sm" className="h-6 text-xs">
                      Change
                    </Button>
                  </div>
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={lead.avatar_url || undefined} />
                      <AvatarFallback
                        className="text-sm font-medium text-white"
                        style={{ backgroundColor: lead.color }}
                      >
                        {lead.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">{lead.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {lead.job_title || 'Team Lead'} · Thiqah
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {lead.task_count || 2} tasks · {lead.workstream_count || 2} workstreams
                      </p>
                    </div>
                  </div>
                  {/* Capacity bar */}
                  <div className="mt-3">
                    <Progress value={lead.capacity_percent || 65} className="h-1.5" />
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-4 text-center mb-3">
                  <p className="text-sm text-muted-foreground">No lead assigned</p>
                  <Button variant="link" size="sm" className="mt-1" onClick={onAddMember}>
                    Assign lead
                  </Button>
                </div>
              )}

              {/* Other Members */}
              {teamMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-9 h-9">
                      <AvatarImage src={member.avatar_url || undefined} />
                      <AvatarFallback
                        className="text-xs font-medium text-white"
                        style={{ backgroundColor: member.color }}
                      >
                        {member.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-foreground">{member.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {member.job_title || 'Team Member'} · {member.task_count || 0} tasks · {member.capacity_percent || 40}% capacity
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    Contributor
                  </Badge>
                </div>
              ))}

              {/* Add Member Button */}
              <button
                onClick={onAddMember}
                className="w-full flex items-center justify-center gap-2 py-3 mt-2 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700 text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                <span className="text-sm font-medium">Add Team Member</span>
              </button>
            </div>

            {/* Work Summary */}
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-3">
                Work Summary
              </p>
              <div className="grid grid-cols-5 gap-2 mb-3">
                <div className="text-center">
                  <p className="text-xl font-bold text-foreground">{task_count}</p>
                  <p className="text-[10px] text-muted-foreground">Total</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-foreground">{backlog_count}</p>
                  <p className="text-[10px] text-muted-foreground">Open</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-foreground">{in_progress_count}</p>
                  <p className="text-[10px] text-muted-foreground">In Progress</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-foreground">{completed_count}</p>
                  <p className="text-[10px] text-muted-foreground">Done</p>
                </div>
                <div className="text-center">
                  <p className={cn(
                    'text-xl font-bold',
                    overdue_count > 0 ? 'text-red-500' : 'text-foreground'
                  )}>
                    {overdue_count}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Overdue</p>
                </div>
              </div>
              <div className="relative">
                <Progress value={progress} className="h-2" />
                <span className="absolute right-0 -top-5 text-sm font-medium text-foreground">
                  {progress}%
                </span>
              </div>
            </div>

            {/* Recent Tasks */}
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-3">
                Recent Tasks
              </p>
              <div className="space-y-2">
                {recentTasks.map((task) => (
                  <div key={task.key} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono text-primary">{task.key}</span>
                      <span className="text-sm text-foreground truncate max-w-[180px]">{task.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">{task.status}</Badge>
                      {task.dueDate && (
                        <span className={cn(
                          'text-xs',
                          task.isOverdue ? 'text-red-500' : 'text-muted-foreground'
                        )}>
                          {task.dueDate} {task.isOverdue && '⚠'}
                        </span>
                      )}
                      {!task.dueDate && <span className="text-muted-foreground">—</span>}
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="link" className="w-full mt-2 text-primary" onClick={onViewTasks}>
                View all {task_count} tasks →
              </Button>
            </div>

            {/* Activity */}
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-3">
                Activity
              </p>
              <ActivityFeed activities={activities} maxItems={10} />
            </div>
          </div>
        </ScrollArea>

        {/* Footer Navigation */}
        <div className="p-4 border-t bg-muted/30">
          <div className="grid grid-cols-3 gap-2">
            <Button 
              className="gap-2" 
              onClick={onViewTasks}
            >
              <List className="w-4 h-4" />
              Task List
            </Button>
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={onViewBoard}
            >
              <LayoutGrid className="w-4 h-4" />
              Board
            </Button>
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={onViewCalendar}
            >
              <Calendar className="w-4 h-4" />
              Calendar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default DetailDrawer;
