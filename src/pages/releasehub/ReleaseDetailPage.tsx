/**
 * Release Operations — Release detail (route /release-hub/:releaseId)
 *
 * Phase 5a (2026-06-18): real detail shell — header (name + status/health
 * lozenges + meta), 9-step lifecycle tracker, and the 8-tab scaffold
 * (Overview / Scope / Readiness / Changes / Sign-offs / Release Notes /
 * Production Events / Audit). Overview tab is populated from real data; the
 * other tabs + Notify list CRUD land in Phase 5b+.
 *
 * Replaces the mock-data ReleaseDashboardV5Page that previously served this
 * route.
 */
import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import Spinner from '@atlaskit/spinner';
import { ArrowLeft, Check, Sparkles } from '@/lib/atlaskit-icons';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRelease } from '@/hooks/useReleaseHub';
import { StatusLozenge } from '@/components/ui/StatusLozenge';
import { ScopeTab, ChangesTab, SignoffsTab, NotifyList, ReadinessTab, ReleaseNotesTab, ProductionEventsTab, AuditTab } from '@/components/releasehub/detail/ReleaseDetailTabs';
import { RH } from '@/constants/releasehub.design';

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
  success: 'var(--ds-background-success-bold, #1F845A)',
  inverse: 'var(--ds-text-inverse, #FFFFFF)',
};

const STAGES = [
  { key: 'draft', label: 'Draft' },
  { key: 'planned', label: 'Planned' },
  { key: 'in_readiness', label: 'In readiness' },
  { key: 'ready_for_signoff', label: 'Ready for sign-off' },
  { key: 'approved', label: 'Approved' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'deploying', label: 'Deploying' },
  { key: 'monitoring', label: 'Monitoring' },
  { key: 'completed', label: 'Completed' },
];

// Map legacy statuses onto the new lifecycle scale.
const LEGACY: Record<string, string> = {
  todo: 'draft', planning: 'planned', in_progress: 'deploying', released: 'completed', done: 'completed',
};
const TERMINAL: Record<string, string> = { rolled_back: 'Rolled back', cancelled: 'Cancelled' };

function HealthPill({ health }: { health: string | null }) {
  if (!health) return null;
  const map: Record<string, { label: string; fg: string; bg: string }> = {
    at_risk: { label: 'At risk', fg: 'var(--ds-text-danger, #AE2A19)', bg: 'var(--ds-background-danger, #FFECEB)' },
    on_track: { label: 'On track', fg: 'var(--ds-text-information, #0055CC)', bg: 'var(--ds-background-information, #E9F2FE)' },
    done: { label: 'Done', fg: 'var(--ds-text-success, #216E4E)', bg: 'var(--ds-background-success, #DCFFF1)' },
  };
  const m = map[health] ?? { label: health, fg: T.subtle, bg: T.sunken };
  return <span style={{ fontFamily: RH.fontBody, fontSize: 11, fontWeight: 600, color: m.fg, background: m.bg, padding: '0 8px', borderRadius: 3 }}>{m.label}</span>;
}

