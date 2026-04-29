/**
 * Report Detail Page — TestHub Module
 * Route: /testhub/reports/:reportId
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';
import {
  ArrowLeft, FileBarChart, Download, Printer, Trash2,
  RefreshCw, CheckCircle2, XCircle, AlertTriangle, Clock,
  BarChart3, PieChart, Users, FileText
} from 'lucide-react';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { catalystToast } from '@/components/ui/CatalystToast';

interface Report {
  id: string;
  report_key: string;
  name: string;
  description: string | null;
  type: string;
  status: string;
  report_data: any;
  generated_at: string | null;
  created_at: string;
  cycle?: { cycle_key: string; name: string } | null;
  plan?: { plan_key: string; name: string } | null;
  generated_by_user?: { full_name: string } | null;
}

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  cycle_summary: { label: 'Cycle Summary', color: '#2563EB' },
  plan_summary: { label: 'Plan Summary', color: '#7C3AED' },
  coverage: { label: 'Coverage', color: '#0891B2' },
  defect: { label: 'Defect Report', color: '#DC2626' },
  trend: { label: 'Trend Analysis', color: '#059669' },
  custom: { label: 'Custom', color: '#64748B' },
};

export default function ReportDetailPage() {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [report, setReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // DARK MODE tokens
  const pageBg = isDark ? 'var(--cp-bg-page, #1F1F21)' : '#F8FAFC';
  const surfaceBg = isDark ? 'var(--cp-bg-surface, #242528)' : '#FFF';
  const borderColor = isDark ? '#2E2E2E' : '#E2E8F0';
  const borderSubtle = isDark ? '#292929' : '#F1F5F9';
  const textPrimary = isDark ? '#EDEDED' : '#0F172A';
  const textSecondary = isDark ? '#A1A1A1' : '#64748B';
  const textMuted = isDark ? '#878787' : '#94A3B8';
  const textBody = isDark ? '#A1A1A1' : '#334155';

  const fetchReport = async () => {
    if (!reportId) return;
    setIsLoading(true);
    try {
      const { data, error } = await typedQuery('th_reports')
        .select(`
          *,
          cycle:tm_test_cycles!th_reports_cycle_id_fkey(cycle_key, name),
          plan:tm_test_plans!th_reports_plan_id_fkey(plan_key, name),
          generated_by_user:profiles!th_reports_generated_by_fkey(full_name)
        `)
        .eq('id', reportId)
        .single();
      if (error) throw error;
      setReport(data);
    } catch (err) {
      console.error('Fetch report error:', err);
      catalystToast.error('Failed to load report');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchReport(); }, [reportId]);

  const deleteReport = async () => {
    if (!report) return;
    if (!confirm(`Delete ${report.report_key}? This cannot be undone.`)) return;
    try {
      const { error } = await typedQuery('th_reports').delete().eq('id', report.id);
      if (error) throw error;
      catalystToast.success('Report deleted');
      navigate('/testhub/reports');
    } catch { catalystToast.error('Failed to delete report'); }
  };

  const exportToCSV = () => {
    if (!report?.report_data?.test_cases) return;
    const testCases = report.report_data.test_cases;
    const headers = ['Case Key', 'Title', 'Priority', 'Status', 'Executed At', 'Executed By'];
    const rows = testCases.map((tc: any) => [tc.case_key, tc.title, tc.priority, tc.status, tc.executed_at || '', tc.executed_by || '']);
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.report_key}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    catalystToast.success('CSV exported');
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: pageBg }}>
        <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', color: '#F59E0B' }} />
      </div>
    );
  }

  if (!report) {
    return <div style={{ padding: 24, textAlign: 'center', color: textSecondary }}>Report not found</div>;
  }

  const type = TYPE_CONFIG[report.type] || TYPE_CONFIG.custom;
  const data = report.report_data || {};

  return (
    <div style={{ padding: 24, backgroundColor: pageBg, minHeight: '100vh' }}>
      <button onClick={() => navigate('/testhub/reports')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', border: `1px solid ${borderColor}`, borderRadius: 8, backgroundColor: surfaceBg, color: textSecondary, fontSize: 13, cursor: 'pointer', marginBottom: 16 }}>
        <ArrowLeft size={16} /> Back to Reports
      </button>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#F59E0B', backgroundColor: isDark ? '#3D3520' : '#FFFBEB', padding: '6px 14px', borderRadius: 8 }}>{report.report_key}</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: type.color, backgroundColor: `${type.color}15`, padding: '4px 10px', borderRadius: 6 }}>{type.label}</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: textPrimary, margin: 0 }}>{report.name}</h1>
          <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 13, color: textSecondary }}>
            {report.generated_by_user && <span>Generated by: {report.generated_by_user.full_name}</span>}
            <span>Generated: {formatDate(report.generated_at)}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={exportToCSV} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 40, padding: '0 16px', border: `1px solid ${borderColor}`, borderRadius: 8, backgroundColor: surfaceBg, color: textBody, fontSize: 13, cursor: 'pointer' }}>
            <Download size={16} /> CSV
          </button>
          <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 40, padding: '0 14px', border: `1px solid ${borderColor}`, borderRadius: 8, backgroundColor: surfaceBg, color: textBody, fontSize: 13, cursor: 'pointer' }}>
            <Printer size={16} />
          </button>
          <button onClick={deleteReport} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 40, padding: '0 14px', border: '1px solid #FECACA', borderRadius: 8, backgroundColor: isDark ? '#3D2020' : '#FEF2F2', color: '#DC2626', fontSize: 13, cursor: 'pointer' }}>
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Cycle Summary Content */}
      {report.type === 'cycle_summary' && data.summary && (
        <>
          {data.cycle && (
            <div style={{ backgroundColor: surfaceBg, borderRadius: 12, padding: 20, border: `1px solid ${borderColor}`, marginBottom: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: textSecondary, margin: '0 0 8px', textTransform: 'uppercase' }}>Test Cycle</h3>
              <p style={{ fontSize: 18, fontWeight: 600, color: textPrimary, margin: 0 }}>{data.cycle.cycle_key} - {data.cycle.name}</p>
              <p style={{ fontSize: 13, color: textSecondary, margin: '4px 0 0' }}>Status: {data.cycle.status} | {data.cycle.start_date} to {data.cycle.end_date}</p>
            </div>
          )}

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            <div style={{ backgroundColor: surfaceBg, borderRadius: 12, padding: 20, border: `1px solid ${borderColor}`, textAlign: 'center' }}>
              <BarChart3 size={24} style={{ color: '#2563EB', marginBottom: 8 }} />
              <p style={{ fontSize: 28, fontWeight: 700, color: textPrimary, margin: 0 }}>{data.summary.total_cases}</p>
              <p style={{ fontSize: 12, color: textSecondary, margin: '4px 0 0' }}>Total Tests</p>
            </div>
            <div style={{ backgroundColor: isDark ? '#1A2E1A' : '#ECFDF5', borderRadius: 12, padding: 20, border: `1px solid ${isDark ? '#2D4A2D' : '#A7F3D0'}`, textAlign: 'center' }}>
              <CheckCircle2 size={24} style={{ color: '#059669', marginBottom: 8 }} />
              <p style={{ fontSize: 28, fontWeight: 700, color: '#059669', margin: 0 }}>{data.summary.passed}</p>
              <p style={{ fontSize: 12, color: '#059669', margin: '4px 0 0' }}>Passed</p>
            </div>
            <div style={{ backgroundColor: isDark ? '#3D2020' : '#FEF2F2', borderRadius: 12, padding: 20, border: `1px solid ${isDark ? '#5C2020' : '#FECACA'}`, textAlign: 'center' }}>
              <XCircle size={24} style={{ color: '#DC2626', marginBottom: 8 }} />
              <p style={{ fontSize: 28, fontWeight: 700, color: '#DC2626', margin: 0 }}>{data.summary.failed}</p>
              <p style={{ fontSize: 12, color: '#DC2626', margin: '4px 0 0' }}>Failed</p>
            </div>
            <div style={{ backgroundColor: surfaceBg, borderRadius: 12, padding: 20, border: `1px solid ${borderColor}`, textAlign: 'center' }}>
              <PieChart size={24} style={{ color: data.summary.pass_rate >= 80 ? '#059669' : data.summary.pass_rate >= 50 ? '#D97706' : '#DC2626', marginBottom: 8 }} />
              <p style={{ fontSize: 28, fontWeight: 700, color: data.summary.pass_rate >= 80 ? '#059669' : data.summary.pass_rate >= 50 ? '#D97706' : '#DC2626', margin: 0 }}>{data.summary.pass_rate}%</p>
              <p style={{ fontSize: 12, color: textSecondary, margin: '4px 0 0' }}>Pass Rate</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div style={{ backgroundColor: surfaceBg, borderRadius: 12, padding: 20, border: `1px solid ${borderColor}`, marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: textPrimary }}>Execution Progress</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#2563EB' }}>{data.summary.progress_percent}%</span>
            </div>
            <div style={{ height: 16, backgroundColor: isDark ? '#292929' : '#E2E8F0', borderRadius: 8, overflow: 'hidden', display: 'flex' }}>
              {data.summary.total_cases > 0 && (
                <>
                  <div style={{ width: `${(data.summary.passed / data.summary.total_cases) * 100}%`, backgroundColor: '#10B981' }} />
                  <div style={{ width: `${(data.summary.failed / data.summary.total_cases) * 100}%`, backgroundColor: '#EF4444' }} />
                  <div style={{ width: `${(data.summary.blocked / data.summary.total_cases) * 100}%`, backgroundColor: '#F59E0B' }} />
                  <div style={{ width: `${(data.summary.skipped / data.summary.total_cases) * 100}%`, backgroundColor: '#94A3B8' }} />
                </>
              )}
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12, color: textSecondary }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, backgroundColor: '#10B981', borderRadius: 4, display: 'inline-block' }} /> Passed ({data.summary.passed})</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, backgroundColor: '#EF4444', borderRadius: 4, display: 'inline-block' }} /> Failed ({data.summary.failed})</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, backgroundColor: '#F59E0B', borderRadius: 4, display: 'inline-block' }} /> Blocked ({data.summary.blocked})</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, backgroundColor: '#94A3B8', borderRadius: 4, display: 'inline-block' }} /> Not Run ({data.summary.not_run})</span>
            </div>
          </div>

          {/* Assignee Breakdown */}
          {data.assignee_breakdown && data.assignee_breakdown.length > 0 && (
            <div style={{ backgroundColor: surfaceBg, borderRadius: 12, padding: 20, border: `1px solid ${borderColor}`, marginBottom: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: textPrimary, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Users size={18} style={{ color: '#F59E0B' }} /> By Assignee
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                {data.assignee_breakdown.map((a: any, i: number) => (
                  <div key={i} style={{ padding: 14, backgroundColor: isDark ? 'var(--cp-bg-surface, #242528)' : '#F8FAFC', borderRadius: 8 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: textPrimary, margin: '0 0 8px' }}>{a.assignee_name}</p>
                    <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                      <span>Total: {a.total}</span>
                      <span style={{ color: '#059669' }}>Passed: {a.passed}</span>
                      <span style={{ color: '#DC2626' }}>Failed: {a.failed}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Test Cases Table */}
          {data.test_cases && data.test_cases.length > 0 && (
            <div style={{ backgroundColor: surfaceBg, borderRadius: 12, padding: 20, border: `1px solid ${borderColor}` }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: textPrimary, margin: '0 0 16px' }}>Test Case Results ({data.test_cases.length})</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${borderColor}` }}>
                      <th style={{ textAlign: 'left', padding: '12px 8px', color: textSecondary, fontWeight: 600 }}>Case Key</th>
                      <th style={{ textAlign: 'left', padding: '12px 8px', color: textSecondary, fontWeight: 600 }}>Title</th>
                      <th style={{ textAlign: 'left', padding: '12px 8px', color: textSecondary, fontWeight: 600 }}>Priority</th>
                      <th style={{ textAlign: 'left', padding: '12px 8px', color: textSecondary, fontWeight: 600 }}>Status</th>
                      <th style={{ textAlign: 'left', padding: '12px 8px', color: textSecondary, fontWeight: 600 }}>Executed By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.test_cases.map((tc: any, i: number) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${borderSubtle}` }}>
                        <td style={{ padding: '12px 8px' }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#2563EB', backgroundColor: isDark ? '#1e293b' : '#EFF6FF', padding: '2px 6px', borderRadius: 4 }}>{tc.case_key}</span>
                        </td>
                        <td style={{ padding: '12px 8px', color: textPrimary }}>{tc.title}</td>
                        <td style={{ padding: '12px 8px', textTransform: 'capitalize', color: textBody }}>{tc.priority}</td>
                        <td style={{ padding: '12px 8px' }}>
                          <span style={{
                            fontSize: 11, fontWeight: 500, padding: '3px 8px', borderRadius: 4,
                            backgroundColor: tc.status === 'passed' ? (isDark ? '#1A2E1A' : '#ECFDF5') : tc.status === 'failed' ? (isDark ? '#3D2020' : '#FEF2F2') : (isDark ? 'var(--cp-bg-surface, #242528)' : '#F1F5F9'),
                            color: tc.status === 'passed' ? '#059669' : tc.status === 'failed' ? '#DC2626' : textSecondary,
                          }}>
                            {tc.status || 'Not Run'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 8px', color: textSecondary }}>{tc.executed_by || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Defect Report */}
      {report.type === 'defect' && data.defects && (
        <div style={{ backgroundColor: surfaceBg, borderRadius: 12, padding: 20, border: `1px solid ${borderColor}` }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: textPrimary, margin: '0 0 16px' }}>Defects ({data.total_defects})</h3>
          <p style={{ fontSize: 13, color: textSecondary, marginBottom: 16 }}>
            Date range: {data.date_range?.from || 'All time'} to {data.date_range?.to || 'Present'}
          </p>
          {data.severity_breakdown && (
            <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
              {Object.entries(data.severity_breakdown).map(([sev, count]) => (
                <div key={sev} style={{ padding: '8px 16px', backgroundColor: isDark ? 'var(--cp-bg-surface, #242528)' : '#F8FAFC', borderRadius: 8, fontSize: 13, color: textBody }}>
                  <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{sev}</span>: {String(count)}
                </div>
              ))}
            </div>
          )}
          {Array.isArray(data.defects) && data.defects.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${borderColor}` }}>
                  <th style={{ textAlign: 'left', padding: '12px 8px', color: textSecondary, fontWeight: 600 }}>Key</th>
                  <th style={{ textAlign: 'left', padding: '12px 8px', color: textSecondary, fontWeight: 600 }}>Title</th>
                  <th style={{ textAlign: 'left', padding: '12px 8px', color: textSecondary, fontWeight: 600 }}>Severity</th>
                  <th style={{ textAlign: 'left', padding: '12px 8px', color: textSecondary, fontWeight: 600 }}>Status</th>
                  <th style={{ textAlign: 'left', padding: '12px 8px', color: textSecondary, fontWeight: 600 }}>Reporter</th>
                </tr>
              </thead>
              <tbody>
                {data.defects.map((d: any, i: number) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${borderSubtle}` }}>
                    <td style={{ padding: '12px 8px' }}><span style={{ fontSize: 12, fontWeight: 600, color: '#DC2626', backgroundColor: isDark ? '#3D2020' : '#FEF2F2', padding: '2px 6px', borderRadius: 4 }}>{d.defect_key}</span></td>
                    <td style={{ padding: '12px 8px', color: textPrimary }}>{d.title}</td>
                    <td style={{ padding: '12px 8px', textTransform: 'capitalize', color: textBody }}>{d.severity}</td>
                    <td style={{ padding: '12px 8px', textTransform: 'capitalize', color: textBody }}>{d.status}</td>
                    <td style={{ padding: '12px 8px', color: textSecondary }}>{d.reporter || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Generic placeholder for other types */}
      {!['cycle_summary', 'defect'].includes(report.type) && (
        <div style={{ backgroundColor: surfaceBg, borderRadius: 12, padding: 40, border: `1px solid ${borderColor}`, textAlign: 'center' }}>
          <FileBarChart size={48} style={{ color: isDark ? '#878787' : '#CBD5E1', marginBottom: 16 }} />
          <p style={{ fontSize: 16, color: textSecondary, margin: 0 }}>Report data visualization coming soon</p>
          <p style={{ fontSize: 13, color: textMuted, margin: '8px 0 0' }}>Raw data has been captured and stored</p>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media print { button { display: none !important; } }
      `}</style>
    </div>
  );
}
