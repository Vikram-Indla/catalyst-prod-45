/**
 * G8-06: Coverage Matrix Page
 * Route: /testhub/coverage-matrix
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutGrid, ChevronDown, ChevronRight, Link2, CheckCircle2, XCircle, 
  AlertTriangle, Clock, RefreshCw, FileCheck
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/components/ui/CatalystToast';

interface Requirement {
  id: string;
  req_key: string;
  title: string;
  type: string;
  coverage_percent: number;
  total_linked_tests: number;
  passed_tests: number;
  failed_tests: number;
  not_run_tests: number;
}

interface LinkedTest {
  link_id: string;
  test_case_id: string;
  case_key: string;
  title: string;
  priority: string;
  latest_status: string | null;
  last_executed: string | null;
}

const EXEC_ICONS: Record<string, { icon: any; color: string; label: string }> = {
  passed: { icon: CheckCircle2, color: '#059669', label: 'Passed' },
  failed: { icon: XCircle, color: '#DC2626', label: 'Failed' },
  blocked: { icon: AlertTriangle, color: '#D97706', label: 'Blocked' },
  skipped: { icon: Clock, color: '#64748B', label: 'Skipped' },
  not_run: { icon: Clock, color: '#94A3B8', label: 'Not Run' },
};

const getCoverageColor = (percent: number) => {
  if (percent === 100) return '#059669';
  if (percent >= 50) return '#D97706';
  return '#DC2626';
};

export default function CoverageMatrixPage() {
  const navigate = useNavigate();
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [expandedReqs, setExpandedReqs] = useState<Set<string>>(new Set());
  const [linkedTestsMap, setLinkedTestsMap] = useState<Record<string, LinkedTest[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('th_requirements' as any)
          .select('id, req_key, title, type, coverage_percent, total_linked_tests, passed_tests, failed_tests, not_run_tests')
          .neq('status', 'deprecated')
          .order('req_key');
        if (error) throw error;
        setRequirements((data as any[]) || []);

        const { data: summaryData } = await supabase.rpc('get_requirements_coverage_summary' as any);
        if (summaryData && Array.isArray(summaryData) && summaryData.length > 0) {
          setSummary(summaryData[0]);
        }
      } catch (err) {
        console.error('Fetch coverage data error:', err);
        catalystToast.error('Failed to load coverage data');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const toggleExpand = async (reqId: string) => {
    const next = new Set(expandedReqs);
    if (next.has(reqId)) {
      next.delete(reqId);
    } else {
      next.add(reqId);
      if (!linkedTestsMap[reqId]) {
        try {
          const { data } = await supabase.rpc('get_requirement_tests' as any, { p_requirement_id: reqId });
          setLinkedTestsMap(prev => ({ ...prev, [reqId]: (data as any[]) || [] }));
        } catch { /* ignore */ }
      }
    }
    setExpandedReqs(next);
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#F8FAFC' }}>
        <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', color: '#0891B2' }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, backgroundColor: '#F8FAFC', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #0891B2 0%, #0E7490 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <LayoutGrid size={24} style={{ color: '#FFFFFF' }} />
        </div>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0F172A', margin: 0 }}>Coverage Matrix</h1>
          <p style={{ fontSize: 14, color: '#64748B', margin: '4px 0 0' }}>Requirements traceability and test coverage overview</p>
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          <div style={{ backgroundColor: '#FFF', borderRadius: 12, padding: 20, border: '1px solid #E2E8F0' }}>
            <p style={{ fontSize: 12, color: '#64748B', margin: 0, textTransform: 'uppercase' }}>Total</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: '#0F172A', margin: '8px 0 0' }}>{summary.total_requirements}</p>
          </div>
          <div style={{ backgroundColor: '#ECFDF5', borderRadius: 12, padding: 20, border: '1px solid #A7F3D0' }}>
            <p style={{ fontSize: 12, color: '#059669', margin: 0, textTransform: 'uppercase' }}>Fully Covered</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: '#059669', margin: '8px 0 0' }}>{summary.fully_covered}</p>
          </div>
          <div style={{ backgroundColor: '#FFFBEB', borderRadius: 12, padding: 20, border: '1px solid #FDE68A' }}>
            <p style={{ fontSize: 12, color: '#D97706', margin: 0, textTransform: 'uppercase' }}>Partial</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: '#D97706', margin: '8px 0 0' }}>{summary.partially_covered}</p>
          </div>
          <div style={{ backgroundColor: '#FEF2F2', borderRadius: 12, padding: 20, border: '1px solid #FECACA' }}>
            <p style={{ fontSize: 12, color: '#DC2626', margin: 0, textTransform: 'uppercase' }}>No Coverage</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: '#DC2626', margin: '8px 0 0' }}>{summary.not_covered}</p>
          </div>
        </div>
      )}

      {/* Requirements List with Expandable Tests */}
      {requirements.length === 0 ? (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 60, textAlign: 'center', border: '1px solid #E2E8F0' }}>
          <FileCheck size={48} style={{ color: '#CBD5E1', marginBottom: 16 }} />
          <p style={{ fontSize: 16, color: '#64748B', margin: 0 }}>No requirements found</p>
        </div>
      ) : (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          {/* Table Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '40px 120px 1fr 120px 80px 80px 80px', padding: '12px 16px', backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', fontSize: 12, fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
            <span></span>
            <span>Key</span>
            <span>Title</span>
            <span>Coverage</span>
            <span>Passed</span>
            <span>Failed</span>
            <span>Not Run</span>
          </div>

          {requirements.map(req => {
            const isExpanded = expandedReqs.has(req.id);
            const coverageColor = getCoverageColor(req.coverage_percent);
            const tests = linkedTestsMap[req.id] || [];

            return (
              <div key={req.id}>
                <div
                  onClick={() => toggleExpand(req.id)}
                  style={{ display: 'grid', gridTemplateColumns: '40px 120px 1fr 120px 80px 80px 80px', padding: '14px 16px', borderBottom: '1px solid #F1F5F9', cursor: 'pointer', alignItems: 'center', transition: 'background 0.1s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
                  <span style={{ color: '#94A3B8' }}>
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#0891B2' }}>{req.req_key}</span>
                  <span style={{ fontSize: 14, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.title}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 60, height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${req.coverage_percent}%`, backgroundColor: coverageColor, borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: coverageColor }}>{req.coverage_percent}%</span>
                  </div>
                  <span style={{ fontSize: 13, color: '#059669', fontWeight: 500 }}>{req.passed_tests}</span>
                  <span style={{ fontSize: 13, color: '#DC2626', fontWeight: 500 }}>{req.failed_tests}</span>
                  <span style={{ fontSize: 13, color: '#94A3B8', fontWeight: 500 }}>{req.not_run_tests}</span>
                </div>

                {isExpanded && (
                  <div style={{ backgroundColor: '#FAFBFC', borderBottom: '1px solid #E2E8F0' }}>
                    {tests.length === 0 ? (
                      <div style={{ padding: '16px 16px 16px 56px', fontSize: 13, color: '#94A3B8' }}>No linked test cases</div>
                    ) : (
                      tests.map(test => {
                        const execConfig = EXEC_ICONS[test.latest_status || 'not_run'];
                        const StatusIcon = execConfig.icon;
                        return (
                          <div key={test.link_id}
                            onClick={(e) => { e.stopPropagation(); navigate(`/testhub/requirements/${req.id}`); }}
                            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px 10px 56px', borderBottom: '1px solid #F1F5F9', cursor: 'pointer' }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F0FDFA'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#2563EB', backgroundColor: '#EFF6FF', padding: '2px 8px', borderRadius: 4 }}>{test.case_key}</span>
                            <span style={{ flex: 1, fontSize: 13, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{test.title}</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 500, color: execConfig.color }}>
                              <StatusIcon size={14} /> {execConfig.label}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
