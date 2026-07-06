/**
 * ReleaseTimelineOps — Phase 6 §2/§3/§4. Release-Ops timeline/roadmap: releases
 * with product + scope counts (BR/sprint/work item/change), status, readiness,
 * and risk markers, expandable to their BRs / sprints / linked changes (each
 * routing to full detail). Lenses: group by Product/Environment/Status + risk
 * filter + search. ADS tokens, no drawers.
 */
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import Select from '@atlaskit/select';
import Spinner from '@atlaskit/spinner';
import { ChevronRight, ChevronDown, Search, Package } from '@/lib/atlaskit-icons';
import { useReleaseTimeline, useReleaseExpansion, type TimelineRelease } from '@/hooks/useReleaseTimeline';
import { StatusLozenge } from '@/components/shared/StatusLozenge';
import { EmptyState } from '@/components/releasehub/EmptyState';
import { RH } from '@/constants/releasehub.design';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';

const T = {
  surface: 'var(--ds-surface)', card: 'var(--ds-surface-raised)', sunken: 'var(--ds-surface-sunken)', border: 'var(--ds-border)',
  text: 'var(--ds-text)', subtle: 'var(--ds-text-subtle)', subtlest: 'var(--ds-text-subtlest)', link: 'var(--ds-link)',
  danger: 'var(--ds-text-danger)', warning: 'var(--ds-text-warning)', success: 'var(--ds-text-success)', mono: 'var(--ds-font-family-code, monospace)',
};
const titleCase = (v: string | null) => (!v ? '—' : v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, ' '));
const fmtD = (iso: string | null) => (iso ? format(new Date(iso), 'MMM d, yyyy') : '—');

function Marker({ label, tone, bg }: { label: string; tone: string; bg: string }) {
  return <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-50)', fontWeight: 700, color: tone, background: bg, padding: '0px 6px', borderRadius: 3, textTransform: 'uppercase', letterSpacing: '.03em', whiteSpace: 'nowrap' }}>{label}</span>;
}
function Count({ label, n, warn }: { label: string; n: number; warn?: boolean }) {
  return <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', color: warn ? T.warning : T.subtle }}><b style={{ color: warn ? T.warning : T.text }}>{n}</b> {label}</span>;
}

