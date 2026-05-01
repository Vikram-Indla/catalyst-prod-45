/**
 * All Releases Page — TestHub Module (Group 15)
 * Route: /testhub/releases
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, Plus, Search, X, LayoutGrid, List, 
  Calendar, Shield, ChevronRight, Clock, CheckCircle2,
  AlertTriangle, XCircle, Archive, Rocket, Beaker, Settings2, Monitor,
} from 'lucide-react';
import { useReleases, type Release, type ReleaseFilters } from '@/hooks/testhub/useReleases';
import { CreateReleaseModal } from '@/components/testhub/releases/CreateReleaseModal';
import { format } from 'date-fns';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  planning: { label: 'Planning', color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #64748B))', bg: 'var(--ds-surface-sunken, var(--ds-surface-sunken, #F1F5F9))', icon: Clock },
  planned: { label: 'Planned', color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #64748B))', bg: 'var(--ds-surface-sunken, var(--ds-surface-sunken, #F1F5F9))', icon: Clock },
  development: { label: 'Development', color: '#8B5CF6', bg: '#F5F3FF', icon: Settings2 },
  testing: { label: 'Testing', color: 'var(--ds-text-brand, var(--ds-text-brand, #2563EB))', bg: 'var(--ds-background-selected, var(--ds-background-selected, #EFF6FF))', icon: Beaker },
  uat: { label: 'UAT', color: '#EA580C', bg: '#FFF7ED', icon: Monitor },
  staging: { label: 'Staging', color: 'var(--ds-text-warning, var(--ds-text-warning, #D97706))', bg: '#FFFBEB', icon: Rocket },
  ready: { label: 'Ready', color: '#059669', bg: '#ECFDF5', icon: CheckCircle2 },
  released: { label: 'Released', color: '#059669', bg: '#ECFDF5', icon: CheckCircle2 },
  shipped: { label: 'Shipped', color: '#059669', bg: '#ECFDF5', icon: CheckCircle2 },
  archived: { label: 'Archived', color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #94A3B8))', bg: 'var(--bg-1, #F8FAFC)', icon: Archive },
};

const HEALTH_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  healthy: { label: 'Healthy', color: '#059669', dot: 'var(--ds-text-success, var(--ds-text-success, #22C55E))' },
  at_risk: { label: 'At Risk', color: 'var(--ds-text-warning, var(--ds-text-warning, #D97706))', dot: 'var(--ds-text-warning, var(--ds-text-warning, #F59E0B))' },
  critical: { label: 'Critical', color: 'var(--ds-text-danger, var(--ds-text-danger, #DC2626))', dot: 'var(--ds-text-danger, var(--ds-text-danger, #EF4444))' },
  none: { label: '—', color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #94A3B8))', dot: 'var(--ds-text-disabled, var(--ds-text-disabled, #CBD5E1))' },
};

export default function ReleasesListPage() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filters, setFilters] = useState<ReleaseFilters>({ status: 'all', health: 'all', search: '' });
  
  const { releases, isLoading, refetch } = useReleases(filters);

  const getExecPercent = (r: Release) => {
    if (!r.test_cases_total) return 0;
    return Math.round(((r.test_cases_executed || r.test_cases_passed || 0) / r.test_cases_total) * 100);
  };

  const getPassRate = (r: Release) => {
    const executed = r.test_cases_executed || r.test_cases_passed || 0;
    if (!executed) return 0;
    return Math.round((r.test_cases_passed / Math.max(executed, 1)) * 100);
  };

  return (
    <div className="th-page-content" style={{ flex: 1, padding: '24px 32px', overflow: 'auto' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg-1, #0F172A)', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Package style={{ width: 24, height: 24, color: 'var(--ds-text-brand, var(--ds-text-brand, #2563EB))' }} />
            Releases
          </h1>
          <p style={{ fontSize: 14, color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #64748B))', margin: '4px 0 0' }}>
            Manage software releases and track quality metrics
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 18px', backgroundColor: 'var(--ds-text-brand, var(--ds-text-brand, #2563EB))', color: 'var(--ds-surface, var(--ds-surface, var(--ds-surface, #fff)))',
            border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600,
          }}
        >
          <Plus style={{ width: 16, height: 16 }} /> Create Release
        </button>
      </div>

      {/* Filters Row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '0 1 280px' }}>
          <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #94A3B8))' }} />
          <input
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            placeholder="Search releases..."
            style={{
              width: '100%', height: 38, paddingLeft: 34, paddingRight: filters.search ? 32 : 12,
              border: '1px solid var(--bd-default, #E2E8F0)', borderRadius: 8, fontSize: 13, outline: 'none',
            }}
          />
          {filters.search && (
            <button onClick={() => setFilters(f => ({ ...f, search: '' }))} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #94A3B8))' }}>
              <X style={{ width: 14, height: 14 }} />
            </button>
          )}
        </div>

        {/* Status filter */}
        <select
          value={filters.status}
          onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
          style={{ height: 38, padding: '8px 12px', border: '1px solid var(--bd-default, #E2E8F0)', borderRadius: 8, fontSize: 13, color: 'var(--ds-text-subtle, var(--ds-text-subtle, #334155))', background: 'var(--bg-app, #fff)', cursor: 'pointer' }}
        >
          <option value="all">All Statuses</option>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>

        {/* Health filter */}
        <select
          value={filters.health}
          onChange={e => setFilters(f => ({ ...f, health: e.target.value }))}
          style={{ height: 38, padding: '8px 12px', border: '1px solid var(--bd-default, #E2E8F0)', borderRadius: 8, fontSize: 13, color: 'var(--ds-text-subtle, var(--ds-text-subtle, #334155))', background: 'var(--bg-app, #fff)', cursor: 'pointer' }}
        >
          <option value="all">All Health</option>
          <option value="healthy">Healthy</option>
          <option value="at_risk">At Risk</option>
          <option value="critical">Critical</option>
        </select>

        <div style={{ flex: 1 }} />

        {/* View toggle */}
        <div style={{ display: 'flex', border: '1px solid var(--bd-default, #E2E8F0)', borderRadius: 8, overflow: 'hidden' }}>
          <button
            onClick={() => setViewMode('table')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 36, height: 50, border: 'none', cursor: 'pointer',
              backgroundColor: viewMode === 'table' ? 'var(--ds-background-selected, var(--ds-background-selected, #EFF6FF))' : 'var(--ds-surface, var(--ds-surface, var(--ds-surface, #fff)))',
              color: viewMode === 'table' ? 'var(--ds-text-brand, var(--ds-text-brand, #2563EB))' : 'var(--ds-text-subtlest, var(--ds-text-subtlest, #64748B))',
            }}
          >
            <List style={{ width: 16, height: 16 }} />
          </button>
          <button
            onClick={() => setViewMode('card')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 36, height: 50, border: 'none', cursor: 'pointer',
              backgroundColor: viewMode === 'card' ? 'var(--ds-background-selected, var(--ds-background-selected, #EFF6FF))' : 'var(--ds-surface, var(--ds-surface, var(--ds-surface, #fff)))',
              color: viewMode === 'card' ? 'var(--ds-text-brand, var(--ds-text-brand, #2563EB))' : 'var(--ds-text-subtlest, var(--ds-text-subtlest, #64748B))',
              borderLeft: '1px solid var(--bd-default, #E2E8F0)',
            }}
          >
            <LayoutGrid style={{ width: 16, height: 16 }} />
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60, color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #94A3B8))' }}>
          Loading releases...
        </div>
      ) : releases.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #94A3B8))' }}>
          <Package style={{ width: 48, height: 48, margin: '0 auto 12px', opacity: 0.3 }} />
          <p style={{ fontSize: 15, fontWeight: 500 }}>No releases found</p>
          <p style={{ fontSize: 13 }}>Create your first release to get started</p>
        </div>
      ) : viewMode === 'table' ? (
        <TableView releases={releases} navigate={navigate} />
      ) : (
        <CardView releases={releases} navigate={navigate} getExecPercent={getExecPercent} getPassRate={getPassRate} />
      )}

      <div style={{ marginTop: 16, fontSize: 13, color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #94A3B8))' }}>
        Showing {releases.length} release{releases.length !== 1 ? 's' : ''}
      </div>

      {showCreateModal && (
        <CreateReleaseModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => { setShowCreateModal(false); refetch(); }}
        />
      )}
    </div>
  );
}

