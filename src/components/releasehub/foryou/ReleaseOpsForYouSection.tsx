/**
 * ReleaseOpsForYouSection — Phase 5. Personal Release-Ops execution feed on For
 * You: derived prompts (notification event model), a day-of-change hero, assigned
 * SOP step cards with data-driven timer + actions, and a manager overview. SOP
 * steps are the source of truth; actions reuse useSopStepAction so they sync to
 * Change Detail. ADS tokens + canonical components. No drawers.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Textfield from '@atlaskit/textfield';
import { useMyExecutionWork, stepHasCommit, type ExecCard, type ChangeCtx, type ExecPrompt } from '@/hooks/useMyExecutionWork';
import { useSopStepAction, type SopStepFull } from '@/hooks/useSopRunbook';
import { SectionMessage } from '@/components/ads/SectionMessage';
import { catalystToast } from '@/lib/catalystToast';
import { RH } from '@/constants/releasehub.design';
import { ReleaseChangeAnnouncementBanner } from '@/components/releasehub/foryou/ReleaseChangeAnnouncementBanner';

const T = {
  card: 'var(--ds-surface-raised)', sunken: 'var(--ds-surface-sunken)', border: 'var(--ds-border)',
  text: 'var(--ds-text)', subtle: 'var(--ds-text-subtle)', subtlest: 'var(--ds-text-subtlest)', link: 'var(--ds-link)',
  danger: 'var(--ds-text-danger)', warning: 'var(--ds-text-warning)', success: 'var(--ds-text-success)', info: 'var(--ds-text-information)',
  mono: 'var(--ds-font-family-code, monospace)',
};
const titleCase = (v: string | null) => (!v ? '' : v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, ' '));
const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
function durStr(ms: number) { const m = Math.max(0, Math.round(ms / 60000)); return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`; }

function Chip({ label, fg, bg }: { label: string; fg: string; bg: string }) {
  return <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-50)', fontWeight: 700, color: fg, background: bg, padding: '1px 6px', borderRadius: 3, textTransform: 'uppercase', letterSpacing: '.03em', whiteSpace: 'nowrap' }}>{label}</span>;
}

function changeMarkers(c: ChangeCtx): React.ReactNode {
  const chips: React.ReactNode[] = [];
  if (c.isProduction) chips.push(<Chip key="prod" label="Prod" fg="var(--ds-text-danger)" bg="var(--ds-background-danger)" />);
  if (c.risk === 'high' || c.risk === 'critical') chips.push(<Chip key="risk" label={c.risk!} fg="var(--ds-text-danger)" bg="var(--ds-background-danger)" />);
  if (c.isEmergency) chips.push(<Chip key="emg" label="Emergency" fg="var(--ds-text-warning)" bg="var(--ds-background-warning)" />);
  if (c.isUnlinkedProduction) chips.push(<Chip key="unl" label="Unlinked prod" fg="var(--ds-text-danger)" bg="var(--ds-background-danger)" />);
  if (c.freezeConflict) chips.push(<Chip key="frz" label={c.freezeOverrideApproved ? 'Freeze (override)' : 'Freeze block'} fg="var(--ds-text-warning)" bg="var(--ds-background-warning)" />);
  return <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>{chips}</div>;
}

// data-driven step timer — same formula as the Change Detail runbook
function stepTimerText(step: SopStepFull, now: number): { text: string; tone: string; state: string } {
  const pStart = step.plannedStartAt ? new Date(step.plannedStartAt).getTime() : null;
  const pEnd = step.plannedEndAt ? new Date(step.plannedEndAt).getTime() : null;
  const aStart = step.actualStartAt ? new Date(step.actualStartAt).getTime() : null;
  const aEnd = step.actualEndAt ? new Date(step.actualEndAt).getTime() : null;
  if (step.status === 'failed') return { text: aStart ? `Failed after ${durStr((aEnd ?? now) - aStart)}` : 'Failed', tone: T.danger, state: 'Failed' };
  if (step.status === 'blocked') return { text: aStart ? `Blocked after ${durStr((aEnd ?? now) - aStart)}` : 'Blocked', tone: T.warning, state: 'Blocked' };
  if (step.status === 'skipped') return { text: 'Skipped', tone: T.subtle, state: 'Skipped' };
  if (step.status === 'done') return { text: aStart && aEnd ? `Done in ${durStr(aEnd - aStart)}` : 'Done', tone: T.success, state: 'Done' };
  if (step.status === 'in_progress' && aStart) {
    const over = pEnd != null && now > pEnd;
    return { text: over ? `Overrun +${durStr(now - pEnd!)}` : (pEnd ? `${durStr(pEnd - now)} left` : `${durStr(now - aStart)} elapsed`), tone: over ? T.danger : T.success, state: over ? 'Overdue' : 'Running' };
  }
  if (pStart) return now < pStart ? { text: `Starts in ${durStr(pStart - now)}`, tone: T.info, state: 'Upcoming' } : { text: `Overdue ${durStr(now - pStart)}`, tone: T.danger, state: 'Overdue' };
  return { text: 'No planned time', tone: T.subtle, state: 'Ready' };
}

function Btn({ label, tone, onClick }: { label: string; tone?: string; onClick: () => void }) {
  return <button onClick={onClick} style={{ height: 28, padding: '0 10px', borderRadius: 6, border: `1px solid ${tone ?? T.border}`, background: 'transparent', color: tone ?? T.text, cursor: 'pointer', fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', fontWeight: 600 }}>{label}</button>;
}

function SopCard({ card }: { card: ExecCard }) {
  const { step, change } = card;
  const navigate = useNavigate();
  const action = useSopStepAction();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  const [reason, setReason] = useState('');
  const [commit, setCommit] = useState('');
  const [evidence, setEvidence] = useState(step.evidenceUrl ?? '');
  const [actual, setActual] = useState('');
  const timer = stepTimerText(step, now);

  const commitField: 'frontend' | 'backend' | 'integration' | 'database' | 'configuration' | null =
    step.stepType === 'frontend' ? 'frontend' : step.stepType === 'backend' ? 'backend' : step.stepType === 'integration' ? 'integration' : step.stepType === 'database' ? 'database' : step.stepType === 'configuration' ? 'configuration' : null;
  const missingCommit = step.commitRequired && !stepHasCommit(step);
  const missingEvidence = step.evidenceRequired && !step.evidenceUrl;

  const run = (patch: Parameters<typeof action.mutate>[0]) =>
    action.mutate(patch, { onError: (e: any) => catalystToast.error(e?.message ?? 'Action failed'), onSuccess: () => patch.status && catalystToast.success(`Step ${patch.status.replace('_', ' ')}`) });

  const goChange = () => navigate(`/release-hub/changes/${change.slug ?? change.id}`);

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderLeft: `3px solid ${timer.tone}`, borderRadius: 8, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={goChange} style={{ fontFamily: T.mono, fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: T.link, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>{change.chgNumber}</button>
            <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.subtle, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 260 }}>{change.title}</span>
            {changeMarkers(change)}
          </div>
          <div style={{ fontFamily: RH.fontDisplay, fontSize: 'var(--ds-font-size-400)', fontWeight: 600, color: T.text, marginTop: 4 }}>
            #{step.stepNo} {step.title}
          </div>
          <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>
            {titleCase(step.stepType)}{step.assignedRole ? ` · ${titleCase(step.assignedRole)}` : ''}
            {change.releaseNames.length ? ` · ${change.releaseNames.join(', ')}` : (change.isUnlinkedProduction ? ' · no release' : '')}
            {change.targetEnv ? ` · ${change.targetEnv}` : ''} · plan {fmt(step.plannedStartAt)} → {fmt(step.plannedEndAt)}
          </div>
        </div>
        <div style={{ textAlign: 'right', flex: 'none' }}>
          <Chip label={timer.state} fg={timer.tone} bg={T.sunken} />
          <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: timer.tone, marginTop: 4 }}>{timer.text}</div>
        </div>
      </div>

      {(missingCommit || missingEvidence) && (step.status === 'in_progress' || step.status === 'pending') && (
        <div style={{ display: 'flex', gap: 6 }}>
          {missingCommit && <Chip label="Missing commit" fg="var(--ds-text-warning)" bg="var(--ds-background-warning)" />}
          {missingEvidence && <Chip label="Missing evidence" fg="var(--ds-text-warning)" bg="var(--ds-background-warning)" />}
        </div>
      )}
      {step.blockerReason && <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.danger }}>Reason: {step.blockerReason}</div>}

      {/* capture (running) */}
      {step.status === 'in_progress' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8, background: T.sunken, borderRadius: 6, padding: 8 }}>
          {commitField && <Textfield value={commit} onChange={(e) => setCommit((e.target as HTMLInputElement).value)} placeholder={`${commitField} commit`} isCompact />}
          {step.evidenceRequired && <Textfield value={evidence} onChange={(e) => setEvidence((e.target as HTMLInputElement).value)} placeholder="Evidence URL" isCompact />}
          <Textfield value={actual} onChange={(e) => setActual((e.target as HTMLInputElement).value)} placeholder="Actual result" isCompact />
          <Btn label="Save" onClick={() => run({ step, changeId: change.id, commits: commitField && commit ? { [commitField]: commit } as any : undefined, evidenceUrl: evidence || undefined, actualResult: actual || undefined })} />
        </div>
      )}
      {(step.status === 'pending' || step.status === 'in_progress' || step.status === 'blocked') && (
        <Textfield value={reason} onChange={(e) => setReason((e.target as HTMLInputElement).value)} placeholder="Reason (block / fail / skip)" isCompact />
      )}

      {/* actions by state */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {(step.status === 'pending' || step.status === 'ready') && (
          <><Btn label="Start" tone={T.success} onClick={() => run({ step, changeId: change.id, status: 'in_progress' })} /><Btn label="Block" tone={T.warning} onClick={() => run({ step, changeId: change.id, status: 'blocked', blockerReason: reason })} /><Btn label="Skip" onClick={() => run({ step, changeId: change.id, status: 'skipped', reason })} /></>
        )}
        {step.status === 'in_progress' && (
          <><Btn label="Mark done" tone={T.success} onClick={() => run({ step, changeId: change.id, status: 'done', commits: commitField && commit ? { [commitField]: commit } as any : undefined, evidenceUrl: evidence || undefined, actualResult: actual || undefined })} /><Btn label="Block" tone={T.warning} onClick={() => run({ step, changeId: change.id, status: 'blocked', blockerReason: reason })} /><Btn label="Fail" tone={T.danger} onClick={() => run({ step, changeId: change.id, status: 'failed', blockerReason: reason })} /></>
        )}
        {step.status === 'blocked' && (
          <><Btn label="Resume" tone={T.success} onClick={() => run({ step, changeId: change.id, status: 'in_progress' })} /><Btn label="Fail" tone={T.danger} onClick={() => run({ step, changeId: change.id, status: 'failed', blockerReason: reason || step.blockerReason || undefined })} /></>
        )}
        <button onClick={goChange} style={{ marginLeft: 'auto', fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.link, background: 'transparent', border: 'none', cursor: 'pointer' }}>View change →</button>
      </div>
    </div>
  );
}