function Expansion({ r }: { r: TimelineRelease }) {
  const { data, isLoading } = useReleaseExpansion(r.id);
  const navigate = useNavigate();
  if (isLoading) return <div style={{ padding: 16, textAlign: 'center' }}><Spinner size="small" /></div>;
  if (!data) return null;
  const Section = ({ title, empty, children }: { title: string; empty: string; children: React.ReactNode; }) => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.subtlest, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>{title}</div>
      {React.Children.count(children) === 0 ? <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.subtlest }}>{empty}</div> : children}
    </div>
  );
  return (
    <div style={{ padding: '12px 16px 16px 44px', background: T.sunken }}>
      <Section title={`Business requests (${data.brs.length})`} empty="No linked business requests — release scope may be incomplete.">
        {data.brs.map((b) => <div key={b.id} style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.text, padding: '4px 0' }}>{b.title}</div>)}
      </Section>
      <Section title={`Sprints (${data.sprints.length})`} empty="No linked sprints.">
        {data.sprints.map((s) => <div key={s.id} style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.text, padding: '4px 0' }}>{s.name} <span style={{ color: T.subtlest, fontSize: 'var(--ds-font-size-100)' }}>{fmtD(s.startDate)} → {fmtD(s.endDate)}</span></div>)}
      </Section>
      <Section title={`Changes (${data.changes.length})`} empty="No linked changes — this release has a deployment gap.">
        {data.changes.map((c) => (
          <button key={c.id} onClick={() => navigate(`/release-hub/changes/${c.slug ?? c.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', background: T.card, border: `1px solid ${T.border}`, borderRadius: 6, padding: '4px 10px', marginBottom: 6, cursor: 'pointer' }}>
            <span style={{ fontFamily: T.mono, fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.link }}>{c.chgNumber}</span>
            <span style={{ flex: 1, minWidth: 0, fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.title}</span>
            {c.isEmergency && <Marker label="Emergency" tone={T.warning} bg="var(--ds-background-warning)" />}
            {c.risk && <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-50)', fontWeight: 700, color: c.risk === 'high' || c.risk === 'critical' ? T.danger : T.subtle, textTransform: 'uppercase' }}>{c.risk}</span>}
            {c.sopTotal > 0 && <span style={{ fontFamily: T.mono, fontSize: 'var(--ds-font-size-100)', color: T.subtle }}>SOP {c.sopDone}/{c.sopTotal}</span>}
            <StatusLozenge status={c.status} />
          </button>
        ))}
      </Section>
    </div>
  );
}

function Row({ r }: { r: TimelineRelease }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  return (
    <div style={{ borderBottom: `1px solid ${T.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 8px' }}>
        <button onClick={() => setOpen((v) => !v)} aria-label={open ? 'Collapse' : 'Expand'} style={{ display: 'flex', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, color: T.subtlest }}>
          {open ? <ChevronDown size={16} style={{ color: T.subtlest }} /> : <ChevronRight size={16} style={{ color: T.subtlest }} />}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => navigate(`/release-hub/${r.slug ?? r.id}`)} style={{ fontFamily: RH.fontDisplay, fontSize: 'var(--ds-font-size-400)', fontWeight: 600, color: T.link, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>{r.name}</button>
            {r.version && <span style={{ fontFamily: T.mono, fontSize: 'var(--ds-font-size-100)', color: T.subtle }}>{r.version}</span>}
            <StatusLozenge status={r.status} />
            {r.productName ? <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', color: T.subtle }}>{r.productName}</span> : <Marker label="No product" tone={T.warning} bg="var(--ds-background-warning)" />}
            {r.targetEnv && <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-50)', color: T.subtle }}>{r.targetEnv}</span>}
            {r.hasEmergency && <Marker label="Emergency" tone={T.warning} bg="var(--ds-background-warning)" />}
            {r.freezeConflict && <Marker label="Freeze" tone={T.danger} bg="var(--ds-background-danger)" />}
            {r.isEmptyScope && <Marker label="Empty scope" tone={T.warning} bg="var(--ds-background-warning)" />}
            {r.hasDeploymentGap && <Marker label="No change" tone={T.danger} bg="var(--ds-background-danger)" />}
          </div>
          <div style={{ display: 'flex', gap: 14, marginTop: 4, flexWrap: 'wrap' }}>
            <Count label="BRs" n={r.brCount} /><Count label="sprints" n={r.sprintCount} /><Count label="items" n={r.workItemCount} />
            <Count label="changes" n={r.changeCount} warn={r.hasDeploymentGap} />
            {r.incidentCount > 0 && <Count label="incidents" n={r.incidentCount} warn />}
            {r.prodEventCount > 0 && <Count label="prod events" n={r.prodEventCount} />}
          </div>
        </div>
        <div style={{ textAlign: 'right', flex: 'none' }}>
          <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.text }}>{fmtD(r.plannedReleaseDate)}</div>
          <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', color: r.readinessPct != null && r.readinessPct >= 80 ? T.success : T.subtle }}>{r.readinessPct != null ? `${r.readinessPct}% ready` : 'readiness —'}</div>
        </div>
      </div>
      {open && <Expansion r={r} />}
    </div>
  );
}

const GROUP_OPTS = [{ label: 'No grouping', value: 'none' }, { label: 'By product', value: 'product' }, { label: 'By environment', value: 'env' }, { label: 'By status', value: 'status' }];

export default function ReleaseTimelineOps() {
  const { data: releases = [], isLoading } = useReleaseTimeline();
  const [group, setGroup] = useState(GROUP_OPTS[0]);
  const [riskOnly, setRiskOnly] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => releases.filter((r) => {
    if (search && !`${r.name} ${r.productName ?? ''}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (riskOnly && !(r.hasEmergency || r.freezeConflict || r.hasDeploymentGap || r.targetEnv === 'production')) return false;
    return true;
  }), [releases, search, riskOnly]);

  const groups = useMemo(() => {
    if (group.value === 'none') return [{ label: '', rows: filtered }];
    const m = new Map<string, TimelineRelease[]>();
    filtered.forEach((r) => {
      const k = group.value === 'product' ? (r.productName ?? 'No product') : group.value === 'env' ? (r.targetEnv ?? 'No environment') : titleCase(r.status);
      (m.get(k) ?? m.set(k, []).get(k)!).push(r);
    });
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([label, rows]) => ({ label, rows }));
  }, [filtered, group]);

  return (
    <div style={{ padding: 24, background: T.surface, minHeight: '100%' }}>
      <div style={{ margin: '-24px -24px 0' }}><ProjectPageHeader projectKey="RELEASES" hubType="release" /></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', flexWrap: 'wrap' }}>
        <h1 style={{ fontFamily: RH.fontDisplay, fontSize: 'var(--ds-font-size-500)', fontWeight: 600, color: T.text, margin: 0 }}>Release timeline</h1>
        <div style={{ width: 180 }}><Select inputId="tl-group" options={GROUP_OPTS} value={group} onChange={(v: any) => setGroup(v)} spacing="compact" menuPosition="fixed" /></div>
        <button onClick={() => setRiskOnly((v) => !v)} style={{ height: 32, padding: '0 12px', borderRadius: 6, border: `1px solid ${riskOnly ? 'var(--ds-border-danger)' : T.border}`, background: riskOnly ? 'var(--ds-background-danger)' : 'transparent', color: riskOnly ? T.danger : T.text, cursor: 'pointer', fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', fontWeight: 600 }}>Risk only</button>
        <div style={{ position: 'relative', marginLeft: 'auto' }}>
          <Search size={14} style={{ position: 'absolute', left: 8, top: '48%', transform: 'translateY(-50%)', color: T.subtlest }} />
          <input type="text" placeholder="Search releases…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ height: 32, width: 220, padding: '0 8px 0 32px', borderRadius: 6, border: `1px solid ${T.border}`, background: T.card, color: T.text, fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', outline: 'none' }} />
        </div>
      </div>

      {isLoading ? (
        <div style={{ padding: 48, textAlign: 'center' }}><Spinner size="large" /></div>
      ) : releases.length === 0 ? (
        <EmptyState icon={Package} title="No releases on the timeline" subtitle="Releases with their planned dates, product, scope (BRs / sprints / work items) and linked changes appear here. Create a release to start planning." />
      ) : (
        <div>
          {groups.map((g) => (
            <div key={g.label || 'all'} style={{ marginBottom: g.label ? 16 : 0 }}>
              {g.label && <div style={{ fontFamily: RH.fontDisplay, fontSize: 'var(--ds-font-size-200)', fontWeight: 700, color: T.text, padding: '8px 8px 6px', textTransform: 'uppercase', letterSpacing: '.04em' }}>{g.label} · {g.rows.length}</div>}
              {g.rows.map((r) => <Row key={r.id} r={r} />)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
