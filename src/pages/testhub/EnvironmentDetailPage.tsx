import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Server, Trash2, Globe, Link2, Database, User,
  CheckCircle2, AlertTriangle, XCircle, HelpCircle, RefreshCw,
  ExternalLink, Settings, Activity, ChevronRight, Key,
  Eye, EyeOff, Copy, FileText
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/components/ui/CatalystToast';
import { useTheme } from '@/hooks/useTheme';

interface Environment {
  id: string;
  env_key: string;
  name: string;
  description: string | null;
  type: string;
  status: string;
  url: string | null;
  api_url: string | null;
  database_info: string | null;
  credentials_note: string | null;
  health_status: string;
  last_health_check: string | null;
  created_at: string;
  updated_at: string;
  owner?: { full_name: string };
}

interface EnvVariable {
  id: string;
  key: string;
  value: string | null;
  is_secret: boolean;
  description: string | null;
}

interface LinkedCycle {
  cycle_id: string;
  cycle_key: string;
  name: string;
  status: string;
  total_cases: number;
  progress_percent: number;
}

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  development: { label: 'Development', color: '#2563EB', bg: '#EFF6FF' },
  testing: { label: 'Testing', color: '#7C3AED', bg: '#F5F3FF' },
  staging: { label: 'Staging', color: '#D97706', bg: '#FFFBEB' },
  uat: { label: 'UAT', color: '#0891B2', bg: '#ECFEFF' },
  production: { label: 'Production', color: '#DC2626', bg: '#FEF2F2' },
  other: { label: 'Other', color: '#64748B', bg: '#F1F5F9' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: 'Active', color: '#059669', bg: '#ECFDF5' },
  maintenance: { label: 'Maintenance', color: '#D97706', bg: '#FFFBEB' },
  inactive: { label: 'Inactive', color: '#64748B', bg: '#F1F5F9' },
  deprecated: { label: 'Deprecated', color: '#94A3B8', bg: '#F8FAFC' },
};

const HEALTH_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  healthy: { label: 'Healthy', color: '#059669', bg: '#ECFDF5', icon: CheckCircle2 },
  degraded: { label: 'Degraded', color: '#D97706', bg: '#FFFBEB', icon: AlertTriangle },
  down: { label: 'Down', color: '#DC2626', bg: '#FEF2F2', icon: XCircle },
  unknown: { label: 'Unknown', color: '#64748B', bg: '#F1F5F9', icon: HelpCircle },
};