function DayOfChangeCard({ c }: { c: ChangeCtx }) {
  const navigate = useNavigate();
  const pct = c.sopTotal ? Math.round((c.sopDone / c.sopTotal) * 100) : 0;
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderLeft: `3px solid ${c.isEmergency || c.freezeConflict ? T.danger : T.info}`, borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Chip label="Today" fg={T.info} bg="var(--ds-background-information)" />
        <span style={{ fontFamily: T.mono, fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: T.link }}>{c.chgNumber}</span>
        <span style={{ fontFamily: RH.fontDisplay, fontSize: 'var(--ds-font-size-400)', fontWeight: 600, color: T.text }}>{c.title}</span>
        {c.managerRole && <Chip label={c.managerRole} fg={T.subtle} bg={T.sunken} />}
        {changeMarkers(c)}
      </div>
      <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.subtle }}>
        {c.releaseNames.length ? c.releaseNames.join(', ') : (c.isUnlinkedProduction ? 'No linked release' : 'Unlinked')} · {c.targetEnv ?? '—'} · {fmt(c.plannedStartAt)} → {fmt(c.plannedEndAt)} · SOP {c.sopDone}/{c.sopTotal} ({pct}%)
      </div>
      {c.running && <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.success }}>▶ Running: #{c.running.stepNo} {c.running.title}</div>}
      <button onClick={() => navigate(`/release-hub/changes/${c.slug ?? c.id}`)} style={{ alignSelf: 'flex-start', fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.link, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>Open change →</button>
    </div>
  );
}

