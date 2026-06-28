/**
 * Release Operations — Overview (route /release-hub/overview)
 *
 * Rebuilt 2026-06-18 to match the design artifact (01-artifact-source.html):
 *   - header with Create change / Create release
 *   - 8 KPI stat cards (status dot + value), drill-down
 *   - Upcoming Release Windows + Release Health (readiness bars)
 *   - Pending Approvals (face avatars + role + change + wait + Review)
 *   - Change Execution Queue + CATY risk summary + Recent Production Events
 *
 * ADS tokens + canonical StatusLozenge / ads Avatar only.
 */
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, isToday, differenceInDays, differenceInHours } from 'date-fns';
import { CheckSquare, Clock } from '@/lib/atlaskit-icons';
import {
  useReleasesList,
  useChangesList,
  usePendingApprovals,
  useProductionEventsList,
  useFreezeWindowsList,
  type PendingApproval,
  type ReleaseListRow,
  type ChangeListRow,
} from '@/hooks/useReleaseHub';
import { RH } from '@/constants/releasehub.design';
import { useReleaseOpsPermissions, PERMISSION_DENIED_TOOLTIP } from '@/hooks/useReleaseOpsPermissions';
import { StatusLozenge } from '@/components/ui/StatusLozenge';
import { type StatusAppearance } from '@/components/catalyst-detail-views/shared/sections/statusPalette';
import { Avatar } from '@/components/ads/Avatar';
import Heading from '@atlaskit/heading';
import { CreateReleaseModal } from '@/components/releasehub/CreateReleaseModal';
import { CreateChgModal } from '@/components/releasehub/CreateChgModal';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import { CatyRiskPanel } from '@/components/releasehub/CatyRiskPanel';
import { ReleasePortfolio } from '@/components/releasehub/ReleasePortfolio';
import { ReleaseTimeline } from '@/components/releasehub/ReleaseTimeline';
import { ScopeIntegrityPanel } from '@/components/releasehub/ScopeIntegrityPanel';
import { OwnerAlignmentStrip } from '@/components/releasehub/OwnerAlignmentStrip';
import { useReleasePortfolio } from '@/hooks/useReleasePortfolio';

const T = {
  surface: 'var(--ds-surface, #FFFFFF)',
  card: 'var(--ds-surface-raised, #FFFFFF)',
  sunken: 'var(--ds-surface-sunken, #F7F8F9)',
  border: 'var(--ds-border, #DFE1E6)',
  text: 'var(--ds-text, #172B4D)',
  subtle: 'var(--ds-text-subtle, #44546F)',
  subtlest: 'var(--ds-text-subtlest, #626F86)',
  link: 'var(--ds-link, #0C66E4)',
  brand: 'var(--ds-background-brand-bold, #0C66E4)',
  inverse: 'var(--ds-text-inverse, #FFFFFF)',
  danger: 'var(--ds-text-danger, #AE2A19)',
  success: 'var(--ds-text-success, #216E4E)',
  warning: 'var(--ds-text-warning, #A54800)',
  hover: 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))',
  mono: 'var(--ds-font-family-code, monospace)',
};

const TERMINAL_RELEASE = ['completed', 'released', 'done', 'rolled_back', 'cancelled', 'archived'];
const IN_FLIGHT_CHANGE = ['assessing', 'ready_for_approval', 'approved', 'scheduled', 'implementing', 'validating', 'in_uat', 'in_beta', 'new'];

function titleCase(v: string | null | undefined) {
  if (!v) return '—';
  return v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, ' ');
}

function shortWait(since: string | null | undefined): string {
  if (!since) return '—';
  const d = new Date(since);
  const days = differenceInDays(new Date(), d);
  if (days >= 1) return `${days}D`;
  return `${Math.max(1, differenceInHours(new Date(), d))}H`;
}



