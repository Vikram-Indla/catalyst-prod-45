/**
 * CommitteeQueueDrawer — Right drawer for committee decision trail
 * 
 * Shows incident snapshot, approvers with votes, and timeline.
 */

import { useState } from 'react';
import { X, AlertTriangle, Clock, CheckCircle, XCircle, Shield, UserPlus, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import type { CommitteeQueueItem, CommitteeApprover, CommitteeDecisionStatus } from '@/hooks/useCommitteeQueue';

interface CommitteeQueueDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: CommitteeQueueItem | null;
  onEditApprovers?: () => void;
}

// Status badge
function StatusBadge({ status }: { status: CommitteeDecisionStatus }) {
  const config = {
    pending: {
      label: 'Pending',
      className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
      icon: Clock,
    },
    approved: {
      label: 'Approved',
      className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
      icon: CheckCircle,
    },
    vetoed: {
      label: 'Vetoed',
      className: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800',
      icon: XCircle,
    },
  };

  const { label, className, icon: Icon } = config[status];

  return (
    <Badge variant="outline" className={cn('gap-1.5', className)}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Badge>
  );
}

// Approver row component
function ApproverRow({ approver }: { approver: CommitteeApprover }) {
  const decisionConfig = {
    pending: {
      label: 'Pending',
      className: 'text-[var(--text-3)]',
      bgClass: 'bg-[var(--surface-subtle)]',
      icon: Clock,
    },
    approved: {
      label: 'Approved',
      className: 'text-emerald-700 dark:text-emerald-400',
      bgClass: 'bg-emerald-100 dark:bg-emerald-900/30',
      icon: CheckCircle,
    },
    vetoed: {
      label: 'Vetoed',
      className: 'text-rose-700 dark:text-rose-400',
      bgClass: 'bg-rose-100 dark:bg-rose-900/30',
      icon: XCircle,
    },
  };

  const { label, className, bgClass, icon: Icon } = decisionConfig[approver.decision];

  return (
    <div className="flex items-start gap-3 py-3 px-4 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-default)]">
      {/* Avatar */}
      <div className={cn(
        "w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium shrink-0",
        bgClass,
        className
      )}>
        {approver.userInitials || approver.userName.charAt(0)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-[var(--text-1)] text-sm">{approver.userName}</span>
          {approver.hasVeto && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-700 border-amber-300 dark:text-amber-400 dark:border-amber-700">
              VETO
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2 mt-0.5">
          <span className={cn("flex items-center gap-1 text-xs font-medium", className)}>
            <Icon className="h-3.5 w-3.5" />
            {label}
          </span>
          {approver.decidedAt && (
            <span className="text-xs text-[var(--text-3)]">
              · {formatDistanceToNow(new Date(approver.decidedAt), { addSuffix: true })}
            </span>
          )}
        </div>

        {/* Veto comment */}
        {approver.decision === 'vetoed' && approver.comment && (
          <div className="mt-2 p-2 bg-rose-50 dark:bg-rose-900/20 rounded text-xs text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <span className="font-medium">Reason: </span>
            {approver.comment}
          </div>
        )}
      </div>
    </div>
  );
}

// Timeline event
interface TimelineEvent {
  id: string;
  type: 'sent' | 'approved' | 'vetoed' | 'approver_added';
  title: string;
  by?: string;
  at: string;
  details?: string;
}

function TimelineItem({ event, isLast }: { event: TimelineEvent; isLast: boolean }) {
  const iconConfig = {
    sent: { icon: Shield, className: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' },
    approved: { icon: CheckCircle, className: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30' },
    vetoed: { icon: XCircle, className: 'text-rose-600 bg-rose-100 dark:bg-rose-900/30' },
    approver_added: { icon: UserPlus, className: 'text-violet-600 bg-violet-100 dark:bg-violet-900/30' },
  };

  const { icon: Icon, className } = iconConfig[event.type];

  return (
    <div className="flex gap-3">
      {/* Icon + line */}
      <div className="flex flex-col items-center">
        <div className={cn("w-7 h-7 rounded-full flex items-center justify-center", className)}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        {!isLast && (
          <div className="w-px flex-1 bg-[var(--border-default)] my-1" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 pb-4">
        <div className="text-sm text-[var(--text-1)] font-medium">{event.title}</div>
        {event.by && (
          <div className="text-xs text-[var(--text-2)]">by {event.by}</div>
        )}
        <div className="text-xs text-[var(--text-3)] mt-0.5">
          {format(new Date(event.at), 'PPp')}
        </div>
        {event.details && (
          <div className="mt-1 text-xs text-[var(--text-2)] italic">"{event.details}"</div>
        )}
      </div>
    </div>
  );
}

export function CommitteeQueueDrawer({
  open,
  onOpenChange,
  item,
  onEditApprovers,
}: CommitteeQueueDrawerProps) {
  if (!item) return null;

  // Build timeline events
  const timelineEvents: TimelineEvent[] = [];

  // Sent to committee
  timelineEvents.push({
    id: 'sent',
    type: 'sent',
    title: 'Sent to Committee',
    at: item.committeeSentAt,
  });

  // Add approval/veto events from approvers
  item.approvers
    .filter(a => a.decidedAt)
    .sort((a, b) => new Date(a.decidedAt!).getTime() - new Date(b.decidedAt!).getTime())
    .forEach(approver => {
      if (approver.decision === 'approved') {
        timelineEvents.push({
          id: `approved-${approver.id}`,
          type: 'approved',
          title: 'Approved',
          by: approver.userName,
          at: approver.decidedAt!,
        });
      } else if (approver.decision === 'vetoed') {
        timelineEvents.push({
          id: `vetoed-${approver.id}`,
          type: 'vetoed',
          title: 'Vetoed',
          by: approver.userName,
          at: approver.decidedAt!,
          details: approver.comment,
        });
      }
    });

  // Sort by time descending (most recent first)
  timelineEvents.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[480px] sm:max-w-[480px] p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="p-4 border-b border-[var(--border-default)] shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base font-semibold text-[var(--text-1)]">
              Committee Decision Trail
            </SheetTitle>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-sm text-[var(--brand-primary)] font-mono font-medium">
            {item.incident.incident_key}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6">
            {/* SECTION A: Incident Snapshot */}
            <section>
              <h3 className="text-xs font-semibold text-[var(--text-2)] uppercase tracking-wider mb-3">
                Incident Snapshot
              </h3>
              
              <div className="space-y-3">
                {/* Summary */}
                <div className="p-3 bg-[var(--surface-subtle)] rounded-lg border border-[var(--border-default)]">
                  <div className="text-sm font-medium text-[var(--text-1)]">{item.incident.title}</div>
                </div>

                {/* Meta row */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Severity */}
                  <Badge 
                    variant="outline" 
                    className={cn(
                      'text-xs',
                      item.incident.severity === 'SEV1' && 'border-rose-300 text-rose-700 dark:text-rose-400',
                      item.incident.severity === 'SEV2' && 'border-orange-300 text-orange-700 dark:text-orange-400',
                      item.incident.severity === 'SEV3' && 'border-amber-300 text-amber-700 dark:text-amber-400',
                      item.incident.severity === 'SEV4' && 'border-blue-300 text-blue-700 dark:text-blue-400',
                    )}
                  >
                    {item.incident.severity}
                  </Badge>

                  {/* Major */}
                  {item.incident.is_major_incident && (
                    <Badge variant="outline" className="text-xs gap-1 border-amber-300 text-amber-700 dark:text-amber-400">
                      <AlertTriangle className="h-3 w-3" />
                      Major
                    </Badge>
                  )}

                  {/* Committee Status */}
                  <StatusBadge status={item.committeeStatus} />
                </div>

                {/* Progress */}
                <div className="flex items-center gap-4 text-sm">
                  <div>
                    <span className="text-[var(--text-3)]">Progress: </span>
                    <span className="text-[var(--text-1)] font-medium">
                      {item.approvalsCompletedCount} / {item.approvalsTotalCount} approved
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--text-3)]">Required: </span>
                    <span className="text-[var(--text-1)] font-medium">{item.approvalsRequiredCount}</span>
                  </div>
                </div>

                {/* Aging + Sent date */}
                <div className="flex items-center gap-4 text-xs text-[var(--text-3)]">
                  <div>
                    <span>Aging: </span>
                    <span className={cn(
                      "font-medium",
                      item.agingDays >= 7 ? "text-rose-600 dark:text-rose-400" : "text-[var(--text-2)]"
                    )}>
                      {item.agingDays} days
                    </span>
                  </div>
                  <div>
                    <span>Sent: </span>
                    <span className="text-[var(--text-2)]">
                      {format(new Date(item.committeeSentAt), 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <Separator />

            {/* SECTION B: Approvers */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-[var(--text-2)] uppercase tracking-wider">
                  Approvers ({item.approvers.length})
                </h3>
                {onEditApprovers && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={onEditApprovers}>
                    Edit Approvers
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                {item.approvers.map(approver => (
                  <ApproverRow key={approver.id} approver={approver} />
                ))}
              </div>
            </section>

            <Separator />

            {/* SECTION C: Timeline */}
            <section>
              <h3 className="text-xs font-semibold text-[var(--text-2)] uppercase tracking-wider mb-3">
                Timeline
              </h3>

              <div>
                {timelineEvents.map((event, i) => (
                  <TimelineItem 
                    key={event.id} 
                    event={event} 
                    isLast={i === timelineEvents.length - 1} 
                  />
                ))}
              </div>
            </section>
          </div>
        </ScrollArea>

        {/* Footer actions */}
        <div className="p-4 border-t border-[var(--border-default)] shrink-0">
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
