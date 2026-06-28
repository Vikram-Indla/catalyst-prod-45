/**
 * Release Operations — Change detail (route /release-hub/changes/:changeId)
 *
 * Phase 8a (2026-06-18): real detail shell — header (chg_number + title +
 * status/risk), meta, 9-step change lifecycle tracker, Notify list, and tabs
 * (Overview / SOP / Work items / Sign-offs / Activity). Overview / Work items /
 * Sign-offs / Activity read the nested useChange(id) payload. The SOP
 * execution table (rh_sop_steps, expandable + evidence) lands in Phase 8b.
 */
import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, formatDistanceToNowStrict } from 'date-fns';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import Spinner from '@atlaskit/spinner';
import { Check } from '@/lib/atlaskit-icons';
import { useChange } from '@/hooks/useReleaseHub';
import { StatusLozenge } from '@/components/ui/StatusLozenge';
import { NotifyList } from '@/components/releasehub/detail/ReleaseDetailTabs';
import { SopExecutionTab } from '@/components/releasehub/detail/SopExecutionTab';
import { RH } from '@/constants/releasehub.design';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';

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
  mono: 'var(--ds-font-family-code, monospace)',
};

const STAGES = [
  { key: 'draft', label: 'Draft' },
  { key: 'assessing', label: 'Assessing' },
  { key: 'ready_for_approval', label: 'Ready for approval' },
  { key: 'approved', label: 'Approved' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'implementing', label: 'Implementing' },
  { key: 'validating', label: 'Validating' },
  { key: 'implemented', label: 'Implemented' },
  { key: 'closed', label: 'Closed' },
];
const LEGACY: Record<string, string> = { new: 'draft', in_uat: 'implementing', in_beta: 'validating', in_production: 'implemented', done: 'closed' };
const TERMINAL: Record<string, string> = { failed: 'Failed', rolled_back: 'Rolled back', cancelled: 'Cancelled' };

function RiskPill({ risk }: { risk: string | null }) {
  if (!risk) return null;
  const map: Record<string, { fg: string; bg: string }> = {
    low: { fg: 'var(--ds-text-success, #216E4E)', bg: 'var(--ds-background-success, #DCFFF1)' },
    medium: { fg: 'var(--ds-text-warning, #A54800)', bg: 'var(--ds-background-warning, #FFF7D6)' },
    high: { fg: 'var(--ds-text-danger, #AE2A19)', bg: 'var(--ds-background-danger, #FFECEB)' },
    critical: { fg: 'var(--ds-text-danger, #AE2A19)', bg: 'var(--ds-background-danger, #FFECEB)' },
  };
  const m = map[risk.toLowerCase()] ?? { fg: T.subtle, bg: T.sunken };
  return <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: m.fg, background: m.bg, padding: '0 8px', borderRadius: 3, textTransform: 'capitalize' }}>{risk}</span>;
}

