/**
 * G8-02: Requirements List Page
 * Route: /testhub/requirements
 * Authority: tm_requirements + tm_requirement_tests
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileCheck, Plus, Search, X, Link2, RefreshCw, ChevronRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/components/ui/CatalystToast';
import { useTheme } from '@/hooks/useTheme';
import { TestHubPageHeader } from '@/components/testhub/TestHubPageHeader';
import { CreateRequirementModal } from '@/components/testhub/requirements/CreateRequirementModal';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface Requirement {
  id: string;
  req_key: string;
  title: string;
  description: string | null;
  type: string;
  priority: string;
  status: string;
  external_id: string | null;
  source: string | null;
  release_version: string | null;
  created_at: string;
  linked_test_count: number;
}

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

const PRIORITY_CONFIG: Record<string, { label: string }> = {
  critical: { label: 'Critical' },
  high: { label: 'High' },
  medium: { label: 'Medium' },
  low: { label: 'Low' },
};

export default function RequirementsListPage() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchRequirements = async () => {
    setIsLoading(true);
    try {
      let query = (supabase as any)
        .from('tm_requirements')
        .select('id, req_key, title, description, type, priority, status, external_id, source, release_version, created_at')
        .order('created_at', { ascending: false });

      if (typeFilter !== 'all') query = query.eq('type', typeFilter);
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      } else {
        query = query.neq('status', 'deprecated');
      }

      const { data, error } = await query;
      if (error) throw error;

      const reqs = (data as any[]) || [];

      // Fetch linked test counts from tm_requirement_tests
      const reqIds = reqs.map((r: any) => r.id);
      let linkCounts: Record<string, number> = {};
      if (reqIds.length > 0) {
        const { data: links } = await (supabase as any)
          .from('tm_requirement_tests')
          .select('requirement_id')
          .in('requirement_id', reqIds);
        if (links) {
          for (const link of links as any[]) {
            linkCounts[link.requirement_id] = (linkCounts[link.requirement_id] || 0) + 1;
          }
        }
      }

      setRequirements(reqs.map((r: any) => ({
        ...r,
        linked_test_count: linkCounts[r.id] || 0,
      })));
    } catch (err) {
      console.error('Fetch requirements error:', err);
      catalystToast.error('Failed to load requirements');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequirements();
  }, [typeFilter, statusFilter]);

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
  };

  const hasActiveFilters = typeFilter !== 'all' || statusFilter !== 'all' || searchTerm;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: isDark ? '#0A0A0A' : '#F8FAFC' }}>
      <TestHubPageHeader title="Requirements" subtitle="Track test coverage for requirements and user stories">
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, height: 40, padding: '0 20px',
            border: 'none', borderRadius: 8,
            backgroundColor: '#2563EB',
            color: '#FFFFFF', fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}
        >
          <Plus size={18} /> Add Requirement
        </button>
      </TestHubPageHeader>
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>

      {/* Summary Cards */}
      {(() => {
        const fullyCount = requirements.filter(r => r.linked_test_count >= 3).length;
        const partialCount = requirements.filter(r => r.linked_test_count > 0 && r.linked_test_count < 3).length;
        const noneCount = requirements.filter(r => r.linked_test_count === 0).length;
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            <div style={{ backgroundColor: isDark ? '#1A1A1A' : '#FFF', borderRadius: 12, padding: 20, border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0' }}>
              <p style={{ fontSize: 12, color: isDark ? '#878787' : '#64748B', margin: 0, textTransform: 'uppercase', fontWeight: 600 }}>Total Requirements</p>
              <p style={{ fontSize: 28, fontWeight: 700, color: isDark ? '#EDEDED' : '#0F172A', margin: '8px 0 0' }}>{requirements.length}</p>
            </div>
            <div style={{ backgroundColor: '#F0FDF4', borderRadius: 12, padding: 20, border: '1px solid #BBF7D0' }}>
              <p style={{ fontSize: 12, color: '#16A34A', margin: 0, textTransform: 'uppercase', fontWeight: 600 }}>Fully Covered</p>
              <p style={{ fontSize: 28, fontWeight: 700, color: '#16A34A', margin: '8px 0 0' }}>{fullyCount}</p>
            </div>
            <div style={{ backgroundColor: '#FFFBEB', borderRadius: 12, padding: 20, border: '1px solid #FDE68A' }}>
              <p style={{ fontSize: 12, color: '#D97706', margin: 0, textTransform: 'uppercase', fontWeight: 600 }}>Partially Covered</p>
              <p style={{ fontSize: 28, fontWeight: 700, color: '#D97706', margin: '8px 0 0' }}>{partialCount}</p>
            </div>
            <div style={{ backgroundColor: '#FEF2F2', borderRadius: 12, padding: 20, border: '1px solid #FECACA' }}>
              <p style={{ fontSize: 12, color: '#DC2626', margin: 0, textTransform: 'uppercase', fontWeight: 600 }}>No Coverage</p>
              <p style={{ fontSize: 28, fontWeight: 700, color: '#DC2626', margin: '8px 0 0' }}>{noneCount}</p>
            </div>
          </div>
        );
      })()}

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
              border: isDark ? '1.5px solid rgba(255,255,255,0.08)' : '1.5px solid #E2E8F0', borderRadius: 12, fontSize: 14, backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF', color: isDark ? '#EDEDED' : undefined,
            }}
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger style={{ width: 160, height: 44 }}><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="functional">Functional</SelectItem>
            <SelectItem value="non_functional">Non-Functional</SelectItem>
            <SelectItem value="user_story">User Story</SelectItem>
            <SelectItem value="epic">Epic</SelectItem>
            <SelectItem value="feature">Feature</SelectItem>
            <SelectItem value="bug_fix">Bug Fix</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger style={{ width: 160, height: 44 }}><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="implemented">Implemented</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="deprecated">Deprecated</SelectItem>
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <button onClick={clearFilters}
            style={{ display: 'flex', alignItems: 'center', gap: 6, height: 44, padding: '0 16px', border: isDark ? '1.5px solid rgba(255,255,255,0.08)' : '1.5px solid #E2E8F0', borderRadius: 12, backgroundColor: isDark ? '#1A1A1A' : '#FFF', color: isDark ? '#A1A1A1' : '#64748B', fontSize: 14, cursor: 'pointer' }}>
            <X size={16} /> Clear
          </button>
        )}
      </div>

      <p style={{ fontSize: 13, color: '#64748B', marginBottom: 16 }}>
        Showing {filteredRequirements.length} requirement{filteredRequirements.length !== 1 ? 's' : ''}
      </p>

      {/* Requirements Table */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', color: '#2563EB' }} />
        </div>
      ) : filteredRequirements.length === 0 ? (
        <div style={{ backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF', borderRadius: 12, padding: 60, textAlign: 'center', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0' }}>
          <FileCheck size={48} style={{ color: isDark ? '#878787' : '#CBD5E1', marginBottom: 16 }} />
          <p style={{ fontSize: 16, color: isDark ? '#A1A1A1' : '#64748B', margin: 0 }}>No requirements found</p>
          <p style={{ fontSize: 14, color: isDark ? '#878787' : '#94A3B8', margin: '8px 0 0' }}>Add requirements to track test coverage</p>
        </div>
      ) : (
        <div style={{ backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF', borderRadius: 8, border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['KEY', 'TITLE', 'TYPE', 'PRIORITY', 'STATUS', 'LINKED TESTS'].map(h => (
                  <th key={h} style={{
                    height: 36, padding: '0 12px', textAlign: 'left',
                    fontSize: 10.5, fontWeight: 600, color: isDark ? '#878787' : '#64748B', textTransform: 'uppercase',
                    borderBottom: isDark ? '0.75px solid rgba(255,255,255,0.08)' : '0.75px solid #E2E8F0', backgroundColor: isDark ? '#1A1A1A' : '#F8FAFC',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRequirements.map((req) => {
                const type = TYPE_CONFIG[req.type] || TYPE_CONFIG.functional;
                const safeStatus = (req.status || 'draft').toLowerCase().replace(/-/g, '_');
                const status = STATUS_CONFIG[safeStatus] ?? STATUS_CONFIG.draft;
                const priority = PRIORITY_CONFIG[req.priority] || PRIORITY_CONFIG.medium;

                return (
                  <tr key={req.id} onClick={() => navigate(`/testhub/requirements/${req.id}`)}
                    style={{ cursor: 'pointer', height: 36, maxHeight: 36, borderBottom: isDark ? '0.75px solid rgba(255,255,255,0.08)' : '0.75px solid #E2E8F0' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}>
                    <td style={{ padding: '0 12px', fontSize: 13, fontWeight: 600, color: '#2563EB' }}>{req.req_key}</td>
                    <td style={{ padding: '0 12px', fontSize: 13, color: isDark ? '#EDEDED' : '#0F172A', maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.title}</td>
                    <td style={{ padding: '0 12px' }}>
                      <span style={{ fontSize: 11, fontWeight: 500, color: type.color, backgroundColor: type.bg, padding: '2px 8px', borderRadius: 4 }}>{type.label}</span>
                    </td>
                    <td style={{ padding: '0 12px' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#374151', backgroundColor: '#F1F5F9', padding: '2px 8px', borderRadius: 4 }}>{priority.label}</span>
                    </td>
                    <td style={{ padding: '0 12px' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em',
                        color: status.color, backgroundColor: status.bg,
                        padding: '2px 6px', borderRadius: 4, height: 20, display: 'inline-flex', alignItems: 'center',
                      }}>{status.label}</span>
                    </td>
                    <td style={{ padding: '0 12px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#64748B' }}>
                        <Link2 size={14} /> {req.linked_test_count}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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