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
import { formatDistanceToNowStrict, format, isToday, differenceInDays } from 'date-fns';
import { Rocket, CheckSquare, ArrowLeftRight, Clock, Calendar, AlertTriangle, Sparkles, ChevronRight } from '@/lib/atlaskit-icons';
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
import { statusBg, statusFg } from '@/components/catalyst-detail-views/shared/sections/statusPalette';
import { Avatar } from '@/components/ads/Avatar';
import { CreateReleaseModal } from '@/components/releasehub/CreateReleaseModal';
import { CreateChgModal } from '@/components/releasehub/CreateChgModal';
import { catalystToast } from '@/lib/catalystToast';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';

const T = {
  surface: 'var(--ds-surface, #FFFFFF)',
  card: 'var(--ds-surface-raised, #FFFFFF)',
  sunken: 'var(--ds-surface-sunken, #F7F8F9)',
  border: 'var(--ds-border, #DFE1E6)',
  borderBold: 'var(--ds-border-bold, #B3B9C4)',
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
  discoveryFg: 'var(--ds-text-discovery, #5E4DB2)',
  discoveryBg: 'var(--ds-background-discovery, #F3F0FF)',
  discoveryBorder: 'var(--ds-border-discovery, #B8ACF6)',
};

const TERMINAL_RELEASE = ['completed', 'released', 'done', 'rolled_back', 'cancelled', 'archived'];
const IN_FLIGHT_CHANGE = ['assessing', 'ready_for_approval', 'approved', 'scheduled', 'implementing', 'validating', 'in_uat', 'in_beta', 'new'];

function titleCase(v: string | null | undefined) {
  if (!v) return '—';
  return v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, ' ');
}

/**
 * Canonical Jira status pill — identical geometry + palette to the shared
 * `StatusLozenge` (statusPalette.ts): medium-pastel Jira background, dark text
 * (#292A2E, never white/inverse), 11px/700/uppercase. Every status-like badge
 * on this page routes through here so the overview matches the home page and
 * uses ONLY the canonical Jira status colors. `appearance` is a statusPalette
 * key: success | inprogress | moved | new | removed | default.
 */
function JiraPill({ appearance, label }: { appearance: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: statusBg(appearance), borderRadius: 3, padding: '0 7px', height: 20 }}>
      <span style={{ fontFamily: RH.fontBody, fontSize: 11, fontWeight: 700, lineHeight: '20px', color: statusFg(), textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{label}</span>
    </span>
  );
}

// Environment → canonical Jira appearance. Production = live = green (done),
// beta = lavender (new), staging = warm yellow (moved), everything else = blue.
const ENV_APPEARANCE: Record<string, string> = { production: 'success', beta: 'new', staging: 'moved', uat: 'inprogress' };
function EnvLozenge({ env }: { env: string | null }) {
  if (!env) return null;
  return <JiraPill appearance={ENV_APPEARANCE[env] ?? 'inprogress'} label={titleCase(env)} />;
}

// Health → canonical Jira appearance. at_risk = coral red (removed),
// on_track = blue (inprogress), done = green (success).
const HEALTH_APPEARANCE: Record<string, string> = { at_risk: 'removed', on_track: 'inprogress', done: 'success' };
function HealthLozenge({ health }: { health: string | null }) {
  if (!health) return null;
  const label = health === 'at_risk' ? 'At risk' : health === 'on_track' ? 'On track' : titleCase(health);
  return <JiraPill appearance={HEALTH_APPEARANCE[health] ?? 'default'} label={label} />;
}

function KpiCard({ label, value, dot, onClick }: { label: string; value: number; dot: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: 16, textAlign: 'left', cursor: onClick ? 'pointer' : 'default', display: 'block', width: '100%', transition: 'border-color 120ms' }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.borderBold; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: RH.fontBody, fontSize: 12, fontWeight: 500, color: T.subtlest }}>{label}</span>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot }} />
      </div>
      <p style={{ fontFamily: RH.fontDisplay, fontSize: 28, fontWeight: 600, color: T.text, margin: '8px 0 0', fontVariantNumeric: 'tabular-nums' }}>{value}</p>
    </button>
  );
}