function Tracker({ status }: { status: string }) {
  const isTerminal = !!TERMINAL[status];
  const resolved = LEGACY[status] ?? status;
  const currentIdx = STAGES.findIndex((s) => s.key === resolved);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', overflowX: 'auto', padding: '16px 0', gap: 0 }}>
      {STAGES.map((s, i) => {
        const done = !isTerminal && currentIdx > i;
        const current = !isTerminal && currentIdx === i;
        const circleBg = done ? T.success : current ? T.brand : T.card;
        const circleBorder = done || current ? 'transparent' : T.border;
        const labelColor = current ? T.text : T.subtlest;
        return (
          <React.Fragment key={s.key}>
            {i > 0 && <div style={{ height: 2, flex: 1, minWidth: 16, background: done || current ? T.brand : T.border, marginTop: 12 }} />}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 72 }}>
              <span style={{ width: 24, height: 24, borderRadius: '50%', background: circleBg, border: `2px solid ${circleBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {done ? <Check size={14} style={{ color: T.inverse }} /> : (
                  <span style={{ fontFamily: RH.fontBody, fontSize: 11, fontWeight: 600, color: current ? T.inverse : T.subtlest }}>{i + 1}</span>
                )}
              </span>
              <span style={{ fontFamily: RH.fontBody, fontSize: 11, fontWeight: current ? 600 : 400, color: labelColor, textAlign: 'center' }}>{s.label}</span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontFamily: RH.fontBody, fontSize: 11, fontWeight: 600, color: T.subtlest, margin: 0 }}>{label}</p>
      <p style={{ fontFamily: RH.fontBody, fontSize: 13, color: T.text, margin: '4px 0 0' }}>{value ?? '—'}</p>
    </div>
  );
}

function titleCase(v: string | null | undefined) {
  if (!v) return '—';
  return v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, ' ');
}

/** Caty advisory: a rule-based release risk read (advisory only). */
function CatyRiskAdvisory({ r, changeCount }: { r: any; changeCount: number }) {
  const reasons: string[] = [];
  if (r.health === 'at_risk') reasons.push('health is at risk');
  if (r.readiness_pct != null && r.readiness_pct < 50) reasons.push(`readiness is ${r.readiness_pct}%`);
  if (r.target_env === 'production' && changeCount === 0) reasons.push('no changes linked for a production release');
  const elevated = reasons.length > 0;
  const moderate = !elevated && r.readiness_pct != null && r.readiness_pct < 75;
  const level = elevated ? 'Elevated risk' : moderate ? 'Moderate risk' : 'Low risk';
  const text = elevated ? `${level} — ${reasons.join('; ')}.` : moderate ? `${level} — readiness is ${r.readiness_pct}%.` : `${level} — no blocking signals detected.`;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: RH.fontBody, fontSize: 12, color: 'var(--ds-text-discovery, #5E4DB2)', background: 'var(--ds-background-discovery, #F3F0FF)', border: '1px solid var(--ds-border-discovery, #B8ACF6)', borderRadius: 6, padding: '8px 12px', marginBottom: 16 }}>
      <Sparkles size={14} style={{ color: 'var(--ds-text-discovery, #5E4DB2)' }} />
      Caty: {text}
    </div>
  );
}

export default function ReleaseDetailPage() {
  const { releaseId } = useParams();
  const navigate = useNavigate();
  const { data: release, isLoading, error } = useRelease(releaseId ?? '');

  const { data: changeCount = 0 } = useQuery({
    queryKey: ['release-hub', 'releases', releaseId, 'change-count'],
    enabled: !!releaseId,
    queryFn: async () => {
      const { count } = await supabase.from('rh_changes').select('*', { count: 'exact', head: true }).eq('release_id', releaseId);
      return count ?? 0;
    },
  });

  const r = release as any;
  const statusLabel = useMemo(() => (r?.status && TERMINAL[r.status] ? TERMINAL[r.status] : null), [r?.status]);

  if (isLoading) {
    return <div style={{ padding: 48, display: 'flex', justifyContent: 'center', background: T.surface, minHeight: '100%' }}><Spinner size="large" /></div>;
  }
  if (error || !r) {
    return (
      <div style={{ padding: 48, textAlign: 'center', background: T.surface, minHeight: '100%' }}>
        <p style={{ fontFamily: RH.fontBody, fontSize: 14, color: T.subtle }}>Release not found.</p>
        <button onClick={() => navigate('/release-hub/releases')} style={{ marginTop: 8, fontFamily: RH.fontBody, fontSize: 13, color: T.link, background: 'transparent', border: 'none', cursor: 'pointer' }}>← Back to releases</button>
      </div>
    );
  }

  const targetDate = r.planned_release_date ?? r.target_date;

  return (
    <div style={{ padding: 24, background: T.surface, minHeight: '100%' }}>
      <button onClick={() => navigate('/release-hub/releases')} style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: RH.fontBody, fontSize: 13, color: T.subtle, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 16 }}>
        <ArrowLeft size={14} style={{ color: T.subtle }} /> Releases
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 8 }}>
        <div>
          <h1 style={{ fontFamily: RH.fontDisplay, fontSize: 24, fontWeight: 600, color: T.text, margin: 0 }}>
            {r.name}{r.version ? <span style={{ color: T.subtlest, fontWeight: 400 }}> · {r.version}</span> : null}
          </h1>
          {r.jira_key && <span style={{ fontFamily: 'var(--ds-font-family-code, monospace)', fontSize: 12, color: T.subtlest }}>{r.jira_key}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {statusLabel ? (
            <span style={{ fontFamily: RH.fontBody, fontSize: 11, fontWeight: 700, color: 'var(--ds-text-danger, #AE2A19)', background: 'var(--ds-background-danger, #FFECEB)', padding: '0 8px', borderRadius: 3 }}>{statusLabel}</span>
          ) : (
            <StatusLozenge status={r.status} />
          )}
          <HealthPill health={r.health} />
        </div>
      </div>

      {/* Meta row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, padding: '12px 0', borderBottom: `1px solid ${T.border}` }}>
        <MetaItem label="Type" value={titleCase(r.release_type)} />
        <MetaItem label="Environment" value={titleCase(r.target_env)} />
        <MetaItem label="Target" value={targetDate ? format(new Date(targetDate), 'MMM d, yyyy') : '—'} />
        <MetaItem label="Changes" value={changeCount} />
        <MetaItem label="Readiness" value={r.readiness_pct != null ? `${r.readiness_pct}%` : '—'} />
      </div>

      {/* Notify list */}
      <div style={{ padding: '12px 0', borderBottom: `1px solid ${T.border}` }}>
        <NotifyList itemType="release" itemId={r.id} />
      </div>

      {/* Lifecycle tracker */}
      <Tracker status={r.status} />

      {/* Tabs */}
      <Tabs id="release-detail-tabs">
        <TabList>
          <Tab>Overview</Tab>
          <Tab>Scope</Tab>
          <Tab>Readiness</Tab>
          <Tab>Changes</Tab>
          <Tab>Sign-offs</Tab>
          <Tab>Release Notes</Tab>
          <Tab>Production Events</Tab>
          <Tab>Audit</Tab>
        </TabList>
        <TabPanel>
          <div style={{ padding: '16px 0', width: '100%' }}>
            <CatyRiskAdvisory r={r} changeCount={changeCount} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
              <MetaItem label="Status" value={titleCase(r.status)} />
              <MetaItem label="Release manager" value={r.release_manager_id ? 'Assigned' : '—'} />
              <MetaItem label="Product owner" value={r.product_owner_id ? 'Assigned' : '—'} />
              <MetaItem label="Planned start" value={r.planned_start_date ? format(new Date(r.planned_start_date), 'MMM d, yyyy') : '—'} />
              <MetaItem label="Planned release" value={r.planned_release_date ? format(new Date(r.planned_release_date), 'MMM d, yyyy') : '—'} />
              <MetaItem label="Source" value={titleCase(r.source)} />
            </div>
            {r.description && (
              <div style={{ marginTop: 24 }}>
                <p style={{ fontFamily: RH.fontBody, fontSize: 11, fontWeight: 600, color: T.subtlest, margin: 0 }}>Description</p>
                <p style={{ fontFamily: RH.fontBody, fontSize: 14, color: T.text, margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{r.description}</p>
              </div>
            )}
          </div>
        </TabPanel>
        <TabPanel><div style={{ width: '100%' }}><ScopeTab releaseId={r.id} /></div></TabPanel>
        <TabPanel><div style={{ width: '100%' }}><ReadinessTab releaseId={r.id} /></div></TabPanel>
        <TabPanel><div style={{ width: '100%' }}><ChangesTab releaseId={r.id} /></div></TabPanel>
        <TabPanel><div style={{ width: '100%' }}><SignoffsTab releaseId={r.id} /></div></TabPanel>
        <TabPanel><div style={{ width: '100%' }}><ReleaseNotesTab releaseId={r.id} /></div></TabPanel>
        <TabPanel><div style={{ width: '100%' }}><ProductionEventsTab releaseId={r.id} /></div></TabPanel>
        <TabPanel><div style={{ width: '100%' }}><AuditTab releaseId={r.id} /></div></TabPanel>
      </Tabs>
    </div>
  );
}
