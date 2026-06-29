/**
 * WorkItemTraceabilityPanel (Phase 16) — Release & Change traceability for a
 * single work item. Shows the changes that reference this work item and the
 * releases it ships under. Mounted in the Project/Product work-item detail view.
 * Renders nothing when the item has no release/change linkage (silence > noise).
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkItemTraceability } from '@/hooks/useReleaseHub';
import { StatusLozenge } from '@/components/shared/StatusLozenge';
import { RH } from '@/constants/releasehub.design';

const T = {
  card: 'var(--ds-surface-raised)',
  border: 'var(--ds-border)',
  text: 'var(--ds-text)',
  subtle: 'var(--ds-text-subtle)',
  subtlest: 'var(--ds-text-subtlest)',
  link: 'var(--ds-link)',
  mono: 'var(--ds-font-family-code, monospace)',
};

export function WorkItemTraceabilityPanel({ workItemKey }: { workItemKey: string }) {
  const navigate = useNavigate();
  const { data, isLoading } = useWorkItemTraceability(workItemKey);

  // Render nothing while loading or when there is no linkage — keeps the detail
  // view clean for the common case.
  if (isLoading || !data || (data.changes.length === 0 && data.releases.length === 0)) return null;

  return (
    <div style={{ marginTop: 16 }}>
      <h2 style={{ fontFamily: RH.fontDisplay, fontSize: 'var(--ds-font-size-500)', fontWeight: 600, color: T.text, margin: '0 0 8px' }}>Release &amp; Change traceability</h2>
      <div style={{ border: `1px solid ${T.border}`, borderRadius: 8, overflow: 'hidden' }}>
        {data.changes.map((c) => (
          <div
            key={c.id}
            onClick={() => navigate(`/release-hub/changes/${c.id}`)}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: `1px solid ${T.border}`, cursor: 'pointer' }}
          >
            <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.subtlest, minWidth: 56 }}>Change</span>
            <span style={{ fontFamily: T.mono, fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: T.link }}>{c.chgNumber}</span>
            <span style={{ flex: 1, minWidth: 0, fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-400)', color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.title}</span>
            <StatusLozenge status={c.status} />
          </div>
        ))}
        {data.releases.map((r) => (
          <div
            key={r.id}
            onClick={() => navigate(`/release-hub/${r.id}`)}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: `1px solid ${T.border}`, cursor: 'pointer' }}
          >
            <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.subtlest, minWidth: 56 }}>Release</span>
            <span style={{ flex: 1, minWidth: 0, fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-400)', fontWeight: 600, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</span>
            <StatusLozenge status={r.status} />
          </div>
        ))}
      </div>
    </div>
  );
}
