/**
 * SopRunbook — Phase 4 SOP execution runbook (Change Detail SOP tab).
 *
 * Runbook summary + ordered, expandable execution steps with lifecycle actions,
 * commit/evidence capture, per-step timer, assignment, up/down reorder, and
 * rollback marking. Validation is enforced in useSopStepAction. ADS tokens +
 * canonical components only. No drawers.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Select from '@atlaskit/select';
import Textfield from '@atlaskit/textfield';
import TextArea from '@atlaskit/textarea';
import { ChevronRight, ChevronDown, ExternalLink, ArrowUp, ArrowDown } from '@/lib/atlaskit-icons';
import { supabase } from '@/integrations/supabase/client';
import { useSopRunbook, useSopStepAction, useAssignSopStep, useReorderSopStep, type SopStepFull } from '@/hooks/useSopRunbook';
import { SectionMessage } from '@/components/ads/SectionMessage';
import CatalystAvatar from '@/components/shared/CatalystAvatar';
import { catalystToast } from '@/lib/catalystToast';
import { RH } from '@/constants/releasehub.design';
import { ApplySopTemplateModal } from '@/components/releasehub/detail/ApplySopTemplateModal';

const T = {
  card: 'var(--ds-surface-raised)', sunken: 'var(--ds-surface-sunken)', border: 'var(--ds-border)',
  text: 'var(--ds-text)', subtle: 'var(--ds-text-subtle)', subtlest: 'var(--ds-text-subtlest)', link: 'var(--ds-link)',
  danger: 'var(--ds-text-danger)', warning: 'var(--ds-text-warning)', success: 'var(--ds-text-success)', info: 'var(--ds-text-information)',
  mono: 'var(--ds-font-family-code, monospace)',
};

const titleCase = (v: string | null) => (!v ? '—' : v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, ' '));
const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
function durStr(ms: number) { const m = Math.max(0, Math.round(ms / 60000)); return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`; }

function statusColor(status: string): { fg: string; bg: string } {
  switch (status) {
    case 'done': return { fg: 'var(--ds-text-success)', bg: 'var(--ds-background-success)' };
    case 'in_progress': return { fg: 'var(--ds-text-information)', bg: 'var(--ds-background-information)' };
    case 'blocked': case 'failed': return { fg: 'var(--ds-text-danger)', bg: 'var(--ds-background-danger)' };
    case 'skipped': return { fg: 'var(--ds-text-warning)', bg: 'var(--ds-background-warning)' };
    case 'ready': return { fg: 'var(--ds-text-information)', bg: 'var(--ds-background-information)' };
    default: return { fg: 'var(--ds-text-subtle)', bg: 'var(--ds-surface-sunken)' };
  }
}

function Indicator({ label, tone }: { label: string; tone: string }) {
  return <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', fontWeight: 700, color: tone, border: `1px solid ${tone}`, borderRadius: 3, padding: '0 4px', textTransform: 'uppercase', letterSpacing: '.03em' }}>{label}</span>;
}

// ── assignee picker (change participants + profiles) ──────────────────
function useProfileOptions() {
  return useQuery({
    queryKey: ['release-hub', 'sop-assignee-options'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name, email').order('full_name').limit(50);
      return (data ?? []).map((p: any) => ({ label: p.full_name || p.email || 'Unknown', value: p.id }));
    },
  });
}

function StepTimer({ step }: { step: SopStepFull }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  if (step.status === 'in_progress' && step.actualStartAt) {
    const start = new Date(step.actualStartAt).getTime();
    const pEnd = step.plannedEndAt ? new Date(step.plannedEndAt).getTime() : null;
    const over = pEnd != null && now > pEnd;
    return <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: over ? T.danger : T.success }}>{over ? `+${durStr(now - pEnd!)} over` : `${durStr(now - start)} elapsed`}</span>;
  }
  if ((step.status === 'done' || step.status === 'failed' || step.status === 'skipped') && step.actualStartAt && step.actualEndAt) {
    return <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', color: T.subtle }}>{durStr(new Date(step.actualEndAt).getTime() - new Date(step.actualStartAt).getTime())}</span>;
  }
  if (step.status === 'pending' && step.plannedStartAt) {
    const s = new Date(step.plannedStartAt).getTime();
    return <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>{now < s ? `in ${durStr(s - now)}` : 'due'}</span>;
  }
  return null;
}

function ActionBtn({ label, tone, onClick, disabled }: { label: string; tone?: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ height: 28, padding: '0 10px', borderRadius: 6, border: `1px solid ${tone ?? T.border}`, background: 'transparent', color: tone ?? T.text, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', fontWeight: 600 }}>{label}</button>
  );
}

function StepRow({ step, changeId, steps, canManage, onRaiseIssue, issue }: { step: SopStepFull; changeId: string; steps: SopStepFull[]; canManage: boolean; onRaiseIssue?: (kind: 'incident' | 'defect', sopStepId: string) => void; issue?: { incidents: number; defects: number; crit: boolean } }) {
  const [expanded, setExpanded] = useState(false);
  const action = useSopStepAction();
  const assign = useAssignSopStep();
  const reorder = useReorderSopStep();
  const { data: profileOpts = [] } = useProfileOptions();
  const sc = statusColor(step.status);
  const [reason, setReason] = useState('');
  const [evidence, setEvidence] = useState(step.evidenceUrl ?? '');
  const [actual, setActual] = useState(step.actualResult ?? '');
  const [commit, setCommit] = useState('');

  const run = (patch: Parameters<typeof action.mutate>[0]) =>
    action.mutate(patch, { onError: (e: any) => catalystToast.error(e?.message ?? 'Action failed'), onSuccess: () => { if (patch.status) catalystToast.success(`Step ${patch.status.replace('_', ' ')}`); } });

  const commitField: 'frontend' | 'backend' | 'integration' | 'database' | 'configuration' | null =
    step.stepType === 'frontend' ? 'frontend' : step.stepType === 'backend' ? 'backend' : step.stepType === 'integration' ? 'integration' : step.stepType === 'database' ? 'database' : step.stepType === 'configuration' ? 'configuration' : null;

  return (
    <div style={{ borderBottom: `1px solid ${T.border}`, background: step.isRollback ? 'var(--ds-background-warning)' : undefined }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 8px' }}>
        <button onClick={() => setExpanded((v) => !v)} aria-label={expanded ? 'Collapse' : 'Expand'} style={{ display: 'flex', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, color: T.subtlest }}>
          {expanded ? <ChevronDown size={16} style={{ color: T.subtlest }} /> : <ChevronRight size={16} style={{ color: T.subtlest }} />}
        </button>
        <span style={{ fontFamily: T.mono, fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: T.subtlest, minWidth: 20 }}>{step.stepNo}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-400)', fontWeight: 600, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{step.title}</span>
            {step.isRollback && <Indicator label="Rollback" tone={T.warning} />}
            {step.commitRequired && <Indicator label="Commit" tone={T.info} />}
            {step.evidenceRequired && <Indicator label="Evidence" tone={T.info} />}
            {!step.isMandatory && <Indicator label="Optional" tone={T.subtle} />}
            {(issue && (issue.incidents + issue.defects > 0)) && <Indicator label={`${issue.incidents + issue.defects} issue${issue.incidents + issue.defects === 1 ? '' : 's'}`} tone={issue.crit ? T.danger : T.warning} />}
            {(step.incidentId || step.defectId) && !issue && <Indicator label="Issue" tone={T.danger} />}
          </div>
          <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>{titleCase(step.stepType)}{step.assignedRole ? ` · ${titleCase(step.assignedRole)}` : ''} · plan {fmt(step.plannedStartAt)}</span>
        </div>
        <StepTimer step={step} />
        {step.ownerName ? <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><CatalystAvatar name={step.ownerName} size="small" /></div> : <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', color: T.warning }}>Unassigned</span>}
        <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: sc.fg, background: sc.bg, padding: '0 8px', borderRadius: 3, minWidth: 74, textAlign: 'center' }}>{titleCase(step.status)}</span>
      </div>

      {expanded && (
        <div style={{ padding: '4px 8px 16px 46px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {step.description && <p style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.text, margin: 0, whiteSpace: 'pre-wrap' }}>{step.description}</p>}

          {/* detail grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: '4px 24px' }}>
            {step.repoName && <Detail label="Repo" value={step.repoUrl ? <a href={step.repoUrl} target="_blank" rel="noreferrer" style={{ color: T.link }}>{step.repoName} <ExternalLink size={11} style={{ color: T.link }} /></a> : step.repoName} />}
            <Detail label="Branch" value={step.branch} mono />
            <Detail label="Script" value={step.scriptReference} mono />
            <Detail label="Command" value={step.commandText} mono />
            <Detail label="Expected" value={step.expectedResult} />
            <Detail label="Planned" value={`${fmt(step.plannedStartAt)} → ${fmt(step.plannedEndAt)}`} />
            <Detail label="Actual" value={step.actualStartAt ? `${fmt(step.actualStartAt)} → ${fmt(step.actualEndAt)}` : '—'} />
            <Detail label="FE / BE / INT" value={[step.frontendCommit, step.backendCommit, step.integrationCommit].filter(Boolean).join(' · ') || '—'} mono />
            <Detail label="DB / Config" value={[step.databaseCommit, step.configurationCommit].filter(Boolean).join(' · ') || '—'} mono />
            <Detail label="Actual result" value={step.actualResult} />
            {step.blockerReason && <Detail label="Blocker" value={step.blockerReason} />}
          </div>

          {/* assignment */}
          {canManage && (
            <div style={{ maxWidth: 320 }}>
              <label style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.subtlest }}>Assignee</label>
              <Select inputId={`assign-${step.id}`} options={profileOpts} value={profileOpts.find((o: any) => o.value === step.ownerId) ?? null} isClearable spacing="compact" menuPosition="fixed"
                onChange={(v: any) => assign.mutate({ stepId: step.id, changeId, ownerId: v?.value ?? null, ownerName: v?.label, stepNo: step.stepNo, title: step.title })} placeholder="Assign a user" />
            </div>
          )}

          {/* capture inputs (in-progress) */}
          {canManage && step.status === 'in_progress' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8, background: T.sunken, borderRadius: 6, padding: 10 }}>
              {commitField && <div><label style={capLbl}>Commit ({commitField})</label><Textfield value={commit} onChange={(e) => setCommit((e.target as HTMLInputElement).value)} placeholder="commit sha" /></div>}
              {step.evidenceRequired && <div><label style={capLbl}>Evidence URL</label><Textfield value={evidence} onChange={(e) => setEvidence((e.target as HTMLInputElement).value)} placeholder="https://…" /></div>}
              <div><label style={capLbl}>Actual result</label><Textfield value={actual} onChange={(e) => setActual((e.target as HTMLInputElement).value)} placeholder="Observed outcome" /></div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                <ActionBtn label="Save capture" onClick={() => run({ step, changeId, commits: commitField && commit ? { [commitField]: commit } as any : undefined, evidenceUrl: evidence || undefined, actualResult: actual || undefined })} />
              </div>
            </div>
          )}

          {/* reason (blocked/failed/skip) */}
          {canManage && (step.status === 'in_progress' || step.status === 'pending' || step.status === 'blocked') && (
            <div style={{ maxWidth: 480 }}>
              <label style={capLbl}>Reason (for block / fail / skip)</label>
              <TextArea value={reason} onChange={(e) => setReason((e.target as HTMLTextAreaElement).value)} placeholder="Required when blocking, failing, or skipping a mandatory step" minimumRows={1} />
            </div>
          )}

          {/* actions by state */}
          {canManage && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(step.status === 'pending' || step.status === 'ready') && (
                <>
                  <ActionBtn label="Start" tone={T.success} onClick={() => run({ step, changeId, status: 'in_progress' })} />
                  <ActionBtn label="Block" tone={T.warning} onClick={() => run({ step, changeId, status: 'blocked', blockerReason: reason })} />
                  <ActionBtn label="Skip" onClick={() => run({ step, changeId, status: 'skipped', reason })} />
                </>
              )}
              {step.status === 'in_progress' && (
                <>
                  <ActionBtn label="Mark done" tone={T.success} onClick={() => run({ step, changeId, status: 'done', commits: commitField && commit ? { [commitField]: commit } as any : undefined, evidenceUrl: evidence || undefined, actualResult: actual || undefined })} />
                  <ActionBtn label="Block" tone={T.warning} onClick={() => run({ step, changeId, status: 'blocked', blockerReason: reason })} />
                  <ActionBtn label="Fail" tone={T.danger} onClick={() => run({ step, changeId, status: 'failed', blockerReason: reason })} />
                </>
              )}
              {step.status === 'blocked' && (
                <>
                  <ActionBtn label="Resume" tone={T.success} onClick={() => run({ step, changeId, status: 'in_progress' })} />
                  <ActionBtn label="Fail" tone={T.danger} onClick={() => run({ step, changeId, status: 'failed', blockerReason: reason || step.blockerReason || undefined })} />
                </>
              )}
              {step.status === 'failed' && steps.some((s) => s.isRollback && s.status === 'pending') && (
                <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.warning, alignSelf: 'center' }}>↩ Rollback step available below — start it to recover.</span>
              )}
              {(step.status === 'done' || step.status === 'skipped') && (
                <ActionBtn label="Reopen" onClick={() => { if (reason.trim()) run({ step, changeId, status: 'pending', blockerReason: reason }); else catalystToast.error('Reopen requires a reason'); }} />
              )}
              {/* reorder */}
              {onRaiseIssue && (
                <>
                  <ActionBtn label="Raise incident" tone={T.danger} onClick={() => onRaiseIssue('incident', step.id)} />
                  <ActionBtn label="Raise defect" tone={T.info} onClick={() => onRaiseIssue('defect', step.id)} />
                </>
              )}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                <ActionBtn label="↑" onClick={() => reorder.mutate({ changeId, stepId: step.id, stepNo: step.stepNo, dir: 'up', steps })} disabled={step.stepNo <= Math.min(...steps.map((s) => s.stepNo))} />
                <ActionBtn label="↓" onClick={() => reorder.mutate({ changeId, stepId: step.id, stepNo: step.stepNo, dir: 'down', steps })} disabled={step.stepNo >= Math.max(...steps.map((s) => s.stepNo))} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const capLbl: React.CSSProperties = { display: 'block', fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-text-subtlest)', marginBottom: 4 };
