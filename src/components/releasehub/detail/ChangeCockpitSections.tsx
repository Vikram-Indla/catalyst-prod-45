/**
 * ChangeCockpitSections — Phase 3 read summaries for the Change Detail cockpit.
 *
 * Linked releases, owners/participants, SOP readiness, sign-off readiness,
 * freeze status, incident/defect, production event. Every section has an
 * educational empty state (what's missing, why it matters, next step). No
 * drawers. ADS tokens + canonical components only. Heavy edit/creation flows
 * are deferred (Phase 4) with clear entry points.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { StatusLozenge } from '@/components/shared/StatusLozenge';
import { RiskLozenge, FlagLozenge } from '@/components/releasehub/shared/ReleaseOpsLozenges';
import CatalystAvatar from '@/components/shared/CatalystAvatar';
import { SectionMessage } from '@/components/ads/SectionMessage';
import { RH } from '@/constants/releasehub.design';
import type {
  ChangeCockpit, CockpitRelease, CockpitPerson, CockpitIssue,
} from '@/hooks/useChangeCockpit';

const T = {
  card: 'var(--ds-surface-raised)',
  sunken: 'var(--ds-surface-sunken)',
  border: 'var(--ds-border)',
  text: 'var(--ds-text)',
  subtle: 'var(--ds-text-subtle)',
  subtlest: 'var(--ds-text-subtlest)',
  link: 'var(--ds-link)',
  danger: 'var(--ds-text-danger)',
  warning: 'var(--ds-text-warning)',
  success: 'var(--ds-text-success)',
};

function Section({ title, count, children, action }: { title: string; count?: number | string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div role="heading" aria-level={3} style={{ fontFamily: RH.fontDisplay, fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: T.text, margin: 0 }}>{title}</div>
        {count != null && <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.subtle, background: T.sunken, borderRadius: 10, padding: '0 8px' }}>{count}</span>}
        {action && <div style={{ marginLeft: 'auto' }}>{action}</div>}
      </div>
      {children}
    </section>
  );
}

function EmptyHint({ what, why, next }: { what: string; why: string; next: string }) {
  return (
    <div style={{ background: T.sunken, borderRadius: 6, padding: 12 }}>
      <p style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: T.text, margin: 0 }}>{what}</p>
      <p style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.subtle, margin: '4px 0 0' }}>{why}</p>
      <p style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.subtlest, margin: '4px 0 0' }}>Next: {next}</p>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div>
      <div style={{ fontFamily: RH.fontDisplay, fontSize: 'var(--ds-font-size-500)', fontWeight: 600, color: tone ?? T.text }}>{value}</div>
      <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>{label}</div>
    </div>
  );
}

// ── Linked releases ────────────────────────────────────────────────
function LinkedReleases({ releases, isUnlinkedProduction }: { releases: CockpitRelease[]; isUnlinkedProduction: boolean }) {
  const navigate = useNavigate();
  return (
    <Section title="Linked releases" count={releases.length}>
      {isUnlinkedProduction && (
        <SectionMessage appearance="warning" title="Unlinked production change">
          <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)' }}>This production change has no linked release. It must carry a justification and is tracked as an unlinked production change.</span>
        </SectionMessage>
      )}
      {releases.length === 0 ? (
        <EmptyHint what="No releases linked" why="A change usually deploys one or more releases; linking keeps scope and production history traceable." next="Link a release from Edit change, or leave unlinked with justification." />
      ) : releases.map((r) => (
        <button key={r.id} onClick={() => navigate(`/release-hub/${r.slug ?? r.id}`)}
          style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', width: '100%', background: T.sunken, border: `1px solid ${T.border}`, borderRadius: 6, padding: '8px 12px', cursor: 'pointer' }}>
          <span style={{ flex: 1, minWidth: 0, fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: T.link, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name ?? '—'}</span>
          {r.targetEnv && <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', color: T.subtle }}>{r.targetEnv}</span>}
          {r.readinessPct != null && <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', color: T.subtle }}>{r.readinessPct}%</span>}
          {r.status && <StatusLozenge status={r.status} />}
        </button>
      ))}
    </Section>
  );
}

// ── Owners & participants ──────────────────────────────────────────
function Owners({ owners }: { owners: CockpitPerson[] }) {
  const CRITICAL = ['Change manager', 'Release manager'];
  const present = new Set(owners.map((o) => o.role));
  const missing = CRITICAL.filter((r) => !present.has(r));
  return (
    <Section title="Owners & participants" count={owners.length}>
      {missing.length > 0 && (
        <SectionMessage appearance="warning" title="Missing critical owner">
          <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)' }}>{missing.join(' and ')} not assigned. Assign before execution.</span>
        </SectionMessage>
      )}
      {owners.length === 0 ? (
        <EmptyHint what="No owners assigned" why="Execution and sign-off depend on knowing who is responsible for each stream." next="Assign managers and execution owners from Edit change." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {owners.map((o) => (
            <div key={`${o.id}-${o.role}`} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <CatalystAvatar name={o.name} size="small" />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.name}</div>
                <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>{o.role}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

// ── SOP summary ────────────────────────────────────────────────────
function SopSummary({ cockpit, onOpenSop }: { cockpit: ChangeCockpit; onOpenSop: () => void }) {
  const s = cockpit.sop;
  const noSop = s.total === 0;
  const techNoSop = noSop && cockpit.isTechnical && cockpit.isProduction;
  return (
    <Section title="SOP runbook" count={s.total} action={s.total > 0 ? (
      <button onClick={onOpenSop} style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.link, background: 'transparent', border: 'none', cursor: 'pointer' }}>Open execution →</button>
    ) : undefined}>
      {techNoSop ? (
        <SectionMessage appearance="error" title="No SOP for technical production change">
          <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)' }}>A technical production change should not execute without an SOP runbook. Apply an SOP template.</span>
        </SectionMessage>
      ) : noSop ? (
        <EmptyHint what="No SOP steps yet" why="The SOP runbook defines the ordered deployment steps, owners, commits and evidence." next="Apply an SOP template to generate steps (full editor arrives in Phase 4)." />
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <Stat label="Steps" value={s.total} />
            <Stat label="Done" value={`${s.done}/${s.total}`} tone={s.done === s.total ? T.success : undefined} />
            <Stat label="Technical" value={s.technical} />
            <Stat label="Assigned" value={`${s.assigned}/${s.total}`} tone={s.assigned < s.total ? T.warning : undefined} />
          </div>
          <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.subtle }}>
            {s.commitRequired} commit-required · {s.evidenceRequired} evidence-required · {s.mandatory} mandatory
          </div>
          {s.running && <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.success }}>▶ Running: {s.running.title}{s.running.role ? ` (${s.running.role})` : ''}</div>}
          {!s.running && s.next && <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.subtle }}>Next: {s.next.title}</div>}
        </>
      )}
    </Section>
  );
}

// ── Sign-off summary ───────────────────────────────────────────────
function SignoffSummary({ cockpit }: { cockpit: ChangeCockpit }) {
  const s = cockpit.signoffs;
  const total = s.changeTotal + s.releaseTotal;
  const blocked = s.pending > 0 || s.rejected > 0;
  return (
    <Section title="Sign-offs" count={total}>
      {total === 0 ? (
        <EmptyHint what="No sign-offs requested" why="Production and high-risk changes need approvals before execution." next="Request sign-off from the header actions." />
      ) : (
        <>
          {blocked && !cockpit.override.exists && (
            <SectionMessage appearance="warning" title="Approval blocking execution">
              <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)' }}>{s.pending} pending{s.rejected ? `, ${s.rejected} rejected` : ''}{s.blockingRole ? ` · waiting on ${s.blockingRole}` : ''}{s.overdue ? ' · overdue' : ''}.</span>
            </SectionMessage>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <Stat label="Pending" value={s.pending} tone={s.pending ? T.warning : undefined} />
            <Stat label="Approved" value={s.approved} tone={s.approved ? T.success : undefined} />
            <Stat label="Rejected" value={s.rejected} tone={s.rejected ? T.danger : undefined} />
            <Stat label="Overridden" value={s.overridden} />
          </div>
          <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.subtlest }}>{s.changeTotal} change-level · {s.releaseTotal} release-level · dependency visual arrives in the Sign-off phase</div>
        </>
      )}
    </Section>
  );
}

// ── Freeze summary ─────────────────────────────────────────────────
function FreezeSummary({ cockpit }: { cockpit: ChangeCockpit }) {
  const f = cockpit.freeze;
  return (
    <Section title="Freeze window">
      {!f.conflict ? (
        <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.success }}>✓ No freeze conflict for this window.</div>
      ) : f.overrideApproved ? (
        <SectionMessage appearance="warning" title="Freeze conflict — override approved">
          <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)' }}>{f.window?.name} ({f.window?.targetEnv}). Emergency override approved — execution allowed and audited.</span>
        </SectionMessage>
      ) : (
        <SectionMessage appearance="error" title="Freeze conflict — execution blocked">
          <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)' }}>{f.window?.name} ({f.window?.targetEnv}) · {f.window?.reason}. Execution is blocked unless an emergency override is approved.</span>
        </SectionMessage>
      )}
    </Section>
  );
}

// ── Incidents & defects ────────────────────────────────────────────
const OPEN_ISSUE = (s: string | null) => !!s && !/^(resolved|closed|done|cancelled)$/i.test(s);
const CRIT_ISSUE = (s: string | null) => !!s && /^(sev1|sev2|critical|high|p1|p2)$/i.test(s);
function kindLabel(k: string) { return k.charAt(0).toUpperCase() + k.slice(1); }

function IssueSummary({ issues, canManage, onRaiseIssue }: { issues: CockpitIssue[]; canManage: boolean; onRaiseIssue?: (kind: 'incident' | 'defect', sopStepId?: string | null) => void }) {
  const navigate = useNavigate();
  const incidents = issues.filter((i) => i.kind === 'incident');
  const defects = issues.filter((i) => i.kind === 'defect');
  const open = issues.filter((i) => OPEN_ISSUE(i.status)).length;
  const crit = issues.filter((i) => CRIT_ISSUE(i.severity)).length;
  const raiseBtns = canManage && onRaiseIssue ? (
    <div style={{ display: 'flex', gap: 6 }}>
      <button onClick={() => onRaiseIssue('incident')} style={raiseBtn('var(--ds-text-danger)')}>Raise incident</button>
      <button onClick={() => onRaiseIssue('defect')} style={raiseBtn('var(--ds-text-information)')}>Raise defect</button>
    </div>
  ) : undefined;
  return (
    <Section title="Incidents & defects" count={issues.length} action={raiseBtns}>
      {issues.length === 0 ? (
        <div style={{ background: T.sunken, borderRadius: 6, padding: 12 }}>
          <p style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: T.success, margin: 0 }}>✓ No incidents or defects raised during this change</p>
          <p style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.subtle, margin: '4px 0 0' }}>If deployment breaks something operationally, raise an incident; if a validation or test check fails, raise a defect. Both stay linked to this change and its SOP step.</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <Stat label="Incidents" value={incidents.length} tone={incidents.length ? T.danger : undefined} />
            <Stat label="Defects" value={defects.length} tone={defects.length ? T.warning : undefined} />
            <Stat label="Open" value={open} tone={open ? T.danger : undefined} />
            <Stat label="Critical" value={crit} tone={crit ? T.danger : undefined} />
          </div>
          {issues.map((i) => (
            <button key={i.id} onClick={() => navigate(i.kind === 'incident' ? `/incidents/${i.id}` : `/testhub/defects/${i.id}`)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', width: '100%', background: T.sunken, border: `1px solid ${CRIT_ISSUE(i.severity) ? 'var(--ds-border-danger)' : T.border}`, borderRadius: 6, padding: '8px 12px', cursor: 'pointer' }}>
              <FlagLozenge label={kindLabel(i.kind)} />
              <span style={{ flex: 1, minWidth: 0, fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{i.key ? `${i.key} · ` : ''}{i.title ?? '—'}{i.sopStepId ? ' · from SOP step' : ''}</span>
              {i.severity && <RiskLozenge risk={i.severity} />}
              {i.status && <StatusLozenge status={i.status} />}
            </button>
          ))}
        </>
      )}
    </Section>
  );
}

// ── Production event ───────────────────────────────────────────────
function ProdEventSummary({ cockpit }: { cockpit: ChangeCockpit }) {
  const navigate = useNavigate();
  const pe = cockpit.prodEvent;
  return (
    <Section title="Production event">
      {!pe.exists ? (
        <EmptyHint what="No production event yet" why="A production change generates an immutable production event when it completes — the record used for history and replay." next={cockpit.isProduction ? 'Complete the change to generate its production event.' : 'Only production changes generate production events.'} />
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: T.text }}>{pe.eventKey ?? 'Production event'}</span>
            {pe.result && <StatusLozenge status={pe.result} />}
          </div>
          <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.subtle }}>
            {pe.actualStartAt && pe.actualEndAt ? `${format(new Date(pe.actualStartAt), 'MMM d HH:mm')} → ${format(new Date(pe.actualEndAt), 'HH:mm')}` : '—'}
            {pe.executedBy ? ` · by ${pe.executedBy}` : ''}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => navigate(`/release-hub/production-events/${pe.eventKey ?? pe.id}`)} style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: T.link, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>Open replay →</button>
            <button onClick={() => navigate('/release-hub/production-events')} style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.subtle, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>All events</button>
          </div>
        </>
      )}
    </Section>
  );
}

const raiseBtn = (tone: string): React.CSSProperties => ({ height: 26, padding: '0 8px', borderRadius: 6, border: `1px solid ${tone}`, background: 'transparent', color: tone, cursor: 'pointer', fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', fontWeight: 600 });

export function ChangeCockpitSections({ cockpit, onOpenSop, canManage = false, onRaiseIssue }: { cockpit: ChangeCockpit; onOpenSop: () => void; canManage?: boolean; onRaiseIssue?: (kind: 'incident' | 'defect', sopStepId?: string | null) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, padding: '16px 0' }}>
      <LinkedReleases releases={cockpit.releases} isUnlinkedProduction={cockpit.isUnlinkedProduction} />
      <Owners owners={cockpit.owners} />
      <SopSummary cockpit={cockpit} onOpenSop={onOpenSop} />
      <SignoffSummary cockpit={cockpit} />
      <FreezeSummary cockpit={cockpit} />
      <IssueSummary issues={cockpit.issues} canManage={canManage} onRaiseIssue={onRaiseIssue} />
      <ProdEventSummary cockpit={cockpit} />
    </div>
  );
}

export default ChangeCockpitSections;
