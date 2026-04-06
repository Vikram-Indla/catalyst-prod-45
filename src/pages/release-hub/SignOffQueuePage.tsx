import React, { useState, useMemo } from 'react';
import { Search, CheckSquare } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { usePendingSignOffs, useApproveSignoff, useRejectSignoff } from '@/hooks/useReleaseHub';
import { RH, SIGNOFF_LOZENGE, LOZENGE } from '@/constants/releasehub.design';
import { RiskBadge } from '@/components/releasehub/RiskBadge';
import { StatusLozenge } from '@/components/releasehub/StatusLozenge';
import { SkeletonRows } from '@/components/releasehub/SkeletonRows';
import { EmptyState } from '@/components/releasehub/EmptyState';
import { ChgDrawer } from '@/components/releasehub/ChgDrawer';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

export default function SignOffQueuePage() {
  const { isDark } = useTheme();
  const { data: signoffs = [], isLoading, error } = usePendingSignOffs();
  const approveSignoff = useApproveSignoff();
  const rejectSignoff = useRejectSignoff();
  const [search, setSearch] = useState('');
  const [selectedChange, setSelectedChange] = useState<any>(null);
  const [actionModal, setActionModal] = useState<{ signoff: any; action: 'approve' | 'reject' } | null>(null);
  const [comment, setComment] = useState('');

  const filtered = useMemo(() => {
    if (!search) return signoffs;
    const q = search.toLowerCase();
    return signoffs.filter((so: any) =>
      so.rh_changes?.chg_number?.toLowerCase().includes(q) ||
      so.rh_changes?.title?.toLowerCase().includes(q) ||
      so.signoff_role?.toLowerCase().includes(q) ||
      so.assigned_to?.toLowerCase().includes(q)
    );
  }, [signoffs, search]);

  const handleAction = () => {
    if (!actionModal) return;
    const { signoff, action } = actionModal;
    if (action === 'approve') {
      approveSignoff.mutate({ signoffId: signoff.id, comment }, {
        onSuccess: () => { toast.success('Sign-off approved'); setActionModal(null); setComment(''); },
        onError: () => toast.error('Failed to approve'),
      });
    } else {
      if (!comment.trim()) { toast.error('Comment is required for rejection'); return; }
      rejectSignoff.mutate({ signoffId: signoff.id, comment }, {
        onSuccess: () => { toast.success('Sign-off rejected'); setActionModal(null); setComment(''); },
        onError: () => toast.error('Failed to reject'),
      });
    }
  };

  return (
    <div className="p-6" style={{ background: isDark ? '#0A0A0A' : '#FFFFFF' }}>
      <div className="mb-5">
        <h1 className="text-[24px]" style={{ fontFamily: RH.fontDisplay, fontWeight: 650, color: isDark ? '#EDEDED' : RH.ink1 }}>Sign-off Queue</h1>
        <p className="text-[13px] mt-1" style={{ color: isDark ? '#878787' : 'rgba(237,237,237,0.40)' }}>All pending approvals — notifications sent to approver's For You homepage</p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: isDark ? '#878787' : 'rgba(237,237,237,0.40)' }} />
          <input type="text" placeholder="Search changes or approvers..." value={search} onChange={e => setSearch(e.target.value)}
            className="h-9 w-72 pl-9 pr-3 rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
            style={{ border: isDark ? '0.75px solid rgba(255,255,255,0.08)' : '0.75px solid rgba(15,23,42,0.12)', fontFamily: RH.fontBody, background: isDark ? '#1A1A1A' : '#FFFFFF', color: isDark ? '#EDEDED' : undefined }} />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <SkeletonRows count={5} />
      ) : signoffs.length === 0 ? (
        <EmptyState icon={CheckSquare} title="No pending sign-offs" subtitle="All approvals are up to date" />
      ) : (
        <div className="rounded-[6px] overflow-hidden" style={{ border: isDark ? '0.75px solid rgba(255,255,255,0.08)' : '0.75px solid rgba(15,23,42,0.12)', background: isDark ? '#1A1A1A' : '#FFFFFF' }}>
          <table className="w-full text-[13px]" style={{ fontFamily: RH.fontBody }}>
            <thead>
              <tr style={{ background: isDark ? '#1A1A1A' : '#1A1A1A' }}>
                {['CHANGE', 'TITLE', 'GATE', 'APPROVER', 'RISK', 'STATUS', 'ACTIONS'].map(h => (
                  <th key={h} className="text-left text-[11px] uppercase tracking-[0.06em]" style={{ fontWeight: 600, height: 50, padding: '8px 12px', color: isDark ? '#878787' : 'rgba(237,237,237,0.40)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((so: any) => {
                const isWaiting = so.status === 'waiting';
                const isPending = so.status === 'pending';
                return (
                  <tr key={so.id}
                    onClick={() => setSelectedChange(so.rh_changes)}
                    className="cursor-pointer group"
                    style={{ height: 50, maxHeight: 50, borderBottom: isDark ? '0.75px solid rgba(255,255,255,0.05)' : '0.75px solid rgba(15,23,42,0.06)', background: isDark ? '#1A1A1A' : undefined }}
                    onMouseEnter={e => (e.currentTarget.style.background = isDark ? '#1A1A1A' : 'rgba(15,23,42,0.04)')}
                    onMouseLeave={e => (e.currentTarget.style.background = isDark ? '#1A1A1A' : '')}
                  >
                    <td className="px-3" style={{ fontFamily: RH.fontMono, color: '#2563EB', fontWeight: 650 }}>{so.rh_changes?.chg_number || '—'}</td>
                    <td className="px-3 truncate max-w-[240px]" style={{ color: isDark ? '#A1A1A1' : RH.ink2 }}>{so.rh_changes?.title || '—'}</td>
                    <td className="px-3" style={{ color: isDark ? '#A1A1A1' : RH.ink2 }}>{so.signoff_role || so.stage || '—'}</td>
                    <td className="px-3" style={{ color: isDark ? '#878787' : 'rgba(237,237,237,0.40)' }}>{so.assigned_to || '—'}</td>
                    <td className="px-3"><RiskBadge risk={so.rh_changes?.risk_level || 'standard'} /></td>
                    <td className="px-3"><StatusLozenge status={so.status} /></td>
                    <td className="px-3">
                      {isWaiting ? (
                        <div className="flex items-center gap-1.5">
                          <button onClick={e => { e.stopPropagation(); setActionModal({ signoff: so, action: 'approve' }); }}
                            className="h-7 px-2.5 rounded-[4px] bg-[#16A34A] text-white text-[11px] font-bold hover:bg-[#15803D]">Approve</button>
                          <button onClick={e => { e.stopPropagation(); setActionModal({ signoff: so, action: 'reject' }); }}
                            className="h-7 px-2.5 rounded-[4px] text-[#DC2626] text-[11px] font-bold hover:bg-[rgba(248,113,113,0.06)]" style={{ border: '0.75px solid #FCA5A5' }}>Reject</button>
                        </div>
                      ) : isPending ? (
                        <span className="text-[11px] text-[rgba(237,237,237,0.40)]" title="Requires previous gate approval">Locked</span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Approve/Reject Modal */}
      <Dialog open={!!actionModal} onOpenChange={() => { setActionModal(null); setComment(''); }}>
        <DialogContent className="sm:max-w-[520px]" style={{ background: isDark ? '#1A1A1A' : '#FFFFFF' }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: RH.fontDisplay, fontWeight: 650 }}>
              {actionModal?.action === 'approve' ? 'Approve Sign-off' : 'Reject Sign-off'}
            </DialogTitle>
          </DialogHeader>
          {actionModal && (
            <div className="space-y-4">
              <div className="rounded-[6px] p-3" style={{ background: isDark ? '#1A1A1A' : '#1A1A1A' }}>
                <p className="text-[12px] mb-1" style={{ color: isDark ? '#878787' : 'rgba(237,237,237,0.40)' }}>Gate: <span className="font-bold" style={{ color: isDark ? '#A1A1A1' : 'rgba(237,237,237,0.53)' }}>{actionModal.signoff.signoff_role || actionModal.signoff.stage}</span></p>
                <p className="text-[12px]" style={{ color: isDark ? '#878787' : 'rgba(237,237,237,0.40)' }}>Change: <span style={{ fontFamily: RH.fontMono, fontWeight: 650, color: '#2563EB' }}>{actionModal.signoff.rh_changes?.chg_number}</span> — {actionModal.signoff.rh_changes?.title}</p>
                {actionModal.signoff.rh_changes?.risk_level && <div className="mt-2"><RiskBadge risk={actionModal.signoff.rh_changes.risk_level} /></div>}
              </div>
              <div>
                <label className="block text-[12px] font-semibold mb-1" style={{ color: isDark ? '#A1A1A1' : '#475569' }}>Comment {actionModal.action === 'reject' && '*'}</label>
                <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Add a comment..."
                  className="w-full h-24 px-3 py-2 rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 resize-none"
                  style={{ border: isDark ? '0.75px solid rgba(255,255,255,0.08)' : '0.75px solid rgba(15,23,42,0.12)', background: isDark ? '#1A1A1A' : undefined, color: isDark ? '#EDEDED' : undefined }} />
              </div>
            </div>
          )}
          <DialogFooter>
            <button onClick={() => { setActionModal(null); setComment(''); }} className="h-9 px-4 rounded-[6px] text-[13px] font-medium" style={{ color: isDark ? '#A1A1A1' : '#475569', border: isDark ? '0.75px solid rgba(255,255,255,0.08)' : '0.75px solid rgba(15,23,42,0.12)', background: isDark ? '#1A1A1A' : undefined }}>Cancel</button>
            <button onClick={handleAction} disabled={approveSignoff.isPending || rejectSignoff.isPending}
              className={`h-9 px-4 rounded-[6px] text-[13px] font-semibold text-white disabled:opacity-50 ${actionModal?.action === 'approve' ? 'bg-[#16A34A] hover:bg-[#15803D]' : 'bg-[#DC2626] hover:bg-[#B91C1C]'}`}>
              {actionModal?.action === 'approve' ? 'Approve' : 'Reject'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedChange && <ChgDrawer change={selectedChange} onClose={() => setSelectedChange(null)} />}
    </div>
  );
}