export default function EnvironmentDetailPage() {
  const { environmentId } = useParams();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [environment, setEnvironment] = useState<Environment | null>(null);
  const [variables, setVariables] = useState<EnvVariable[]>([]);
  const [linkedCycles, setLinkedCycles] = useState<LinkedCycle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  const fetchEnvironment = async () => {
    if (!environmentId) return;
    setIsLoading(true);
    try {
      const { data: envData } = await (supabase as any)
        .from('tm_environments')
        .select(`*, owner:profiles!tm_environments_owner_id_fkey(full_name)`)
        .eq('id', environmentId)
        .single();
      if (envData) setEnvironment(envData);

      const { data: varsData } = await (supabase as any)
        .from('th_environment_variables')
        .select('*')
        .eq('environment_id', environmentId)
        .order('key');
      if (varsData) setVariables(varsData);

      const { data: cyclesData } = await (supabase as any).rpc('get_environment_cycles', { p_environment_id: environmentId });
      if (cyclesData) setLinkedCycles(cyclesData);
    } catch (err) {
      console.error('Fetch environment error:', err);
      catalystToast.error('Failed to load environment');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchEnvironment(); }, [environmentId]);

  const updateStatus = async (newStatus: string) => {
    if (!environment) return;
    try {
      const { error } = await (supabase as any).from('tm_environments').update({ status: newStatus }).eq('id', environment.id);
      if (error) throw error;
      catalystToast.success(`Status changed to ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
      fetchEnvironment();
    } catch { catalystToast.error('Failed to update status'); }
  };

  const updateHealthStatus = async (newHealth: string) => {
    if (!environment) return;
    try {
      const { error } = await (supabase as any).from('tm_environments').update({ health_status: newHealth, last_health_check: new Date().toISOString() }).eq('id', environment.id);
      if (error) throw error;
      catalystToast.success(`Health status updated to ${HEALTH_CONFIG[newHealth]?.label || newHealth}`);
      fetchEnvironment();
    } catch { catalystToast.error('Failed to update health status'); }
  };

  const deleteEnvironment = async () => {
    if (!environment) return;
    if (!confirm(`Delete ${environment.name}? This cannot be undone.`)) return;
    try {
      const { error } = await (supabase as any).from('tm_environments').delete().eq('id', environment.id);
      if (error) throw error;
      catalystToast.success('Environment deleted');
      navigate('/testhub/environments');
    } catch { catalystToast.error('Failed to delete environment'); }
  };

  const toggleSecretVisibility = (varId: string) => setShowSecrets(prev => ({ ...prev, [varId]: !prev[varId] }));
  const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); catalystToast.success('Copied to clipboard'); };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: isDark ? '#0A0A0A' : '#F8FAFC' }}>
        <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', color: '#6366F1' }} />
      </div>
    );
  }

  if (!environment) {
    return <div style={{ padding: 24, textAlign: 'center', color: isDark ? '#A1A1A1' : '#64748B' }}>Environment not found</div>;
  }

  const type = TYPE_CONFIG[environment.type] || TYPE_CONFIG.other;
  const status = STATUS_CONFIG[environment.status] || STATUS_CONFIG.inactive;
  const health = HEALTH_CONFIG[environment.health_status] || HEALTH_CONFIG.unknown;
  const HealthIcon = health.icon;

  return (
    <div style={{ padding: 24, backgroundColor: isDark ? '#0A0A0A' : '#F8FAFC', minHeight: '100vh' }}>
      <button onClick={() => navigate('/testhub/environments')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'}`, borderRadius: 8, backgroundColor: isDark ? '#1A1A1A' : '#FFF', color: isDark ? '#A1A1A1' : '#64748B', fontSize: 13, cursor: 'pointer', marginBottom: 16 }}>
        <ArrowLeft size={16} /> Back to Environments
      </button>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#6366F1', backgroundColor: '#EEF2FF', padding: '6px 14px', borderRadius: 8 }}>{environment.env_key}</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: type.color, backgroundColor: type.bg, padding: '4px 10px', borderRadius: 6 }}>{type.label}</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: status.color, backgroundColor: status.bg, padding: '4px 10px', borderRadius: 6 }}>{status.label}</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: isDark ? '#EDEDED' : '#0F172A', margin: 0 }}>{environment.name}</h1>
          {environment.owner && (
            <p style={{ fontSize: 13, color: isDark ? '#A1A1A1' : '#64748B', margin: '8px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
              <User size={14} /> {environment.owner.full_name}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={environment.status} onChange={(e) => updateStatus(e.target.value)}
            style={{ height: 40, padding: '0 14px', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'}`, borderRadius: 8, fontSize: 13, backgroundColor: isDark ? '#1A1A1A' : '#FFF', color: isDark ? '#EDEDED' : undefined, cursor: 'pointer' }}>
            {Object.entries(STATUS_CONFIG).map(([key, val]) => <option key={key} value={key}>{val.label}</option>)}
          </select>
          <button onClick={deleteEnvironment}
            style={{ display: 'flex', alignItems: 'center', gap: 6, height: 40, padding: '0 14px', border: '1px solid #FECACA', borderRadius: 8, backgroundColor: '#FEF2F2', color: '#DC2626', fontSize: 13, cursor: 'pointer' }}>
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Health Status Card */}
      <div style={{ backgroundColor: health.bg, borderRadius: 12, padding: 20, border: `1px solid ${health.color}30`, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: `${health.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HealthIcon size={24} style={{ color: health.color }} />
          </div>
          <div>
            <p style={{ fontSize: 18, fontWeight: 700, color: health.color, margin: 0 }}>{health.label}</p>
            <p style={{ fontSize: 13, color: isDark ? '#A1A1A1' : '#64748B', margin: '4px 0 0' }}>Last checked: {formatDate(environment.last_health_check)}</p>
          </div>
        </div>
        <select value={environment.health_status} onChange={(e) => updateHealthStatus(e.target.value)}
          style={{ height: 50, padding: '8px 12px', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'}`, borderRadius: 6, fontSize: 13, backgroundColor: isDark ? '#1A1A1A' : '#FFF', color: isDark ? '#EDEDED' : undefined, cursor: 'pointer' }}>
          <option value="healthy">Healthy</option>
          <option value="degraded">Degraded</option>
          <option value="down">Down</option>
          <option value="unknown">Unknown</option>
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Left Column */}
        <div>
          <div style={{ backgroundColor: isDark ? '#1A1A1A' : '#FFF', borderRadius: 12, padding: 24, border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'}`, marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: isDark ? '#EDEDED' : '#0F172A', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Settings size={18} style={{ color: '#6366F1' }} /> Connection Info
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {environment.url && (
                <div>
                  <p style={{ fontSize: 12, color: isDark ? '#A1A1A1' : '#64748B', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 4 }}><Globe size={12} /> Application URL</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <a href={environment.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, color: '#2563EB', textDecoration: 'none' }}>{environment.url}</a>
                    <ExternalLink size={14} style={{ color: '#94A3B8' }} />
                  </div>
                </div>
              )}
              {environment.api_url && (
                <div>
                  <p style={{ fontSize: 12, color: isDark ? '#A1A1A1' : '#64748B', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 4 }}><Link2 size={12} /> API URL</p>
                  <p style={{ fontSize: 14, color: isDark ? '#EDEDED' : '#0F172A', margin: 0 }}>{environment.api_url}</p>
                </div>
              )}
              {environment.database_info && (
                <div>
                  <p style={{ fontSize: 12, color: isDark ? '#A1A1A1' : '#64748B', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 4 }}><Database size={12} /> Database</p>
                  <p style={{ fontSize: 14, color: isDark ? '#EDEDED' : '#0F172A', margin: 0 }}>{environment.database_info}</p>
                </div>
              )}
              {!environment.url && !environment.api_url && !environment.database_info && (
                <p style={{ fontSize: 13, color: isDark ? '#878787' : '#94A3B8', textAlign: 'center', padding: 20 }}>No connection info configured</p>
              )}
            </div>
          </div>

          {environment.description && (
            <div style={{ backgroundColor: isDark ? '#1A1A1A' : '#FFF', borderRadius: 12, padding: 24, border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'}` }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: isDark ? '#EDEDED' : '#0F172A', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={18} style={{ color: '#6366F1' }} /> Description
              </h3>
              <p style={{ fontSize: 14, color: isDark ? '#A1A1A1' : '#334155', margin: 0, whiteSpace: 'pre-wrap' }}>{environment.description}</p>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div>
          {/* Variables */}
          <div style={{ backgroundColor: isDark ? '#1A1A1A' : '#FFF', borderRadius: 12, padding: 24, border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'}`, marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: isDark ? '#EDEDED' : '#0F172A', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Key size={18} style={{ color: '#6366F1' }} /> Variables ({variables.length})
            </h3>
            {variables.length === 0 ? (
              <p style={{ fontSize: 13, color: isDark ? '#878787' : '#94A3B8', textAlign: 'center', padding: 20 }}>No environment variables configured</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {variables.map((v) => (
                  <div key={v.id} style={{ padding: 12, backgroundColor: isDark ? '#1A1A1A' : '#F8FAFC', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: isDark ? '#EDEDED' : '#0F172A', margin: 0 }}>{v.key}</p>
                      <p style={{ fontSize: 12, color: isDark ? '#A1A1A1' : '#64748B', margin: '2px 0 0', fontFamily: 'monospace' }}>
                        {v.is_secret && !showSecrets[v.id] ? '••••••••' : v.value || '(empty)'}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {v.is_secret && (
                        <button onClick={() => toggleSecretVisibility(v.id)}
                          style={{ width: 28, height: 28, border: 'none', borderRadius: 4, backgroundColor: 'transparent', color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {showSecrets[v.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      )}
                      <button onClick={() => copyToClipboard(v.value || '')}
                        style={{ width: 28, height: 28, border: 'none', borderRadius: 4, backgroundColor: 'transparent', color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Copy size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Linked Cycles */}
          <div style={{ backgroundColor: isDark ? '#1A1A1A' : '#FFF', borderRadius: 12, padding: 24, border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'}` }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: isDark ? '#EDEDED' : '#0F172A', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={18} style={{ color: '#6366F1' }} /> Test Cycles ({linkedCycles.length})
            </h3>
            {linkedCycles.length === 0 ? (
              <p style={{ fontSize: 13, color: isDark ? '#878787' : '#94A3B8', textAlign: 'center', padding: 20 }}>No test cycles using this environment</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {linkedCycles.map((cycle) => (
                  <div key={cycle.cycle_id} onClick={() => navigate(`/testhub/cycles/${cycle.cycle_id}`)}
                    style={{ padding: 12, backgroundColor: isDark ? '#1A1A1A' : '#F8FAFC', borderRadius: 8, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#2563EB', backgroundColor: '#EFF6FF', padding: '2px 6px', borderRadius: 4, marginRight: 8 }}>{cycle.cycle_key}</span>
                      <span style={{ fontSize: 13, color: isDark ? '#EDEDED' : '#0F172A' }}>{cycle.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, color: isDark ? '#A1A1A1' : '#64748B' }}>{cycle.progress_percent}%</span>
                      <ChevronRight size={16} style={{ color: '#94A3B8' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
