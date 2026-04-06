/**
 * CommitteeModal — Vote Matrix + Manage + Activity
 * 760px, 3 tabs
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { IncidentCommitteeWithMembers } from '@/types/incident';

interface CommitteeModalProps {
  open: boolean;
  onClose: () => void;
  committee: IncidentCommitteeWithMembers;
  incidentId: string;
}

const TABS = ['Vote Matrix', 'Manage Approvers', 'Activity Log'];

export function CommitteeModal({ open, onClose, committee, incidentId }: CommitteeModalProps) {
  const [activeTab, setActiveTab] = useState(0);
  const members = committee.members || [];
  const approvedCount = committee.approved_count || 0;
  const quorumMet = approvedCount >= 3;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[760px]" style={{ borderRadius: 8, padding: 0 }}>
        <DialogHeader className="px-6 pt-5 pb-3" style={{ borderBottom: '0.75px solid rgba(15,23,42,0.06)' }}>
          <DialogTitle style={{ fontFamily: 'Sora, sans-serif', fontSize: 16, fontWeight: 700 }}>Escalation Committee</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-6" style={{ borderBottom: '0.75px solid rgba(15,23,42,0.06)' }}>
          {TABS.map((tab, i) => (
            <button
              key={tab}
              role="tab"
              onClick={() => setActiveTab(i)}
              className="px-3 py-2"
              style={{
                fontFamily: 'Inter, sans-serif', fontSize: 12,
                fontWeight: activeTab === i ? 650 : 400,
                color: activeTab === i ? '#2563EB' : '#64748B',
                borderBottom: activeTab === i ? '2px solid #2563EB' : '2px solid transparent',
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
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'var(--fg-3, #94A3B8)' }}>No committee members assigned.</p>
              )}
              {members.map((m: any) => {
                const vote = m.vote;
                const voteStatus = vote?.vote || 'pending';
                return (
                  <div key={m.id} className="flex items-center gap-3 p-2" style={{ border: '1px solid rgba(15,23,42,0.08)', borderRadius: 4 }}>
                    <div className="rounded-full flex items-center justify-center shrink-0" style={{ width: 32, height: 32, backgroundColor: 'var(--bd-default, #E2E8F0)', fontSize: 12, fontWeight: 650, color: '#475569' }}>
                      {(m.user?.full_name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 650, color: '#0F172A' }}>
                          {m.user?.full_name || 'Member'}
                        </span>
                        {m.role === 'chair' && (
                          <span className="px-1.5" style={{ fontSize: 9, fontWeight: 700, backgroundColor: '#F3E8FF', color: '#7C3AED', borderRadius: 3 }}>CHAIR</span>
                        )}
                        {m.has_veto && (
                          <span className="px-1.5" style={{ fontSize: 9, fontWeight: 700, backgroundColor: '#FEE2E2', color: '#991B1B', borderRadius: 3 }}>VETO</span>
                        )}
                      </div>
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#64748B' }}>{m.role || 'Member'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {['approved', 'rejected', 'pending'].map(v => (
                        <span
                          key={v}
                          className="px-2 py-0.5 capitalize"
                          style={{
                            fontSize: 11,
                            fontWeight: voteStatus === v ? 700 : 400,
                            borderRadius: 4,
                            backgroundColor: voteStatus === v
                              ? (v === 'approved' ? '#1B7F37' : v === 'rejected' ? '#FEE2E2' : '#DFE1E6')
                              : 'transparent',
                            color: voteStatus === v
                              ? (v === 'approved' ? '#FFFFFF' : v === 'rejected' ? '#991B1B' : '#42526E')
                              : 'var(--fg-3, #94A3B8)',
                            border: voteStatus === v ? 'none' : '1px solid rgba(15,23,42,0.08)',
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
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'var(--fg-3, #94A3B8)' }}>Approver management coming soon.</p>
          )}

          {activeTab === 2 && (
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'var(--fg-3, #94A3B8)' }}>Activity log coming soon.</p>
          )}
        </div>

        <DialogFooter className="px-6 py-3" style={{ borderTop: '0.75px solid rgba(15,23,42,0.06)' }}>
          <Button variant="ghost" onClick={onClose} style={{ borderRadius: 6 }}>Close</Button>
          <Button
            disabled={!quorumMet}
            title={!quorumMet ? 'Requires \u22653 approvals to submit decision' : ''}
            style={{
              backgroundColor: quorumMet ? '#2563EB' : undefined,
              borderRadius: 6,
              opacity: quorumMet ? 1 : 0.5,
              cursor: quorumMet ? 'pointer' : 'not-allowed',
            }}
            onClick={() => { toast.success('Decision submitted'); onClose(); }}
          >
            Submit Decision
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
