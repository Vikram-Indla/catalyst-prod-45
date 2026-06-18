/**
 * SOP execution table (Phase 8b) — change detail SOP tab.
 * Expandable step rows over rh_sop_steps: step lifecycle status (select),
 * evidence link, branch/commit/command detail on expand. ADS tokens only.
 */
import React, { useState, useMemo } from 'react';
import Select from '@atlaskit/select';
import { ChevronRight, ChevronDown, ExternalLink } from '@/lib/atlaskit-icons';
import { useSopSteps, useUpdateSopStep, useSopTemplates, useApplySopTemplate, type SopStep } from '@/hooks/useReleaseHub';
import { catalystToast } from '@/lib/catalystToast';
import { RH } from '@/constants/releasehub.design';

const T = {
  card: 'var(--ds-surface-raised, #FFFFFF)',
  sunken: 'var(--ds-surface-sunken, #F7F8F9)',
  border: 'var(--ds-border, #DFE1E6)',
  text: 'var(--ds-text, #172B4D)',
  subtle: 'var(--ds-text-subtle, #44546F)',
  subtlest: 'var(--ds-text-subtlest, #626F86)',
  link: 'var(--ds-link, #0C66E4)',
  mono: 'var(--ds-font-family-code, monospace)',
};

const STATUS_OPTS = [
  { label: 'Pending', value: 'pending' },
  { label: 'In progress', value: 'in_progress' },
  { label: 'Done', value: 'done' },
  { label: 'Blocked', value: 'blocked' },
  { label: 'Skipped', value: 'skipped' },
  { label: 'Failed', value: 'failed' },
];

function statusColor(status: string): { fg: string; bg: string } {
  switch (status) {
    case 'done': return { fg: 'var(--ds-text-success, #216E4E)', bg: 'var(--ds-background-success, #DCFFF1)' };
    case 'in_progress': return { fg: 'var(--ds-text-information, #0055CC)', bg: 'var(--ds-background-information, #E9F2FE)' };
    case 'blocked':
    case 'failed': return { fg: 'var(--ds-text-danger, #AE2A19)', bg: 'var(--ds-background-danger, #FFECEB)' };
    case 'skipped': return { fg: 'var(--ds-text-warning, #A54800)', bg: 'var(--ds-background-warning, #FFF7D6)' };
    default: return { fg: T.subtle, bg: T.sunken };
  }
}

function titleCase(v: string | null) {
  if (!v) return '—';
  return v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, ' ');
}

function DetailRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  if (value == null || value === '') return null;
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
      <span style={{ fontFamily: RH.fontBody, fontSize: 12, fontWeight: 600, color: T.subtlest, minWidth: 120 }}>{label}</span>
      <span style={{ fontFamily: mono ? T.mono : RH.fontBody, fontSize: 13, color: T.text }}>{value}</span>
    </div>
  );
}