function Detail({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  if (value == null || value === '') return null;
  return <div style={{ display: 'flex', gap: 8 }}><span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.subtlest, minWidth: 96 }}>{label}</span><span style={{ fontFamily: mono ? T.mono : RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.text, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</span></div>;
}

function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) {
  return <div><div style={{ fontFamily: RH.fontDisplay, fontSize: 'var(--ds-font-size-400)', fontWeight: 600, color: tone ?? T.text }}>{value}</div><div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.subtlest, textTransform: 'uppercase', letterSpacing: '.03em' }}>{label}</div></div>;
}

export interface StepIssueInfo { incidents: number; defects: number; crit: boolean }
export function SopRunbook({ changeId, change, canManage, onRaiseIssue, issuesByStep }: { changeId: string; change: any; canManage: boolean; onRaiseIssue?: (kind: 'incident' | 'defect', sopStepId: string) => void; issuesByStep?: Record<string, StepIssueInfo> }) {
  const { data: steps = [], isLoading } = useSopRunbook(changeId);
  const [applyOpen, setApplyOpen] = useState(false);

  const summary = useMemo(() => {
    const done = steps.filter((s) => s.status === 'done').length;
    const running = steps.filter((s) => s.status === 'in_progress');
    const missingCommit = steps.filter((s) => s.commitRequired && !(s.frontendCommit || s.backendCommit || s.integrationCommit || s.databaseCommit || s.configurationCommit)).length;
    const missingEvidence = steps.filter((s) => s.evidenceRequired && !s.evidenceUrl).length;
    const unassigned = steps.filter((s) => (s.isMandatory || s.isTechnical) && !s.ownerId).length;
    return {
      total: steps.length, done,
      mandatory: steps.filter((s) => s.isMandatory).length,
      technical: steps.filter((s) => s.isTechnical).length,
      blocked: steps.filter((s) => s.status === 'blocked').length,
      failed: steps.filter((s) => s.status === 'failed').length,
      missingCommit, missingEvidence, unassigned,
      running, next: steps.find((s) => s.status === 'pending' || s.status === 'ready') ?? null,
      multipleRunning: running.length > 1,
    };
  }, [steps]);

  if (isLoading) return <div style={{ padding: 32, textAlign: 'center', fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.subtlest }}>Loading runbook…</div>;

  const isTechProd = change?.target_env === 'production' && ['frontend', 'backend', 'integration', 'database', 'configuration'].includes(change?.deployment_category ?? '');

  return (
    <div style={{ width: '100%', padding: '8px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h2 style={{ fontFamily: RH.fontDisplay, fontSize: 'var(--ds-font-size-500)', fontWeight: 600, color: T.text, margin: 0 }}>SOP execution runbook</h2>
        {canManage && <button onClick={() => setApplyOpen(true)} style={{ marginLeft: 'auto', height: 32, padding: '0 12px', borderRadius: 6, border: 'none', background: 'var(--ds-background-brand-bold)', color: 'var(--ds-text-inverse)', cursor: 'pointer', fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', fontWeight: 600 }}>Apply SOP template</button>}
      </div>

      {steps.length === 0 ? (
        <>
          {isTechProd
            ? <SectionMessage appearance="error" title="No SOP for a technical production change"><span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)' }}>A technical production change should not execute without a runbook. Apply an SOP template to generate executable steps.</span></SectionMessage>
            : <div style={{ background: T.sunken, borderRadius: 6, padding: 16 }}><p style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: T.text, margin: 0 }}>No SOP steps yet</p><p style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.subtle, margin: '4px 0 0' }}>Apply an SOP template to generate the ordered deployment runbook with owners, commits, evidence, and timing.</p></div>}
        </>
      ) : (
        <>
          {/* summary */}
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: 12 }}>
              <Stat label="Steps" value={summary.total} />
              <Stat label="Done" value={`${summary.done}/${summary.total}`} tone={summary.done === summary.total ? T.success : undefined} />
              <Stat label="Mandatory" value={summary.mandatory} />
              <Stat label="Technical" value={summary.technical} />
              <Stat label="Blocked" value={summary.blocked} tone={summary.blocked ? T.danger : undefined} />
              <Stat label="Failed" value={summary.failed} tone={summary.failed ? T.danger : undefined} />
              <Stat label="Missing commit" value={summary.missingCommit} tone={summary.missingCommit ? T.warning : undefined} />
              <Stat label="Missing evidence" value={summary.missingEvidence} tone={summary.missingEvidence ? T.warning : undefined} />
              <Stat label="Unassigned" value={summary.unassigned} tone={summary.unassigned ? T.warning : undefined} />
            </div>
            {summary.multipleRunning && <SectionMessage appearance="error" title="Data quality: multiple steps in progress"><span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)' }}>{summary.running.length} steps are marked in progress at once. Only one should run at a time.</span></SectionMessage>}
            {summary.running[0] && <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.success }}>▶ Running: #{summary.running[0].stepNo} {summary.running[0].title}</div>}
            {!summary.running[0] && summary.next && <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.subtle }}>Next: #{summary.next.stepNo} {summary.next.title}</div>}
          </div>

          {/* steps */}
          <div>
            {steps.map((s) => <StepRow key={s.id} step={s} changeId={changeId} steps={steps} canManage={canManage} onRaiseIssue={onRaiseIssue} issue={issuesByStep?.[s.id]} />)}
          </div>
        </>
      )}

      {applyOpen && <ApplySopTemplateModal changeId={changeId} change={change} existingCount={steps.length} onClose={() => setApplyOpen(false)} />}
    </div>
  );
}

export default SopRunbook;
