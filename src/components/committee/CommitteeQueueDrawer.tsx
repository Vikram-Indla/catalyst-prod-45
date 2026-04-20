/**
 * CommitteeQueueDrawer — Governance Decision View
 *
 * Header: "Committee — INC-####" + status badge + sent info
 * Sections:
 *   A) Decision Snapshot (majority rule + veto override + auto outcome)
 *   B) Approvers List (each with addedBy/addedAt)
 *   C) Timeline (audit trail)
 */

import { AlertTriangle, Clock, CheckCircle, XCircle, Shield, UserPlus, ChevronRight, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Lozenge, type LozengeAppearance } from '@/components/ads';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import type { CommitteeQueueItem, CommitteeApprover, CommitteeDecisionStatus } from '@/hooks/useCommitteeQueue';

interface CommitteeQueueDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: CommitteeQueueItem | null;
  onEditApprovers?: () => void;
}

// Status badge (tokens)
function StatusBadge({ status }: { status: CommitteeDecisionStatus }) {
  const cfg: Record<CommitteeDecisionStatus, { label: string; appearance: LozengeAppearance; icon: typeof Clock }> = {
    pending: { label: 'Pending', appearance: 'moved', icon: Clock },
    approved: { label: 'Approved', appearance: 'success', icon: CheckCircle },
    vetoed: { label: 'Vetoed', appearance: 'removed', icon: XCircle },
  };
  const { label, appearance, icon: Icon } = cfg[status];
  return (
    <span className="inline-flex items-center gap-1">
      <Icon className="h-3 w-3" aria-hidden="true" />
      <Lozenge appearance={appearance}>{label}</Lozenge>
    </span>
  );
}

