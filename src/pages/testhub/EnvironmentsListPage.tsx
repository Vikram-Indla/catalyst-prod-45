import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Server, Plus, Search, X, CheckCircle2, AlertTriangle, XCircle,
  HelpCircle, RefreshCw, ExternalLink, ChevronRight,
  Wrench, Power
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/components/ui/CatalystToast';
import { CreateEnvironmentModal } from '@/components/testhub/environments/CreateEnvironmentModal';

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
  development: { label: 'Development', color: '#2563EB', bg: '#EFF6FF' },
  testing: { label: 'Testing', color: '#7C3AED', bg: '#F5F3FF' },
  staging: { label: 'Staging', color: '#D97706', bg: '#FFFBEB' },
  uat: { label: 'UAT', color: '#0891B2', bg: '#ECFEFF' },
  production: { label: 'Production', color: '#DC2626', bg: '#FEF2F2' },
  other: { label: 'Other', color: '#64748B', bg: '#F1F5F9' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  active: { label: 'Active', color: '#059669', bg: '#ECFDF5', icon: Power },
  maintenance: { label: 'Maintenance', color: '#D97706', bg: '#FFFBEB', icon: Wrench },
  inactive: { label: 'Inactive', color: '#64748B', bg: '#F1F5F9', icon: Power },
  deprecated: { label: 'Deprecated', color: '#94A3B8', bg: '#F8FAFC', icon: XCircle },
};

const HEALTH_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  healthy: { label: 'Healthy', color: '#059669', bg: '#ECFDF5', icon: CheckCircle2 },
  degraded: { label: 'Degraded', color: '#D97706', bg: '#FFFBEB', icon: AlertTriangle },
  down: { label: 'Down', color: '#DC2626', bg: '#FEF2F2', icon: XCircle },
  unknown: { label: 'Unknown', color: '#64748B', bg: '#F1F5F9', icon: HelpCircle },
};

export default function EnvironmentsListPage() {
  const navigate = useNavigate();
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
      let query = (supabase as any)
        .from('th_environments')
        .select(`*, owner:profiles!th_environments_owner_id_fkey(full_name)`)
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

      const { data: summaryData } = await (supabase as any).rpc('get_environment_summary');
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#F8FAFC' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Server size={24} style={{ color: '#FFFFFF' }} />
            </div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0F172A', margin: 0 }}>Test Environments</h1>
              <p style={{ fontSize: 14, color: '#64748B', margin: '4px 0 0' }}>Manage and monitor test environments</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, height: 44, padding: '0 20px',
            border: 'none', borderRadius: 10,
            background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
            color: '#FFFFFF', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
          }}
        >
          <Plus size={18} /> Add Environment
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          <div style={{ backgroundColor: '#FFF', borderRadius: 12, padding: 20, border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: 12, color: '#64748B', margin: 0, textTransform: 'uppercase' }}>Total</p>
                <p style={{ fontSize: 28, fontWeight: 700, color: '#0F172A', margin: '8px 0 0' }}>{summary.total_environments}</p>
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
                <p style={{ fontSize: 12, color: '#D97706', margin: 0, textTransform: 'uppercase' }}>Degraded</p>
                <p style={{ fontSize: 28, fontWeight: 700, color: '#D97706', margin: '8px 0 0' }}>{summary.degraded_count}</p>
              </div>
              <AlertTriangle size={24} style={{ color: '#D97706' }} />
            </div>
          </div>
          <div style={{ backgroundColor: '#FEF2F2', borderRadius: 12, padding: 20, border: '1px solid #FECACA' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: 12, color: '#DC2626', margin: 0, textTransform: 'uppercase' }}>Down</p>
                <p style={{ fontSize: 28, fontWeight: 700, color: '#DC2626', margin: '8px 0 0' }}>{summary.down_count}</p>
              </div>
              <XCircle size={24} style={{ color: '#DC2626' }} />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 300px', maxWidth: 400 }}>
          <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input
            type="text"
            placeholder="Search environments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%', height: 44, padding: '0 14px 0 44px',
              border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: 14, backgroundColor: '#FFFFFF',
            }}
          />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
          style={{ height: 44, padding: '0 36px 0 14px', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: 14, backgroundColor: '#FFF', cursor: 'pointer' }}>
          <option value="all">All Types</option>
          <option value="development">Development</option>
          <option value="testing">Testing</option>
          <option value="staging">Staging</option>
          <option value="uat">UAT</option>
          <option value="production">Production</option>
          <option value="other">Other</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          style={{ height: 44, padding: '0 36px 0 14px', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: 14, backgroundColor: '#FFF', cursor: 'pointer' }}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="maintenance">Maintenance</option>
          <option value="inactive">Inactive</option>
          <option value="deprecated">Deprecated</option>
        </select>
        {hasActiveFilters && (
          <button onClick={clearFilters}
            style={{ display: 'flex', alignItems: 'center', gap: 6, height: 44, padding: '0 16px', border: '1.5px solid #E2E8F0', borderRadius: 10, backgroundColor: '#FFF', color: '#64748B', fontSize: 14, cursor: 'pointer' }}>
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
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 60, textAlign: 'center', border: '1px solid #E2E8F0' }}>
          <Server size={48} style={{ color: '#CBD5E1', marginBottom: 16 }} />
          <p style={{ fontSize: 16, color: '#64748B', margin: 0 }}>No environments found</p>
          <p style={{ fontSize: 14, color: '#94A3B8', margin: '8px 0 0' }}>Add an environment to get started</p>
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
                  backgroundColor: '#FFFFFF', borderRadius: 12, padding: 20,
                  border: '1px solid #E2E8F0', cursor: 'pointer', transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#6366F1', backgroundColor: '#EEF2FF', padding: '4px 10px', borderRadius: 6 }}>{env.env_key}</span>
                    <span style={{ fontSize: 11, fontWeight: 500, color: type.color, backgroundColor: type.bg, padding: '3px 8px', borderRadius: 4 }}>{type.label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: health.color, backgroundColor: health.bg, padding: '4px 8px', borderRadius: 6 }}>
                    <HealthIcon size={12} /> {health.label}
                  </div>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: '#0F172A', margin: '0 0 8px' }}>{env.name}</h3>
                {env.url && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748B', marginBottom: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <ExternalLink size={14} /> {env.url}
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid #F1F5F9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 500, color: status.color }}>
                    <StatusIcon size={14} /> {status.label}
                  </div>
                  <div style={{ fontSize: 12, color: '#94A3B8' }}>Checked: {formatDate(env.last_health_check)}</div>
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
