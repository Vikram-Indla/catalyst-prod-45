import React from 'react';
import { useNavigate } from 'react-router-dom';
import Lozenge from '@atlaskit/lozenge';
import { PageHeader } from '@/components/ads/PageHeader';
import { Breadcrumbs } from '@/components/ads/Breadcrumbs';

interface StatusDef {
  value: string;
  label: string;
  appearance: 'default' | 'inprogress' | 'success' | 'removed' | 'moved';
  description: string;
  transitions: string[];
}

const CASE_STATUSES: StatusDef[] = [
  {
    value: 'DRAFT',
    label: 'Draft',
    appearance: 'default',
    description: 'Test case is being created or edited. Not ready for execution.',
    transitions: ['REVIEW'],
  },
  {
    value: 'REVIEW',
    label: 'Review',
    appearance: 'inprogress',
    description: 'Test case has been submitted for peer review. May be edited based on feedback.',
    transitions: ['APPROVED', 'DRAFT'],
  },
  {
    value: 'APPROVED',
    label: 'Approved',
    appearance: 'success',
    description: 'Test case has been reviewed and approved. Ready to be included in test cycles.',
    transitions: ['DEPRECATED', 'DRAFT'],
  },
  {
    value: 'DEPRECATED',
    label: 'Deprecated',
    appearance: 'removed',
    description: 'Test case is no longer relevant. Excluded from new cycles but retained for history.',
    transitions: ['APPROVED'],
  },
];

export default function TestCaseStatusesPage() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: 24, maxWidth: 860, fontFamily: 'var(--ds-font-family-body)' }}>
      <PageHeader
        title="Case statuses"
        breadcrumbs={
          <Breadcrumbs items={[
            { key: 'admin', text: 'Admin', onClick: () => navigate('/admin/overview') },
            { key: 'test', text: 'Test Hub', isCurrent: false },
            { key: 'statuses', text: 'Case statuses', isCurrent: true },
          ]} />
        }
      />

      <p style={{ fontSize: 14, color: 'var(--ds-text-subtle)', margin: '4px 0 24px' }}>
        Test case lifecycle statuses are system-defined. Contact your administrator to change the workflow.
      </p>

      {/* Lifecycle flow diagram */}
      <div style={{
        background: 'var(--ds-surface-sunken)',
        border: '1px solid var(--ds-border)',
        borderRadius: 8,
        padding: '16px 20px',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtle)', marginRight: 4 }}>Lifecycle:</span>
        {CASE_STATUSES.map((s, i) => (
          <React.Fragment key={s.value}>
            <Lozenge appearance={s.appearance}>{s.label}</Lozenge>
            {i < CASE_STATUSES.length - 1 && (
              <span style={{ color: 'var(--ds-text-subtlest)', fontSize: 14 }}>→</span>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Status cards */}
      <div style={{ display: 'grid', gap: 12 }}>
        {CASE_STATUSES.map(s => (
          <div
            key={s.value}
            style={{
              border: '1px solid var(--ds-border)',
              borderRadius: 8,
              padding: '16px 20px',
              background: 'var(--ds-surface)',
              display: 'grid',
              gridTemplateColumns: '160px 1fr auto',
              alignItems: 'start',
              gap: 16,
            }}
          >
            <div>
              <Lozenge appearance={s.appearance}>{s.label}</Lozenge>
              <div style={{ marginTop: 4, fontSize: 11, fontFamily: 'var(--ds-font-family-code, monospace)', color: 'var(--ds-text-subtlest)' }}>
                {s.value}
              </div>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--ds-text)', lineHeight: 1.5 }}>
                {s.description}
              </p>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ds-text-subtlest)', marginBottom: 4 }}>
                CAN MOVE TO
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {s.transitions.length === 0 ? (
                  <span style={{ fontSize: 12, color: 'var(--ds-text-subtlest)' }}>—</span>
                ) : s.transitions.map(to => {
                  const target = CASE_STATUSES.find(x => x.value === to);
                  return target ? (
                    <Lozenge key={to} appearance={target.appearance}>{target.label}</Lozenge>
                  ) : null;
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      <p style={{ marginTop: 24, fontSize: 12, color: 'var(--ds-text-subtlest)' }}>
        These statuses are built into the Test Hub platform. Custom status workflows are not supported in this release.
      </p>
    </div>
  );
}