// Approver row with addedBy
function ApproverRow({ approver }: { approver: CommitteeApprover }) {
  const statusCfg: Record<CommitteeDecisionStatus, { label: string; fg: string; icon: typeof Clock }> = {
    pending: { label: 'Pending', fg: 'var(--text-secondary)', icon: Clock },
    approved: { label: 'Approved', fg: 'var(--status-success)', icon: CheckCircle },
    vetoed: { label: 'Vetoed', fg: 'var(--status-danger)', icon: XCircle },
  };
  const { label, fg, icon: Icon } = statusCfg[approver.decision];

  return (
    <div
      className="p-3 rounded-lg border"
      style={{ background: 'var(--surface-subtle)', borderColor: 'var(--border-default)' }}
    >
      <div className="flex items-start gap-3">
        {/* Avatar - always neutral background, not status-colored */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium shrink-0 border"
          style={{ background: 'var(--surface-subtle)', color: 'var(--text-secondary)', borderColor: 'var(--border-default)' }}
        >
          {approver.userInitials || approver.userName.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-[var(--text-primary)] text-sm">{approver.userName}</span>
            {approver.hasVeto && (
              <Lozenge appearance="moved">VETO POWER</Lozenge>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="flex items-center gap-1 text-xs font-medium" style={{ color: fg }}>
              <Icon className="h-3 w-3" />
              {label}
            </span>
            {approver.decidedAt && (
              <span className="text-[11px] text-[var(--text-tertiary)]">
                · {formatDistanceToNow(new Date(approver.decidedAt), { addSuffix: true })}
              </span>
            )}
          </div>
          {/* Added by */}
          {approver.addedBy && (
            <div className="flex items-center gap-1 mt-1.5 text-[11px] text-[var(--text-tertiary)]">
              <User className="h-3 w-3" />
              <span>
                Added by <span className="text-[var(--text-secondary)]">{approver.addedBy}</span>
              </span>
              {approver.addedAt && <span className="ml-1">· {format(new Date(approver.addedAt), 'MMM d')}</span>}
            </div>
          )}
          {/* Veto comment */}
          {approver.decision === 'vetoed' && approver.comment && (
            <div
              className="mt-2 p-2 rounded text-xs border"
              style={{ background: 'var(--status-danger-bg)', borderColor: 'var(--status-danger)', color: 'var(--status-danger)' }}
            >
              <span className="font-medium">Reason: </span>
              {approver.comment}
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
  const iconCfg: Record<TimelineEvent['type'], { icon: typeof Clock; bg: string; fg: string }> = {
    sent: { icon: Shield, bg: 'var(--status-info-bg)', fg: 'var(--status-info)' },
    approved: { icon: CheckCircle, bg: 'var(--status-success-bg)', fg: 'var(--status-success)' },
    vetoed: { icon: XCircle, bg: 'var(--status-danger-bg)', fg: 'var(--status-danger)' },
    approver_added: { icon: UserPlus, bg: 'var(--surface-subtle)', fg: 'var(--text-secondary)' },
  };
  const { icon: Icon, bg, fg } = iconCfg[event.type];

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: bg, color: fg }}>
          <Icon className="h-3 w-3" />
        </div>
        {!isLast && <div className="w-px flex-1 my-1" style={{ background: 'var(--border-default)' }} />}
      </div>
      <div className="flex-1 pb-3">
        <div className="text-sm text-[var(--text-primary)] font-medium">{event.title}</div>
        {event.by && <div className="text-xs text-[var(--text-secondary)]">by {event.by}</div>}
        <div className="text-[11px] text-[var(--text-tertiary)]">{format(new Date(event.at), 'PPp')}</div>
        {event.details && <div className="mt-1 text-xs text-[var(--text-secondary)] italic">"{event.details}"</div>}
      </div>
    </div>
  );
}

export function CommitteeQueueDrawer({ open, onOpenChange, item, onEditApprovers }: CommitteeQueueDrawerProps) {
  if (!item) return null;

  // Build timeline
  const events: TimelineEvent[] = [];
  events.push({ id: 'sent', type: 'sent', title: 'Sent to Committee', by: item.committeeSentBy, at: item.committeeSentAt });

  // Approver added events
  const addedTimes = new Set<string>();
  item.approvers.forEach((a) => {
    if (a.addedAt && !addedTimes.has(a.addedAt)) {
      const sameTime = item.approvers.filter((x) => x.addedAt === a.addedAt);
      if (new Date(a.addedAt).getTime() > new Date(item.committeeSentAt).getTime() + 60000) {
        addedTimes.add(a.addedAt);
        events.push({
          id: `add-${a.addedAt}`,
          type: 'approver_added',
          title: `Approver${sameTime.length > 1 ? 's' : ''} added`,
          by: sameTime[0].addedBy,
          at: a.addedAt,
        });
      }
    }
  });

  // Decision events
  item.approvers
    .filter((a) => a.decidedAt)
    .forEach((a) => {
      if (a.decision === 'approved') {
        events.push({ id: `appr-${a.id}`, type: 'approved', title: 'Approved', by: a.userName, at: a.decidedAt! });
      } else if (a.decision === 'vetoed') {
        events.push({ id: `veto-${a.id}`, type: 'vetoed', title: 'Vetoed', by: a.userName, at: a.decidedAt!, details: a.comment });
      }
    });

  events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  const hasVeto = item.vetoCount > 0;
  const outcomeNote = hasVeto
    ? 'Veto recorded — decision finalized immediately.'
    : item.committeeStatus === 'approved'
    ? 'Majority reached — Incident moves to In Progress.'
    : `${item.approvalsRequiredCount - item.approvalsCompletedCount} more approval(s) required.`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[440px] sm:max-w-[440px] p-0 flex flex-col">
        <SheetHeader className="p-4 border-b shrink-0" style={{ borderColor: 'var(--border-default)' }}>
          <SheetTitle className="text-sm font-semibold text-[var(--text-primary)]">
            Committee — {item.incident.incident_key}
          </SheetTitle>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge status={item.committeeStatus} />
            <span className="text-[11px] text-[var(--text-tertiary)]">
              Sent {format(new Date(item.committeeSentAt), 'MMM d')} by {item.committeeSentBy}
            </span>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-5">
            {/* DECISION SNAPSHOT */}
            <section>
              <h3 className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                Decision Snapshot
              </h3>
              <div className="p-3 rounded-lg border space-y-2" style={{ background: 'var(--surface-subtle)', borderColor: 'var(--border-default)' }}>
                <div className="text-sm font-medium text-[var(--text-primary)]">{item.incident.title}</div>
                <div className="flex flex-wrap items-center gap-2">
                  <Lozenge
                    appearance={
                      (item.incident.severity === 'SEV1'
                        ? 'removed'
                        : item.incident.severity === 'SEV2'
                        ? 'moved'
                        : 'default') as LozengeAppearance
                    }
                  >
                    {item.incident.severity}
                  </Lozenge>
                  {item.incident.is_major_incident && (
                    <span className="inline-flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                      <Lozenge appearance="moved">Major</Lozenge>
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs mt-3">
                <div>
                  <span className="text-[var(--text-tertiary)]">Majority required: </span>
                  <span className="text-[var(--text-primary)] font-medium">{item.approvalsRequiredCount}</span>
                </div>
                <div>
                  <span className="text-[var(--text-tertiary)]">Current: </span>
                  <span className="text-[var(--text-primary)] font-medium">
                    {item.approvalsCompletedCount}/{item.approvalsTotalCount}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-[var(--text-tertiary)]">Veto: </span>
                  <span className={cn('font-medium', hasVeto ? 'text-[var(--status-danger)]' : 'text-[var(--text-primary)]')}>
                    {hasVeto ? 'Yes — overrides majority' : 'None'}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-[var(--text-tertiary)]">Aging: </span>
                  <span className={cn('font-medium', item.agingDays >= 7 ? 'text-[var(--text-warning)]' : 'text-[var(--text-primary)]')}>
                    {item.agingDays}d
                  </span>
                </div>
              </div>

              {/* Outcome note */}
              <div
                className="mt-3 p-2 rounded text-xs border"
                style={{
                  background: hasVeto ? 'var(--status-danger-bg)' : item.committeeStatus === 'approved' ? 'var(--status-success-bg)' : 'var(--surface-subtle)',
                  borderColor: 'var(--border-default)',
                  color: hasVeto ? 'var(--status-danger)' : item.committeeStatus === 'approved' ? 'var(--status-success)' : 'var(--text-secondary)',
                }}
              >
                {outcomeNote}
              </div>
            </section>

            <Separator />

            {/* APPROVERS */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  Approvers ({item.approvers.length})
                </h3>
                {onEditApprovers && (
                  <Button variant="ghost" size="sm" className="h-6 text-[11px] gap-1" onClick={onEditApprovers}>
                    Edit
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                {item.approvers.map((a) => (
                  <ApproverRow key={a.id} approver={a} />
                ))}
              </div>
            </section>

            <Separator />

            {/* TIMELINE */}
            <section>
              <h3 className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                Timeline
              </h3>
              <div>
                {events.map((e, i) => (
                  <TimelineItem key={e.id} event={e} isLast={i === events.length - 1} />
                ))}
              </div>
            </section>
          </div>
        </ScrollArea>

        <div className="p-3 border-t shrink-0" style={{ borderColor: 'var(--border-default)' }}>
          <Button variant="outline" className="w-full h-8 text-sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
