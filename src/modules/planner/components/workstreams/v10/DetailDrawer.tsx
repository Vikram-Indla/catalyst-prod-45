// ============================================================
// WORKSTREAMS V10 DETAIL DRAWER
// Slide-out panel with tabbed sections
// ============================================================

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { X, Users, Activity, Settings, Calendar, TrendingUp, Trash2 } from 'lucide-react';
import { WorkstreamDataV10, WorkstreamActivity } from './types';
import { HealthBadge, TrendIndicator } from './HealthBadge';
import { ActivityFeed } from './ActivityFeed';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { format } from 'date-fns';

interface DetailDrawerProps {
  workstream: WorkstreamDataV10 | null;
  activities: WorkstreamActivity[];
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onAddMember?: () => void;
  onRemoveMember?: (memberId: string) => void;
}

export function DetailDrawer({
  workstream,
  activities,
  isOpen,
  onClose,
  onEdit,
  onAddMember,
  onRemoveMember,
}: DetailDrawerProps) {
  const [activeTab, setActiveTab] = useState('overview');

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
    start_date,
    due_date,
  } = workstream;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[420px] sm:w-[480px] p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="p-4 pb-0 border-b border-border/50">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded"
                  style={{ backgroundColor: `${color}20`, color }}
                >
                  {code}
                </span>
                <HealthBadge health={health} size="sm" />
                <TrendIndicator trend={healthTrend} />
                <TrendIndicator trend={healthTrend} />
              </div>
              <SheetTitle className="text-lg font-semibold text-foreground truncate">
                {name}
              </SheetTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="grid w-full grid-cols-3 h-9">
              <TabsTrigger value="overview" className="text-xs">
                <TrendingUp className="w-3 h-3 mr-1" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="members" className="text-xs">
                <Users className="w-3 h-3 mr-1" />
                Members
              </TabsTrigger>
              <TabsTrigger value="activity" className="text-xs">
                <Activity className="w-3 h-3 mr-1" />
                Activity
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </SheetHeader>

        {/* Content */}
        <ScrollArea className="flex-1">
          <Tabs value={activeTab} className="p-4">
            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-0 space-y-4">
              {/* Description */}
              {description && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-1">Description</h4>
                  <p className="text-sm text-foreground">{description}</p>
                </div>
              )}

              {/* Progress */}
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2">Progress</h4>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>{completed_count} of {task_count} tasks</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              {/* Task breakdown */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <span className="text-[10px] uppercase text-muted-foreground">In Progress</span>
                  <p className="text-lg font-semibold text-foreground">{in_progress_count}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <span className="text-[10px] uppercase text-muted-foreground">Backlog</span>
                  <p className="text-lg font-semibold text-foreground">{backlog_count}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <span className="text-[10px] uppercase text-muted-foreground">Completed</span>
                  <p className="text-lg font-semibold text-green-600">{completed_count}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <span className="text-[10px] uppercase text-muted-foreground">Overdue</span>
                  <p className={cn(
                    "text-lg font-semibold",
                    overdue_count > 0 ? "text-destructive" : "text-foreground"
                  )}>
                    {overdue_count}
                  </p>
                </div>
              </div>

              {/* Dates */}
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2">Timeline</h4>
                <div className="space-y-2 text-sm">
                  {start_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Start:</span>
                      <span className="text-foreground">{format(new Date(start_date), 'MMM d, yyyy')}</span>
                    </div>
                  )}
                  {due_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Due:</span>
                      <span className="text-foreground">{format(new Date(due_date), 'MMM d, yyyy')}</span>
                    </div>
                  )}
                  {created_at && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Created:</span>
                      <span className="text-foreground">{format(new Date(created_at), 'MMM d, yyyy')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Lead */}
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2">Lead</h4>
                {lead ? (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={lead.avatar_url || undefined} />
                      <AvatarFallback style={{ backgroundColor: lead.color, color: '#fff' }}>
                        {lead.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-foreground">{lead.full_name}</p>
                      {lead.job_title && (
                        <p className="text-xs text-muted-foreground">{lead.job_title}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No lead assigned</p>
                )}
              </div>
            </TabsContent>

            {/* Members Tab */}
            <TabsContent value="members" className="mt-0 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-medium text-muted-foreground">
                  {members.length} member{members.length !== 1 ? 's' : ''}
                </h4>
                <Button size="sm" variant="outline" onClick={onAddMember} className="h-7 text-xs">
                  Add Member
                </Button>
              </div>

              {members.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No members yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 group"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={member.avatar_url || undefined} />
                          <AvatarFallback style={{ backgroundColor: member.color, color: '#fff' }}>
                            {member.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground">{member.full_name}</p>
                            {member.role === 'lead' && (
                              <Badge variant="secondary" className="text-[10px] h-4">Lead</Badge>
                            )}
                          </div>
                          {member.job_title && (
                            <p className="text-xs text-muted-foreground">{member.job_title}</p>
                          )}
                        </div>
                      </div>
                      {onRemoveMember && member.role !== 'lead' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                          onClick={() => onRemoveMember(member.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity" className="mt-0">
              <ActivityFeed activities={activities} maxItems={20} />
            </TabsContent>
          </Tabs>
        </ScrollArea>

        {/* Footer actions */}
        <div className="p-4 border-t border-border/50">
          <Button onClick={onEdit} className="w-full">
            <Settings className="w-4 h-4 mr-2" />
            Edit Workstream
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default DetailDrawer;