function Panel({ title, sub, action, children }: { title: string; sub?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <Heading size="small">{title}</Heading>
          {sub && <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.subtlest }}>{sub}</span>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function ViewLink({ label, onClick }: { label: string; onClick: () => void }) {
  return <button onClick={onClick} style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', fontWeight: 500, color: T.link, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>{label}</button>;
}

function rowStyleClickable(onClick?: () => void): React.CSSProperties {
  return { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: `1px solid ${T.border}`, cursor: onClick ? 'pointer' : 'default' };
}

export default function CommandCenterPage() {
  const navigate = useNavigate();
  const { data: releases = [] } = useReleasesList();
  const { data: changes = [] } = useChangesList();
  const { data: approvals = [] } = usePendingApprovals();
  const { data: prodEvents = [] } = useProductionEventsList();
  const { data: freezes = [] } = useFreezeWindowsList();
  const { data: portfolio = [] } = useReleasePortfolio();
  const [showCreateRel, setShowCreateRel] = useState(false);
  const [showCreateChg, setShowCreateChg] = useState(false);
  const { canManage, canApprove } = useReleaseOpsPermissions();

  const activeReleases = releases.filter((r) => !TERMINAL_RELEASE.includes(r.status));

  const kpis = useMemo(() => {
    const dateOf = (c: ChangeListRow) => c.window_start ?? c.deployment_date;
    return {
      active: activeReleases.length,
      readyForSignoff: releases.filter((r) => r.status === 'ready_for_signoff' || r.status === 'in_readiness').length,
      atRisk: releases.filter((r) => r.health === 'at_risk').length,
      changesToday: changes.filter((c) => { const d = dateOf(c); return d ? isToday(new Date(d)) : false; }).length,
      freezeConflicts: freezes.reduce((s, f) => s + f.conflicts, 0),
      prodThisWeek: prodEvents.filter((e) => e.deployedAt ? differenceInDays(new Date(), new Date(e.deployedAt)) <= 7 : false).length,
      pending: approvals.length,
      deploymentWindows: changes.filter((c) => !!c.window_start && !['closed', 'implemented', 'cancelled'].includes(c.status)).length,
    };
  }, [releases, activeReleases, changes, freezes, prodEvents, approvals]);

  const execQueue = useMemo(
    () => changes.filter((c) => IN_FLIGHT_CHANGE.includes(c.status) || c.status === 'implementing').slice(0, 4),
    [changes],
  );

  const { openRiskItems, lowConfidenceCount } = useMemo(() => {
    const activePortfolio = portfolio.filter((r) => r.confidence !== 'released' && r.confidence !== 'draft');
    return {
      openRiskItems: activePortfolio.reduce((s, r) => s + r.openDefects + r.openIncidents, 0),
      lowConfidenceCount: activePortfolio.filter((r) => r.confidence === 'low').length,
    };
  }, [portfolio]);

  const caty = useMemo(() => {
    const reasons: string[] = [];
    const atRiskRel = releases.find((r) => r.health === 'at_risk');
    if (kpis.freezeConflicts > 0) reasons.push(`${kpis.freezeConflicts} freeze conflict${kpis.freezeConflicts === 1 ? '' : 's'}`);
    if (kpis.pending > 0) reasons.push(`${kpis.pending} sign-off${kpis.pending === 1 ? '' : 's'} pending`);
    if (kpis.atRisk > 0) reasons.push(`${kpis.atRisk} at-risk release${kpis.atRisk === 1 ? '' : 's'}`);
    const lead = atRiskRel ? `${atRiskRel.name} is at risk.` : reasons.length ? 'Attention needed.' : 'Release path is clear.';
    const body = reasons.length
      ? `${lead} ${reasons.join(', ')}. Resolve freeze conflicts and complete approvals before the next deployment window.`
      : `${lead} No blocking signals across the active releases.`;
    const basis = `Based on ${kpis.active} active releases · ${changes.length} changes · ${kpis.freezeConflicts} freeze conflict${kpis.freezeConflicts === 1 ? '' : 's'}`;
    return { body, basis };
  }, [releases, kpis, changes]);

  // Compact, UUID-free snapshot sent to the ai-digest `release-risk` mode.
  const riskContext = useMemo(() => ({
    kpis,
    releases: activeReleases.map((r) => ({
      name: r.name,
      version: r.version,
      status: r.status,
      health: r.health,
      readiness_pct: r.readiness_pct,
      target_date: r.planned_release_date ?? r.target_date,
    })),
    changes: changes
      .filter((c) => IN_FLIGHT_CHANGE.includes(c.status))
      .map((c) => ({ change: c.chg_number, title: c.title, status: c.status, risk_level: c.risk_level, window_start: c.window_start ?? c.deployment_date })),
    freezeWindows: freezes.map((f) => ({ name: f.name, target_env: f.targetEnv, status: f.status, conflicts: f.conflicts, start: f.startDate, end: f.endDate })),
    pendingApprovals: approvals.map((a) => ({ change: a.chgNumber, title: a.changeTitle, role: a.role, risk_level: a.riskLevel, waiting_since: a.waitStartedAt, approver: a.approverName })),
  }), [kpis, activeReleases, changes, freezes, approvals]);

  return (
    <div style={{ padding: 24, background: T.surface, minHeight: '100%' }}>
      {/* Canonical breadcrumb header — pulled to the page edge to cancel the
          24px container padding so it aligns with every other hub header. */}
      <div style={{ margin: '-24px -24px 0' }}>
        <ProjectPageHeader projectKey="RELEASES" hubType="release" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginBottom: 16 }}>
        <button onClick={() => canManage && setShowCreateChg(true)} disabled={!canManage} title={canManage ? undefined : PERMISSION_DENIED_TOOLTIP} style={{ height: 32, padding: '0 12px', borderRadius: 6, border: `1px solid ${T.border}`, background: T.card, color: T.text, cursor: canManage ? 'pointer' : 'not-allowed', opacity: canManage ? 1 : 0.5, fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-400)', fontWeight: 500 }}>Create change</button>
        <button onClick={() => canManage && setShowCreateRel(true)} disabled={!canManage} title={canManage ? undefined : PERMISSION_DENIED_TOOLTIP} style={{ height: 32, padding: '0 12px', borderRadius: 6, border: 'none', background: T.brand, color: T.inverse, cursor: canManage ? 'pointer' : 'not-allowed', opacity: canManage ? 1 : 0.5, fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-400)', fontWeight: 500 }}>Create release</button>
      </div>

      {/* 5-metric command strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, marginBottom: 16, overflow: 'hidden' }}>
        {([
          { label: 'Active releases', value: kpis.active, sub: lowConfidenceCount > 0 ? `${lowConfidenceCount} low confidence` : 'all clear', subColor: lowConfidenceCount > 0 ? T.danger : T.success, onClick: () => navigate('/release-hub/releases-management') },
          { label: 'Pending approvals', value: kpis.pending, sub: kpis.pending > 0 ? 'needs action' : 'none pending', subColor: kpis.pending > 0 ? T.warning : T.success, onClick: () => navigate('/release-hub/sign-off-queue') },
          { label: 'Open risk items', value: openRiskItems, sub: openRiskItems > 0 ? 'defects + incidents' : 'no open items', subColor: openRiskItems > 0 ? T.danger : T.success, onClick: () => navigate('/release-hub/releases-management') },
          { label: 'Freeze conflicts', value: kpis.freezeConflicts, sub: kpis.freezeConflicts > 0 ? 'resolve before deploy' : 'no conflicts', subColor: kpis.freezeConflicts > 0 ? T.danger : T.success, onClick: () => navigate('/release-hub/freeze-windows') },
          { label: 'Events this week', value: kpis.prodThisWeek, sub: kpis.prodThisWeek > 0 ? 'production deployments' : 'none this week', subColor: kpis.prodThisWeek > 0 ? T.success : T.subtlest, onClick: () => navigate('/release-hub/production-events') },
        ] as const).map((m, i) => (
          <button
            key={i}
            onClick={m.onClick}
            style={{ padding: '16px', textAlign: 'left', cursor: 'pointer', background: 'transparent', border: 'none', borderRight: i < 4 ? `1px solid ${T.border}` : 'none', transition: 'background 120ms' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = T.hover; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.subtlest, letterSpacing: '0.04em' }}>{m.label}</span>
            <p style={{ fontFamily: RH.fontDisplay, fontSize: 32, fontWeight: 700, color: T.text, margin: '8px 0 4px', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{m.value}</p>
            <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', fontWeight: 500, color: m.subColor }}>{m.sub}</span>
          </button>
        ))}
      </div>

      {/* Release portfolio — per-release production confidence */}
      <div style={{ marginBottom: 16 }}>
        <ReleasePortfolio />
      </div>

      {/* Release timeline — go-lives + freeze overlay */}
      <div style={{ marginBottom: 16 }}>
        <ReleaseTimeline />
      </div>

      {/* Scope integrity — per-release drift + defects */}
      <div style={{ marginBottom: 16 }}>
        <ScopeIntegrityPanel />
      </div>

      {/* Owner alignment — per-release signoff coverage */}
      <div style={{ marginBottom: 16 }}>
        <OwnerAlignmentStrip />
      </div>

      {/* CATY Risk Summary — strategic synthesis before operational detail */}
      <div style={{ marginBottom: 16 }}>
        <CatyRiskPanel
          context={riskContext}
          metrics={{ freezeConflicts: kpis.freezeConflicts, pending: kpis.pending, atRisk: kpis.atRisk, active: kpis.active }}
          basis={caty.basis}
          fallbackNarrative={caty.body}
        />
      </div>

      {/* Operational panels — 2-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Pending Approvals */}
        <Panel title="Pending approvals" sub={`${approvals.length} waiting`} action={<ViewLink label="Sign-off queue" onClick={() => navigate('/release-hub/sign-off-queue')} />}>
          {approvals.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <CheckSquare size={20} style={{ color: T.success }} />
              <p style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: T.success, margin: '8px 0 0' }}>No pending approvals</p>
            </div>
          ) : approvals.slice(0, 5).map((a: PendingApproval) => (
            <div key={a.id} style={rowStyleClickable()}>
              <Avatar name={a.approverName ?? 'Unassigned'} src={a.approverAvatarUrl ?? undefined} size="small" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: T.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.approverName ?? 'Unassigned'}</p>
                <p style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.subtlest, margin: '4px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.changeTitle ?? '—'}</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                {(() => {
                  const urgent = (a.role ?? '').toLowerCase().includes('emergency');
                  return <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: urgent ? T.danger : T.subtlest }}>{shortWait(a.waitStartedAt)}</span>;
                })()}
                <button onClick={() => canApprove && navigate('/release-hub/sign-off-queue')} disabled={!canApprove} title={canApprove ? undefined : PERMISSION_DENIED_TOOLTIP} style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', fontWeight: 500, color: T.success, background: 'transparent', border: `1px solid var(--ds-border-success, #4BCE97)`, borderRadius: 4, padding: '4px 8px', cursor: canApprove ? 'pointer' : 'not-allowed', opacity: canApprove ? 1 : 0.5 }}>Review</button>
              </div>
            </div>
          ))}
        </Panel>

        {/* Change Execution Queue */}
        <Panel title="Change execution queue" action={<ViewLink label="All changes" onClick={() => navigate('/release-hub/changes')} />}>
          {execQueue.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.subtlest }}>No changes in flight</div>
          ) : execQueue.map((c) => {
            const risk = (c.risk_level ?? '').toLowerCase();
            const riskColor = risk === 'high' ? T.danger : risk === 'medium' ? T.warning : T.subtlest;
            const windowStr = c.window_start ? format(new Date(c.window_start), 'MMM d, HH:mm') : (c.deployment_date ? format(new Date(c.deployment_date), 'MMM d') : null);
            return (
              <div key={c.id} style={rowStyleClickable(() => navigate(`/release-hub/changes/${c.id}`))} onClick={() => navigate(`/release-hub/changes/${c.id}`)}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontFamily: T.mono, fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: T.link, flexShrink: 0 }}>{c.chg_number}</span>
                    {risk && risk !== 'low' && <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-50)', fontWeight: 700, color: riskColor, letterSpacing: '0.05em' }}>{risk.toUpperCase()} RISK</span>}
                  </div>
                  <p style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.text, margin: '4px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title ?? '—'}</p>
                  {windowStr && <p style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', color: T.subtlest, margin: '4px 0 0' }}>{windowStr}</p>}
                </div>
                <div style={{ flexShrink: 0 }}><StatusLozenge status={c.status} /></div>
              </div>
            );
          })}
        </Panel>
      </div>

      {/* Recent Production Events */}
      <Panel title="Recent production events" action={<ViewLink label="All events" onClick={() => navigate('/release-hub/production-events')} />}>
        {prodEvents.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.subtlest }}>No production events</div>
        ) : prodEvents.slice(0, 4).map((ev) => {
          const ok = (ev.result ?? ev.deploymentStatus ?? '').toLowerCase() === 'success';
          const partial = (ev.result ?? ev.deploymentStatus ?? '').toLowerCase() === 'partial';
          const resultAppearance: StatusAppearance = ok ? 'success' : partial ? 'moved' : 'removed';
          const wi = Array.isArray(ev.workItemsSnapshot) ? ev.workItemsSnapshot.length : null;
          const br = Array.isArray(ev.businessRequestsSnapshot) ? ev.businessRequestsSnapshot.length : null;
          return (
            <div key={ev.id} style={rowStyleClickable()}>
              <span style={{ flexShrink: 0 }}><StatusLozenge appearance={resultAppearance} label={titleCase(ev.result ?? ev.deploymentStatus)} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-400)', fontWeight: 600, color: T.text, margin: 0 }}>{ev.title}</p>
                <p style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.subtlest, margin: '4px 0 0' }}>
                  {wi != null ? `${wi} work items · ` : ''}{br != null ? `${br} business requests · ` : ''}{ev.changeKey ? `change ${ev.changeKey}` : ev.deployedBy}
                </p>
              </div>
              <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.subtlest, whiteSpace: 'nowrap' }}>{ev.deployedAt ? format(new Date(ev.deployedAt), 'MMM d') : '—'}</span>
            </div>
          );
        })}
      </Panel>

      {showCreateRel && <CreateReleaseModal onClose={() => setShowCreateRel(false)} />}
      {showCreateChg && <CreateChgModal onClose={() => setShowCreateChg(false)} />}
    </div>
  );
}
