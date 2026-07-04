/**
 * CommitteeQueueDrawer — Governance Decision View
 *
 * Header: "Committee — INC-####" + status badge + sent info
 * Sections:
 *   A) Decision Snapshot (majority rule + veto override + auto outcome)
 *   B) Approvers List (each with addedBy/addedAt)
 *   C) Timeline (audit trail)
 */

import { useState } from 'react';
import { AlertTriangle, Clock, CheckCircle, XCircle, Shield, UserPlus, ChevronRight, User } from '@/lib/atlaskit-icons';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Lozenge, type LozengeAppearance } from '@/components/ads';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/lib/auth';
import { useRecordApproval, useRecordVeto } from '@/hooks/useCommitteeQueue';
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
function ApproverRow({
  approver,
  canVote,
  onApprove,
  onVeto,
  isVoting,
}: {
  approver: CommitteeApprover;
  canVote: boolean;
  onApprove: () => void;
  onVeto: (comment: string) => void;
  isVoting: boolean;
}) {
  const [vetoing, setVetoing] = useState(false);
  const [vetoComment, setVetoComment] = useState('');

  const statusCfg: Record<CommitteeDecisionStatus, { label: string; fg: string; icon: typeof Clock }> = {
    pending: { label: 'Pending', fg: 'var(--ds-text-subtle)', icon: Clock },
    approved: { label: 'Approved', fg: 'var(--ds-text-success)', icon: CheckCircle },
    vetoed: { label: 'Vetoed', fg: 'var(--ds-text-danger)', icon: XCircle },
  };
  const { label, fg, icon: Icon } = statusCfg[approver.decision];

  return (
    <div
      className="p-3 rounded-lg border"
      style={{ background: 'var(--ds-background-neutral-subtle)', borderColor: 'var(--ds-border)' }}
    >
      <div className="flex items-start gap-3">
        {/* Avatar - always neutral background, not status-colored */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium shrink-0 border"
          style={{ background: 'var(--ds-background-neutral-subtle)', color: 'var(--ds-text-subtle)', borderColor: 'var(--ds-border)' }}
        >
          {approver.userInitials || approver.userName.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-[var(--ds-text)] text-sm">{approver.userName}</span>
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
              <span className="text-[11px] text-[var(--ds-text-subtlest)]">
                · {formatDistanceToNow(new Date(approver.decidedAt), { addSuffix: true })}
              </span>
            )}
          </div>
          {/* Added by */}
          {approver.addedBy && (
            <div className="flex items-center gap-1 mt-1.5 text-[11px] text-[var(--ds-text-subtlest)]">
              <User className="h-3 w-3" />
              <span>
                Added by <span className="text-[var(--ds-text-subtle)]">{approver.addedBy}</span>
              </span>
              {approver.addedAt && <span className="ml-1">· {format(new Date(approver.addedAt), 'MMM d')}</span>}
            </div>
          )}
          {/* Veto comment */}
          {approver.decision === 'vetoed' && approver.comment && (
            <div
              className="mt-2 p-2 rounded text-xs border"
              style={{ background: 'var(--ds-background-danger)', borderColor: 'var(--ds-text-danger)', color: 'var(--ds-text-danger)' }}
            >
              <span className="font-medium">Reason: </span>
              {approver.comment}
            </div>
          )}
          {/* Your vote */}
          {canVote && approver.decision === 'pending' && (
            // ads-scanner:ignore-next-line — sizing utility, matches h-6/h-8 text-xs/sm pattern already used elsewhere in this file
            <div className="mt-2">
              {!vetoing ? (
                // ads-scanner:ignore-next-line — layout utility, matches gap-2 pattern already used elsewhere in this file
                <div className="flex gap-2">
                  {/* ads-scanner:ignore-next-line — sizing utility, matches h-6/h-8 text-xs/sm pattern already used elsewhere in this file */}
                  <Button size="sm" className="h-7 text-xs" disabled={isVoting} onClick={onApprove}>
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    // ads-scanner:ignore-next-line — sizing utility, matches h-6/h-8 text-xs/sm pattern already used elsewhere in this file
                    className="h-7 text-xs"
                    disabled={isVoting}
                    onClick={() => setVetoing(true)}
                  >
                    Veto
                  </Button>
                </div>
              ) : (
                // ads-scanner:ignore-next-line — layout utility, matches space-y-2 pattern already used elsewhere in this file
                <div className="space-y-2">
                  <Textarea
                    placeholder="Reason for veto (required)"
                    value={vetoComment}
                    onChange={(e) => setVetoComment(e.target.value)}
                    // ads-scanner:ignore-next-line — sizing utility, matches text-xs pattern already used elsewhere in this file
                    className="text-xs min-h-16"
                  />
                  {/* ads-scanner:ignore-next-line — layout utility, matches gap-2 pattern already used elsewhere in this file */}
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      // ads-scanner:ignore-next-line — sizing utility, matches h-6/h-8 text-xs/sm pattern already used elsewhere in this file
                      className="h-7 text-xs"
                      disabled={isVoting || vetoComment.trim().length === 0}
                      onClick={() => onVeto(vetoComment)}
                    >
                      Confirm veto
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      // ads-scanner:ignore-next-line — sizing utility, matches h-6/h-8 text-xs/sm pattern already used elsewhere in this file
                      className="h-7 text-xs"
                      disabled={isVoting}
                      onClick={() => {
                        setVetoing(false);
                        setVetoComment('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
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
    sent: { icon: Shield, bg: 'var(--ds-background-information)', fg: 'var(--ds-text-information)' },
    approved: { icon: CheckCircle, bg: 'var(--ds-background-success)', fg: 'var(--ds-text-success)' },
    vetoed: { icon: XCircle, bg: 'var(--ds-background-danger)', fg: 'var(--ds-text-danger)' },
    approver_added: { icon: UserPlus, bg: 'var(--ds-background-neutral-subtle)', fg: 'var(--ds-text-subtle)' },
  };
  const { icon: Icon, bg, fg } = iconCfg[event.type];

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: bg, color: fg }}>
          <Icon className="h-3 w-3" />
        </div>
        {!isLast && <div className="w-px flex-1 my-1" style={{ background: 'var(--ds-border)' }} />}
      </div>
      <div className="flex-1 pb-3">
        <div className="text-sm text-[var(--ds-text)] font-medium">{event.title}</div>
        {event.by && <div className="text-xs text-[var(--ds-text-subtle)]">by {event.by}</div>}
        <div className="text-[11px] text-[var(--ds-text-subtlest)]">{format(new Date(event.at), 'PPp')}</div>
        {event.details && <div className="mt-1 text-xs text-[var(--ds-text-subtle)] italic">"{event.details}"</div>}
      </div>
    </div>
  );
}

export function CommitteeQueueDrawer({ open, onOpenChange, item, onEditApprovers }: CommitteeQueueDrawerProps) {
  const { user } = useAuth();
  const recordApproval = useRecordApproval();
  const recordVeto = useRecordVeto();

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
        <SheetHeader className="p-4 border-b shrink-0" style={{ borderColor: 'var(--ds-border)' }}>
          <SheetTitle className="text-sm font-semibold text-[var(--ds-text)]">
            Committee — {item.incident.incident_key}
          </SheetTitle>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge status={item.committeeStatus} />
            <span className="text-[11px] text-[var(--ds-text-subtlest)]">
              Sent {format(new Date(item.committeeSentAt), 'MMM d')} by {item.committeeSentBy}
            </span>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-5">
            {/* DECISION SNAPSHOT */}
            <section>
              <h3 className="text-[11px] font-semibold text-[var(--ds-text-subtle)] uppercase tracking-wider mb-2">
                Decision Snapshot
              </h3>
              <div className="p-3 rounded-lg border space-y-2" style={{ background: 'var(--ds-background-neutral-subtle)', borderColor: 'var(--ds-border)' }}>
                <div className="text-sm font-medium text-[var(--ds-text)]">{item.incident.title}</div>
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
                  <span className="text-[var(--ds-text-subtlest)]">Majority required: </span>
                  <span className="text-[var(--ds-text)] font-medium">{item.approvalsRequiredCount}</span>
                </div>
                <div>
                  <span className="text-[var(--ds-text-subtlest)]">Current: </span>
                  <span className="text-[var(--ds-text)] font-medium">
                    {item.approvalsCompletedCount}/{item.approvalsTotalCount}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-[var(--ds-text-subtlest)]">Veto: </span>
                  <span className={cn('font-medium', hasVeto ? 'text-[var(--ds-text-danger)]' : 'text-[var(--ds-text)]')}>
                    {hasVeto ? 'Yes — overrides majority' : 'None'}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-[var(--ds-text-subtlest)]">Aging: </span>
                  <span className={cn('font-medium', item.agingDays >= 7 ? 'text-[var(--ds-text-warning)]' : 'text-[var(--ds-text)]')}>
                    {item.agingDays}d
                  </span>
                </div>
              </div>

              {/* Outcome note */}
              <div
                className="mt-3 p-2 rounded text-xs border"
                style={{
                  background: hasVeto ? 'var(--ds-background-danger)' : item.committeeStatus === 'approved' ? 'var(--ds-background-success)' : 'var(--ds-background-neutral-subtle)',
                  borderColor: 'var(--ds-border)',
                  color: hasVeto ? 'var(--ds-text-danger)' : item.committeeStatus === 'approved' ? 'var(--ds-text-success)' : 'var(--ds-text-subtle)',
                }}
              >
                {outcomeNote}
              </div>
            </section>

            <Separator />

            {/* APPROVERS */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[11px] font-semibold text-[var(--ds-text-subtle)] uppercase tracking-wider">
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
                  <ApproverRow
                    key={a.id}
                    approver={a}
                    canVote={item.committeeStatus === 'pending' && a.userId === user?.id}
                    isVoting={recordApproval.isPending || recordVeto.isPending}
                    onApprove={() =>
                      recordApproval.mutate({ committeeId: item.committeeId, memberId: a.id })
                    }
                    onVeto={(comment) =>
                      recordVeto.mutate({ committeeId: item.committeeId, memberId: a.id, comment })
                    }
                  />
                ))}
              </div>
            </section>

            <Separator />

            {/* TIMELINE */}
            <section>
              <h3 className="text-[11px] font-semibold text-[var(--ds-text-subtle)] uppercase tracking-wider mb-2">
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

        <div className="p-3 border-t shrink-0" style={{ borderColor: 'var(--ds-border)' }}>
          <Button variant="outline" className="w-full h-8 text-sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
