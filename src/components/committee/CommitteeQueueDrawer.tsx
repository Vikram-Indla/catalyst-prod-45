/**
 * CommitteeQueueDrawer — Right drawer for committee decision trail
 * 
 * Shows full approval complexity with addedBy attribution and timeline.
 */

import { X, AlertTriangle, Clock, CheckCircle, XCircle, Shield, UserPlus, ChevronRight, Calendar, User } from 'lucide-react';
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
    pending: { label: 'Pending', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200', icon: Clock },
    approved: { label: 'Approved', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200', icon: CheckCircle },
    vetoed: { label: 'Vetoed', className: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200', icon: XCircle },
  };
  const { label, className, icon: Icon } = config[status];
  return (
    <Badge variant="outline" className={cn('gap-1', className)}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

// Approver row with addedBy
function ApproverRow({ approver }: { approver: CommitteeApprover }) {
  const decisionConfig = {
    pending: { label: 'Pending', className: 'text-[var(--text-3)]', bgClass: 'bg-[var(--surface-subtle)]', icon: Clock },
    approved: { label: 'Approved', className: 'text-emerald-700 dark:text-emerald-400', bgClass: 'bg-emerald-100 dark:bg-emerald-900/30', icon: CheckCircle },
    vetoed: { label: 'Vetoed', className: 'text-rose-700 dark:text-rose-400', bgClass: 'bg-rose-100 dark:bg-rose-900/30', icon: XCircle },
  };
  const { label, className, bgClass, icon: Icon } = decisionConfig[approver.decision];

  return (
    <div className="p-3 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-default)]">
      <div className="flex items-start gap-3">
        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium shrink-0", bgClass, className)}>
          {approver.userInitials || approver.userName.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-[var(--text-1)] text-sm">{approver.userName}</span>
            {approver.hasVeto && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 text-amber-700 border-amber-300 dark:text-amber-400">VETO</Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className={cn("flex items-center gap-1 text-xs font-medium", className)}>
              <Icon className="h-3 w-3" />
              {label}
            </span>
            {approver.decidedAt && (
              <span className="text-[11px] text-[var(--text-3)]">
                · {formatDistanceToNow(new Date(approver.decidedAt), { addSuffix: true })}
              </span>
            )}
          </div>
          {/* Added by attribution */}
          {approver.addedBy && (
            <div className="flex items-center gap-1 mt-1.5 text-[11px] text-[var(--text-3)]">
              <User className="h-3 w-3" />
              <span>Added by <span className="text-[var(--text-2)]">{approver.addedBy}</span></span>
              {approver.addedAt && (
                <span className="ml-1">· {format(new Date(approver.addedAt), 'MMM d')}</span>
              )}
            </div>
          )}
          {/* Veto comment */}
          {approver.decision === 'vetoed' && approver.comment && (
            <div className="mt-2 p-2 bg-rose-50 dark:bg-rose-900/20 rounded text-xs text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
              <span className="font-medium">Reason: </span>{approver.comment}
            </div>
          )}
        </div>
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
      <div className="flex flex-col items-center">
        <div className={cn("w-6 h-6 rounded-full flex items-center justify-center", className)}>
          <Icon className="h-3 w-3" />
        </div>
        {!isLast && <div className="w-px flex-1 bg-[var(--border-default)] my-1" />}
      </div>
      <div className="flex-1 pb-3">
        <div className="text-sm text-[var(--text-1)] font-medium">{event.title}</div>
        {event.by && <div className="text-xs text-[var(--text-2)]">by {event.by}</div>}
        <div className="text-[11px] text-[var(--text-3)]">{format(new Date(event.at), 'PPp')}</div>
        {event.details && <div className="mt-1 text-xs text-[var(--text-2)] italic">"{event.details}"</div>}
      </div>
    </div>
  );
}

export function CommitteeQueueDrawer({ open, onOpenChange, item, onEditApprovers }: CommitteeQueueDrawerProps) {
  if (!item) return null;

  // Build timeline
  const timelineEvents: TimelineEvent[] = [];
  
  // Sent event
  timelineEvents.push({ id: 'sent', type: 'sent', title: 'Sent to Committee', by: item.committeeSentBy, at: item.committeeSentAt });

  // Approver added events (if different addedAt times)
  const addedAtTimes = new Set<string>();
  item.approvers.forEach(a => {
    if (a.addedAt && !addedAtTimes.has(a.addedAt)) {
      const sameTimeApprovers = item.approvers.filter(x => x.addedAt === a.addedAt);
      if (sameTimeApprovers.length > 0) {
        addedAtTimes.add(a.addedAt);
        // Only show if added after sent (different time)
        if (new Date(a.addedAt).getTime() > new Date(item.committeeSentAt).getTime() + 60000) {
          timelineEvents.push({
            id: `added-${a.addedAt}`,
            type: 'approver_added',
            title: `Approver${sameTimeApprovers.length > 1 ? 's' : ''} added`,
            by: sameTimeApprovers[0].addedBy,
            at: a.addedAt,
          });
        }
      }
    }
  });

  // Vote events
  item.approvers.filter(a => a.decidedAt).forEach(a => {
    if (a.decision === 'approved') {
      timelineEvents.push({ id: `approved-${a.id}`, type: 'approved', title: 'Approved', by: a.userName, at: a.decidedAt! });
    } else if (a.decision === 'vetoed') {
      timelineEvents.push({ id: `vetoed-${a.id}`, type: 'vetoed', title: 'Vetoed', by: a.userName, at: a.decidedAt!, details: a.comment });
    }
  });

  // Sort chronologically (oldest first for reading top-to-bottom)
  timelineEvents.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[440px] sm:max-w-[440px] p-0 flex flex-col">
        <SheetHeader className="p-4 border-b border-[var(--border-default)] shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-sm font-semibold text-[var(--text-1)]">Committee Decision Trail</SheetTitle>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-sm text-[var(--brand-primary)] font-mono font-medium">{item.incident.incident_key}</div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-5">
            {/* SNAPSHOT */}
            <section>
              <h3 className="text-[11px] font-semibold text-[var(--text-2)] uppercase tracking-wider mb-2">Snapshot</h3>
              <div className="p-3 bg-[var(--surface-subtle)] rounded-lg border border-[var(--border-default)] mb-3">
                <div className="text-sm font-medium text-[var(--text-1)]">{item.incident.title}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Badge variant="outline" className={cn('text-xs',
                  item.incident.severity === 'SEV1' && 'border-rose-300 text-rose-700',
                  item.incident.severity === 'SEV2' && 'border-orange-300 text-orange-700',
                  item.incident.severity === 'SEV3' && 'border-amber-300 text-amber-700',
                  item.incident.severity === 'SEV4' && 'border-blue-300 text-blue-700',
                )}>{item.incident.severity}</Badge>
                {item.incident.is_major_incident && (
                  <Badge variant="outline" className="text-xs gap-1 border-amber-300 text-amber-700">
                    <AlertTriangle className="h-3 w-3" />Major
                  </Badge>
                )}
                <StatusBadge status={item.committeeStatus} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-[var(--text-3)]">Progress: </span><span className="text-[var(--text-1)] font-medium">{item.approvalsCompletedCount}/{item.approvalsTotalCount}</span></div>
                <div><span className="text-[var(--text-3)]">Required: </span><span className="text-[var(--text-1)] font-medium">{item.approvalsRequiredCount}</span></div>
                <div><span className="text-[var(--text-3)]">Aging: </span><span className={cn("font-medium", item.agingDays >= 7 ? "text-orange-600" : "text-[var(--text-1)]")}>{item.agingDays}d</span></div>
                <div><span className="text-[var(--text-3)]">Sent: </span><span className="text-[var(--text-2)]">{format(new Date(item.committeeSentAt), 'MMM d')}</span></div>
              </div>
            </section>

            <Separator />

            {/* APPROVERS */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[11px] font-semibold text-[var(--text-2)] uppercase tracking-wider">
                  Approvers ({item.approvers.length})
                </h3>
                {onEditApprovers && (
                  <Button variant="ghost" size="sm" className="h-6 text-[11px] gap-1" onClick={onEditApprovers}>
                    Edit<ChevronRight className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                {item.approvers.map(a => <ApproverRow key={a.id} approver={a} />)}
              </div>
            </section>

            <Separator />

            {/* TIMELINE */}
            <section>
              <h3 className="text-[11px] font-semibold text-[var(--text-2)] uppercase tracking-wider mb-2">Timeline</h3>
              <div>
                {timelineEvents.map((e, i) => <TimelineItem key={e.id} event={e} isLast={i === timelineEvents.length - 1} />)}
              </div>
            </section>
          </div>
        </ScrollArea>

        <div className="p-3 border-t border-[var(--border-default)] shrink-0">
          <Button variant="outline" className="w-full h-8 text-sm" onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
