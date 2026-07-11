/**
 * CommitteeModal — Vote Matrix + Manage + Activity
 * 760px, 3 tabs
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { catalystToast } from '@/lib/catalystToast';
import { useTheme } from '@/hooks/useTheme';
import type { IncidentCommitteeWithMembers } from '@/types/incident';

interface CommitteeModalProps {
  open: boolean;
  onClose: () => void;
  committee: IncidentCommitteeWithMembers;
  incidentId: string;
}

const TABS = ['Vote Matrix', 'Manage Approvers', 'Activity Log'];

export function CommitteeModal({ open, onClose, committee, incidentId }: CommitteeModalProps) {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const members = committee.members || [];
  const approvedCount = committee.approved_count || 0;
  const quorumMet = approvedCount >= 3;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[760px]" style={{ borderRadius: 8, padding: 0 }}>
        <DialogHeader className="px-6 pt-5 pb-3" style={{ borderBottom: '0.75px solid var(--ds-shadow-overlay)' }}>
          <DialogTitle style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 'var(--ds-font-size-500)', fontWeight: 700 }}>Escalation Committee</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-6" style={{ borderBottom: '0.75px solid var(--ds-shadow-overlay)' }}>
          {TABS.map((tab, i) => (
            <button
              key={tab}
              role="tab"
              onClick={() => setActiveTab(i)}
              className="px-3 py-2"
              style={{
                fontFamily: 'var(--cp-font-body)', fontSize: 'var(--ds-font-size-200)',
                fontWeight: activeTab === i ? 650 : 400,
                color: activeTab === i ? 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))',
                borderBottom: activeTab === i ? '2px solid var(--ds-link)' : '2px solid transparent',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="px-6 py-4" style={{ minHeight: 300, maxHeight: 440, overflowY: 'auto' }}>
          {activeTab === 0 && (
            <div className="space-y-3">
              {members.length === 0 && (
                <p style={{ fontFamily: 'var(--cp-font-body)', fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))' }}>No committee members assigned.</p>
              )}
              {members.map((m: any) => {
                const vote = m.vote;
                const voteStatus = vote?.vote || 'pending';
                return (
                  <div key={m.id} className="flex items-center gap-3 p-2" style={{ border: `1px solid ${'var(--cp-border-subtle, rgba(15,23,42,0.08))'}`, borderRadius: 4 }}>
                    <div className="rounded-full flex items-center justify-center shrink-0" style={{ width: 32, height: 32, backgroundColor: 'var(--cp-bg-sunken, var(--cp-border, var(--cp-bg-sunken)))', fontSize: 'var(--ds-font-size-200)', fontWeight: 650, color: 'var(--cp-text-secondary)' }}>
                      {(m.user?.full_name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span style={{ fontFamily: 'var(--cp-font-body)', fontSize: 'var(--ds-font-size-200)', fontWeight: 650, color: 'var(--fg-1, var(--cp-ink-1, var(--cp-ink-1)))' }}>
                          {m.user?.full_name || 'Member'}
                        </span>
                        {m.role === 'chair' && (
                          <span className="px-1.5" style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 700, backgroundColor: 'var(--cp-purple-5)', color: 'var(--cp-purple-60, var(--cp-purple-60))', borderRadius: 3 }}>CHAIR</span>
                        )}
                        {m.has_veto && (
                          <span className="px-1.5" style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 700, backgroundColor: 'var(--cp-danger-light)', color: 'var(--cp-danger-text)', borderRadius: 3 }}>VETO</span>
                        )}
                      </div>
                      <span style={{ fontFamily: 'var(--cp-font-body)', fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))' }}>{m.role || 'Member'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {['approved', 'rejected', 'pending'].map(v => (
                        <span
                          key={v}
                          className="px-2 py-0.5 capitalize"
                          style={{
                            fontSize: 'var(--ds-font-size-100)',
                            fontWeight: voteStatus === v ? 700 : 400,
                            borderRadius: 4,
                            backgroundColor: voteStatus === v
                              ? (v === 'approved' ? 'var(--cp-lozenge-green-bg)' : v === 'rejected' ? 'var(--ds-background-danger)' : 'var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral)))')
                              : 'transparent',
                            color: voteStatus === v
                              ? (v === 'approved' ? 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))' : v === 'rejected' ? 'var(--ds-text-danger)' : 'var(--ds-text-subtle)')
                              : 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))',
                            border: voteStatus === v ? 'none' : '1px solid var(--ds-shadow-overlay)',
                          }}
                        >
                          {v === 'approved' ? 'Approve' : v === 'rejected' ? 'Reject' : 'Pending'}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 1 && (
            <p style={{ fontFamily: 'var(--cp-font-body)', fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))' }}>Approver management coming soon.</p>
          )}

          {activeTab === 2 && (
            <p style={{ fontFamily: 'var(--cp-font-body)', fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))' }}>Activity log coming soon.</p>
          )}
        </div>

        <DialogFooter className="px-6 py-3" style={{ borderTop: '0.75px solid var(--ds-shadow-overlay)' }}>
          <Button variant="ghost" onClick={onClose} style={{ borderRadius: 6 }}>Close</Button>
          <Button
            disabled={!quorumMet}
            title={!quorumMet ? 'Requires \u22653 approvals to submit decision' : ''}
            style={{
              backgroundColor: quorumMet ? 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' : undefined,
              borderRadius: 6,
              opacity: quorumMet ? 1 : 0.5,
              cursor: quorumMet ? 'pointer' : 'not-allowed',
            }}
            onClick={() => { catalystToast.success('Decision submitted'); onClose(); }}
          >
            Submit Decision
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
