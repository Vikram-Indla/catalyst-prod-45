/**
 * ProductionEventReplayPage — Phase 9 full-page deployment replay.
 * Route: /release-hub/production-events/:eventKey. Reconstructs the whole
 * deployment: executive summary (deterministic, honestly labelled), release/
 * change context, scope snapshot, SOP execution timeline (planned vs actual),
 * commit + evidence ledgers, sign-off/override/freeze trails, incident/defect
 * trail, and result/closure. Read-only audit surface. No drawers.
 */
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Spinner from '@atlaskit/spinner';
import { format } from 'date-fns';
import { ChevronRight, ChevronDown, ExternalLink, Copy } from '@/lib/atlaskit-icons';
import { useProductionEventReplay, type ReplayGate, type ReplayIssue } from '@/hooks/useProductionEventReplay';
import type { SopStepFull } from '@/hooks/useSopRunbook';
import { StatusLozenge } from '@/components/shared/StatusLozenge';
import { Lozenge } from '@/components/ads/Lozenge';
import { ChangeStatusLozenge, RiskLozenge, FlagLozenge } from '@/components/releasehub/shared/ReleaseOpsLozenges';
import CatalystAvatar from '@/components/shared/CatalystAvatar';
import { SectionMessage } from '@/components/ads/SectionMessage';
import { catalystToast } from '@/lib/catalystToast';
import { RH } from '@/constants/releasehub.design';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import { AtlaskitPageShell } from '@/components/ads';

const T = {
  surface: 'var(--ds-surface)', card: 'var(--ds-surface-raised)', sunken: 'var(--ds-surface-sunken)', border: 'var(--ds-border)',
  text: 'var(--ds-text)', subtle: 'var(--ds-text-subtle)', subtlest: 'var(--ds-text-subtlest)', link: 'var(--ds-link)',
  danger: 'var(--ds-text-danger)', warning: 'var(--ds-text-warning)', success: 'var(--ds-text-success)', info: 'var(--ds-text-information)', mono: 'var(--ds-font-family-code, monospace)',
};
const tc = (v: string | null | undefined) => (!v ? '—' : v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, ' '));
const fmt = (iso: string | null) => (iso ? format(new Date(iso), 'MMM d, HH:mm') : '—');
const CRIT = (s: string | null) => !!s && /^(sev1|sev2|critical|high|p1|p2)$/i.test(s);
function durBetween(a: string | null, b: string | null): string { if (!a || !b) return '—'; const m = Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000); return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`; }
function resultTone(r: string | null): { fg: string; bg: string } {
  switch (r) {
    case 'success': return { fg: T.success, bg: 'var(--ds-background-success)' };
    case 'partial': return { fg: T.warning, bg: 'var(--ds-background-warning)' };
    case 'failed': case 'rollback': return { fg: T.danger, bg: 'var(--ds-background-danger)' };
    default: return { fg: T.subtle, bg: T.sunken };
  }
}

function Panel({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: 16, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div role="heading" aria-level={2} style={{ fontFamily: RH.fontDisplay, fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: T.text }}>{title}</div>
        {action && <div style={{ marginLeft: 'auto' }}>{action}</div>}
      </div>
      {children}
    </section>
  );
}
function Field({ label, value, tone, mono }: { label: string; value: React.ReactNode; tone?: string; mono?: boolean }) {
  return <div><div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-50)', color: T.subtlest }}>{label}</div><div style={{ fontFamily: mono ? T.mono : RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: tone ?? T.text }}>{value ?? '—'}</div></div>;
}
const grid = (cols: number): React.CSSProperties => ({ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`, gap: 12 });
// Canonical person cell: face avatar + name (falls back to em-dash when unknown).
function Person({ name }: { name: string | null | undefined }) {
  if (!name) return <>{'—'}</>;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
      <CatalystAvatar name={name} size="xsmall" />
      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
    </span>
  );
}