function Panel({ title, sub, action, children }: { title: string; sub?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <h2 style={{ fontFamily: RH.fontDisplay, fontSize: 16, fontWeight: 600, color: T.text, margin: 0 }}>{title}</h2>
          {sub && <span style={{ fontFamily: RH.fontBody, fontSize: 12, color: T.subtlest }}>{sub}</span>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function ViewLink({ label, onClick }: { label: string; onClick: () => void }) {
  return <button onClick={onClick} style={{ fontFamily: RH.fontBody, fontSize: 12, fontWeight: 500, color: T.link, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>{label}</button>;
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

  const upcoming = useMemo(
    () => releases
      .filter((r) => (r.planned_release_date ?? r.target_date))
      .filter((r) => !TERMINAL_RELEASE.includes(r.status))
      .sort((a, b) => new Date(a.planned_release_date ?? a.target_date!).getTime() - new Date(b.planned_release_date ?? b.target_date!).getTime())
      .slice(0, 4),
    [releases],
  );

  const execQueue = useMemo(
    () => changes.filter((c) => IN_FLIGHT_CHANGE.includes(c.status) || c.status === 'implementing').slice(0, 4),
    [changes],
  );

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

  const copyCaty = () => { navigator.clipboard?.writeText(caty.body).then(() => catalystToast.success('Copied')).catch(() => {}); };

  return (
    <div style={{ padding: 24, background: T.surface, minHeight: '100%' }}>
      {/* Canonical breadcrumb header — pulled to the page edge to cancel the
          24px container padding so it aligns with every other hub header. */}
      <div style={{ margin: '-24px -24px 0' }}>
        <ProjectPageHeader projectKey="RELEASES" hubType="release" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginBottom: 16 }}>
        <button onClick={() => canManage && setShowCreateChg(true)} disabled={!canManage} title={canManage ? undefined : PERMISSION_DENIED_TOOLTIP} style={{ height: 32, padding: '0 12px', borderRadius: 6, border: `1px solid ${T.border}`, background: T.card, color: T.text, cursor: canManage ? 'pointer' : 'not-allowed', opacity: canManage ? 1 : 0.5, fontFamily: RH.fontBody, fontSize: 14, fontWeight: 500 }}>Create change</button>
        <button onClick={() => canManage && setShowCreateRel(true)} disabled={!canManage} title={canManage ? undefined : PERMISSION_DENIED_TOOLTIP} style={{ height: 32, padding: '0 12px', borderRadius: 6, border: 'none', background: T.brand, color: T.inverse, cursor: canManage ? 'pointer' : 'not-allowed', opacity: canManage ? 1 : 0.5, fontFamily: RH.fontBody, fontSize: 14, fontWeight: 500 }}>Create release</button>
      </div>

      {/* 8 KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
        <KpiCard label="Active Releases" value={kpis.active} dot={T.link} onClick={() => navigate('/release-hub/releases')} />
        <KpiCard label="Ready for Sign-off" value={kpis.readyForSignoff} dot={T.link} onClick={() => navigate('/release-hub/sign-off-queue')} />
        <KpiCard label="At-risk Releases" value={kpis.atRisk} dot={T.danger} onClick={() => navigate('/release-hub/releases')} />
        <KpiCard label="Changes Today" value={kpis.changesToday} dot={T.link} onClick={() => navigate('/release-hub/changes')} />
        <KpiCard label="Freeze Conflicts" value={kpis.freezeConflicts} dot={T.danger} onClick={() => navigate('/release-hub/freeze-windows')} />
        <KpiCard label="Prod Events This Week" value={kpis.prodThisWeek} dot={T.success} onClick={() => navigate('/release-hub/production-events')} />
        <KpiCard label="Pending Approvals" value={kpis.pending} dot={T.warning} onClick={() => navigate('/release-hub/sign-off-queue')} />
        <KpiCard label="Deployment Windows" value={kpis.deploymentWindows} dot={T.link} onClick={() => navigate('/release-hub/calendar')} />
      </div>

      {/* Upcoming Release Windows + Release Health */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <Panel title="Upcoming Release Windows" action={<ViewLink label="View calendar" onClick={() => navigate('/release-hub/calendar')} />}>
          {upcoming.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', fontFamily: RH.fontBody, fontSize: 13, color: T.subtlest }}>No upcoming releases</div>
          ) : upcoming.map((r) => {
            const d = new Date(r.planned_release_date ?? r.target_date!);
            return (
              <div key={r.id} style={rowStyleClickable(() => navigate(`/release-hub/${r.id}`))} onClick={() => navigate(`/release-hub/${r.id}`)}>
                <div style={{ width: 48, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '6px 0', borderRadius: 8, background: 'var(--ds-background-selected, #E9F2FE)' }}>
                  <div style={{ fontFamily: RH.fontBody, fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ds-text-information, #0055CC)' }}>{format(d, 'MMM')}</div>
                  <div style={{ fontFamily: RH.fontDisplay, fontSize: 18, fontWeight: 700, color: 'var(--ds-text-information, #0055CC)' }}>{format(d, 'd')}</div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 600, color: T.text, margin: 0 }}>{r.jira_key ?? r.name}</p>
                  <p style={{ fontFamily: RH.fontBody, fontSize: 12, color: T.subtlest, margin: '4px 0 0' }}>{r.name} · {titleCase(r.target_env)}</p>
                </div>
                <EnvLozenge env={r.target_env} />
              </div>
            );
          })}
        </Panel>

        <Panel title="Release Health">
          {activeReleases.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', fontFamily: RH.fontBody, fontSize: 13, color: T.subtlest }}>No active releases</div>
          ) : activeReleases.slice(0, 4).map((r) => {
            const pct = r.readiness_pct ?? 0;
            const barColor = r.health === 'at_risk' ? T.danger : T.link;
            return (
              <div key={r.id} style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 600, color: T.text }}>{r.jira_key ?? r.name}</span>
                  <HealthLozenge health={r.health} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, height: 6, borderRadius: 4, background: T.sunken, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: 4 }} />
                  </div>
                  <span style={{ fontFamily: RH.fontBody, fontSize: 12, fontWeight: 600, color: T.subtle, minWidth: 32, textAlign: 'right' }}>{pct}%</span>
                </div>
              </div>
            );
          })}
        </Panel>
      </div>

      {/* Pending Approvals */}
      <div style={{ marginBottom: 16 }}>
        <Panel title="Pending Approvals" sub="Waiting on specific approvers" action={<ViewLink label="Open sign-off queue" onClick={() => navigate('/release-hub/sign-off-queue')} />}>
          {approvals.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <CheckSquare size={20} style={{ color: T.success }} />
              <p style={{ fontFamily: RH.fontBody, fontSize: 13, fontWeight: 600, color: T.success, margin: '8px 0 0' }}>No pending approvals</p>
            </div>
          ) : approvals.slice(0, 6).map((a: PendingApproval) => (
            <div key={a.id} style={rowStyleClickable()}>
              <span style={{ fontFamily: RH.fontBody, fontSize: 10, fontWeight: 700, color: T.subtle, background: T.sunken, padding: '0 8px', borderRadius: 3, minWidth: 56, textAlign: 'center', flexShrink: 0 }}>Change</span>
              <div style={{ width: 220, minWidth: 0 }}>
                {a.chgNumber && <span style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 600, color: T.link }}>{a.chgNumber}</span>}
                <p style={{ fontFamily: RH.fontBody, fontSize: 12, color: T.subtlest, margin: '4px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.changeTitle ?? '—'}</p>
              </div>
              <Avatar name={a.approverName ?? 'Unassigned'} src={a.approverAvatarUrl ?? undefined} size="small" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: RH.fontBody, fontSize: 14, fontWeight: 600, color: T.text, margin: 0 }}>Waiting on {a.approverName ?? 'Unassigned'}</p>
                <p style={{ fontFamily: RH.fontBody, fontSize: 12, color: T.subtlest, margin: '4px 0 0' }}>{a.approverName ?? 'Unassigned'} · {a.role ?? '—'}</p>
              </div>
              <span style={{ fontFamily: RH.fontBody, fontSize: 11, fontWeight: 700, color: T.warning, background: 'var(--ds-background-warning, #FFF7D6)', padding: '0 8px', borderRadius: 3, whiteSpace: 'nowrap' }}>{a.waitStartedAt ? formatDistanceToNowStrict(new Date(a.waitStartedAt)) : '—'}</span>
              <button onClick={() => canApprove && navigate('/release-hub/sign-off-queue')} disabled={!canApprove} title={canApprove ? undefined : PERMISSION_DENIED_TOOLTIP} style={{ fontFamily: RH.fontBody, fontSize: 13, fontWeight: 500, color: T.success, background: 'transparent', border: `1px solid var(--ds-border, #DFE1E6)`, borderRadius: 6, padding: '4px 12px', cursor: canApprove ? 'pointer' : 'not-allowed', opacity: canApprove ? 1 : 0.5, whiteSpace: 'nowrap' }}>Review</button>
            </div>
          ))}
        </Panel>
      </div>

      {/* Change Execution Queue */}
      <div style={{ marginBottom: 16 }}>
        <Panel title="Change Execution Queue" action={<ViewLink label="All changes" onClick={() => navigate('/release-hub/changes')} />}>
          {execQueue.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', fontFamily: RH.fontBody, fontSize: 13, color: T.subtlest }}>No changes in flight</div>
          ) : execQueue.map((c) => (
            <div key={c.id} style={rowStyleClickable(() => navigate(`/release-hub/changes/${c.id}`))} onClick={() => navigate(`/release-hub/changes/${c.id}`)}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 600, color: T.text }}>{c.chg_number}</span>
                <p style={{ fontFamily: RH.fontBody, fontSize: 12, color: T.subtlest, margin: '4px 0 0' }}>{c.window_start ? format(new Date(c.window_start), 'MMM d, HH:mm') : (c.deployment_date ? format(new Date(c.deployment_date), 'MMM d') : '—')}</p>
              </div>
              <StatusLozenge status={c.status} />
            </div>
          ))}
        </Panel>
      </div>

      {/* CATY Risk Summary */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ background: T.discoveryBg, border: `1px solid ${T.discoveryBorder}`, borderRadius: 8, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={14} style={{ color: T.discoveryFg }} />
              <span style={{ fontFamily: RH.fontDisplay, fontSize: 14, fontWeight: 600, color: T.discoveryFg }}>AI Release Risk Summary · CATY</span>
            </div>
            <span style={{ fontFamily: RH.fontBody, fontSize: 11, color: T.subtlest }}>{caty.basis}</span>
          </div>
          <p style={{ fontFamily: RH.fontBody, fontSize: 14, color: T.text, margin: 0, lineHeight: 1.5 }}>{caty.body}</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={() => catalystToast.info('Recomputed from live data')} style={{ fontFamily: RH.fontBody, fontSize: 12, fontWeight: 500, color: T.discoveryFg, background: 'transparent', border: `1px solid ${T.discoveryBorder}`, borderRadius: 6, padding: '4px 12px', cursor: 'pointer' }}>Regenerate</button>
            <button onClick={copyCaty} style={{ fontFamily: RH.fontBody, fontSize: 12, fontWeight: 500, color: T.discoveryFg, background: 'transparent', border: `1px solid ${T.discoveryBorder}`, borderRadius: 6, padding: '4px 12px', cursor: 'pointer' }}>Copy</button>
            <button onClick={() => catalystToast.success('Saved as note')} style={{ fontFamily: RH.fontBody, fontSize: 12, fontWeight: 500, color: T.discoveryFg, background: 'transparent', border: `1px solid ${T.discoveryBorder}`, borderRadius: 6, padding: '4px 12px', cursor: 'pointer' }}>Save as note</button>
          </div>
        </div>
      </div>

      {/* Recent Production Events */}
      <Panel title="Recent Production Events" action={<ViewLink label="All events" onClick={() => navigate('/release-hub/production-events')} />}>
        {prodEvents.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', fontFamily: RH.fontBody, fontSize: 13, color: T.subtlest }}>No production events</div>
        ) : prodEvents.slice(0, 4).map((ev) => {
          const ok = (ev.result ?? ev.deploymentStatus ?? '').toLowerCase() === 'success';
          const partial = (ev.result ?? ev.deploymentStatus ?? '').toLowerCase() === 'partial';
          const resultAppearance = ok ? 'success' : partial ? 'moved' : 'removed';
          const wi = Array.isArray(ev.workItemsSnapshot) ? ev.workItemsSnapshot.length : null;
          const br = Array.isArray(ev.businessRequestsSnapshot) ? ev.businessRequestsSnapshot.length : null;
          return (
            <div key={ev.id} style={rowStyleClickable()}>
              <span style={{ flexShrink: 0 }}><JiraPill appearance={resultAppearance} label={titleCase(ev.result ?? ev.deploymentStatus)} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: RH.fontBody, fontSize: 14, fontWeight: 600, color: T.text, margin: 0 }}>{ev.title}</p>
                <p style={{ fontFamily: RH.fontBody, fontSize: 12, color: T.subtlest, margin: '4px 0 0' }}>
                  {wi != null ? `${wi} work items · ` : ''}{br != null ? `${br} business requests · ` : ''}{ev.changeKey ? `change ${ev.changeKey}` : ev.deployedBy}
                </p>
              </div>
              <span style={{ fontFamily: RH.fontBody, fontSize: 12, color: T.subtlest, whiteSpace: 'nowrap' }}>{ev.deployedAt ? format(new Date(ev.deployedAt), 'MMM d') : '—'}</span>
            </div>
          );
        })}
      </Panel>

      {showCreateRel && <CreateReleaseModal onClose={() => setShowCreateRel(false)} />}
      {showCreateChg && <CreateChgModal onClose={() => setShowCreateChg(false)} />}
    </div>
  );
}
