/**
 * G8-04: Requirement Detail Page
 * Route: /testhub/requirements/:requirementId
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, FileCheck, Trash2, Plus, Link2, Unlink,
  CheckCircle2, XCircle, Clock, AlertTriangle, User, Tag,
  ExternalLink, RefreshCw, FileText, ChevronRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/components/ui/CatalystToast';
import { LinkTestCaseModal } from '@/components/testhub/requirements/LinkTestCaseModal';

interface Requirement {
  id: string;
  req_key: string;
  title: string;
  description: string | null;
  type: string;
  priority: string;
  status: string;
  source: string | null;
  external_id: string | null;
  release_version: string | null;
  total_linked_tests: number;
  passed_tests: number;
  failed_tests: number;
  not_run_tests: number;
  coverage_percent: number;
  created_at: string;
  owner?: { full_name: string } | null;
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

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  functional: { label: 'Functional', color: '#2563EB', bg: '#EFF6FF' },
  non_functional: { label: 'Non-Functional', color: '#7C3AED', bg: '#F5F3FF' },
  user_story: { label: 'User Story', color: '#0891B2', bg: '#ECFEFF' },
  epic: { label: 'Epic', color: '#C026D3', bg: '#FDF4FF' },
  feature: { label: 'Feature', color: '#059669', bg: '#ECFDF5' },
  bug_fix: { label: 'Bug Fix', color: '#DC2626', bg: '#FEF2F2' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'Draft', color: '#64748B', bg: '#F1F5F9' },
  approved: { label: 'Approved', color: '#2563EB', bg: '#EFF6FF' },
  in_progress: { label: 'In Progress', color: '#D97706', bg: '#FFFBEB' },
  implemented: { label: 'Implemented', color: '#7C3AED', bg: '#F5F3FF' },
  verified: { label: 'Verified', color: '#059669', bg: '#ECFDF5' },
  deprecated: { label: 'Deprecated', color: '#94A3B8', bg: '#F8FAFC' },
};

const EXEC_STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  passed: { label: 'Passed', color: '#059669', icon: CheckCircle2 },
  failed: { label: 'Failed', color: '#DC2626', icon: XCircle },
  blocked: { label: 'Blocked', color: '#D97706', icon: AlertTriangle },
  skipped: { label: 'Skipped', color: '#64748B', icon: Clock },
  not_run: { label: 'Not Run', color: '#94A3B8', icon: Clock },
};

export default function RequirementDetailPage() {
  const { requirementId } = useParams();
  const navigate = useNavigate();
  const [requirement, setRequirement] = useState<Requirement | null>(null);
  const [linkedTests, setLinkedTests] = useState<LinkedTest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLinkModal, setShowLinkModal] = useState(false);

  const fetchRequirement = async () => {
    if (!requirementId) return;
    setIsLoading(true);
    try {
      const { data: reqData } = await supabase
        .from('th_requirements' as any)
        .select(`*, owner:profiles!th_requirements_owner_id_fkey(full_name)`)
        .eq('id', requirementId)
        .single();
      if (reqData) setRequirement(reqData as any);

      const { data: testsData } = await supabase.rpc('get_requirement_tests' as any, { p_requirement_id: requirementId });
      if (testsData) setLinkedTests(testsData as any[]);
    } catch (err) {
      console.error('Fetch requirement error:', err);
      catalystToast.error('Failed to load requirement');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchRequirement(); }, [requirementId]);

  const updateStatus = async (newStatus: string) => {
    if (!requirement) return;
    try {
      const { error } = await supabase.from('th_requirements' as any).update({ status: newStatus }).eq('id', requirement.id);
      if (error) throw error;
      catalystToast.success(`Status changed to ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
      fetchRequirement();
    } catch { catalystToast.error('Failed to update status'); }
  };

  const unlinkTest = async (linkId: string) => {
    if (!confirm('Remove this test case from the requirement?')) return;
    try {
      const { error } = await supabase.from('th_requirement_tests' as any).delete().eq('id', linkId);
      if (error) throw error;
      catalystToast.success('Test case unlinked');
      fetchRequirement();
    } catch { catalystToast.error('Failed to unlink test case'); }
  };

  const deleteRequirement = async () => {
    if (!requirement) return;
    if (!confirm(`Delete ${requirement.req_key}? This cannot be undone.`)) return;
    try {
      const { error } = await supabase.from('th_requirements' as any).delete().eq('id', requirement.id);
      if (error) throw error;
      catalystToast.success('Requirement deleted');
      navigate('/testhub/requirements');
    } catch { catalystToast.error('Failed to delete requirement'); }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getCoverageColor = (percent: number) => {
    if (percent === 100) return '#059669';
    if (percent >= 50) return '#D97706';
    return '#DC2626';
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#F8FAFC' }}>
        <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', color: '#0891B2' }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!requirement) {
    return <div style={{ padding: 24, textAlign: 'center', color: '#64748B' }}>Requirement not found</div>;
  }

  const type = TYPE_CONFIG[requirement.type] || TYPE_CONFIG.functional;
  const status = STATUS_CONFIG[requirement.status] || STATUS_CONFIG.draft;
  const coverageColor = getCoverageColor(requirement.coverage_percent);

  return (
    <div style={{ padding: 24, backgroundColor: '#F8FAFC', minHeight: '100vh' }}>
      <button onClick={() => navigate('/testhub/requirements')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 8, backgroundColor: '#FFF', color: '#64748B', fontSize: 13, cursor: 'pointer', marginBottom: 16 }}>
        <ArrowLeft size={16} /> Back to Requirements
      </button>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#0891B2', backgroundColor: '#ECFEFF', padding: '6px 14px', borderRadius: 8 }}>{requirement.req_key}</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: type.color, backgroundColor: type.bg, padding: '4px 10px', borderRadius: 6 }}>{type.label}</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: status.color, backgroundColor: status.bg, padding: '4px 10px', borderRadius: 6 }}>{status.label}</span>
            {requirement.external_id && (
              <span style={{ fontSize: 12, fontWeight: 500, color: '#64748B', backgroundColor: '#F1F5F9', padding: '4px 10px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                <ExternalLink size={12} /> {requirement.external_id}
              </span>
            )}
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0F172A', margin: 0 }}>{requirement.title}</h1>
          <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 13, color: '#64748B' }}>
            {requirement.owner && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><User size={14} /> {requirement.owner.full_name}</span>}
            {requirement.release_version && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Tag size={14} /> v{requirement.release_version}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={requirement.status} onChange={(e) => updateStatus(e.target.value)}
            style={{ height: 40, padding: '0 14px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, backgroundColor: '#FFF', cursor: 'pointer' }}>
            {Object.entries(STATUS_CONFIG).map(([key, val]) => <option key={key} value={key}>{val.label}</option>)}
          </select>
          <button onClick={deleteRequirement}
            style={{ display: 'flex', alignItems: 'center', gap: 6, height: 40, padding: '0 14px', border: '1px solid #FECACA', borderRadius: 8, backgroundColor: '#FEF2F2', color: '#DC2626', fontSize: 13, cursor: 'pointer' }}>
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Coverage Card */}
      <div style={{ backgroundColor: '#FFF', borderRadius: 12, padding: 24, border: '1px solid #E2E8F0', marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0F172A', margin: '0 0 16px' }}>Test Coverage</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 14, color: '#64748B' }}>Coverage</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: coverageColor }}>{requirement.coverage_percent}%</span>
            </div>
            <div style={{ height: 12, backgroundColor: '#E2E8F0', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${requirement.coverage_percent}%`, backgroundColor: coverageColor, borderRadius: 6 }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 20, borderLeft: '1px solid #E2E8F0', paddingLeft: 24 }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 24, fontWeight: 700, color: '#0F172A', margin: 0 }}>{requirement.total_linked_tests}</p>
              <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 0' }}>Linked</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 24, fontWeight: 700, color: '#059669', margin: 0 }}>{requirement.passed_tests}</p>
              <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 0' }}>Passed</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 24, fontWeight: 700, color: '#DC2626', margin: 0 }}>{requirement.failed_tests}</p>
              <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 0' }}>Failed</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 24, fontWeight: 700, color: '#94A3B8', margin: 0 }}>{requirement.not_run_tests}</p>
              <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 0' }}>Not Run</p>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      {requirement.description && (
        <div style={{ backgroundColor: '#FFF', borderRadius: 12, padding: 24, border: '1px solid #E2E8F0', marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0F172A', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={18} style={{ color: '#0891B2' }} /> Description
          </h3>
          <p style={{ fontSize: 14, color: '#334155', margin: 0, whiteSpace: 'pre-wrap' }}>{requirement.description}</p>
        </div>
      )}

      {/* Linked Tests */}
      <div style={{ backgroundColor: '#FFF', borderRadius: 12, padding: 24, border: '1px solid #E2E8F0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link2 size={18} style={{ color: '#0891B2' }} /> Linked Test Cases ({linkedTests.length})
          </h3>
          <button onClick={() => setShowLinkModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 14px', border: 'none', borderRadius: 8, backgroundColor: '#0891B2', color: '#FFF', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            <Plus size={16} /> Link Test Case
          </button>
        </div>

        {linkedTests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>
            <Link2 size={40} style={{ marginBottom: 12, opacity: 0.5 }} />
            <p style={{ margin: 0 }}>No test cases linked</p>
            <p style={{ margin: '8px 0 0', fontSize: 13 }}>Link test cases to track coverage</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {linkedTests.map((test) => {
              const execStatus = EXEC_STATUS_CONFIG[test.latest_status || 'not_run'];
              const StatusIcon = execStatus.icon;
              return (
                <div key={test.link_id}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 14, backgroundColor: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#2563EB', backgroundColor: '#EFF6FF', padding: '2px 8px', borderRadius: 4 }}>{test.case_key}</span>
                      <span style={{ fontSize: 11, fontWeight: 500, color: execStatus.color, display: 'flex', alignItems: 'center', gap: 3 }}>
                        <StatusIcon size={12} /> {execStatus.label}
                      </span>
                    </div>
                    <p style={{ fontSize: 14, color: '#0F172A', margin: 0 }}>{test.title}</p>
                    {test.last_executed && <p style={{ fontSize: 12, color: '#94A3B8', margin: '4px 0 0' }}>Last executed: {formatDate(test.last_executed)}</p>}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => navigate(`/testhub/repository?view=${test.test_case_id}`)}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, height: 32, padding: '0 12px', border: '1px solid #E2E8F0', borderRadius: 6, backgroundColor: '#FFF', color: '#334155', fontSize: 12, cursor: 'pointer' }}>
                      View <ChevronRight size={14} />
                    </button>
                    <button onClick={() => unlinkTest(test.link_id)}
                      style={{ width: 32, height: 32, border: '1px solid #E2E8F0', borderRadius: 6, backgroundColor: '#FFF', color: '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Unlink size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showLinkModal && (
        <LinkTestCaseModal
          isOpen={showLinkModal}
          onClose={() => setShowLinkModal(false)}
          requirementId={requirementId!}
          onLinked={fetchRequirement}
          alreadyLinkedIds={linkedTests.map(t => t.test_case_id)}
        />
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
