import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Server, Plus, Search, X, CheckCircle2, AlertTriangle, XCircle,
  HelpCircle, RefreshCw, ExternalLink, ChevronRight,
  Wrench, Power
} from 'lucide-react';
import { supabase, typedQuery, typedRpc } from '@/integrations/supabase/client';
import { catalystToast } from '@/components/ui/CatalystToast';
import { useTheme } from '@/hooks/useTheme';
import { CreateEnvironmentModal } from '@/components/testhub/environments/CreateEnvironmentModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Environment {
  id: string;
  env_key: string;
  name: string;
  description: string | null;
  type: string;
  status: string;
  url: string | null;
  health_status: string;
  last_health_check: string | null;
  created_at: string;
  owner?: { full_name: string };
}

interface EnvironmentSummary {
  total_environments: number;
  active_count: number;
  maintenance_count: number;
  healthy_count: number;
  degraded_count: number;
  down_count: number;
}

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  development: { label: 'Development', color: 'var(--ds-text-subtle, #475569)', bg: 'var(--ds-surface-sunken, #F1F5F9)' },
  testing: { label: 'Testing', color: 'var(--ds-text-subtle, #475569)', bg: 'var(--ds-surface-sunken, #F1F5F9)' },
  staging: { label: 'Staging', color: 'var(--ds-text-subtle, #475569)', bg: 'var(--ds-surface-sunken, #F1F5F9)' },
  uat: { label: 'UAT', color: 'var(--ds-text-subtle, #475569)', bg: 'var(--ds-surface-sunken, #F1F5F9)' },
  production: { label: 'Production', color: 'var(--ds-text-subtle, #475569)', bg: 'var(--ds-surface-sunken, #F1F5F9)' },
  other: { label: 'Other', color: 'var(--ds-text-subtle, #475569)', bg: 'var(--ds-surface-sunken, #F1F5F9)' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  active: { label: 'Active', color: '#059669', bg: '#ECFDF5', icon: Power },
  maintenance: { label: 'Maintenance', color: 'var(--ds-text-warning, #D97706)', bg: '#FFFBEB', icon: Wrench },
  inactive: { label: 'Inactive', color: 'var(--ds-text-subtlest, #64748B)', bg: 'var(--ds-surface-sunken, #F1F5F9)', icon: Power },
  deprecated: { label: 'Deprecated', color: 'var(--ds-text-subtlest, #94A3B8)', bg: 'var(--ds-surface-sunken, #F8FAFC)', icon: XCircle },
};

const HEALTH_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  healthy: { label: 'Healthy', color: '#059669', bg: '#ECFDF5', icon: CheckCircle2 },
  degraded: { label: 'Degraded', color: 'var(--ds-text-warning, #D97706)', bg: '#FFFBEB', icon: AlertTriangle },
  down: { label: 'Down', color: 'var(--ds-text-danger, #DC2626)', bg: 'var(--ds-background-danger, #FEF2F2)', icon: XCircle },
  unknown: { label: 'Unknown', color: 'var(--ds-text-subtlest, #64748B)', bg: 'var(--ds-surface-sunken, #F1F5F9)', icon: HelpCircle },
};