// ===== Table View =====
function TableView({ releases, navigate }: { releases: Release[]; navigate: any }) {
  return (
    <div style={{ border: '1px solid var(--bd-default, #E2E8F0)', borderRadius: 12, overflow: 'hidden', background: 'var(--bg-app, #fff)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ backgroundColor: 'var(--bg-1, #F8FAFC)', borderBottom: '1px solid var(--bd-default, #E2E8F0)' }}>
            <th style={thStyle}>Version</th>
            <th style={thStyle}>Name</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Health</th>
            <th style={thStyle}>Tests</th>
            <th style={thStyle}>Defects</th>
            <th style={thStyle}>Release Date</th>
            <th style={{ ...thStyle, width: 40 }}></th>
          </tr>
        </thead>
        <tbody>
          {releases.map(r => {
            const sc = STATUS_CONFIG[r.status] || STATUS_CONFIG.planned;
            const hc = HEALTH_CONFIG[r.health] || HEALTH_CONFIG.none;
            const StatusIcon = sc.icon;
            return (
              <tr
                key={r.id}
                onClick={() => navigate(`/testhub/releases/${r.id}`)}
                style={{ borderBottom: '1px solid #F1F5F9', cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-1, #F8FAFC)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
              >
                <td style={tdStyle}>
                  <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #64748B))', fontWeight: 600 }}>{r.version}</span>
                </td>
                <td style={tdStyle}>
                  <div style={{ fontWeight: 600, color: 'var(--fg-1, #0F172A)' }}>{r.name}</div>
                  {r.vehicle && (
                    <span style={{ fontSize: 11, color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #64748B))' }}>{r.vehicle.name}</span>
                  )}
                </td>
                <td style={tdStyle}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '3px 10px', borderRadius: 6,
                    backgroundColor: sc.bg, color: sc.color, fontSize: 12, fontWeight: 600,
                  }}>
                    <StatusIcon style={{ width: 12, height: 12 }} />
                    {sc.label}
                  </span>
                </td>
                <td style={tdStyle}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: hc.dot }} />
                    <span style={{ color: hc.color, fontWeight: 500, fontSize: 12 }}>{hc.label}</span>
                  </span>
                </td>
                <td style={tdStyle}>
                  <span style={{ fontSize: 12, color: 'var(--ds-text-subtle, var(--ds-text-subtle, #334155))' }}>
                    {r.test_cases_passed}/{r.test_cases_total || 0}
                  </span>
                </td>
                <td style={tdStyle}>
                  <span style={{ fontSize: 12, color: r.critical_defects > 0 ? 'var(--ds-text-danger, var(--ds-text-danger, #DC2626))' : 'var(--ds-text-subtle, var(--ds-text-subtle, #334155))', fontWeight: r.critical_defects > 0 ? 600 : 400 }}>
                    {r.defects_open} open{r.critical_defects > 0 ? ` (${r.critical_defects} critical)` : ''}
                  </span>
                </td>
                <td style={tdStyle}>
                  <span style={{ fontSize: 12, color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #64748B))' }}>
                    {r.target_date ? format(new Date(r.target_date), 'MMM dd, yyyy') : '—'}
                  </span>
                </td>
                <td style={tdStyle}>
                  <ChevronRight style={{ width: 16, height: 16, color: 'var(--ds-text-disabled, var(--ds-text-disabled, #CBD5E1))' }} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ===== Card View =====
function CardView({ releases, navigate, getExecPercent, getPassRate }: { releases: Release[]; navigate: any; getExecPercent: (r: Release) => number; getPassRate: (r: Release) => number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
      {releases.map(r => {
        const sc = STATUS_CONFIG[r.status] || STATUS_CONFIG.planned;
        const hc = HEALTH_CONFIG[r.health] || HEALTH_CONFIG.none;
        const StatusIcon = sc.icon;
        const execPct = getExecPercent(r);
        return (
          <div
            key={r.id}
            onClick={() => navigate(`/testhub/releases/${r.id}`)}
            style={{
              background: 'var(--bg-app, #fff)', border: '1px solid var(--bd-default, #E2E8F0)', borderRadius: 12,
              padding: 20, cursor: 'pointer', transition: 'all 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--ds-text-brand, var(--ds-text-brand, #2563EB))'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(37,99,235,0.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bd-default, #E2E8F0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #94A3B8))', fontWeight: 600 }}>{r.version}</span>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg-1, #0F172A)', margin: '2px 0 0' }}>{r.name}</h3>
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, width: 8, height: 8, borderRadius: '50%', backgroundColor: hc.dot }} />
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 6, backgroundColor: sc.bg, color: sc.color, fontSize: 11, fontWeight: 600 }}>
                <StatusIcon style={{ width: 11, height: 11 }} />
                {sc.label}
              </span>
              {r.vehicle && (
                <span style={{ padding: '2px 8px', borderRadius: 6, backgroundColor: 'var(--ds-surface-sunken, var(--ds-surface-sunken, #F1F5F9))', color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #64748B))', fontSize: 11, fontWeight: 500 }}>
                  {r.vehicle.name}
                </span>
              )}
            </div>

            {/* Progress bar */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #64748B))' }}>Test Progress</span>
                <span style={{ fontWeight: 600, color: 'var(--fg-1, #0F172A)' }}>{execPct}%</span>
              </div>
              <div style={{ height: 6, backgroundColor: 'var(--ds-surface-sunken, var(--ds-surface-sunken, #F1F5F9))', borderRadius: 3 }}>
                <div style={{ height: '100%', width: `${execPct}%`, backgroundColor: execPct >= 80 ? 'var(--ds-text-success, var(--ds-text-success, #22C55E))' : execPct >= 50 ? 'var(--ds-text-warning, var(--ds-text-warning, #F59E0B))' : 'var(--ds-text-brand, var(--ds-text-brand, #3B82F6))', borderRadius: 4, transition: 'width 0.3s' }} />
              </div>
            </div>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #64748B))' }}>
              <span><strong style={{ color: '#059669' }}>{r.test_cases_passed}</strong> passed</span>
              <span><strong style={{ color: 'var(--ds-text-danger, var(--ds-text-danger, #DC2626))' }}>{r.test_cases_failed || 0}</strong> failed</span>
              <span><strong style={{ color: 'var(--ds-text-warning, var(--ds-text-warning, #D97706))' }}>{r.defects_open}</strong> defects</span>
            </div>

            {/* Date */}
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #94A3B8))' }}>
              <Calendar style={{ width: 12, height: 12 }} />
              {r.target_date ? format(new Date(r.target_date), 'MMM dd, yyyy') : 'No target date'}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 650,
  color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #64748B))', textTransform: 'uppercase', letterSpacing: '0.04em',
};

const tdStyle: React.CSSProperties = {
  padding: '12px 14px', verticalAlign: 'middle',
};
