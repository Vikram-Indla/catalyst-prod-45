/**
 * Reports List Page — TestHub Module
 * Route: /testhub/reports
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileBarChart, Plus, Search, X, Download, Trash2,
  RefreshCw, CheckCircle2, AlertCircle, FileText,
  BarChart3, TrendingUp, Shield, Calendar
} from 'lucide-react';
import { supabase, typedQuery, typedRpc } from '@/integrations/supabase/client';
import { catalystToast } from '@/components/ui/CatalystToast';
import { useTheme } from '@/hooks/useTheme';
import { CatalystPageHeader } from '@/components/shared/CatalystPageHeader';
import { CreateReportModal } from '@/components/testhub/reports/CreateReportModal';

interface Report {
  id: string;
  report_key: string;
  name: string;
  description: string | null;
  type: string;
  status: string;
  generated_at: string | null;
  created_at: string;
  cycle?: { cycle_key: string; name: string } | null;
  plan?: { plan_key: string; name: string } | null;
  generated_by_user?: { full_name: string } | null;
}

interface ReportStats {
  total_reports: number;
  ready_reports: number;
  this_month: number;
}

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  cycle_summary: { label: 'Cycle Summary', color: 'var(--ds-text-brand, var(--ds-text-brand, #2563EB))', bg: 'var(--ds-background-selected, var(--ds-background-selected, #EFF6FF))', icon: BarChart3 },
  plan_summary: { label: 'Plan Summary', color: '#7C3AED', bg: '#F5F3FF', icon: FileText },
  coverage: { label: 'Coverage', color: '#0891B2', bg: '#ECFEFF', icon: Shield },
  defect: { label: 'Defect Report', color: 'var(--ds-text-danger, var(--ds-text-danger, #DC2626))', bg: 'var(--ds-background-danger, var(--ds-background-danger, #FEF2F2))', icon: AlertCircle },
  trend: { label: 'Trend Analysis', color: '#059669', bg: '#ECFDF5', icon: TrendingUp },
  custom: { label: 'Custom', color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #64748B))', bg: 'var(--ds-surface-sunken, var(--ds-surface-sunken, #F1F5F9))', icon: FileBarChart },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'Draft', color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #64748B))', bg: 'var(--ds-surface-sunken, var(--ds-surface-sunken, #F1F5F9))' },
  generating: { label: 'Generating', color: 'var(--ds-text-warning, var(--ds-text-warning, #D97706))', bg: '#FFFBEB' },
  ready: { label: 'Ready', color: '#059669', bg: '#ECFDF5' },
  failed: { label: 'Failed', color: 'var(--ds-text-danger, var(--ds-text-danger, #DC2626))', bg: 'var(--ds-background-danger, var(--ds-background-danger, #FEF2F2))' },
  archived: { label: 'Archived', color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #94A3B8))', bg: 'var(--ds-surface-sunken, var(--ds-surface-sunken, #F8FAFC))' },
};

export default function ReportsListPage() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      let query = typedQuery('th_reports')
        .select(`
          *,
          cycle:tm_test_cycles!th_reports_cycle_id_fkey(cycle_key, name),
          plan:tm_test_plans!th_reports_plan_id_fkey(plan_key, name),
          generated_by_user:profiles!th_reports_generated_by_fkey(full_name)
        `)
        .order('created_at', { ascending: false });

      if (typeFilter !== 'all') query = query.eq('type', typeFilter);
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      } else {
        query = query.neq('status', 'archived');
      }

      const { data, error } = await query;
      if (error) throw error;
      setReports(data || []);

      const { data: statsData } = await typedRpc('get_report_stats');
      if (statsData && statsData.length > 0) {
        setStats(statsData[0]);
      }
    } catch (err) {
      console.error('Fetch reports error:', err);
      catalystToast.error('Failed to load reports');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [typeFilter, statusFilter]);

  const filteredReports = reports.filter(r => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return r.report_key.toLowerCase().includes(search) || r.name.toLowerCase().includes(search);
  });

  const deleteReport = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this report?')) return;
    try {
      const { error } = await typedQuery('th_reports').delete().eq('id', id);
      if (error) throw error;
      catalystToast.success('Report deleted');
      fetchReports();
    } catch {
      catalystToast.error('Failed to delete report');
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const clearFilters = () => { setSearchTerm(''); setTypeFilter('all'); setStatusFilter('all'); };
  const hasActiveFilters = typeFilter !== 'all' || statusFilter !== 'all' || searchTerm;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--cp-bg-page, #F8FAFC)' }}>
      <CatalystPageHeader title="Test Reports" actions={
        <button onClick={() => setShowCreateModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, height: 40, padding: '0 20px', border: 'none', borderRadius: 8, background: 'linear-gradient(135deg, var(--ds-text-brand, #2563EB) 0%, var(--ds-background-brand-bold-hovered, #1D4ED8) 100%)', color: 'var(--ds-text-inverse, #FFFFFF)', fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px rgba(37,99,235,0.25)' }}>
          <Plus size={18} /> New Report
        </button>
      } />
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>

      {/* Stats Cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
          <div style={{ backgroundColor: isDark ? 'var(--cp-bg-surface, #242528)' : 'var(--ds-surface, var(--ds-surface, var(--ds-surface, #FFF)))', borderRadius: 12, padding: 20, border: isDark ? '1px solid #2E2E2E' : '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: 12, color: 'var(--cp-text-tertiary, #64748B)', margin: 0, textTransform: 'uppercase' }}>Total Reports</p>
                <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--cp-text-primary, #0F172A)', margin: '8px 0 0' }}>{stats.total_reports}</p>
              </div>
              <FileBarChart size={24} style={{ color: 'var(--ds-text-warning, var(--ds-text-warning, #F59E0B))' }} />
            </div>
          </div>
          <div style={{ backgroundColor: '#ECFDF5', borderRadius: 12, padding: 20, border: '1px solid #A7F3D0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: 12, color: '#059669', margin: 0, textTransform: 'uppercase' }}>Ready</p>
                <p style={{ fontSize: 28, fontWeight: 700, color: '#059669', margin: '8px 0 0' }}>{stats.ready_reports}</p>
              </div>
              <CheckCircle2 size={24} style={{ color: '#059669' }} />
            </div>
          </div>
          <div style={{ backgroundColor: isDark ? 'var(--cp-bg-surface, #242528)' : 'var(--ds-surface, var(--ds-surface, var(--ds-surface, #FFF)))', borderRadius: 12, padding: 20, border: isDark ? '1px solid #2E2E2E' : '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: 12, color: 'var(--cp-text-tertiary, #64748B)', margin: 0, textTransform: 'uppercase' }}>This Month</p>
                <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--cp-text-primary, #0F172A)', margin: '8px 0 0' }}>{stats.this_month}</p>
              </div>
              <Calendar size={24} style={{ color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #64748B))' }} />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 300px', maxWidth: 400 }}>
          <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #94A3B8))' }} />
          <input type="text" placeholder="Search reports..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', height: 44, padding: '0 14px 0 44px', border: isDark ? '1.5px solid #2E2E2E' : '1.5px solid #E2E8F0', borderRadius: 12, fontSize: 14, backgroundColor: 'var(--cp-bg-elevated, #FFFFFF)', color: isDark ? 'var(--ds-text, var(--ds-text, #EDEDED))' : undefined }} />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ height: 44, padding: '0 36px 0 14px', border: isDark ? '1.5px solid #2E2E2E' : '1.5px solid #E2E8F0', borderRadius: 12, fontSize: 14, backgroundColor: isDark ? 'var(--cp-bg-surface, #242528)' : 'var(--ds-surface, var(--ds-surface, var(--ds-surface, #FFF)))', color: isDark ? 'var(--ds-text, var(--ds-text, #EDEDED))' : undefined, cursor: 'pointer' }}>
          <option value="all">All Types</option>
          <option value="cycle_summary">Cycle Summary</option>
          <option value="plan_summary">Plan Summary</option>
          <option value="coverage">Coverage</option>
          <option value="defect">Defect Report</option>
          <option value="trend">Trend Analysis</option>
          <option value="custom">Custom</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ height: 44, padding: '0 36px 0 14px', border: isDark ? '1.5px solid #2E2E2E' : '1.5px solid #E2E8F0', borderRadius: 12, fontSize: 14, backgroundColor: isDark ? 'var(--cp-bg-surface, #242528)' : 'var(--ds-surface, var(--ds-surface, var(--ds-surface, #FFF)))', color: isDark ? 'var(--ds-text, var(--ds-text, #EDEDED))' : undefined, cursor: 'pointer' }}>
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="generating">Generating</option>
          <option value="ready">Ready</option>
          <option value="failed">Failed</option>
          <option value="archived">Archived</option>
        </select>
        {hasActiveFilters && (
          <button onClick={clearFilters} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 44, padding: '0 16px', border: isDark ? '1.5px solid #2E2E2E' : '1.5px solid #E2E8F0', borderRadius: 12, backgroundColor: isDark ? 'var(--cp-bg-surface, #242528)' : 'var(--ds-surface, var(--ds-surface, var(--ds-surface, #FFF)))', color: 'var(--cp-text-tertiary, #64748B)', fontSize: 14, cursor: 'pointer' }}>
            <X size={16} /> Clear
          </button>
        )}
      </div>

      <p style={{ fontSize: 13, color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #64748B))', marginBottom: 16 }}>
        Showing {filteredReports.length} report{filteredReports.length !== 1 ? 's' : ''}
      </p>

      {/* Reports List */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--ds-text-warning, var(--ds-text-warning, #F59E0B))' }} />
        </div>
      ) : filteredReports.length === 0 ? (
        <div style={{ backgroundColor: 'var(--cp-bg-elevated, #FFFFFF)', borderRadius: 12, padding: 60, textAlign: 'center', border: isDark ? '1px solid #2E2E2E' : '1px solid #E2E8F0' }}>
          <FileBarChart size={48} style={{ color: 'var(--cp-text-muted, #CBD5E1)', marginBottom: 16 }} />
          <p style={{ fontSize: 16, color: 'var(--cp-text-tertiary, #64748B)', margin: 0 }}>No reports found</p>
          <p style={{ fontSize: 14, color: 'var(--cp-text-muted, #94A3B8)', margin: '8px 0 0' }}>Generate a new report to get started</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredReports.map((report) => {
            const type = TYPE_CONFIG[report.type] || TYPE_CONFIG.custom;
            const status = STATUS_CONFIG[report.status] || STATUS_CONFIG.draft;
            const TypeIcon = type.icon;
            return (
              <div key={report.id} onClick={() => navigate(`/testhub/reports/${report.id}`)}
                style={{ backgroundColor: 'var(--cp-bg-elevated, #FFFFFF)', borderRadius: 12, padding: 20, border: isDark ? '1px solid #2E2E2E' : '1px solid #E2E8F0', cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--cp-border-strong, #CBD5E1)'; e.currentTarget.style.boxShadow = isDark ? '0 4px 12px rgba(0,0,0,0.2)' : '0 4px 12px rgba(0,0,0,0.05)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--cp-border, #E2E8F0)'; e.currentTarget.style.boxShadow = 'none'; }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: 16, flex: 1 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: type.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <TypeIcon size={22} style={{ color: type.color }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-text-warning, var(--ds-text-warning, #F59E0B))', backgroundColor: '#FFFBEB', padding: '3px 8px', borderRadius: 4 }}>{report.report_key}</span>
                        <span style={{ fontSize: 11, fontWeight: 500, color: type.color, backgroundColor: type.bg, padding: '2px 8px', borderRadius: 4 }}>{type.label}</span>
                        <span style={{ fontSize: 11, fontWeight: 500, color: status.color, backgroundColor: status.bg, padding: '2px 8px', borderRadius: 4 }}>{status.label}</span>
                      </div>
                      <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--cp-text-primary, #0F172A)', margin: '0 0 4px' }}>{report.name}</h3>
                      <div style={{ display: 'flex', gap: 12, fontSize: 13, color: 'var(--cp-text-tertiary, #64748B)' }}>
                        {report.cycle && <span>Cycle: {report.cycle.cycle_key}</span>}
                        {report.plan && <span>Plan: {report.plan.plan_key}</span>}
                        <span>Generated: {formatDate(report.generated_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {report.status === 'ready' && (
                      <button onClick={(e) => { e.stopPropagation(); navigate(`/testhub/reports/${report.id}`); }}
                        style={{ width: 36, height: 50, border: '1px solid #E2E8F0', borderRadius: 8, backgroundColor: 'var(--ds-surface, var(--ds-surface, var(--ds-surface, #FFF)))', color: '#059669', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Download size={16} />
                      </button>
                    )}
                    <button onClick={(e) => deleteReport(report.id, e)}
                      style={{ width: 36, height: 50, border: '1px solid #FECACA', borderRadius: 8, backgroundColor: 'var(--ds-background-danger, var(--ds-background-danger, #FEF2F2))', color: 'var(--ds-text-danger, var(--ds-text-danger, #DC2626))', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreateReportModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onCreated={fetchReports} />

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