function StepReplay({ step, issues }: { step: SopStepFull; issues: ReplayIssue[] }) {
  const [open, setOpen] = useState(false);
  const stepIssues = issues.filter((i) => i.sopStepId === step.id);
  const tone = step.status === 'failed' || step.status === 'blocked' ? T.danger : step.status === 'done' ? T.success : step.status === 'skipped' ? T.warning : T.subtle;
  const plannedDur = durBetween(step.plannedStartAt, step.plannedEndAt);
  const actualDur = durBetween(step.actualStartAt, step.actualEndAt);
  const overran = step.plannedEndAt && step.actualEndAt && new Date(step.actualEndAt) > new Date(step.plannedEndAt);
  return (
    <div style={{ borderBottom: `1px solid ${T.border}`, background: step.isRollback ? 'var(--ds-background-warning)' : undefined }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px' }}>
        <button onClick={() => setOpen((v) => !v)} aria-label={open ? 'Collapse' : 'Expand'} style={{ display: 'flex', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>{open ? <ChevronDown size={14} style={{ color: T.subtlest }} /> : <ChevronRight size={14} style={{ color: T.subtlest }} />}</button>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: tone, flex: 'none' }} />
        <span style={{ fontFamily: T.mono, fontSize: 'var(--ds-font-size-100)', color: T.subtlest, minWidth: 18 }}>{step.stepNo}</span>
        <span style={{ flex: 1, minWidth: 0, fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{step.title}{step.isRollback ? ' ↩' : ''}{step.ownerName ? ` · ${step.ownerName}` : ''}</span>
        {stepIssues.length > 0 && <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-50)', fontWeight: 700, color: T.danger }}>{stepIssues.length} issue{stepIssues.length === 1 ? '' : 's'}</span>}
        <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-50)', color: T.subtle }}>plan {plannedDur} · act {actualDur}{overran ? ' ⚠' : ''}</span>
        <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-50)', fontWeight: 700, color: tone, minWidth: 60, textAlign: 'right' }}>{tc(step.status)}</span>
      </div>
      {open && (
        <div style={{ padding: '4px 4px 12px 44px', ...grid(3) }}>
          <Field label="Type" value={tc(step.stepType)} /><Field label="Role" value={tc(step.assignedRole)} /><Field label="Environment" value={tc(step.environment)} />
          <Field label="Planned" value={`${fmt(step.plannedStartAt)} → ${fmt(step.plannedEndAt)}`} /><Field label="Actual" value={`${fmt(step.actualStartAt)} → ${fmt(step.actualEndAt)}`} tone={overran ? T.danger : undefined} />
          <Field label="Repo / branch" value={[step.repoName, step.branch].filter(Boolean).join(' · ') || '—'} mono />
          <Field label="Expected" value={step.expectedResult} /><Field label="Actual result" value={step.actualResult} />
          <Field label="Commits" value={[step.frontendCommit, step.backendCommit, step.integrationCommit, step.databaseCommit, step.configurationCommit].filter(Boolean).join(' · ') || '—'} mono />
          {step.blockerReason && <Field label="Blocker / failure" value={step.blockerReason} tone={T.danger} />}
          {step.evidenceUrl && <Field label="Evidence" value={<a href={step.evidenceUrl} target="_blank" rel="noreferrer" style={{ color: T.link }}>open <ExternalLink size={11} style={{ color: T.link }} /></a>} />}
        </div>
      )}
    </div>
  );
}

export default function ProductionEventReplayPage() {
  const { eventKey = '' } = useParams();
  const navigate = useNavigate();
  const { data: r, isLoading } = useProductionEventReplay(eventKey);

  if (isLoading) return <div style={{ padding: 48, display: 'flex', justifyContent: 'center', background: T.surface, minHeight: '100%' }}><Spinner size="large" /></div>;
  if (!r || !r.found) {
    return (
      <AtlaskitPageShell flush chromeBand={<ProjectPageHeader projectKey="RELEASES" hubType="release" hideTitle trail={[{ text: 'Production Events', href: '/release-hub/production-events' }, { text: eventKey }]} />} testId="release-ops-replay-not-found">
        <div style={{ padding: 16 }}>
        <SectionMessage appearance="warning" title="Production event not found"><span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)' }}>No production event matches "{eventKey}". It may have been removed, or the link is stale.</span></SectionMessage>
        </div>
      </AtlaskitPageShell>
    );
  }

  const rt = resultTone(r.result);
  const copySummary = () => {
    const lines = [
      `Production event ${r.eventKey ?? ''} — ${String(r.result).toUpperCase()}`,
      r.release ? `Release: ${r.release.name}${r.release.version ? ` ${r.release.version}` : ''}` : '',
      r.change ? `Change: ${r.change.chgNumber} — ${r.change.title}` : '',
      `Environment: ${r.env ?? '—'}`,
      `Window: ${fmt(r.actualStartAt)} → ${fmt(r.actualEndAt)}`,
      `Executed by: ${r.executedByName ?? '—'}`,
      `SOP: ${r.steps.filter((s) => s.status === 'done').length}/${r.steps.length} done`,
      `Issues: ${r.issues.filter((i) => i.kind === 'incident').length} incident(s), ${r.issues.filter((i) => i.kind === 'defect').length} defect(s)`,
      '', r.summary,
    ].filter(Boolean);
    navigator.clipboard?.writeText(lines.join('\n')).then(() => catalystToast.success('Summary copied')).catch(() => catalystToast.error('Copy failed'));
  };

  return (
    <AtlaskitPageShell flush chromeBand={<ProjectPageHeader projectKey="RELEASES" hubType="release" hideTitle trail={[{ text: 'Production Events', href: '/release-hub/production-events' }, { text: r.eventKey ?? eventKey }]} />} testId="release-ops-replay">
      <div style={{ padding: 16 }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontFamily: T.mono, fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: T.link }}>{r.eventKey ?? '—'}</span>
          <div role="heading" aria-level={1} style={{ fontFamily: RH.fontDisplay, fontSize: 'var(--ds-font-size-700)', fontWeight: 600, color: T.text, marginTop: 4 }}>{r.title ?? 'Deployment replay'}</div>
        </div>
        <FlagLozenge label={tc(r.result)} />
        <button onClick={copySummary} style={{ display: 'flex', alignItems: 'center', gap: 4, height: 32, padding: '0 12px', borderRadius: 6, border: `1px solid ${T.border}`, background: 'transparent', color: T.text, cursor: 'pointer', fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', fontWeight: 600 }}><Copy size={14} style={{ color: T.subtle }} /> Copy summary</button>
      </div>
      <div style={{ ...grid(6), padding: '12px 0', borderBottom: `1px solid ${T.border}`, marginBottom: 16 }}>
        <Field label="Release" value={r.release?.name} /><Field label="Change" value={r.change?.chgNumber} /><Field label="Environment" value={tc(r.env)} />
        <Field label="Actual window" value={`${fmt(r.actualStartAt)} → ${fmt(r.actualEndAt)}`} /><Field label="Duration" value={durBetween(r.actualStartAt, r.actualEndAt)} tone={r.overrunMinutes ? T.danger : undefined} /><Field label="Executed by" value={<Person name={r.executedByName} />} />
      </div>
      {(r.change?.isEmergency || r.freeze.conflict || r.change?.isUnlinkedProduction) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {r.change?.isEmergency && <SectionMessage appearance="warning" title="Emergency override used"><span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)' }}>This deployment bypassed a gate via emergency override — see the override trail below.</span></SectionMessage>}
          {r.freeze.conflict && <SectionMessage appearance={r.freeze.overrideApproved ? 'warning' : 'error'} title={`Deployed during freeze window${r.freeze.overrideApproved ? ' (override approved)' : ''}`}><span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)' }}>{r.freeze.name} · {r.freeze.reason}</span></SectionMessage>}
        </div>
      )}

      {/* executive summary */}
      <Panel title="Executive summary" action={<span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-50)', color: T.subtlest }}>Deterministic — generated from event data (not AI)</span>}>
        <p style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-400)', color: T.text, margin: 0, lineHeight: 1.5 }}>{r.summary}</p>
      </Panel>

      {/* context */}
      <Panel title="Release & change context">
        {!r.release && <SectionMessage appearance="warning" title="Traceability gap: no linked release"><span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)' }}>This event has no release — showing change-only lineage.</span></SectionMessage>}
        <div style={{ ...grid(4), marginTop: r.release ? 0 : 8 }}>
          <Field label="Release" value={r.release ? <button onClick={() => navigate(`/release-hub/${r.release!.slug ?? r.release!.id}`)} style={linkBtn}>{r.release.name}</button> : '—'} />
          <Field label="Version" value={r.release?.version} /><Field label="Product" value={r.release?.productName} /><Field label="Release manager" value={<Person name={r.release?.releaseManagerName} />} />
          <Field label="Change" value={r.change ? <button onClick={() => navigate(`/release-hub/changes/${r.change!.slug ?? r.change!.id}`)} style={linkBtn}>{r.change.chgNumber}</button> : '—'} />
          <Field label="Change manager" value={<Person name={r.change?.changeManagerName} />} /><Field label="Risk" value={<RiskLozenge risk={r.change?.risk ?? null} />} /><Field label="Category" value={tc(r.change?.deploymentCategory)} />
        </div>
      </Panel>

      {/* scope snapshot */}
      <Panel title="Scope snapshot" action={<span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-50)', color: r.scope.source === 'reconstructed' ? T.warning : T.subtlest }}>{r.scope.source === 'snapshot' ? 'From event snapshot' : r.scope.source === 'reconstructed' ? 'Reconstructed from current release links' : 'No scope data'}</span>}>
        {r.scope.source === 'none' ? <SectionMessage appearance="warning" title="No scope snapshot"><span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)' }}>This event has no scope snapshot and no linked release to reconstruct from.</span></SectionMessage>
          : <div style={grid(3)}><Field label="Business requests" value={r.scope.brs} /><Field label="Sprints" value={r.scope.sprints} /><Field label="Work items" value={r.scope.workItems} /></div>}
      </Panel>

      {/* SOP timeline */}
      <Panel title={`SOP execution timeline (${r.steps.length})`}>
        {r.steps.length === 0 ? <SectionMessage appearance="warning" title="No SOP steps recorded"><span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)' }}>No runbook steps are linked to this change — execution history cannot be replayed.</span></SectionMessage>
          : r.steps.map((s) => <StepReplay key={s.id} step={s} issues={r.issues} />)}
      </Panel>

      {/* commit ledger */}
      <Panel title="Commit ledger">
        <Ledger rows={r.steps.filter((s) => s.frontendCommit || s.backendCommit || s.integrationCommit || s.databaseCommit || s.configurationCommit).map((s) => ({ step: `#${s.stepNo} ${s.title}`, val: [s.frontendCommit && `fe ${s.frontendCommit}`, s.backendCommit && `be ${s.backendCommit}`, s.integrationCommit && `int ${s.integrationCommit}`, s.databaseCommit && `db ${s.databaseCommit}`, s.configurationCommit && `cfg ${s.configurationCommit}`].filter(Boolean).join(' · '), owner: s.ownerName }))}
          empty="No commits captured for this deployment."
          gap={r.steps.filter((s) => s.commitRequired && !(s.frontendCommit || s.backendCommit || s.integrationCommit || s.databaseCommit || s.configurationCommit)).length} gapLabel="commit-required step(s) missing a commit" />
      </Panel>

      {/* evidence ledger */}
      <Panel title="Evidence ledger">
        <Ledger rows={r.steps.filter((s) => s.evidenceUrl || s.actualResult).map((s) => ({ step: `#${s.stepNo} ${s.title}`, val: s.evidenceUrl ? 'evidence attached' : (s.actualResult ?? ''), owner: s.ownerName, href: s.evidenceUrl }))}
          empty="No evidence captured for this deployment."
          gap={r.steps.filter((s) => s.evidenceRequired && !s.evidenceUrl).length} gapLabel="evidence-required step(s) missing evidence" />
      </Panel>

      {/* sign-off + override trail */}
      <Panel title="Sign-off & override trail">
        {r.gates.length === 0 ? <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.subtlest }}>No sign-offs recorded.</div> : r.gates.map((g, i) => <GateRow key={i} g={g} />)}
        {r.override && (
          <div style={{ borderLeft: `2px dashed ${T.warning}`, background: 'var(--ds-background-warning)', borderRadius: 6, padding: '8px 12px', marginTop: 8 }}>
            <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', fontWeight: 700, color: T.warning }}>⚡ Emergency override — {tc(r.override.status)}</div>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', color: T.subtle }}><span>Bypassed {r.override.bypassedGate ?? 'gate'} · {r.override.reason ?? ''}</span>{r.override.requestedByName ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>· requested by <Person name={r.override.requestedByName} /></span> : null}{r.override.approvedByName ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>· approved by <Person name={r.override.approvedByName} /></span> : null}</div>
          </div>
        )}
      </Panel>

      {/* freeze trail */}
      <Panel title="Freeze window trail">
        {!r.freeze.conflict ? <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.success }}>✓ No freeze conflict at deployment time.</div>
          : <SectionMessage appearance={r.freeze.overrideApproved ? 'warning' : 'error'} title={r.freeze.overrideApproved ? 'Freeze conflict — override approved' : 'Freeze conflict — unresolved'}><span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)' }}>{r.freeze.name} ({r.env}) · {r.freeze.reason}</span></SectionMessage>}
      </Panel>

      {/* incident/defect trail */}
      <Panel title={`Incidents & defects (${r.issues.length})`}>
        {r.issues.length === 0 ? <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.success }}>✓ No incidents or defects linked to this deployment.</div> : (
          <>
            <div style={{ ...grid(4), marginBottom: 8 }}>
              <Field label="Incidents" value={r.issues.filter((i) => i.kind === 'incident').length} tone={T.danger} />
              <Field label="Defects" value={r.issues.filter((i) => i.kind === 'defect').length} tone={T.warning} />
              <Field label="Open" value={r.issues.filter((i) => i.status && !/^(resolved|closed|done|cancelled)$/i.test(i.status)).length} />
              <Field label="Critical" value={r.issues.filter((i) => CRIT(i.severity)).length} tone={T.danger} />
            </div>
            {r.issues.map((i) => (
              <button key={i.id} onClick={() => navigate(i.kind === 'incident' ? `/incidents/${i.id}` : `/testhub/defects/${i.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', background: T.sunken, border: `1px solid ${CRIT(i.severity) ? 'var(--ds-border-danger)' : T.border}`, borderRadius: 6, padding: '6px 10px', marginBottom: 6, cursor: 'pointer' }}>
                <Lozenge appearance={i.kind === 'incident' ? 'removed' : 'default'}>{tc(i.kind)}</Lozenge>
                <span style={{ flex: 1, minWidth: 0, fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{i.key ? `${i.key} · ` : ''}{i.title ?? '—'}{i.sopStepId ? ' · from SOP step' : ''}</span>
                {i.severity && <Lozenge appearance={CRIT(i.severity) ? 'removed' : 'default'}>{i.severity}</Lozenge>}
                {i.status && <StatusLozenge status={i.status} />}
              </button>
            ))}
          </>
        )}
      </Panel>

      {/* result & closure */}
      <Panel title="Result & closure">
        <div style={{ ...grid(4), marginBottom: 8 }}>
          <Field label="Final result" value={tc(r.result)} tone={rt.fg} /><Field label="Open incidents" value={r.closure.openIncidents} tone={r.closure.openIncidents ? T.danger : undefined} />
          <Field label="Open defects" value={r.closure.openDefects} tone={r.closure.openDefects ? T.warning : undefined} /><Field label="Change status after" value={<ChangeStatusLozenge status={r.change?.status ?? null} />} />
        </div>
        <SectionMessage appearance={r.result === 'success' && r.closure.openIncidents === 0 ? 'success' : r.result === 'failed' || r.result === 'rollback' ? 'error' : 'warning'} title={r.closure.reason}>
          <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)' }}>{r.result === 'unknown' ? 'Record the deployment result to complete the audit trail.' : (r.closure.openIncidents + r.closure.openDefects > 0 ? 'Open follow-ups remain — resolve linked incidents/defects before closing out.' : 'Deployment closed out cleanly.')}</span>
        </SectionMessage>
      </Panel>
      </div>
    </AtlaskitPageShell>
  );
}

function Ledger({ rows, empty, gap, gapLabel }: { rows: Array<{ step: string; val: string; owner: string | null; href?: string | null }>; empty: string; gap: number; gapLabel: string }) {
  return (
    <>
      {gap > 0 && <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.warning, marginBottom: 8 }}>⚠ {gap} {gapLabel} — audit gap.</div>}
      {rows.length === 0 ? <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.subtlest }}>{empty}</div> : rows.map((r, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderTop: i ? `1px solid ${T.border}` : 'none' }}>
          <span style={{ flex: 1, minWidth: 0, fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.step}</span>
          {r.href ? <a href={r.href} target="_blank" rel="noreferrer" style={{ fontFamily: T.mono, fontSize: 'var(--ds-font-size-100)', color: T.link }}>{r.val} <ExternalLink size={10} style={{ color: T.link }} /></a> : <span style={{ fontFamily: T.mono, fontSize: 'var(--ds-font-size-100)', color: T.subtle, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 320 }}>{r.val}</span>}
          {r.owner && <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-50)', color: T.subtlest }}>{r.owner}</span>}
        </div>
      ))}
    </>
  );
}
function GateRow({ g }: { g: ReplayGate }) {
  const tone = g.status === 'rejected' || g.overdue ? T.danger : g.status === 'approved' || g.status === 'auto_approved' ? T.success : g.status === 'pending' ? T.warning : T.subtle;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderTop: `1px solid ${T.border}` }}>
      <span style={{ minWidth: 52 }}><Lozenge appearance="default">{g.scope}</Lozenge></span>
      <span style={{ flex: 1, minWidth: 0, display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.text }}>{tc(g.role)}{g.approverName ? <Person name={g.approverName} /> : null}</span>
      {g.comment && <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-50)', color: T.subtlest, maxWidth: 280, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.comment}</span>}
      <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-50)', fontWeight: 700, color: tone, minWidth: 64, textAlign: 'right' }}>{g.overdue && g.status === 'pending' ? 'Overdue' : tc(g.status)}</span>
    </div>
  );
}
const linkBtn: React.CSSProperties = { fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-link)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 };
