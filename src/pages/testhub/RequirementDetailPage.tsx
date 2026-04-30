/**
 * G8-04: Requirement Detail Page
 * Route: /testhub/requirements/:requirementId
 * Authority: tm_requirements + tm_requirement_tests
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, FileCheck, Trash2, Plus, Link2, Unlink,
  CheckCircle2, XCircle, Clock, AlertTriangle, User, Tag,
  ExternalLink, RefreshCw, FileText, ChevronRight, Bug
} from 'lucide-react';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { catalystToast } from '@/components/ui/CatalystToast';
import { LinkTestCaseModal } from '@/components/testhub/requirements/LinkTestCaseModal';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useTheme } from '@/hooks/useTheme';
import { useDefectsByRequirementId } from '@/hooks/useDefectsG25';
import { EntityCommentsPanel } from '@/components/testhub/EntityCommentsPanel';
import { EntityAttachmentsPanel } from '@/components/testhub/EntityAttachmentsPanel';

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
  created_at: string;
}

interface LinkedTest {
  link_id: string;
  test_case_id: string;
  case_key: string;
  title: string;
  priority: string;
  coverage_status: string;
}

const COVERAGE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  'Passed':  { label: 'PASSED',  color: '#006644', bg: '#E3FCEF' },
  'Failed':  { label: 'FAILED',  color: '#BF2600', bg: '#FFEBE6' },
  'Blocked': { label: 'BLOCKED', color: '#FF8B00', bg: '#FFFAE6' },
  'Skipped': { label: 'SKIPPED', color: '#6B778C', bg: '#DFE1E6' },
  'Not Run': { label: 'NOT RUN', color: '#253858', bg: '#DFE1E6' },
};

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  functional: { label: 'Functional', color: '#2563EB', bg: '#EFF6FF' },
  non_functional: { label: 'Non-Functional', color: '#64748B', bg: '#F1F5F9' },
  user_story: { label: 'User Story', color: '#0891B2', bg: '#ECFEFF' },
  epic: { label: 'Epic', color: '#64748B', bg: '#F1F5F9' },
  feature: { label: 'Feature', color: '#059669', bg: '#ECFDF5' },
  bug_fix: { label: 'Bug Fix', color: '#DC2626', bg: '#FEF2F2' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft:        { label: 'DRAFT',        color: '#253858', bg: '#DFE1E6' },
  approved:     { label: 'APPROVED',     color: '#0747A6', bg: '#DEEBFF' },
  in_progress:  { label: 'IN PROGRESS',  color: '#0747A6', bg: '#DEEBFF' },
  implemented:  { label: 'IMPLEMENTED',  color: '#006644', bg: '#E3FCEF' },
  verified:     { label: 'VERIFIED',     color: '#006644', bg: '#E3FCEF' },
  deprecated:   { label: 'DEPRECATED',   color: '#253858', bg: '#DFE1E6' },
};

const defectStatusColors: Record<string, { bg: string; color: string }> = {
  open:        { bg: '#DFE1E6', color: '#253858' },
  new:         { bg: '#DFE1E6', color: '#253858' },
  deferred:    { bg: '#DFE1E6', color: '#253858' },
  in_progress: { bg: '#DEEBFF', color: '#0747A6' },
  reopened:    { bg: '#DEEBFF', color: '#0747A6' },
  fixed:       { bg: '#E3FCEF', color: '#006644' },
  resolved:    { bg: '#E3FCEF', color: '#006644' },
  closed:      { bg: '#E3FCEF', color: '#006644' },
  verified:    { bg: '#E3FCEF', color: '#006644' },
};

const RequirementDefectsPanel = ({ requirementId }: { requirementId?: string }) => {
  const { data: defects = [], isLoading } = useDefectsByRequirementId(requirementId);

  if (isLoading) {
    return <div style={{ padding: 24, color: '#94A3B8', textAlign: 'center' }}>Loading defects...</div>;
  }

  if (defects.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>
        <Bug size={40} style={{ marginBottom: 12, opacity: 0.5 }} />
        <p style={{ margin: 0 }}>No defects linked to this requirement.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ height: 36, backgroundColor: '#111111', textAlign: 'left' }}>
            {['Defect Key', 'Title', 'Status', 'Severity', 'Source'].map(h => (
              <th key={h} style={{ padding: '8px 12px', fontWeight: 600, color: '#A1A1A1', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.03em', borderBottom: '1px solid #2E2E2E' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {defects.map((d: any) => {
            const sc = defectStatusColors[d.status] ?? { bg: '#DFE1E6', color: '#253858' };
            return (
              <tr key={d.id} style={{ height: 36, backgroundColor: '#1A1A1A', borderBottom: '0.75px solid #2E2E2E' }}>
                <td style={{ padding: '8px 12px' }}>
                  <span style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 12, fontWeight: 600, color: '#2563EB' }}>
                    {d.defect_key}
                  </span>
                </td>
                <td style={{ padding: '8px 12px', color: '#EDEDED' }}>{d.title}</td>
                <td style={{ padding: '8px 12px' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', height: 20, padding: '2px 6px', borderRadius: 3,
                    fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em',
                    backgroundColor: sc.bg, color: sc.color,
                  }}>
                    {d.status?.replace(/_/g, ' ')}
                  </span>
                </td>
                <td style={{ padding: '8px 12px', color: '#A1A1A1' }}>{d.severity ?? '—'}</td>
                <td style={{ padding: '8px 12px' }}>
                  {d.link_source === 'auto_execution' && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#A1A1A1', backgroundColor: '#1F1F1F', padding: '2px 6px', borderRadius: 4 }}>Auto</span>
                  )}
                  {d.link_source === 'auto_jira' && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#A1A1A1', backgroundColor: '#1F1F1F', padding: '2px 6px', borderRadius: 4 }}>Jira</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default function RequirementDetailPage() {
  const { requirementId } = useParams();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [requirement, setRequirement] = useState<Requirement | null>(null);
  const [linkedTests, setLinkedTests] = useState<LinkedTest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLinkModal, setShowLinkModal] = useState(false);

  const fetchRequirement = async () => {
    if (!requirementId) return;
    setIsLoading(true);
    try {
      const { data: reqData, error: reqErr } = await typedQuery('tm_requirements')
        .select('id, req_key, title, description, type, priority, status, source, external_id, release_version, created_at')
        .eq('id', requirementId)
        .single();
      if (reqErr) throw reqErr;
      if (reqData) setRequirement(reqData);

      // Fetch linked tests via tm_requirement_tests joined to tm_test_cases
      const { data: linksData } = await typedQuery('tm_requirement_tests')
        .select('id, test_case_id, coverage_status, test_case:tm_test_cases(id, case_key, title, priority_id, priority:tm_case_priorities(id, name, color))')
        .eq('requirement_id', requirementId);
      
      if (linksData) {
        setLinkedTests((linksData as any[]).map((l: any) => ({
          link_id: l.id,
          test_case_id: l.test_case_id,
          case_key: l.test_case?.case_key || '—',
          title: l.test_case?.title || 'Unknown',
          priority: l.test_case?.priority?.name || 'Medium',
          coverage_status: l.coverage_status || 'Not Run',
        })));
      } else {
        setLinkedTests([]);
      }
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
      const { error } = await typedQuery('tm_requirements').update({ status: newStatus }).eq('id', requirement.id);
      if (error) throw error;
      catalystToast.success(`Status changed to ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
      fetchRequirement();
    } catch { catalystToast.error('Failed to update status'); }
  };

  const unlinkTest = async (linkId: string) => {
    if (!confirm('Remove this test case from the requirement?')) return;
    try {
      const { error } = await typedQuery('tm_requirement_tests').delete().eq('id', linkId);
      if (error) throw error;
      catalystToast.success('Test case unlinked');
      fetchRequirement();
    } catch { catalystToast.error('Failed to unlink test case'); }
  };

  const deleteRequirement = async () => {
    if (!requirement) return;
    if (!confirm(`Delete ${requirement.req_key}? This cannot be undone.`)) return;
    try {
      const { error } = await typedQuery('tm_requirements').delete().eq('id', requirement.id);
      if (error) throw error;
      catalystToast.success('Requirement deleted');
      navigate('/testhub/requirements');
    } catch { catalystToast.error('Failed to delete requirement'); }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: isDark ? 'var(--cp-bg-page, #1F1F21)' : '#F8FAFC' }}>
        <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', color: '#2563EB' }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!requirement) {
    return <div style={{ padding: 24, textAlign: 'center', color: '#64748B' }}>Requirement not found</div>;
  }

  const type = TYPE_CONFIG[requirement.type] || TYPE_CONFIG.functional;
  const safeStatus = (requirement.status || 'draft').toLowerCase().replace(/-/g, '_');
  const status = STATUS_CONFIG[safeStatus] ?? STATUS_CONFIG.draft;

  return (
    <div style={{ padding: 24, backgroundColor: isDark ? 'var(--cp-bg-page, #1F1F21)' : '#F8FAFC', minHeight: '100vh' }}>
      <button onClick={() => navigate('/testhub/requirements')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', border: isDark ? '1px solid #2E2E2E' : '1px solid #E2E8F0', borderRadius: 8, backgroundColor: isDark ? 'var(--cp-bg-surface, #242528)' : '#FFF', color: 'var(--cp-text-tertiary, #64748B)', fontSize: 13, cursor: 'pointer', marginBottom: 16 }}>
        <ArrowLeft size={16} /> Back to Requirements
      </button>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#2563EB', backgroundColor: '#EFF6FF', padding: '6px 14px', borderRadius: 8 }}>{requirement.req_key}</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: type.color, backgroundColor: type.bg, padding: '4px 10px', borderRadius: 6 }}>{type.label}</span>
            <span style={{
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em',
              color: status.color, backgroundColor: status.bg,
              padding: '2px 6px', borderRadius: 4, height: 20, display: 'inline-flex', alignItems: 'center',
            }}>{status.label}</span>
            {requirement.external_id && (
              <span style={{ fontSize: 12, fontWeight: 500, color: '#64748B', backgroundColor: '#F1F5F9', padding: '4px 10px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                <ExternalLink size={12} /> {requirement.external_id}
              </span>
            )}
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--cp-text-primary, #0F172A)', margin: 0 }}>{requirement.title}</h1>
          <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 13, color: '#64748B' }}>
            {requirement.release_version && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Tag size={14} /> v{requirement.release_version}</span>}
            <span>Created {formatDate(requirement.created_at)}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Select value={requirement.status} onValueChange={updateStatus}>
            <SelectTrigger style={{ height: 40, width: 160 }}><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_CONFIG).map(([key, val]) => <SelectItem key={key} value={key}>{val.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <button onClick={deleteRequirement}
            style={{ display: 'flex', alignItems: 'center', gap: 6, height: 40, padding: '0 14px', border: '1px solid #FECACA', borderRadius: 8, backgroundColor: '#FEF2F2', color: '#DC2626', fontSize: 13, cursor: 'pointer' }}>
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Description */}
      {requirement.description && (
        <div style={{ backgroundColor: isDark ? 'var(--cp-bg-surface, #242528)' : '#FFF', borderRadius: 12, padding: 24, border: isDark ? '1px solid #2E2E2E' : '1px solid #E2E8F0', marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--cp-text-primary, #0F172A)', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={18} style={{ color: '#2563EB' }} /> Description
          </h3>
          <p style={{ fontSize: 14, color: '#334155', margin: 0, whiteSpace: 'pre-wrap' }}>{requirement.description}</p>
        </div>
      )}

      {/* Linked Tests */}
      <div style={{ backgroundColor: isDark ? 'var(--cp-bg-surface, #242528)' : '#FFF', borderRadius: 12, padding: 24, border: isDark ? '1px solid #2E2E2E' : '1px solid #E2E8F0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--cp-text-primary, #0F172A)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link2 size={18} style={{ color: '#2563EB' }} /> Linked Test Cases ({linkedTests.length})
          </h3>
          <button onClick={() => setShowLinkModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, height: 50, padding: '0 14px', border: 'none', borderRadius: 8, backgroundColor: '#2563EB', color: '#FFF', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
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
            {linkedTests.map((test) => (
              <div key={test.link_id}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 14, backgroundColor: isDark ? 'var(--cp-bg-surface, #242528)' : '#F8FAFC', borderRadius: 12, border: isDark ? '1px solid #2E2E2E' : '1px solid #E2E8F0' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#2563EB', backgroundColor: '#EFF6FF', padding: '2px 8px', borderRadius: 4 }}>{test.case_key}</span>
                    <span style={{ fontSize: 11, fontWeight: 500, color: '#64748B' }}>{test.priority}</span>
                    {(() => {
                      const cov = COVERAGE_CONFIG[test.coverage_status] || COVERAGE_CONFIG['Not Run'];
                      return (
                        <span style={{
                          fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em',
                          color: cov.color, backgroundColor: cov.bg,
                          padding: '2px 6px', borderRadius: 3, height: 20, display: 'inline-flex', alignItems: 'center',
                        }}>{cov.label}</span>
                      );
                    })()}
                  </div>
                  <p style={{ fontSize: 14, color: 'var(--cp-text-primary, #0F172A)', margin: 0 }}>{test.title}</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => navigate(`/testhub/repository?view=${test.test_case_id}`)}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, height: 32, padding: '8px 12px', border: isDark ? '1px solid #2E2E2E' : '1px solid #E2E8F0', borderRadius: 6, backgroundColor: isDark ? 'var(--cp-bg-surface, #242528)' : '#FFF', color: 'var(--cp-text-secondary, #334155)', fontSize: 12, cursor: 'pointer' }}>
                    View <ChevronRight size={14} />
                  </button>
                  <button onClick={() => unlinkTest(test.link_id)}
                    style={{ width: 32, height: 32, border: isDark ? '1px solid #2E2E2E' : '1px solid #E2E8F0', borderRadius: 6, backgroundColor: isDark ? 'var(--cp-bg-surface, #242528)' : '#FFF', color: 'var(--cp-text-muted, #94A3B8)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Unlink size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Linked Defects */}
      <div style={{ backgroundColor: isDark ? 'var(--cp-bg-surface, #242528)' : '#FFF', borderRadius: 12, padding: 24, border: isDark ? '1px solid #2E2E2E' : '1px solid #E2E8F0', marginTop: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--cp-text-primary, #0F172A)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bug size={18} style={{ color: '#E5493A' }} /> Linked Defects
          </h3>
        </div>
        <RequirementDefectsPanel requirementId={requirementId} />
      </div>

      {/* Comments */}
      <div style={{ backgroundColor: isDark ? 'var(--cp-bg-surface, #242528)' : '#FFF', borderRadius: 12, padding: 24, border: isDark ? '1px solid #2E2E2E' : '1px solid #E2E8F0', marginTop: 24 }}>
        <EntityCommentsPanel entityType="requirement" entityId={requirement?.id} title="Requirement Comments" />
      </div>

      {/* Attachments */}
      <div style={{ backgroundColor: isDark ? 'var(--cp-bg-surface, #242528)' : '#FFF', borderRadius: 12, padding: 24, border: isDark ? '1px solid #2E2E2E' : '1px solid #E2E8F0', marginTop: 24 }}>
        <EntityAttachmentsPanel entityType="requirement" entityId={requirement?.id} title="Requirement Attachments" />
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