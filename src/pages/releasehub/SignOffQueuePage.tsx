/**
 * Release Operations — Sign-off Queue (route /release-hub/sign-off-queue)
 *
 * Phase 12: aggregates all pending approvals (usePendingApprovals) with the
 * approver's face avatar, change, role, and wait time. Review opens the
 * approval window — Approve (with optional comment) or Reject (comment
 * required). Approve/Reject delegate to useApproveSignoff / useRejectSignoff.
 */
import React, { useState } from 'react';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import TextArea from '@atlaskit/textarea';
import { formatDistanceToNowStrict } from 'date-fns';
import { CheckSquare, ChevronRight } from '@/lib/atlaskit-icons';
import { usePendingApprovals, useApproveSignoff, useRejectSignoff, type PendingApproval } from '@/hooks/useReleaseHub';
import { Avatar } from '@/components/ads/Avatar';
import { EmptyState, ErrorState } from '@/components/releasehub/EmptyState';
import { catalystToast } from '@/lib/catalystToast';
import { useReleaseOpsPermissions, PERMISSION_DENIED_TOOLTIP } from '@/hooks/useReleaseOpsPermissions';
import { RH } from '@/constants/releasehub.design';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';

const T = {
  surface: 'var(--ds-surface, #FFFFFF)',
  sunken: 'var(--ds-surface-sunken, #F7F8F9)',
  border: 'var(--ds-border, #DFE1E6)',
  text: 'var(--ds-text, #172B4D)',
  subtle: 'var(--ds-text-subtle, #44546F)',
  subtlest: 'var(--ds-text-subtlest, #626F86)',
  link: 'var(--ds-link, #0C66E4)',
  mono: 'var(--ds-font-family-code, monospace)',
};

function ApprovalWindow({ approval, onClose }: { approval: PendingApproval; onClose: () => void }) {
  const approve = useApproveSignoff();
  const reject = useRejectSignoff();
  const { canApprove } = useReleaseOpsPermissions();
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const busy = approve.isPending || reject.isPending;

  const doApprove = () => {
    setError('');
    approve.mutate({ signoffId: approval.id, comment: comment.trim() || undefined }, {
      onSuccess: () => { catalystToast.success('Sign-off approved'); onClose(); },
      onError: (e: any) => { setError(e?.message || 'Failed to approve'); },
    });
  };
  const doReject = () => {
    if (!comment.trim()) { setError('A comment is required to reject'); return; }
    setError('');
    reject.mutate({ signoffId: approval.id, comment: comment.trim() }, {
      onSuccess: () => { catalystToast.success('Sign-off rejected'); onClose(); },
      onError: (e: any) => { setError(e?.message || 'Failed to reject'); },
    });
  };

  return (
    <ModalTransition>
      <Modal onClose={onClose} width="small">
        <ModalHeader hasCloseButton><ModalTitle>Review sign-off</ModalTitle></ModalHeader>
        <ModalBody>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 600, color: T.link }}>{approval.chgNumber ?? '—'}</span>
              <span style={{ fontFamily: RH.fontBody, fontSize: 14, color: T.text }}>{approval.changeTitle ?? ''}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {approval.role && <span style={{ fontFamily: RH.fontBody, fontSize: 11, fontWeight: 600, color: T.subtle, background: T.sunken, padding: '0 8px', borderRadius: 3 }}>{approval.role}</span>}
              <Avatar name={approval.approverName ?? 'Unassigned'} src={approval.approverAvatarUrl ?? undefined} size="small" />
              <span style={{ fontFamily: RH.fontBody, fontSize: 13, color: T.subtle }}>{approval.approverName ?? 'Unassigned'}</span>
            </div>
          </div>
          <label style={{ display: 'block', fontFamily: RH.fontBody, fontSize: 12, fontWeight: 600, color: T.subtle, marginBottom: 4 }} htmlFor="signoff-comment">Comment</label>
          <TextArea id="signoff-comment" value={comment} onChange={(e) => setComment((e.target as HTMLTextAreaElement).value)} placeholder="Optional for approve, required for reject" minimumRows={3} />
          {error && <div style={{ fontFamily: RH.fontBody, fontSize: 11, color: 'var(--ds-text-danger, #AE2A19)', marginTop: 4 }}>{error}</div>}
        </ModalBody>
        <ModalFooter>
          <Button appearance="subtle" onClick={onClose}>Cancel</Button>
          <Button appearance="warning" onClick={doReject} isDisabled={busy || !canApprove}>Reject</Button>
          <Button appearance="primary" onClick={doApprove} isDisabled={busy || !canApprove} isLoading={approve.isPending}>Approve</Button>
        </ModalFooter>
      </Modal>
    </ModalTransition>
  );
}

function waitLabel(iso: string | null): string {
  if (!iso) return '—';
  try { return `${formatDistanceToNowStrict(new Date(iso))} waiting`; } catch { return '—'; }
}

export default function SignOffQueuePage() {
  const { data: approvals = [], isLoading, error, refetch } = usePendingApprovals();
  const [selected, setSelected] = useState<PendingApproval | null>(null);

  return (
    <div style={{ padding: 24, background: T.surface, minHeight: '100%' }}>
      <div style={{ margin: '-24px -24px 16px' }}>
        <ProjectPageHeader projectKey="RELEASES" hubType="release" />
      </div>

      {error ? (
        <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
      ) : isLoading ? (
        <div style={{ padding: 32, textAlign: 'center', fontFamily: RH.fontBody, fontSize: 13, color: T.subtlest }}>Loading…</div>
      ) : approvals.length === 0 ? (
        <EmptyState icon={CheckSquare} title="No pending sign-offs" subtitle="Approvals requested on changes will appear here for review." />
      ) : (
        <div style={{ border: `1px solid ${T.border}`, borderRadius: 8, overflow: 'hidden' }}>
          {approvals.map((a) => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: `1px solid ${T.border}` }}>
              <Avatar name={a.approverName ?? 'Unassigned'} src={a.approverAvatarUrl ?? undefined} size="medium" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: RH.fontBody, fontSize: 14, fontWeight: 600, color: T.text }}>{a.approverName ?? 'Unassigned'}</span>
                  {a.role && <span style={{ fontFamily: RH.fontBody, fontSize: 11, fontWeight: 600, color: T.subtle, background: T.sunken, padding: '0 8px', borderRadius: 3 }}>{a.role}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  {a.chgNumber && <span style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 600, color: T.link }}>{a.chgNumber}</span>}
                  <span style={{ fontFamily: RH.fontBody, fontSize: 12, color: T.subtlest, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.changeTitle ?? '—'} · {waitLabel(a.waitStartedAt)}</span>
                </div>
              </div>
              <button onClick={() => setSelected(a)} style={{ display: 'flex', alignItems: 'center', gap: 2, fontFamily: RH.fontBody, fontSize: 13, fontWeight: 500, color: T.link, background: 'transparent', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Review <ChevronRight size={14} style={{ color: T.link }} />
              </button>
            </div>
          ))}
        </div>
      )}

      {selected && <ApprovalWindow approval={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
