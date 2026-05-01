/**
 * Release Detail Page — TestHub Module (Group 15)
 * Route: /testhub/releases/:releaseId
 */
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Package, Calendar, Clock, CheckCircle2, XCircle,
  AlertTriangle, Shield, Users, Milestone as MilestoneIcon,
  RefreshCw, Bug, ChevronRight, Beaker, Archive, Monitor,
  Rocket, Settings2,
} from 'lucide-react';
import { useRelease, useReleaseCycles } from '@/hooks/testhub/useReleases';
import { useTheme } from '@/hooks/useTheme';
import { format } from 'date-fns';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  planning: { label: 'Planning', color: 'var(--ds-text-subtlest, #64748B)', bg: 'var(--ds-surface-sunken, #F1F5F9)', icon: Clock },
  planned: { label: 'Planned', color: 'var(--ds-text-subtlest, #64748B)', bg: 'var(--ds-surface-sunken, #F1F5F9)', icon: Clock },
  development: { label: 'Development', color: '#8B5CF6', bg: '#F5F3FF', icon: Settings2 },
  testing: { label: 'Testing', color: 'var(--ds-text-brand, #2563EB)', bg: 'var(--ds-background-selected, #EFF6FF)', icon: Beaker },
  uat: { label: 'UAT', color: '#EA580C', bg: '#FFF7ED', icon: Monitor },
  staging: { label: 'Staging', color: 'var(--ds-text-warning, #D97706)', bg: '#FFFBEB', icon: Rocket },
  ready: { label: 'Ready', color: '#059669', bg: '#ECFDF5', icon: CheckCircle2 },
  released: { label: 'Released', color: '#059669', bg: '#ECFDF5', icon: CheckCircle2 },
  shipped: { label: 'Shipped', color: '#059669', bg: '#ECFDF5', icon: CheckCircle2 },
  archived: { label: 'Archived', color: 'var(--ds-text-subtlest, #94A3B8)', bg: 'var(--ds-surface-sunken, #F8FAFC)', icon: Archive },
};

const HEALTH_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  healthy: { label: 'Healthy', color: '#059669', dot: 'var(--ds-text-success, #22C55E)' },
  at_risk: { label: 'At Risk', color: 'var(--ds-text-warning, #D97706)', dot: 'var(--ds-text-warning, #F59E0B)' },
  critical: { label: 'Critical', color: 'var(--ds-text-danger, #DC2626)', dot: 'var(--ds-text-danger, #EF4444)' },
  none: { label: '—', color: 'var(--ds-text-subtlest, #94A3B8)', dot: 'var(--ds-text-disabled, #CBD5E1)' },
};

