/**
 * Release Operations — Overview (route /release-hub/overview)
 *
 * Rebuilt 2026-06-18 (Phase 3) to ADS tokens + canonical components.
 *   - KPI stat cards (whole card is a drill-down button)
 *   - Pending Approvals panel — face avatars of the pending approver(s),
 *     name + role + change + wait time + Review action (handoff §3b priority)
 *   - Release Status + Recent Production Events supporting panels
 *
 * Status pills via StatusLozenge; avatars via ads/Avatar. No --cp-* tokens.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNowStrict, format } from 'date-fns';
import { Rocket, ArrowLeftRight, CheckSquare, Clock, ChevronRight } from '@/lib/atlaskit-icons';
import {
  useReleases,
  useChanges,
  useCommandCenterKPIs,
  useProductionEvents,
  usePendingApprovals,
  type PendingApproval,
} from '@/hooks/useReleaseHub';
import { RH } from '@/constants/releasehub.design';
import { StatusLozenge } from '@/components/ui/StatusLozenge';
import { Avatar } from '@/components/ads/Avatar';

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
  hover: 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))',
  danger: 'var(--ds-text-danger, #AE2A19)',
  success: 'var(--ds-text-success, #216E4E)',
};

function KPICard({ label, value, icon: Icon, loading, onClick }: {
  label: string; value: number | string; icon: any; loading?: boolean; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: T.card, border: `1px solid ${T.border}`, borderRadius: 8,
        padding: 16, textAlign: 'left', cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 120ms', display: 'block', width: '100%',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.borderBold; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontFamily: RH.fontBody, fontSize: 12, fontWeight: 600, color: T.subtlest, margin: 0 }}>{label}</p>
          {loading ? (
            <div style={{ height: 32, width: 56, borderRadius: 4, background: T.sunken, marginTop: 8 }} />
          ) : (
            <p style={{ fontFamily: RH.fontDisplay, fontSize: 28, fontWeight: 600, color: T.text, margin: '4px 0 0', fontVariantNumeric: 'tabular-nums' }}>{value}</p>
          )}
        </div>
        <span style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.sunken }}>
          <Icon size={16} style={{ color: T.subtle }} />
        </span>
      </div>
    </button>
  );
}

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: `1px solid ${T.border}` }}>
        <h2 style={{ fontFamily: RH.fontDisplay, fontSize: 16, fontWeight: 600, color: T.text, margin: 0 }}>{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function ViewAll({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ fontFamily: RH.fontBody, fontSize: 12, fontWeight: 500, color: T.link, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
      View all
    </button>
  );
}

function waitLabel(iso: string | null): string {
  if (!iso) return '—';
  try { return `${formatDistanceToNowStrict(new Date(iso))} waiting`; } catch { return '—'; }
}

function PendingApprovalRow({ a, onReview }: { a: PendingApproval; onReview: () => void }) {
  const name = a.approverName ?? 'Unassigned';
  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: `1px solid ${T.border}` }}
      onMouseEnter={(e) => { e.currentTarget.style.background = T.hover; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <Avatar name={name} src={a.approverAvatarUrl ?? undefined} size="medium" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: RH.fontBody, fontSize: 14, fontWeight: 600, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
          {a.role && (
            <span style={{ fontFamily: RH.fontBody, fontSize: 11, fontWeight: 600, color: T.subtle, background: T.sunken, padding: '0 8px', borderRadius: 3, whiteSpace: 'nowrap' }}>{a.role}</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          {a.chgNumber && (
            <span style={{ fontFamily: 'var(--ds-font-family-code, monospace)', fontSize: 12, fontWeight: 600, color: T.link }}>{a.chgNumber}</span>
          )}
          <span style={{ fontFamily: RH.fontBody, fontSize: 12, color: T.subtlest, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {a.changeTitle ?? '—'} · {waitLabel(a.waitStartedAt)}
          </span>
        </div>
      </div>
      <button
        onClick={onReview}
        style={{ display: 'flex', alignItems: 'center', gap: 2, fontFamily: RH.fontBody, fontSize: 13, fontWeight: 500, color: T.link, background: 'transparent', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', padding: '4px 0' }}
      >
        Review <ChevronRight size={14} style={{ color: T.link }} />
      </button>
    </div>
  );
}

export default function CommandCenterPage() {
  const navigate = useNavigate();
  const { data: releases = [], isLoading: relLoading } = useReleases();
  const { data: changes = [], isLoading: chgLoading } = useChanges();
  const { data: kpis, isLoading: kpiLoading } = useCommandCenterKPIs();
  const { data: approvals = [], isLoading: apLoading } = usePendingApprovals();
  const { data: prodEvents = [], isLoading: evLoading } = useProductionEvents();

  const kpiLoad = relLoading || chgLoading || kpiLoading;

  // A release is "active" while it is in-flight — i.e. not in a terminal
  // state. Works for both the new lifecycle (draft→…→completed) and legacy
  // statuses (released/done).
  const TERMINAL_RELEASE = ['completed', 'released', 'done', 'rolled_back', 'cancelled', 'archived'];
  const isActiveRelease = (r: any) => !TERMINAL_RELEASE.includes(r.status);

  // Compute directly from the loaded rows — the rh_command_center_kpis view
  // pre-dates the new lifecycle vocabulary and reports stale counts.
  const activeReleases = releases.filter(isActiveRelease).length;
  const openChanges = changes.filter((c: any) => !['in_production', 'closed', 'cancelled'].includes(c.status)).length;
  const pendingCount = approvals.length;
  const prodCount = prodEvents.length;

  const activeRels = releases.filter(isActiveRelease);

  return (
    <div style={{ padding: 24, background: T.surface, minHeight: '100%' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: RH.fontDisplay, fontSize: 24, fontWeight: 600, color: T.text, margin: 0 }}>Release Operations Overview</h1>
        <p style={{ fontFamily: RH.fontBody, fontSize: 13, color: T.subtlest, margin: '4px 0 0' }}>Releases, changes, and approvals at a glance</p>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <KPICard label="Active Releases" value={activeReleases} icon={Rocket} loading={kpiLoad} onClick={() => navigate('/release-hub/releases')} />
        <KPICard label="Open Changes" value={openChanges} icon={ArrowLeftRight} loading={kpiLoad} onClick={() => navigate('/release-hub/changes')} />
        <KPICard label="Pending Approvals" value={pendingCount} icon={CheckSquare} loading={apLoading} onClick={() => navigate('/release-hub/sign-off-queue')} />
        <KPICard label="Production Events" value={prodCount} icon={Clock} loading={evLoading} onClick={() => navigate('/release-hub/production-events')} />
      </div>

      {/* Pending Approvals — priority surface */}
      <div style={{ marginBottom: 24 }}>
        <Panel title="Pending Approvals" action={<ViewAll onClick={() => navigate('/release-hub/sign-off-queue')} />}>
          {apLoading ? (
            <div style={{ padding: 16 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: T.sunken }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ height: 12, width: '40%', background: T.sunken, borderRadius: 4, marginBottom: 8 }} />
                    <div style={{ height: 10, width: '60%', background: T.sunken, borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : approvals.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center' }}>
              <CheckSquare size={20} style={{ color: T.success }} />
              <p style={{ fontFamily: RH.fontBody, fontSize: 13, fontWeight: 600, color: T.success, margin: '8px 0 0' }}>No pending approvals</p>
            </div>
          ) : (
            approvals.map((a) => (
              <PendingApprovalRow key={a.id} a={a} onReview={() => navigate('/release-hub/sign-off-queue')} />
            ))
          )}
        </Panel>
      </div>

      {/* Release Status + Production Events */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        <Panel title="Release Status" action={<ViewAll onClick={() => navigate('/release-hub/releases')} />}>
          {relLoading ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', fontFamily: RH.fontBody, fontSize: 13, color: T.subtlest }}>Loading…</div>
          ) : activeRels.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', fontFamily: RH.fontBody, fontSize: 13, color: T.subtlest }}>No active releases</div>
          ) : (
            activeRels.map((r: any) => {
              const chgCount = r.chg_count ?? changes.filter((c: any) => c.release_id === r.id).length;
              return (
                <div
                  key={r.id}
                  onClick={() => navigate(`/release-hub/${r.id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: `1px solid ${T.border}`, cursor: 'pointer' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = T.hover; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ flex: 1, minWidth: 0, fontFamily: RH.fontBody, fontSize: 14, fontWeight: 600, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</span>
                  <StatusLozenge status={r.status} />
                  <span style={{ fontFamily: RH.fontBody, fontSize: 12, color: T.subtlest, whiteSpace: 'nowrap' }}>
                    {chgCount} {chgCount === 1 ? 'change' : 'changes'}
                  </span>
                  <span style={{ fontFamily: RH.fontBody, fontSize: 12, color: T.subtlest, whiteSpace: 'nowrap' }}>
                    {r.target_date ? format(new Date(r.target_date), 'MMM d') : '—'}
                  </span>
                </div>
              );
            })
          )}
        </Panel>

        <Panel title="Recent Production Events" action={<ViewAll onClick={() => navigate('/release-hub/production-events')} />}>
          {evLoading ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', fontFamily: RH.fontBody, fontSize: 13, color: T.subtlest }}>Loading…</div>
          ) : prodEvents.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', fontFamily: RH.fontBody, fontSize: 13, color: T.subtlest }}>No production events</div>
          ) : (
            prodEvents.slice(0, 5).map((ev: any) => (
              <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: `1px solid ${T.border}` }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: RH.fontBody, fontSize: 13, fontWeight: 600, color: T.text, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.title}</p>
                  <p style={{ fontFamily: RH.fontBody, fontSize: 11, color: T.subtlest, margin: '4px 0 0' }}>
                    {ev.deployed_at ? format(new Date(ev.deployed_at), 'MMM d, HH:mm') : '—'}{ev.deployed_by ? ` · ${ev.deployed_by}` : ''}
                  </p>
                </div>
              </div>
            ))
          )}
        </Panel>
      </div>
    </div>
  );
}