function promptAppearance(k: ExecPrompt['kind']): 'warning' | 'error' | 'information' {
  if (k === 'overdue' || k === 'freeze' || k === 'blocked_upstream' || k === 'multiple_running') return 'error';
  if (k === 'emergency' || k === 'missing_capture' || k === 'due_soon') return 'warning';
  return 'information';
}

export function ReleaseOpsForYouSection() {
  const { data, isLoading } = useMyExecutionWork();
  if (isLoading || !data) return null;
  const { assignedCards, managedChanges, dayOfChanges } = data;

  /* Collapse every change the user touches into ONE ranked list and surface the
     single most urgent as a slim countdown banner (running first, then soonest
     planned start). No card stack — the banner links into the hub for actions. */
  const byId = new Map<string, ChangeCtx>();
  for (const c of [...dayOfChanges, ...assignedCards.map((k) => k.change), ...managedChanges]) {
    if (!byId.has(c.id)) byId.set(c.id, c);
  }
  const changes = Array.from(byId.values());
  if (changes.length === 0) return null; // no execution involvement — keep For You uncluttered

  const startMs = (c: ChangeCtx) => (c.plannedStartAt ? new Date(c.plannedStartAt).getTime() : Number.MAX_SAFE_INTEGER);
  changes.sort((a, b) => {
    const ar = a.running ? 0 : 1, br = b.running ? 0 : 1;
    return ar !== br ? ar - br : startMs(a) - startMs(b);
  });
  const primary = changes[0];

  return (
    <section style={{ marginBottom: 20 }}>
      <ReleaseChangeAnnouncementBanner change={primary} assignedCards={assignedCards} moreCount={changes.length - 1} />
    </section>
  );
}

export default ReleaseOpsForYouSection;