function Tracker({ status }: { status: string }) {
  const isTerminal = !!TERMINAL[status];
  const resolved = LEGACY[status] ?? status;
  const currentIdx = STAGES.findIndex((s) => s.key === resolved);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', overflowX: 'auto', padding: '16px 0' }}>
      {STAGES.map((s, i) => {
        const done = !isTerminal && currentIdx > i;
        const current = !isTerminal && currentIdx === i;
        const circleBg = done ? T.success : current ? T.brand : T.card;
        const circleBorder = done || current ? 'transparent' : T.border;
        return (
          <React.Fragment key={s.key}>
            {i > 0 && <div style={{ height: 2, flex: 1, minWidth: 16, background: done || current ? T.brand : T.border, marginTop: 12 }} />}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 72 }}>
              <span style={{ width: 24, height: 24, borderRadius: '50%', background: circleBg, border: `2px solid ${circleBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {done ? <Check size={14} style={{ color: T.inverse }} /> : <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: current ? T.inverse : T.subtlest }}>{i + 1}</span>}
              </span>
              <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', fontWeight: current ? 600 : 400, color: current ? T.text : T.subtlest, textAlign: 'center' }}>{s.label}</span>
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
      <p style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.subtlest, margin: 0 }}>{label}</p>
      <p style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.text, margin: '4px 0 0' }}>{value ?? '—'}</p>
    </div>
  );
}
function titleCase(v: string | null | undefined) {
  if (!v) return '—';
  return v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, ' ');
}
const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: `1px solid ${T.border}` };
function Empty({ text }: { text: string }) {
  return <div style={{ padding: 32, textAlign: 'center', fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.subtlest }}>{text}</div>;
}

export default function ChangeDetailPage() {
  const { changeId } = useParams();
  const navigate = useNavigate();
  const { data: change, isLoading, error } = useChange(changeId ?? '');

  const c = change as any;
  const statusLabel = useMemo(() => (c?.status && TERMINAL[c.status] ? TERMINAL[c.status] : null), [c?.status]);

  if (isLoading) {
    return <div style={{ padding: 48, display: 'flex', justifyContent: 'center', background: T.surface, minHeight: '100%' }}><Spinner size="large" /></div>;
  }
  if (error || !c) {
    return (
      <div style={{ padding: 48, textAlign: 'center', background: T.surface, minHeight: '100%' }}>
        <p style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-400)', color: T.subtle }}>Change not found.</p>
        <button onClick={() => navigate('/release-hub/changes')} style={{ marginTop: 8, fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.link, background: 'transparent', border: 'none', cursor: 'pointer' }}>← Back to changes</button>
      </div>
    );
  }

  const workItems = (c.rh_change_work_items ?? []) as any[];
  const signoffs = (c.rh_change_signoffs ?? []) as any[];
  const history = ((c.rh_change_status_history ?? []) as any[]).slice().sort((a, b) => new Date(b.changed_at ?? 0).getTime() - new Date(a.changed_at ?? 0).getTime());
  const windowDate = c.window_start ?? c.deployment_date;

  return (
    <div style={{ padding: 24, background: T.surface, minHeight: '100%' }}>
      <div style={{ margin: '-24px -24px 16px' }}>
        <ProjectPageHeader
          hubType="release"
          projectKey="RELEASES"
          hideTitle
          trail={[
            { text: 'Change Records', href: '/release-hub/changes' },
            { text: c.chg_number },
          ]}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 8 }}>
        <div>
          <span style={{ fontFamily: T.mono, fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: T.link }}>{c.chg_number}</span>
          <h1 style={{ fontFamily: RH.fontDisplay, fontSize: 'var(--ds-font-size-800)', fontWeight: 600, color: T.text, margin: '4px 0 0' }}>{c.title}</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {statusLabel ? (
            <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', fontWeight: 700, color: 'var(--ds-text-danger, #AE2A19)', background: 'var(--ds-background-danger, #FFECEB)', padding: '0 8px', borderRadius: 3 }}>{statusLabel}</span>
          ) : (
            <StatusLozenge status={c.status} />
          )}
          <RiskPill risk={c.risk_level} />
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, padding: '12px 0', borderBottom: `1px solid ${T.border}` }}>
        <MetaItem label="Type" value={titleCase(c.change_type)} />
        <MetaItem label="Environment" value={titleCase(c.target_env)} />
        <MetaItem label="Category" value={titleCase(c.deployment_category)} />
        <MetaItem label="Window" value={windowDate ? format(new Date(windowDate), 'MMM d, yyyy') : '—'} />
      </div>

      <div style={{ padding: '12px 0', borderBottom: `1px solid ${T.border}` }}>
        <NotifyList itemType="change" itemId={c.id} />
      </div>

      <Tracker status={c.status} />

      <Tabs id="change-detail-tabs">
        <TabList>
          <Tab>Overview</Tab>
          <Tab>SOP</Tab>
          <Tab>Work items</Tab>
          <Tab>Sign-offs</Tab>
          <Tab>Activity</Tab>
        </TabList>

        <TabPanel>
          <div style={{ padding: '16px 0', width: '100%' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
              <MetaItem label="Status" value={titleCase(c.status)} />
              <MetaItem label="Risk" value={titleCase(c.risk_level)} />
              <MetaItem label="Source" value={titleCase(c.source)} />
              <MetaItem label="Window start" value={c.window_start ? format(new Date(c.window_start), 'MMM d, yyyy') : '—'} />
              <MetaItem label="Window end" value={c.window_end ? format(new Date(c.window_end), 'MMM d, yyyy') : '—'} />
            </div>
            {c.description && (
              <div style={{ marginTop: 24 }}>
                <p style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.subtlest, margin: 0 }}>Description</p>
                <p style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-400)', color: T.text, margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{c.description}</p>
              </div>
            )}
          </div>
        </TabPanel>

        <TabPanel><div style={{ width: '100%' }}><SopExecutionTab changeId={c.id} /></div></TabPanel>

        <TabPanel>
          <div style={{ width: '100%', padding: '8px 0' }}>
            {workItems.length === 0 ? <Empty text="No work items linked to this change." /> : workItems.map((w) => (
              <div key={w.id} style={rowStyle}>
                <span style={{ fontFamily: T.mono, fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: T.link }}>{w.work_item_key}</span>
                <span style={{ flex: 1, minWidth: 0, fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-400)', color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.work_item_title}</span>
                {w.work_item_status && <StatusLozenge status={w.work_item_status} />}
              </div>
            ))}
          </div>
        </TabPanel>

        <TabPanel>
          <div style={{ width: '100%', padding: '8px 0' }}>
            {signoffs.length === 0 ? <Empty text="No sign-offs requested for this change." /> : signoffs.map((s) => (
              <div key={s.id} style={rowStyle}>
                <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.subtle, background: T.sunken, padding: '0 8px', borderRadius: 3, whiteSpace: 'nowrap' }}>{s.signoff_role ?? s.stage ?? '—'}</span>
                <span style={{ flex: 1, minWidth: 0, fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.subtlest }}>{s.comment ?? ''}</span>
                <StatusLozenge status={s.status} />
              </div>
            ))}
          </div>
        </TabPanel>

        <TabPanel>
          <div style={{ width: '100%', padding: '8px 0' }}>
            {history.length === 0 ? <Empty text="No activity recorded yet." /> : history.map((h) => (
              <div key={h.id} style={rowStyle}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-400)', color: T.text, margin: 0 }}>
                    {h.from_status ? `${titleCase(h.from_status)} → ${titleCase(h.to_status)}` : titleCase(h.to_status)}
                  </p>
                  {h.comment && <p style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.subtlest, margin: '4px 0 0' }}>{h.comment}</p>}
                </div>
                <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.subtlest, whiteSpace: 'nowrap' }}>{h.changed_at ? `${formatDistanceToNowStrict(new Date(h.changed_at))} ago` : '—'}</span>
              </div>
            ))}
          </div>
        </TabPanel>
      </Tabs>
    </div>
  );
}
