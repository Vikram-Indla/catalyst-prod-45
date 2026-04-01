/**
 * G8-02: Requirements List Page
 * Route: /testhub/requirements
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileCheck, Plus, Search, X, Link2, RefreshCw, ChevronRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/components/ui/CatalystToast';
import { TestHubPageHeader } from '@/components/testhub/TestHubPageHeader';
import { CreateRequirementModal } from '@/components/testhub/requirements/CreateRequirementModal';

interface Requirement {
  id: string;
  req_key: string;
  title: string;
  description: string | null;
  type: string;
  priority: string;
  status: string;
  release_version: string | null;
  total_linked_tests: number;
  passed_tests: number;
  failed_tests: number;
  not_run_tests: number;
  coverage_percent: number;
  created_at: string;
  owner?: { full_name: string } | null;
}

interface CoverageSummary {
  total_requirements: number;
  fully_covered: number;
  partially_covered: number;
  not_covered: number;
  avg_coverage_percent: number;
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

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  critical: { label: 'Critical', color: '#DC2626' },
  high: { label: 'High', color: '#EA580C' },
  medium: { label: 'Medium', color: '#D97706' },
  low: { label: 'Low', color: '#059669' },
};

export default function RequirementsListPage() {
  const navigate = useNavigate();
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [summary, setSummary] = useState<CoverageSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [coverageFilter, setCoverageFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchRequirements = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('th_requirements' as any)
        .select(`*, owner:profiles!th_requirements_owner_id_fkey(full_name)`)
        .order('created_at', { ascending: false });

      if (typeFilter !== 'all') query = query.eq('type', typeFilter);
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      } else {
        query = query.neq('status', 'deprecated');
      }

      const { data, error } = await query;
      if (error) throw error;

      let filtered = (data as any[]) || [];
      if (coverageFilter === 'covered') {
        filtered = filtered.filter(r => r.coverage_percent === 100);
      } else if (coverageFilter === 'partial') {
        filtered = filtered.filter(r => r.coverage_percent > 0 && r.coverage_percent < 100);
      } else if (coverageFilter === 'none') {
        filtered = filtered.filter(r => r.coverage_percent === 0 || r.total_linked_tests === 0);
      }

      setRequirements(filtered);

      const { data: summaryData } = await supabase.rpc('get_requirements_coverage_summary' as any);
      if (summaryData && Array.isArray(summaryData) && summaryData.length > 0) {
        setSummary(summaryData[0]);
      }
    } catch (err) {
      console.error('Fetch requirements error:', err);
      catalystToast.error('Failed to load requirements');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequirements();
  }, [typeFilter, statusFilter, coverageFilter]);

  const filteredRequirements = requirements.filter(r => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      r.req_key.toLowerCase().includes(search) ||
      r.title.toLowerCase().includes(search)
    );
  });

  const clearFilters = () => {
    setSearchTerm('');
    setTypeFilter('all');
    setStatusFilter('all');
    setCoverageFilter('all');
  };

  const hasActiveFilters = typeFilter !== 'all' || statusFilter !== 'all' || coverageFilter !== 'all' || searchTerm;

  const getCoverageColor = (percent: number) => {
    if (percent === 100) return '#059669';
    if (percent >= 50) return '#D97706';
    return '#DC2626';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#F8FAFC' }}>
      <TestHubPageHeader title="Requirements" subtitle="Track test coverage for requirements and user stories">
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, height: 40, padding: '0 20px',
            border: 'none', borderRadius: 8,
            background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
            color: '#FFFFFF', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
          }}
        >
          <Plus size={18} /> Add Requirement
        </button>
      </TestHubPageHeader>
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>

      {/* Coverage Summary Cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          <div style={{ backgroundColor: '#FFF', borderRadius: 12, padding: 20, border: '1px solid #E2E8F0' }}>
            <p style={{ fontSize: 12, color: '#64748B', margin: 0, textTransform: 'uppercase' }}>Total Requirements</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: '#0F172A', margin: '8px 0 0' }}>{summary.total_requirements}</p>
          </div>
          <div style={{ backgroundColor: '#ECFDF5', borderRadius: 12, padding: 20, border: '1px solid #A7F3D0' }}>
            <p style={{ fontSize: 12, color: '#059669', margin: 0, textTransform: 'uppercase' }}>Fully Covered</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: '#059669', margin: '8px 0 0' }}>{summary.fully_covered}</p>
          </div>
          <div style={{ backgroundColor: '#FFFBEB', borderRadius: 12, padding: 20, border: '1px solid #FDE68A' }}>
            <p style={{ fontSize: 12, color: '#D97706', margin: 0, textTransform: 'uppercase' }}>Partially Covered</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: '#D97706', margin: '8px 0 0' }}>{summary.partially_covered}</p>
          </div>
          <div style={{ backgroundColor: '#FEF2F2', borderRadius: 12, padding: 20, border: '1px solid #FECACA' }}>
            <p style={{ fontSize: 12, color: '#DC2626', margin: 0, textTransform: 'uppercase' }}>No Coverage</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: '#DC2626', margin: '8px 0 0' }}>{summary.not_covered}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 300px', maxWidth: 400 }}>
          <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input
            type="text"
            placeholder="Search requirements..."
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
          <option value="functional">Functional</option>
          <option value="non_functional">Non-Functional</option>
          <option value="user_story">User Story</option>
          <option value="epic">Epic</option>
          <option value="feature">Feature</option>
          <option value="bug_fix">Bug Fix</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          style={{ height: 44, padding: '0 36px 0 14px', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: 14, backgroundColor: '#FFF', cursor: 'pointer' }}>
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="approved">Approved</option>
          <option value="in_progress">In Progress</option>
          <option value="implemented">Implemented</option>
          <option value="verified">Verified</option>
          <option value="deprecated">Deprecated</option>
        </select>
        <select value={coverageFilter} onChange={(e) => setCoverageFilter(e.target.value)}
          style={{ height: 44, padding: '0 36px 0 14px', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: 14, backgroundColor: '#FFF', cursor: 'pointer' }}>
          <option value="all">All Coverage</option>
          <option value="covered">Fully Covered (100%)</option>
          <option value="partial">Partially Covered</option>
          <option value="none">No Coverage</option>
        </select>
        {hasActiveFilters && (
          <button onClick={clearFilters}
            style={{ display: 'flex', alignItems: 'center', gap: 6, height: 44, padding: '0 16px', border: '1.5px solid #E2E8F0', borderRadius: 10, backgroundColor: '#FFF', color: '#64748B', fontSize: 14, cursor: 'pointer' }}>
            <X size={16} /> Clear
          </button>
        )}
      </div>

      <p style={{ fontSize: 13, color: '#64748B', marginBottom: 16 }}>
        Showing {filteredRequirements.length} requirement{filteredRequirements.length !== 1 ? 's' : ''}
      </p>

      {/* Requirements List */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', color: '#0891B2' }} />
        </div>
      ) : filteredRequirements.length === 0 ? (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 60, textAlign: 'center', border: '1px solid #E2E8F0' }}>
          <FileCheck size={48} style={{ color: '#CBD5E1', marginBottom: 16 }} />
          <p style={{ fontSize: 16, color: '#64748B', margin: 0 }}>No requirements found</p>
          <p style={{ fontSize: 14, color: '#94A3B8', margin: '8px 0 0' }}>Add requirements to track test coverage</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredRequirements.map((req) => {
            const type = TYPE_CONFIG[req.type] || TYPE_CONFIG.functional;
            const status = STATUS_CONFIG[req.status] || STATUS_CONFIG.draft;
            const priority = PRIORITY_CONFIG[req.priority] || PRIORITY_CONFIG.medium;
            const coverageColor = getCoverageColor(req.coverage_percent);

            return (
              <div key={req.id} onClick={() => navigate(`/testhub/requirements/${req.id}`)}
                style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 20, border: '1px solid #E2E8F0', cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#0891B2', backgroundColor: '#ECFEFF', padding: '4px 10px', borderRadius: 6 }}>{req.req_key}</span>
                      <span style={{ fontSize: 11, fontWeight: 500, color: type.color, backgroundColor: type.bg, padding: '3px 8px', borderRadius: 4 }}>{type.label}</span>
                      <span style={{ fontSize: 11, fontWeight: 500, color: status.color, backgroundColor: status.bg, padding: '3px 8px', borderRadius: 4 }}>{status.label}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: priority.color, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: priority.color }} />
                        {priority.label}
                      </span>
                    </div>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0F172A', margin: 0 }}>{req.title}</h3>
                    {req.description && (
                      <p style={{ fontSize: 13, color: '#64748B', margin: '8px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 500 }}>{req.description}</p>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', marginLeft: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <div style={{ width: 100, height: 8, backgroundColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${req.coverage_percent}%`, backgroundColor: coverageColor, borderRadius: 4 }} />
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 700, color: coverageColor, minWidth: 45 }}>{req.coverage_percent}%</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: '#64748B' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Link2 size={14} /> {req.total_linked_tests} tests</span>
                      <span style={{ color: '#059669' }}>{req.passed_tests} passed</span>
                      <span style={{ color: '#DC2626' }}>{req.failed_tests} failed</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreateRequirementModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={fetchRequirements}
      />

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
