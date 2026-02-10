/**
 * Defect Detail Page — TestHub Module
 * Route: /testhub/defects/:defectId
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Bug, Trash2, CheckCircle2, XCircle, Clock, User,
  Calendar, Monitor, FileText, AlertCircle, RefreshCw, Link2,
  MessageSquare, History, AlertTriangle, Target,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/components/ui/CatalystToast';

interface Defect {
  id: string;
  defect_key: string;
  title: string;
  description: string | null;
  severity: string;
  priority: string;
  status: string;
  environment: string | null;
  steps_to_reproduce: string | null;
  expected_result: string | null;
  actual_result: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  reported_by: string | null;
  assigned_to: string | null;
  reporter?: { full_name: string };
  assignee?: { full_name: string };
}

interface DefectHistoryEntry {
  id: string;
  field_changed: string;
  old_value: string | null;
  new_value: string | null;
  changed_at: string;
  changer?: { full_name: string };
}

interface DefectComment {
  id: string;
  comment: string;
  created_at: string;
  creator?: { full_name: string };
}

interface LinkedTest {
  link_id: string;
  case_key: string;
  title: string;
  cycle_key: string | null;
  execution_status: string | null;
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

const STATUS_TRANSITIONS: Record<string, string[]> = {
  new: ['open', 'closed'],
  open: ['in_progress', 'closed'],
  in_progress: ['fixed', 'open'],
  fixed: ['verified', 'reopened'],
  verified: ['closed', 'reopened'],
  closed: ['reopened'],
  reopened: ['open', 'in_progress'],
};

export default function DefectDetailPage() {
  const { defectId } = useParams();
  const navigate = useNavigate();

  const [defect, setDefect] = useState<Defect | null>(null);
  const [history, setHistory] = useState<DefectHistoryEntry[]>([]);
  const [comments, setComments] = useState<DefectComment[]>([]);
  const [linkedTests, setLinkedTests] = useState<LinkedTest[]>([]);
  const [users, setUsers] = useState<{ id: string; full_name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const fetchDefect = async () => {
    if (!defectId) return;
    setIsLoading(true);
    try {
      const { data: defectData } = await supabase
        .from('th_defects' as any)
        .select(`
          *,
          reporter:profiles!th_defects_reported_by_fkey(full_name),
          assignee:profiles!th_defects_assigned_to_fkey(full_name)
        `)
        .eq('id', defectId)
        .single();

      if (defectData) setDefect(defectData as any);

      // Fetch history
      const { data: historyData } = await supabase
        .from('th_defect_history' as any)
        .select(`*, changer:profiles!th_defect_history_changed_by_fkey(full_name)`)
        .eq('defect_id', defectId)
        .order('changed_at', { ascending: false });

      if (historyData) setHistory(historyData as any);

      // Fetch comments
      const { data: commentsData } = await supabase
        .from('th_defect_comments' as any)
        .select(`*, creator:profiles!th_defect_comments_created_by_fkey(full_name)`)
        .eq('defect_id', defectId)
        .order('created_at', { ascending: true });

      if (commentsData) setComments(commentsData as any);

      // Fetch linked tests
      const { data: linksData } = await supabase.rpc('get_defect_linked_tests', { p_defect_id: defectId });
      if (linksData) setLinkedTests(linksData as any);

      // Fetch users
      const { data: usersData } = await supabase.from('profiles').select('id, full_name').order('full_name');
      if (usersData) setUsers(usersData);
    } catch (err) {
      console.error('Fetch defect error:', err);
      catalystToast.error('Failed to load defect');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDefect();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, [defectId]);

  const updateStatus = async (newStatus: string) => {
    if (!defect) return;
    try {
      const { error } = await supabase
        .from('th_defects' as any)
        .update({ status: newStatus } as any)
        .eq('id', defect.id);
      if (error) throw error;
      catalystToast.success(`Status changed to ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
      fetchDefect();
    } catch (err) {
      console.error('Update status error:', err);
      catalystToast.error('Failed to update status');
    }
  };

  const updateAssignee = async (assigneeId: string) => {
    if (!defect) return;
    try {
      const { error } = await supabase
        .from('th_defects' as any)
        .update({ assigned_to: assigneeId || null } as any)
        .eq('id', defect.id);
      if (error) throw error;
      catalystToast.success('Assignee updated');
      fetchDefect();
    } catch (err) {
      console.error('Update assignee error:', err);
      catalystToast.error('Failed to update assignee');
    }
  };

  const addComment = async () => {
    if (!newComment.trim() || !defect || !currentUserId) return;
    setIsSubmittingComment(true);
    try {
      const { error } = await supabase.from('th_defect_comments' as any).insert({
        defect_id: defect.id,
        comment: newComment.trim(),
        created_by: currentUserId,
      } as any);
      if (error) throw error;
      setNewComment('');
      fetchDefect();
    } catch (err) {
      console.error('Add comment error:', err);
      catalystToast.error('Failed to add comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const deleteDefect = async () => {
    if (!defect) return;
    if (!confirm(`Delete ${defect.defect_key}? This cannot be undone.`)) return;
    try {
      const { error } = await supabase.from('th_defects' as any).delete().eq('id', defect.id);
      if (error) throw error;
      catalystToast.success('Defect deleted');
      navigate('/testhub/defects');
    } catch (err) {
      console.error('Delete defect error:', err);
      catalystToast.error('Failed to delete defect');
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
    });

  const formatTimeAgo = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  const sectionStyle: React.CSSProperties = {
    backgroundColor: 'hsl(var(--card))', borderRadius: 12, padding: 24,
    border: '1px solid hsl(var(--border))', marginBottom: 20,
  };
  const sectionTitle: React.CSSProperties = {
    fontSize: 15, fontWeight: 700, color: 'hsl(var(--foreground))', margin: '0 0 16px',
    display: 'flex', alignItems: 'center', gap: 8,
  };
  const selectStyle: React.CSSProperties = {
    width: '100%', height: 40, padding: '0 12px',
    border: '1.5px solid hsl(var(--border))', borderRadius: 8, fontSize: 14,
    backgroundColor: 'hsl(var(--background))', color: 'hsl(var(--foreground))', cursor: 'pointer',
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', padding: 80 }}>
        <RefreshCw size={32} className="animate-spin" style={{ color: '#2563EB' }} />
      </div>
    );
  }

  if (!defect) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 80 }}>
        <Bug size={48} style={{ color: 'hsl(var(--muted-foreground))', opacity: 0.4, marginBottom: 16 }} />
        <p style={{ fontSize: 18, color: 'hsl(var(--muted-foreground))' }}>Defect not found</p>
        <button onClick={() => navigate('/testhub/defects')} style={{
          marginTop: 16, height: 40, padding: '0 20px', border: '1.5px solid hsl(var(--border))',
          borderRadius: 10, backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))',
          fontSize: 14, cursor: 'pointer',
        }}>
          Back to Defects
        </button>
      </div>
    );
  }

  const status = STATUS_CONFIG[defect.status] || STATUS_CONFIG.new;
  const severity = SEVERITY_CONFIG[defect.severity] || SEVERITY_CONFIG.medium;
  const StatusIcon = status.icon;
  const validTransitions = STATUS_TRANSITIONS[defect.status] || [];

  return (
    <div style={{ padding: 24, backgroundColor: 'hsl(var(--background))', minHeight: '100%', overflow: 'auto' }}>
      {/* Back Button */}
      <button
        onClick={() => navigate('/testhub/defects')}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'hsl(var(--muted-foreground))',
          border: 'none', backgroundColor: 'transparent', cursor: 'pointer', padding: 0, marginBottom: 20,
        }}
      >
        <ArrowLeft size={16} /> Back to Defects
      </button>

      {/* Header */}
      <div style={{ ...sectionStyle, marginBottom: 20, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              fontSize: 13, fontWeight: 600, color: '#DC2626',
              backgroundColor: '#FEF2F2', padding: '4px 10px', borderRadius: 6,
            }}>
              {defect.defect_key}
            </span>
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
          <button
            onClick={deleteDefect}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 14px',
              border: '1.5px solid #FCA5A5', borderRadius: 8,
              backgroundColor: '#FEF2F2', color: '#DC2626', fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'hsl(var(--foreground))', margin: 0 }}>
          {defect.title}
        </h1>
      </div>

      {/* Main Content - 2 column */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>
        {/* Left Column */}
        <div>
          {/* Details */}
          <div style={sectionStyle}>
            <h3 style={sectionTitle}>
              <FileText size={18} style={{ color: '#2563EB' }} /> Details
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--muted-foreground))', margin: '0 0 4px' }}>
                  <User size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Reporter
                </p>
                <p style={{ fontSize: 14, color: 'hsl(var(--foreground))', margin: 0 }}>
                  {(defect.reporter as any)?.full_name || 'Unknown'}
                </p>
              </div>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--muted-foreground))', margin: '0 0 4px' }}>
                  <Target size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Priority
                </p>
                <p style={{ fontSize: 14, color: 'hsl(var(--foreground))', margin: 0, textTransform: 'capitalize' }}>
                  {defect.priority}
                </p>
              </div>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--muted-foreground))', margin: '0 0 4px' }}>
                  <Monitor size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Environment
                </p>
                <p style={{ fontSize: 14, color: 'hsl(var(--foreground))', margin: 0 }}>
                  {defect.environment || '—'}
                </p>
              </div>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--muted-foreground))', margin: '0 0 4px' }}>
                  <Calendar size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Created
                </p>
                <p style={{ fontSize: 14, color: 'hsl(var(--foreground))', margin: 0 }}>
                  {formatDate(defect.created_at)}
                </p>
              </div>
            </div>
          </div>

          {/* Description */}
          {defect.description && (
            <div style={sectionStyle}>
              <h3 style={sectionTitle}>Description</h3>
              <p style={{ fontSize: 14, color: 'hsl(var(--foreground))', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
                {defect.description}
              </p>
            </div>
          )}

          {/* Steps to Reproduce */}
          {defect.steps_to_reproduce && (
            <div style={sectionStyle}>
              <h3 style={sectionTitle}>Steps to Reproduce</h3>
              <pre style={{
                fontSize: 13, color: 'hsl(var(--foreground))', lineHeight: 1.7, margin: 0,
                whiteSpace: 'pre-wrap', fontFamily: 'monospace',
                backgroundColor: 'hsl(var(--muted))', padding: 16, borderRadius: 8,
              }}>
                {defect.steps_to_reproduce}
              </pre>
            </div>
          )}

          {/* Expected vs Actual */}
          {(defect.expected_result || defect.actual_result) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              {defect.expected_result && (
                <div style={{ ...sectionStyle, marginBottom: 0, borderLeft: '3px solid #059669' }}>
                  <h3 style={{ ...sectionTitle, color: '#059669' }}>
                    <CheckCircle2 size={16} /> Expected Result
                  </h3>
                  <p style={{ fontSize: 14, color: 'hsl(var(--foreground))', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
                    {defect.expected_result}
                  </p>
                </div>
              )}
              {defect.actual_result && (
                <div style={{ ...sectionStyle, marginBottom: 0, borderLeft: '3px solid #DC2626' }}>
                  <h3 style={{ ...sectionTitle, color: '#DC2626' }}>
                    <AlertTriangle size={16} /> Actual Result
                  </h3>
                  <p style={{ fontSize: 14, color: 'hsl(var(--foreground))', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
                    {defect.actual_result}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Comments */}
          <div style={sectionStyle}>
            <h3 style={sectionTitle}>
              <MessageSquare size={16} style={{ color: '#2563EB' }} />
              Comments ({comments.length})
            </h3>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addComment()}
                placeholder="Add a comment..."
                style={{
                  flex: 1, height: 40, padding: '0 14px',
                  border: '1.5px solid hsl(var(--border))', borderRadius: 8, fontSize: 14,
                  backgroundColor: 'hsl(var(--background))', color: 'hsl(var(--foreground))',
                }}
              />
              <button
                onClick={addComment}
                disabled={isSubmittingComment || !newComment.trim()}
                style={{
                  height: 40, padding: '0 16px', border: 'none', borderRadius: 8,
                  backgroundColor: '#2563EB', color: '#FFF', fontSize: 14, fontWeight: 600,
                  cursor: isSubmittingComment ? 'not-allowed' : 'pointer',
                  opacity: !newComment.trim() ? 0.5 : 1,
                }}
              >
                Post
              </button>
            </div>

            {comments.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {comments.map((c) => (
                  <div key={c.id} style={{
                    padding: 14, backgroundColor: 'hsl(var(--muted))', borderRadius: 8,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--foreground))' }}>
                        {(c.creator as any)?.full_name || 'Unknown'}
                      </span>
                      <span style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>
                        {formatTimeAgo(c.created_at)}
                      </span>
                    </div>
                    <p style={{ fontSize: 14, color: 'hsl(var(--foreground))', margin: 0, lineHeight: 1.5 }}>
                      {c.comment}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', textAlign: 'center', padding: 20, margin: 0 }}>
                No comments yet
              </p>
            )}
          </div>
        </div>

        {/* Right Column — Sidebar */}
        <div>
          {/* Status Control */}
          <div style={sectionStyle}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'hsl(var(--muted-foreground))', marginBottom: 6 }}>
              Status
            </label>
            <select
              value={defect.status}
              onChange={(e) => updateStatus(e.target.value)}
              style={selectStyle}
            >
              <option value={defect.status}>{STATUS_CONFIG[defect.status]?.label || defect.status} (current)</option>
              {validTransitions.map((s) => (
                <option key={s} value={s}>{STATUS_CONFIG[s]?.label || s}</option>
              ))}
            </select>

            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'hsl(var(--muted-foreground))', margin: '16px 0 6px' }}>
              Assignee
            </label>
            <select
              value={defect.assigned_to || ''}
              onChange={(e) => updateAssignee(e.target.value)}
              style={selectStyle}
            >
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.full_name}</option>
              ))}
            </select>
          </div>

          {/* Linked Tests */}
          <div style={sectionStyle}>
            <h3 style={sectionTitle}>
              <Link2 size={16} style={{ color: '#2563EB' }} />
              Linked Tests ({linkedTests.length})
            </h3>
            {linkedTests.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {linkedTests.map((lt) => (
                  <div key={lt.link_id} style={{
                    padding: 10, backgroundColor: 'hsl(var(--muted))', borderRadius: 8,
                    fontSize: 13,
                  }}>
                    <span style={{ fontWeight: 600, color: '#2563EB' }}>{lt.case_key}</span>
                    <span style={{ color: 'hsl(var(--foreground))', marginLeft: 8 }}>{lt.title}</span>
                    {lt.execution_status && (
                      <span style={{
                        marginLeft: 8, fontSize: 11, padding: '2px 8px', borderRadius: 4,
                        backgroundColor: lt.execution_status === 'passed' ? '#ECFDF5' : '#FEF2F2',
                        color: lt.execution_status === 'passed' ? '#059669' : '#DC2626',
                      }}>
                        {lt.execution_status}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', textAlign: 'center', padding: 16, margin: 0 }}>
                No linked tests
              </p>
            )}
          </div>

          {/* History */}
          <div style={sectionStyle}>
            <h3 style={sectionTitle}>
              <History size={16} style={{ color: '#2563EB' }} />
              History ({history.length})
            </h3>
            {history.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {history.map((h) => (
                  <div key={h.id} style={{ fontSize: 13, paddingBottom: 10, borderBottom: '1px solid hsl(var(--border))' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, color: 'hsl(var(--foreground))', textTransform: 'capitalize' }}>
                        {h.field_changed.replace(/_/g, ' ')}
                      </span>
                      <span style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>
                        {formatTimeAgo(h.changed_at)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {h.old_value && (
                        <span style={{
                          padding: '2px 8px', borderRadius: 4, fontSize: 12,
                          backgroundColor: '#FEF2F2', color: '#DC2626', textDecoration: 'line-through',
                        }}>
                          {h.old_value}
                        </span>
                      )}
                      <span style={{ color: 'hsl(var(--muted-foreground))' }}>→</span>
                      <span style={{
                        padding: '2px 8px', borderRadius: 4, fontSize: 12,
                        backgroundColor: '#ECFDF5', color: '#059669',
                      }}>
                        {h.new_value}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', textAlign: 'center', padding: 16, margin: 0 }}>
                No history yet
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