function StepRow({ step, changeId }: { step: SopStep; changeId: string }) {
  const [expanded, setExpanded] = useState(false);
  const update = useUpdateSopStep();
  const sc = statusColor(step.status);
  const current = STATUS_OPTS.find((o) => o.value === step.status) ?? null;

  return (
    <div style={{ borderBottom: `1px solid ${T.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0' }}>
        <button onClick={() => setExpanded((v) => !v)} aria-label={expanded ? 'Collapse' : 'Expand'} style={{ display: 'flex', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, color: T.subtlest }}>
          {expanded ? <ChevronDown size={16} style={{ color: T.subtlest }} /> : <ChevronRight size={16} style={{ color: T.subtlest }} />}
        </button>
        <span style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 600, color: T.subtlest, minWidth: 24 }}>{step.stepNo}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: RH.fontBody, fontSize: 14, fontWeight: 600, color: T.text, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{step.title}</p>
          <p style={{ fontFamily: RH.fontBody, fontSize: 12, color: T.subtlest, margin: '4px 0 0' }}>
            {titleCase(step.stepType)}{step.externalOwnerName ? ` · ${step.externalOwnerName}` : ''}{step.isMandatory ? '' : ' · optional'}
          </p>
        </div>
        {step.evidenceUrl && (
          <a href={step.evidenceUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: RH.fontBody, fontSize: 12, color: T.link, textDecoration: 'none' }}>
            Evidence <ExternalLink size={12} style={{ color: T.link }} />
          </a>
        )}
        <div style={{ width: 150 }}>
          <Select
            inputId={`sop-status-${step.id}`}
            options={STATUS_OPTS}
            value={current}
            spacing="compact"
            menuPosition="fixed"
            onChange={(v: any) => { if (v) update.mutate({ id: step.id, changeId, status: v.value }); }}
            isDisabled={update.isPending}
          />
        </div>
        <span style={{ fontFamily: RH.fontBody, fontSize: 11, fontWeight: 600, color: sc.fg, background: sc.bg, padding: '0 8px', borderRadius: 3, whiteSpace: 'nowrap', minWidth: 72, textAlign: 'center' }}>{titleCase(step.status)}</span>
      </div>
      {expanded && (
        <div style={{ padding: '8px 0 16px 48px' }}>
          {step.description && <p style={{ fontFamily: RH.fontBody, fontSize: 13, color: T.text, margin: '0 0 12px', whiteSpace: 'pre-wrap' }}>{step.description}</p>}
          <DetailRow label="Environment" value={titleCase(step.environment)} />
          <DetailRow label="Branch" value={step.branch} mono />
          <DetailRow label="Frontend commit" value={step.frontendCommit} mono />
          <DetailRow label="Backend commit" value={step.backendCommit} mono />
          <DetailRow label="Integration commit" value={step.integrationCommit} mono />
          <DetailRow label="Script" value={step.scriptReference} mono />
          <DetailRow label="Command" value={step.commandText} mono />
          <DetailRow label="Expected result" value={step.expectedResult} />
          <DetailRow label="Actual result" value={step.actualResult} />
          <DetailRow label="Blocker" value={step.blockerReason} />
        </div>
      )}
    </div>
  );
}

function ApplyTemplateBar({ changeId }: { changeId: string }) {
  const { data: templates = [] } = useSopTemplates();
  const apply = useApplySopTemplate();
  const [sel, setSel] = useState<{ label: string; value: string } | null>(null);
  const opts = useMemo(() => templates.map((t) => ({ label: `${t.name} (${t.stepCount})`, value: t.id })), [templates]);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
      <div style={{ width: 280 }}>
        <Select inputId="sop-apply-tmpl" options={opts} value={sel} onChange={(v: any) => setSel(v)} placeholder="Apply SOP template…" spacing="compact" menuPosition="fixed" />
      </div>
      <button
        onClick={() => { if (sel) apply.mutate({ templateId: sel.value, changeId }, { onSuccess: (n) => { catalystToast.success(`Applied ${n} step${n === 1 ? '' : 's'}`); setSel(null); }, onError: () => catalystToast.error('Failed to apply template') }); }}
        disabled={!sel || apply.isPending}
        style={{ height: 32, padding: '0 12px', borderRadius: 6, border: 'none', cursor: sel ? 'pointer' : 'not-allowed', background: 'var(--ds-background-brand-bold, #0C66E4)', color: 'var(--ds-text-inverse, #FFFFFF)', fontFamily: RH.fontBody, fontSize: 14, fontWeight: 500, opacity: sel ? 1 : 0.5 }}
      >
        Apply
      </button>
    </div>
  );
}

export function SopExecutionTab({ changeId }: { changeId: string }) {
  const { data: steps = [], isLoading } = useSopSteps(changeId);
  if (isLoading) return <div style={{ padding: 32, textAlign: 'center', fontFamily: RH.fontBody, fontSize: 13, color: T.subtlest }}>Loading…</div>;
  const done = steps.filter((s) => s.status === 'done').length;
  return (
    <div style={{ width: '100%', padding: '8px 0' }}>
      <ApplyTemplateBar changeId={changeId} />
      {steps.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', fontFamily: RH.fontBody, fontSize: 13, color: T.subtlest }}>No SOP steps yet. Apply an SOP template above to populate the runbook.</div>
      ) : (
        <>
          <p style={{ fontFamily: RH.fontBody, fontSize: 12, fontWeight: 600, color: T.subtlest, margin: '0 0 8px' }}>{done} of {steps.length} steps done</p>
          {steps.map((s) => <StepRow key={s.id} step={s} changeId={changeId} />)}
        </>
      )}
    </div>
  );
}
