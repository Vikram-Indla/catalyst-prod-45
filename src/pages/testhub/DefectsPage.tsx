/**
 * Defects List Page — TestHub Module
 * Route: /testhub/defects
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bug, Plus, Search, X, AlertCircle, Clock,
  CheckCircle2, XCircle, AlertTriangle, User, Link2, RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/components/ui/CatalystToast';
import { CreateDefectModal } from '@/components/testhub/defects/CreateDefectModal';

interface Defect {
  id: string;
  defect_key: string;
  title: string;
  description: string | null;
  severity: string;
  priority: string;
  status: string;
  environment: string | null;
  created_at: string;
  updated_at: string;
  reported_by: string | null;
  assigned_to: string | null;
  reporter?: { full_name: string } | null;
  assignee?: { full_name: string } | null;
  link_count?: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  new: { label: 'New', color: '#64748B', bg: '#F1F5F9', icon: Clock },
  open: { label: 'Open', color: '#2563EB', bg: '#EFF6FF', icon: AlertCircle },
  in_progress: { label: 'In Progress', color: '#D97706', bg: '#FFFBEB', icon: RefreshCw },
  fixed: { label: 'Fixed', color: '#7C3AED', bg: '#F5F3FF', icon: CheckCircle2 },
  verified: { label: 'Verified', color: '#059669', bg: '#ECFDF5', icon: CheckCircle2 },
  closed: { label: 'Closed', color: '#94A3B8', bg: '#F8FAFC', icon: XCircle },
  reopened: { label: 'Reopened', color: '#DC2626', bg: '#FEF2F2', icon: AlertTriangle },
};

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  critical: { label: 'Critical', color: '#DC2626', bg: '#FEF2F2' },
  high: { label: 'High', color: '#EA580C', bg: '#FFF7ED' },
  medium: { label: 'Medium', color: '#D97706', bg: '#FFFBEB' },
  low: { label: 'Low', color: '#059669', bg: '#ECFDF5' },
};

export default function DefectsPage() {
  const navigate = useNavigate();
  const [defects, setDefects] = useState<Defect[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [users, setUsers] = useState<{ id: string; full_name: string }[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchDefects = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('th_defects' as any)
        .select(`
          *,
          reporter:profiles!th_defects_reported_by_fkey(full_name),
          assignee:profiles!th_defects_assigned_to_fkey(full_name)
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (severityFilter !== 'all') {
        query = query.eq('severity', severityFilter);
      }
      if (assigneeFilter !== 'all') {
        if (assigneeFilter === 'unassigned') {
          query = query.is('assigned_to', null);
        } else {
          query = query.eq('assigned_to', assigneeFilter);
        }
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      // Get link counts
      const defectsWithCounts = await Promise.all(
        (data || []).map(async (defect: any) => {
          const { count } = await supabase
            .from('th_defect_links' as any)
            .select('*', { count: 'exact', head: true })
            .eq('defect_id', defect.id);
          return { ...defect, link_count: count || 0 };
        })
      );

      setDefects(defectsWithCounts as Defect[]);
    } catch (err: any) {
      console.error('Fetch defects error:', err);
      catalystToast.error('Failed to load defects');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name')
      .order('full_name');
    if (data) setUsers(data);
  };

  useEffect(() => {
    fetchDefects();
    fetchUsers();
  }, [statusFilter, severityFilter, assigneeFilter]);

  const filteredDefects = defects.filter(d => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      d.defect_key.toLowerCase().includes(search) ||
      d.title.toLowerCase().includes(search) ||
      (d.description && d.description.toLowerCase().includes(search))
    );
  });

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setSeverityFilter('all');
    setAssigneeFilter('all');
  };

  const hasActiveFilters = statusFilter !== 'all' || severityFilter !== 'all' || assigneeFilter !== 'all' || searchTerm;

  const selectStyle: React.CSSProperties = {
    height: 44, padding: '0 36px 0 14px',
    border: '1.5px solid hsl(var(--border))', borderRadius: 10, fontSize: 14,
    backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))', cursor: 'pointer',
  };

  return (
    <div style={{ padding: 24, backgroundColor: 'hsl(var(--background))', minHeight: '100%', overflow: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Bug size={24} style={{ color: '#FFFFFF' }} />
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: 'hsl(var(--foreground))', margin: 0 }}>Defects</h1>
            <p style={{ fontSize: 14, color: 'hsl(var(--muted-foreground))', margin: '4px 0 0' }}>
              Track and manage bugs discovered during testing
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, height: 44, padding: '0 20px',
            border: 'none', borderRadius: 10,
            background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
            color: '#FFFFFF', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)',
          }}
        >
          <Plus size={18} />
          Create Defect
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 300px', maxWidth: 400 }}>
          <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--muted-foreground))' }} />
          <input
            type="text"
            placeholder="Search defects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%', height: 44, padding: '0 14px 0 44px',
              border: '1.5px solid hsl(var(--border))', borderRadius: 10, fontSize: 14,
              backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))',
            }}
          />
        </div>

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={selectStyle}>
          <option value="all">All Status</option>
          <option value="new">New</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="fixed">Fixed</option>
          <option value="verified">Verified</option>
          <option value="closed">Closed</option>
          <option value="reopened">Reopened</option>
        </select>

        <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} style={selectStyle}>
          <option value="all">All Severity</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)} style={selectStyle}>
          <option value="all">All Assignees</option>
          <option value="unassigned">Unassigned</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>{u.full_name}</option>
          ))}
        </select>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, height: 44, padding: '0 16px',
              border: '1.5px solid hsl(var(--border))', borderRadius: 10,
              backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--muted-foreground))',
              fontSize: 14, cursor: 'pointer',
            }}
          >
            <X size={16} />
            Clear
          </button>
        )}
      </div>

      {/* Results Count */}
      <p style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', marginBottom: 16 }}>
        Showing {filteredDefects.length} defect{filteredDefects.length !== 1 ? 's' : ''}
      </p>

      {/* Defects List */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <RefreshCw size={32} className="animate-spin" style={{ color: '#2563EB' }} />
        </div>
      ) : filteredDefects.length === 0 ? (
        <div style={{
          backgroundColor: 'hsl(var(--card))', borderRadius: 12, padding: 60,
          textAlign: 'center', border: '1px solid hsl(var(--border))',
        }}>
          <Bug size={48} style={{ color: 'hsl(var(--muted-foreground))', marginBottom: 16, opacity: 0.4 }} />
          <p style={{ fontSize: 16, color: 'hsl(var(--muted-foreground))', margin: 0 }}>
            {hasActiveFilters ? 'No defects match your filters' : 'No defects found'}
          </p>
          <p style={{ fontSize: 14, color: 'hsl(var(--muted-foreground))', margin: '8px 0 0', opacity: 0.7 }}>
            {hasActiveFilters ? 'Try adjusting your filters' : 'Create a defect to get started'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredDefects.map((defect) => {
            const status = STATUS_CONFIG[defect.status] || STATUS_CONFIG.new;
            const severity = SEVERITY_CONFIG[defect.severity] || SEVERITY_CONFIG.medium;
            const StatusIcon = status.icon;

            return (
              <div
                key={defect.id}
                onClick={() => navigate(`/testhub/defects/${defect.id}`)}
                style={{
                  backgroundColor: 'hsl(var(--card))', borderRadius: 12, padding: 20,
                  border: '1px solid hsl(var(--border))', cursor: 'pointer', transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Top Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      fontSize: 13, fontWeight: 600, color: '#DC2626',
                      backgroundColor: '#FEF2F2', padding: '4px 10px', borderRadius: 6,
                    }}>
                      {defect.defect_key}
                    </span>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: 'hsl(var(--foreground))', margin: 0 }}>
                      {defect.title}
                    </h3>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, color: severity.color, backgroundColor: severity.bg,
                      padding: '4px 10px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: severity.color }} />
                      {severity.label}
                    </span>
                    <span style={{
                      fontSize: 11, fontWeight: 600, color: status.color, backgroundColor: status.bg,
                      padding: '4px 10px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      <StatusIcon size={12} />
                      {status.label}
                    </span>
                  </div>
                </div>

                {/* Bottom Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 13, color: 'hsl(var(--muted-foreground))' }}>
                    <span>
                      Reported by {(defect.reporter as any)?.full_name || 'Unknown'} · {formatTimeAgo(defect.created_at)}
                    </span>
                    {defect.assignee && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <User size={14} />
                        {(defect.assignee as any).full_name}
                      </span>
                    )}
                  </div>
                  {(defect.link_count ?? 0) > 0 && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#2563EB' }}>
                      <Link2 size={14} />
                      {defect.link_count} test{defect.link_count !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreateDefectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={fetchDefects}
      />
    </div>
  );
}