export default function EnvironmentsListPage() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [summary, setSummary] = useState<EnvironmentSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchEnvironments = async () => {
    setIsLoading(true);
    try {
      let query = typedQuery('tm_environments')
        .select(`*, owner:profiles!tm_environments_owner_id_fkey(full_name)`)
        .eq('project_id', '00000000-0000-0000-0000-000000000001')
        .order('created_at', { ascending: true });

      if (typeFilter !== 'all') query = query.eq('type', typeFilter);
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      } else {
        query = query.neq('status', 'deprecated');
      }

      const { data, error } = await query;
      if (error) throw error;
      setEnvironments(data || []);

      const { data: summaryData } = await typedRpc('get_environment_summary');
      if (summaryData && summaryData.length > 0) {
        setSummary(summaryData[0]);
      }
    } catch (err) {
      console.error('Fetch environments error:', err);
      catalystToast.error('Failed to load environments');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEnvironments();
  }, [typeFilter, statusFilter]);

  const filteredEnvironments = environments.filter(e => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      e.env_key.toLowerCase().includes(search) ||
      e.name.toLowerCase().includes(search) ||
      (e.url && e.url.toLowerCase().includes(search))
    );
  });

  const clearFilters = () => {
    setSearchTerm('');
    setTypeFilter('all');
    setStatusFilter('all');
  };

  const hasActiveFilters = typeFilter !== 'all' || statusFilter !== 'all' || searchTerm;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--cp-bg-page, #F8FAFC)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Server size={24} style={{ color: 'var(--ds-text-inverse, #FFFFFF)' }} />
            </div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--cp-text-primary, #0F172A)', margin: 0 }}>Test Environments</h1>
              <p style={{ fontSize: 14, color: 'var(--cp-text-tertiary, #64748B)', margin: '4px 0 0' }}>Manage and monitor test environments</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, height: 44, padding: '0 20px',
            border: 'none', borderRadius: 12,
            background: 'var(--ds-text-brand, #2563EB)',
            color: 'var(--ds-text-inverse, #FFFFFF)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            boxShadow: 'none',
          }}
        >
          <Plus size={18} /> Add Environment
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          <div style={{ backgroundColor: isDark ? 'var(--cp-bg-surface, #242528)' : 'var(--ds-surface, #FFF)', borderRadius: 12, padding: 20, border: `1px solid ${'var(--cp-border, #E2E8F0)'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: 12, color: 'var(--cp-text-tertiary, #64748B)', margin: 0, textTransform: 'uppercase' }}>Total</p>
                <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--cp-text-primary, #0F172A)', margin: '8px 0 0' }}>{summary.total_environments}</p>
              </div>
              <Server size={24} style={{ color: '#6366F1' }} />
            </div>
          </div>
          <div style={{ backgroundColor: '#ECFDF5', borderRadius: 12, padding: 20, border: '1px solid #A7F3D0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: 12, color: '#059669', margin: 0, textTransform: 'uppercase' }}>Healthy</p>
                <p style={{ fontSize: 28, fontWeight: 700, color: '#059669', margin: '8px 0 0' }}>{summary.healthy_count}</p>
              </div>
              <CheckCircle2 size={24} style={{ color: '#059669' }} />
            </div>
          </div>
          <div style={{ backgroundColor: '#FFFBEB', borderRadius: 12, padding: 20, border: '1px solid #FDE68A' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: 12, color: 'var(--ds-text-warning, #D97706)', margin: 0, textTransform: 'uppercase' }}>Degraded</p>
                <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--ds-text-warning, #D97706)', margin: '8px 0 0' }}>{summary.degraded_count}</p>
              </div>
              <AlertTriangle size={24} style={{ color: 'var(--ds-text-warning, #D97706)' }} />
            </div>
          </div>
          <div style={{ backgroundColor: 'var(--ds-background-danger, #FEF2F2)', borderRadius: 12, padding: 20, border: '1px solid #FECACA' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: 12, color: 'var(--ds-text-danger, #DC2626)', margin: 0, textTransform: 'uppercase' }}>Down</p>
                <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--ds-text-danger, #DC2626)', margin: '8px 0 0' }}>{summary.down_count}</p>
              </div>
              <XCircle size={24} style={{ color: 'var(--ds-text-danger, #DC2626)' }} />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 300px', maxWidth: 400 }}>
          <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--ds-text-subtlest, #94A3B8)' }} />
          <input
            type="text"
            placeholder="Search environments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%', height: 44, padding: '0 14px 0 44px',
              border: `1.5px solid ${'var(--cp-border, #E2E8F0)'}`, borderRadius: 12, fontSize: 14, backgroundColor: 'var(--cp-bg-elevated, #FFFFFF)', color: isDark ? 'var(--ds-text, #EDEDED)' : undefined,
            }}
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-[50px] w-[160px] border-[var(--ds-border, #E2E8F0)] rounded text-[13px]" style={{ fontFamily: 'var(--cp-font-body)' }}>
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="development">Development</SelectItem>
            <SelectItem value="testing">Testing</SelectItem>
            <SelectItem value="staging">Staging</SelectItem>
            <SelectItem value="uat">UAT</SelectItem>
            <SelectItem value="production">Production</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-[50px] w-[160px] border-[var(--ds-border, #E2E8F0)] rounded text-[13px]" style={{ fontFamily: 'var(--cp-font-body)' }}>
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="unknown">Unknown</SelectItem>
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <button onClick={clearFilters}
            style={{ display: 'flex', alignItems: 'center', gap: 6, height: 44, padding: '0 16px', border: `1.5px solid ${'var(--cp-border, #E2E8F0)'}`, borderRadius: 12, backgroundColor: isDark ? 'var(--cp-bg-surface, #242528)' : 'var(--ds-surface, #FFF)', color: 'var(--cp-text-tertiary, #64748B)', fontSize: 14, cursor: 'pointer' }}>
            <X size={16} /> Clear
          </button>
        )}
      </div>

      {/* Environments Grid */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', color: '#6366F1' }} />
        </div>
      ) : filteredEnvironments.length === 0 ? (
        <div style={{ backgroundColor: 'var(--cp-bg-elevated, #FFFFFF)', borderRadius: 12, padding: 60, textAlign: 'center', border: `1px solid ${'var(--cp-border, #E2E8F0)'}` }}>
          <Server size={48} style={{ color: 'var(--cp-text-muted, #CBD5E1)', marginBottom: 16 }} />
          <p style={{ fontSize: 16, color: 'var(--cp-text-tertiary, #64748B)', margin: 0 }}>No environments found</p>
          <p style={{ fontSize: 14, color: 'var(--cp-text-muted, #94A3B8)', margin: '8px 0 0' }}>Add an environment to get started</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {filteredEnvironments.map((env) => {
            const type = TYPE_CONFIG[env.type] || TYPE_CONFIG.other;
            const status = STATUS_CONFIG[env.status] || STATUS_CONFIG.inactive;
            const health = HEALTH_CONFIG[env.health_status] || HEALTH_CONFIG.unknown;
            const StatusIcon = status.icon;
            const HealthIcon = health.icon;

            return (
              <div
                key={env.id}
                onClick={() => navigate(`/testhub/environments/${env.id}`)}
                style={{
                  backgroundColor: 'var(--cp-bg-elevated, #FFFFFF)', borderRadius: 12, padding: 20,
                  border: `1px solid ${'var(--cp-border, #E2E8F0)'}`, cursor: 'pointer', transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--cp-border-strong, #CBD5E1)'; e.currentTarget.style.boxShadow = isDark ? 'none' : '0 4px 12px rgba(0,0,0,0.05)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--cp-border, #E2E8F0)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#6366F1', backgroundColor: '#EEF2FF', padding: '4px 10px', borderRadius: 6 }}>{env.env_key}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ds-text-subtle, #475569)', backgroundColor: 'var(--ds-surface-sunken, #F1F5F9)', padding: '0 6px', borderRadius: 4, height: 20, display: 'inline-flex', alignItems: 'center', textTransform: 'uppercase' as const }}>{type.label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: health.color, backgroundColor: health.bg, padding: '4px 8px', borderRadius: 6 }}>
                    <HealthIcon size={12} /> {health.label}
                  </div>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--cp-text-primary, #0F172A)', margin: '0 0 8px' }}>{env.name}</h3>
                {env.url && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--cp-text-tertiary, #64748B)', marginBottom: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <ExternalLink size={14} /> {env.url}
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: `1px solid ${'var(--cp-bg-sunken, #F1F5F9)'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 500, color: status.color }}>
                    <StatusIcon size={14} /> {status.label}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--cp-text-muted, #94A3B8)' }}>Checked: {formatDate(env.last_health_check)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreateEnvironmentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={fetchEnvironments}
      />

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