export default function ReleaseDetailPage() {
  const { releaseId } = useParams();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { release, isLoading } = useRelease(releaseId);
  const { cycles, isLoading: cyclesLoading } = useReleaseCycles(releaseId);
  const [activeTab, setActiveTab] = useState<'overview' | 'cycles' | 'defects' | 'milestones'>('overview');

  if (isLoading) {
    return <div style={{ padding: 60, textAlign: 'center', color: 'var(--cp-text-muted, #94A3B8)' }}>Loading release...</div>;
  }

  if (!release) {
    return <div style={{ padding: 60, textAlign: 'center', color: 'var(--cp-text-muted, #94A3B8)' }}>Release not found</div>;
  }

  const sc = STATUS_CONFIG[release.status] || STATUS_CONFIG.planned;
  const hc = HEALTH_CONFIG[release.health] || HEALTH_CONFIG.none;
  const StatusIcon = sc.icon;

  const execRate = release.test_cases_total > 0
    ? Math.round(((release.test_cases_executed || release.test_cases_passed) / release.test_cases_total) * 100)
    : 0;

  const passRate = (release.test_cases_executed || release.test_cases_passed) > 0
    ? Math.round((release.test_cases_passed / Math.max(release.test_cases_executed || release.test_cases_passed, 1)) * 100)
    : 0;

  const daysLeft = release.target_date
    ? Math.max(0, Math.ceil((new Date(release.target_date).getTime() - Date.now()) / 86400000))
    : null;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Package },
    { id: 'cycles', label: 'Test Cycles', icon: RefreshCw },
    { id: 'defects', label: 'Defects', icon: Bug },
    { id: 'milestones', label: 'Milestones', icon: Calendar },
  ] as const;

  return (
    <div className="th-page-content" style={{ flex: 1, overflow: 'auto' }}>
      {/* Header */}
      <div style={{ padding: '20px 32px', borderBottom: `1px solid ${'var(--cp-border, #E2E8F0)'}`, background: isDark ? 'var(--cp-bg-page, #1F1F21)' : 'var(--ds-surface, #fff)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <button
            onClick={() => navigate('/testhub/releases')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cp-text-tertiary, #64748B)', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <ArrowLeft style={{ width: 18, height: 18 }} />
          </button>
          <span style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--cp-text-muted, #94A3B8)', fontWeight: 600 }}>{release.version}</span>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--cp-text-primary, #0F172A)', margin: 0, flex: 1 }}>{release.name}</h1>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 12px', borderRadius: 6, backgroundColor: sc.bg, color: sc.color, fontSize: 13, fontWeight: 600,
          }}>
            <StatusIcon style={{ width: 14, height: 14 }} />
            {sc.label}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: hc.dot }} />
            <span style={{ color: hc.color, fontWeight: 600, fontSize: 13 }}>{hc.label}</span>
          </span>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
          <StatCard label="Days Left" value={daysLeft !== null ? String(daysLeft) : '—'} color="var(--ds-text-brand, #2563EB)" isDark={isDark} />
          <StatCard label="Total Tests" value={String(release.test_cases_total || 0)} color={'var(--cp-text-secondary, #334155)'} isDark={isDark} />
          <StatCard label="Execution" value={`${execRate}%`} color={execRate >= 80 ? '#059669' : 'var(--ds-text-warning, #D97706)'} isDark={isDark} />
          <StatCard label="Pass Rate" value={`${passRate}%`} color={passRate >= 80 ? '#059669' : 'var(--ds-text-danger, #DC2626)'} isDark={isDark} />
          <StatCard label="Open Defects" value={String(release.defects_open || 0)} color={release.defects_open > 0 ? 'var(--ds-text-danger, #DC2626)' : '#059669'} isDark={isDark} />
          <StatCard label="Critical" value={String(release.critical_defects || 0)} color={release.critical_defects > 0 ? 'var(--ds-text-danger, #DC2626)' : '#059669'} isDark={isDark} />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${'var(--cp-border, #E2E8F0)'}`, padding: '0 32px', background: isDark ? 'var(--cp-bg-page, #1F1F21)' : 'var(--ds-surface, #fff)' }}>
        {tabs.map(tab => {
          const active = activeTab === tab.id;
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, padding: '12px 20px',
                fontSize: 14, fontWeight: active ? 600 : 500, border: 'none',
                borderBottom: active ? '2px solid #2563EB' : '2px solid transparent',
                color: active ? 'var(--ds-text-brand, #2563EB)' : ('var(--cp-text-tertiary, #64748B)'), background: 'none', cursor: 'pointer',
              }}
            >
              <TabIcon style={{ width: 15, height: 15 }} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div style={{ padding: '24px 32px' }}>
        {activeTab === 'overview' && <OverviewTab release={release} isDark={isDark} />}
        {activeTab === 'cycles' && <CyclesTab cycles={cycles} isLoading={cyclesLoading} navigate={navigate} isDark={isDark} />}
        {activeTab === 'defects' && <DefectsTab release={release} isDark={isDark} />}
        {activeTab === 'milestones' && <MilestonesTab releaseId={release.id} isDark={isDark} />}
      </div>
    </div>
  );
}

function StatCard({ label, value, color, isDark }: { label: string; value: string; color: string; isDark: boolean }) {
  return (
    <div style={{ padding: '14px 16px', background: 'var(--cp-bg-page, #F8FAFC)', borderRadius: 12, border: `1px solid ${'var(--cp-border, #E2E8F0)'}` }}>
      <div style={{ fontSize: 22, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--cp-text-tertiary, #64748B)', marginTop: 2 }}>{label}</div>
    </div>
  );
}

function OverviewTab({ release, isDark }: { release: any; isDark: boolean }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
      <div>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--cp-text-primary, #0F172A)', marginBottom: 12 }}>Description</h3>
        <p style={{ fontSize: 14, color: 'var(--cp-text-secondary, #334155)', lineHeight: 1.7 }}>
          {release.description || 'No description provided.'}
        </p>

        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--cp-text-primary, #0F172A)', margin: '24px 0 12px' }}>Test Progress</h3>
        <div style={{ height: 10, backgroundColor: 'var(--cp-bg-sunken, #F1F5F9)', borderRadius: 6, overflow: 'hidden', marginBottom: 8 }}>
          {release.test_cases_total > 0 && (
            <div style={{
              display: 'flex', height: '100%',
            }}>
              <div style={{ width: `${(release.test_cases_passed / release.test_cases_total) * 100}%`, backgroundColor: 'var(--ds-text-success, #22C55E)' }} />
              <div style={{ width: `${((release.test_cases_failed || 0) / release.test_cases_total) * 100}%`, backgroundColor: 'var(--ds-text-danger, #EF4444)' }} />
              <div style={{ width: `${((release.test_cases_blocked || 0) / release.test_cases_total) * 100}%`, backgroundColor: 'var(--ds-text-warning, #F59E0B)' }} />
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--cp-text-tertiary, #64748B)' }}>
          <span>✓ {release.test_cases_passed} Passed</span>
          <span>✗ {release.test_cases_failed || 0} Failed</span>
          <span>⊘ {release.test_cases_blocked || 0} Blocked</span>
          <span>○ {Math.max(0, (release.test_cases_total || 0) - (release.test_cases_passed || 0) - (release.test_cases_failed || 0) - (release.test_cases_blocked || 0))} Remaining</span>
        </div>
      </div>

      {/* Details panel */}
      <div style={{ background: 'var(--cp-bg-page, #F8FAFC)', borderRadius: 12, padding: 20, border: `1px solid ${'var(--cp-border, #E2E8F0)'}` }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--cp-text-primary, #0F172A)', marginBottom: 16 }}>Details</h3>
        <dl style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <DetailRow label="Target Date" value={release.target_date ? format(new Date(release.target_date), 'MMMM dd, yyyy') : '—'} />
          <DetailRow label="Start Date" value={release.start_date ? format(new Date(release.start_date), 'MMMM dd, yyyy') : '—'} />
          <DetailRow label="Release Manager" value={release.release_manager?.full_name || '—'} />
          <DetailRow label="QA Lead" value={release.qa_lead?.full_name || '—'} />
          <DetailRow label="Owner" value={release.owner?.full_name || '—'} />
          <DetailRow label="Vehicle" value={release.vehicle?.name || '—'} />
          <DetailRow label="Coverage" value={`${release.coverage_percent || 0}%`} />
        </dl>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const { isDark } = useTheme();
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <dt style={{ fontSize: 13, color: 'var(--cp-text-tertiary, #64748B)' }}>{label}</dt>
      <dd style={{ fontSize: 13, fontWeight: 600, color: 'var(--cp-text-primary, #0F172A)', margin: 0 }}>{value}</dd>
    </div>
  );
}

function CyclesTab({ cycles, isLoading, navigate, isDark }: { cycles: any[]; isLoading: boolean; navigate: any; isDark: boolean }) {
  if (isLoading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--cp-text-muted, #94A3B8)' }}>Loading cycles...</div>;

  if (cycles.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 48, color: 'var(--cp-text-muted, #94A3B8)' }}>
        <RefreshCw style={{ width: 40, height: 40, margin: '0 auto 12px', opacity: 0.3 }} />
        <p style={{ fontSize: 14, fontWeight: 500 }}>No test cycles linked to this release</p>
        <p style={{ fontSize: 13 }}>Link test cycles from the Test Cycles module</p>
      </div>
    );
  }

  return (
    <div style={{ border: `1px solid ${'var(--cp-border, #E2E8F0)'}`, borderRadius: 12, overflow: 'hidden', background: isDark ? 'var(--cp-bg-surface, #242528)' : 'var(--ds-surface, #fff)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ backgroundColor: 'var(--cp-bg-page, #F8FAFC)', borderBottom: `1px solid ${'var(--cp-border, #E2E8F0)'}` }}>
            <th style={getThStyle(isDark)}>Cycle</th>
            <th style={getThStyle(isDark)}>Status</th>
            <th style={getThStyle(isDark)}>Total</th>
            <th style={getThStyle(isDark)}>Passed</th>
            <th style={getThStyle(isDark)}>Failed</th>
            <th style={{ ...getThStyle(isDark), width: 30 }}></th>
          </tr>
        </thead>
        <tbody>
          {cycles.map(c => {
            const cycle = c.cycle;
            if (!cycle) return null;
            return (
              <tr
                key={c.id}
                onClick={() => navigate(`/testhub/cycles/${cycle.id}`)}
                style={{ borderBottom: `1px solid ${'var(--cp-bg-sunken, #F1F5F9)'}`, cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--cp-bg-page, #F8FAFC)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
              >
                <td style={tdStyle}><span style={{ fontWeight: 600, color: 'var(--cp-text-primary, #0F172A)' }}>{cycle.name}</span></td>
                <td style={tdStyle}><span style={{ fontSize: 12, textTransform: 'capitalize' }}>{cycle.status}</span></td>
                <td style={tdStyle}>{cycle.total_cases || 0}</td>
                <td style={tdStyle}><span style={{ color: '#059669', fontWeight: 600 }}>{cycle.passed_count || 0}</span></td>
                <td style={tdStyle}><span style={{ color: 'var(--ds-text-danger, #DC2626)', fontWeight: 600 }}>{cycle.failed_count || 0}</span></td>
                <td style={tdStyle}><ChevronRight style={{ width: 14, height: 14, color: 'var(--ds-text-disabled, #CBD5E1)' }} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DefectsTab({ release, isDark }: { release: any; isDark: boolean }) {
  return (
    <div style={{ textAlign: 'center', padding: 48, color: 'var(--cp-text-muted, #94A3B8)' }}>
      <Bug style={{ width: 40, height: 40, margin: '0 auto 12px', opacity: 0.3 }} />
      <p style={{ fontSize: 14, fontWeight: 500 }}>Defects linked to this release</p>
      <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginTop: 16 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--ds-text-danger, #DC2626)' }}>{release.defects_open || 0}</div>
          <div style={{ fontSize: 12, color: 'var(--cp-text-tertiary, #64748B)' }}>Open</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--ds-text-danger, #DC2626)' }}>{release.critical_defects || 0}</div>
          <div style={{ fontSize: 12, color: 'var(--cp-text-tertiary, #64748B)' }}>Critical</div>
        </div>
      </div>
    </div>
  );
}

function MilestonesTab({ releaseId, isDark }: { releaseId: string; isDark: boolean }) {
  return (
    <div style={{ textAlign: 'center', padding: 48, color: 'var(--cp-text-muted, #94A3B8)' }}>
      <Calendar style={{ width: 40, height: 40, margin: '0 auto 12px', opacity: 0.3 }} />
      <p style={{ fontSize: 14, fontWeight: 500 }}>Release milestones</p>
      <p style={{ fontSize: 13 }}>Milestone management will be available in the next update</p>
    </div>
  );
}

const getThStyle = (isDark: boolean): React.CSSProperties => ({
  padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 650,
  color: 'var(--cp-text-tertiary, #64748B)', textTransform: 'uppercase', letterSpacing: '0.04em',
});

const tdStyle: React.CSSProperties = {
  padding: '12px 14px', verticalAlign: 'middle',
};
