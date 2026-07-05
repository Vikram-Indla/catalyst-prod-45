import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Lozenge from '@atlaskit/lozenge';
import Textfield from '@atlaskit/textfield';
import Select from '@atlaskit/select';
import Spinner from '@atlaskit/spinner';
import { PageHeader } from '@/components/ads/PageHeader';
import { Breadcrumbs } from '@/components/ads/Breadcrumbs';
import { useTestHubProject } from '@/hooks/test-management/useTestHubProject';
import {
  useCaseStatusConfig,
  useSaveCaseStatusConfig,
  DEFAULT_STATUS_CONFIG,
  type CaseStatusConfig,
  type StatusCategory,
} from '@/hooks/test-management/useCaseStatusConfig';
import { ArrowUp, ArrowDown } from '@/lib/atlaskit-icons';

/**
 * S6b — configurable test-case status workflow (admin). Edits label, ADS
 * category, order, and allowed transitions per project, persisting to
 * tm_case_status_config. The status_key set is fixed (draft/ready/approved/
 * deprecated) — the enum is not editable — so no live status write path is
 * affected. A project with no saved config uses the canonical defaults.
 */

const CATEGORY_OPTIONS: { label: string; value: StatusCategory }[] = [
  { label: 'Neutral', value: 'default' },
  { label: 'In progress', value: 'inprogress' },
  { label: 'Success', value: 'success' },
  { label: 'Removed', value: 'removed' },
];

export default function TestCaseWorkflowPage() {
  const navigate = useNavigate();
  const { projectId } = useTestHubProject();
  const { data, isLoading } = useCaseStatusConfig(projectId);
  const save = useSaveCaseStatusConfig(projectId);

  const [draft, setDraft] = useState<CaseStatusConfig[]>(DEFAULT_STATUS_CONFIG);

  useEffect(() => { if (data?.config) setDraft(data.config); }, [data]);

  const update = (i: number, patch: Partial<CaseStatusConfig>) =>
    setDraft(d => d.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= draft.length) return;
    setDraft(d => { const n = [...d]; [n[i], n[j]] = [n[j], n[i]]; return n; });
  };

  const labelFor = (key: string) => draft.find(s => s.status_key === key)?.display_label ?? key;

  return (
    <div style={{ padding: 'var(--ds-space-300)', maxWidth: 900, fontFamily: 'var(--ds-font-family-body)' }}>
      <PageHeader
        title="Case workflow"
        breadcrumbs={
          <Breadcrumbs items={[
            { key: 'admin', text: 'Admin', onClick: () => navigate('/admin/overview') },
            { key: 'test', text: 'Test Hub', isCurrent: false },
            { key: 'workflow', text: 'Case workflow', isCurrent: true },
          ]} />
        }
      />

      <p style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtle)', margin: 'var(--ds-space-050) 0 var(--ds-space-300)' }}>
        Configure how the four lifecycle statuses appear and which transitions are allowed. The status set is fixed; labels, colour category, order and transitions are per project.
      </p>

      {/* Live lifecycle preview */}
      <div style={{
        background: 'var(--ds-surface-sunken)', border: '1px solid var(--ds-border)',
        borderRadius: 'var(--ds-border-radius)', padding: 'var(--ds-space-200) var(--ds-space-250)',
        marginBottom: 'var(--ds-space-300)', display: 'flex', alignItems: 'center', gap: 'var(--ds-space-150)', flexWrap: 'wrap',
      }}>
        {draft.map((s, i) => (
          <React.Fragment key={s.status_key}>
            <Lozenge appearance={s.category}>{s.display_label}</Lozenge>
            {i < draft.length - 1 && <span style={{ color: 'var(--ds-text-subtlest)' }}>→</span>}
          </React.Fragment>
        ))}
      </div>

      {isLoading ? (
        <div style={{ padding: 'var(--ds-space-300)', display: 'flex', justifyContent: 'center' }}><Spinner /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-150)' }}>
          {draft.map((s, i) => (
            <div key={s.status_key} style={{
              border: '1px solid var(--ds-border)', borderRadius: 'var(--ds-border-radius)',
              padding: 'var(--ds-space-200)', display: 'grid',
              gridTemplateColumns: '28px 1fr 160px 1fr auto', gap: 'var(--ds-space-150)', alignItems: 'center',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-025)' }}>
                <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up"
                  style={{ background: 'none', border: 'none', cursor: i === 0 ? 'default' : 'pointer', color: 'var(--ds-text-subtle)', opacity: i === 0 ? 0.4 : 1, padding: 0 }}>
                  <ArrowUp size={14} />
                </button>
                <button onClick={() => move(i, 1)} disabled={i === draft.length - 1} aria-label="Move down"
                  style={{ background: 'none', border: 'none', cursor: i === draft.length - 1 ? 'default' : 'pointer', color: 'var(--ds-text-subtle)', opacity: i === draft.length - 1 ? 0.4 : 1, padding: 0 }}>
                  <ArrowDown size={14} />
                </button>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-text-subtlest)', marginBottom: 'var(--ds-space-050)' }}>
                  {s.status_key}
                </label>
                <Textfield
                  value={s.display_label}
                  onChange={e => update(i, { display_label: (e.target as HTMLInputElement).value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-text-subtlest)', marginBottom: 'var(--ds-space-050)' }}>
                  Category
                </label>
                <Select
                  isSearchable={false}
                  options={CATEGORY_OPTIONS}
                  value={CATEGORY_OPTIONS.find(o => o.value === s.category)}
                  onChange={(opt) => update(i, { category: (opt as { value: StatusCategory }).value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-text-subtlest)', marginBottom: 'var(--ds-space-050)' }}>
                  Can transition to
                </label>
                <Select
                  isMulti
                  options={draft.filter(o => o.status_key !== s.status_key).map(o => ({ label: o.display_label, value: o.status_key }))}
                  value={s.allowed_next.map(k => ({ label: labelFor(k), value: k }))}
                  onChange={(opts) => update(i, { allowed_next: (opts as Array<{ value: string }>).map(o => o.value) })}
                />
              </div>

              <div style={{ paddingTop: 'var(--ds-space-250)' }}>
                <Lozenge appearance={s.category}>{s.display_label}</Lozenge>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 'var(--ds-space-150)', marginTop: 'var(--ds-space-300)' }}>
        <button
          onClick={() => save.mutate(draft)}
          disabled={save.isPending || !projectId}
          style={{
            padding: 'var(--ds-space-075) var(--ds-space-250)', borderRadius: 'var(--ds-border-radius)', border: 'none', fontWeight: 600,
            cursor: save.isPending ? 'not-allowed' : 'pointer',
            background: save.isPending ? 'var(--ds-background-disabled)' : 'var(--ds-background-brand-bold)',
            color: save.isPending ? 'var(--ds-text-disabled)' : 'var(--ds-text-inverse)',
          }}
        >
          {save.isPending ? 'Saving…' : 'Save workflow'}
        </button>
        <button
          onClick={() => setDraft(DEFAULT_STATUS_CONFIG)}
          style={{ padding: 'var(--ds-space-075) var(--ds-space-200)', borderRadius: 'var(--ds-border-radius)', border: '1px solid var(--ds-border)', background: 'var(--ds-surface)', color: 'var(--ds-text-subtle)', fontWeight: 500, cursor: 'pointer' }}
        >
          Reset to defaults
        </button>
      </div>
    </div>
  );
}
