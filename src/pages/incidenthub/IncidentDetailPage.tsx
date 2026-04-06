/**
 * IncidentDetailPage — 2-Column Jira Layout
 * Left: content (flex), Right: metadata rail (300px)
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertTriangle, ChevronRight, Clock, Plus, Loader2 } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useProductionIncident } from '@/hooks/useIncidentHub';
import { StatusLozenge } from './components/StatusLozenge';
import { SeverityChip } from './components/SeverityChip';
import { PriorityChip } from './components/PriorityChip';
import { CommitteeModal } from './components/CommitteeModal';
import { ConvertDialog } from './components/ConvertDialog';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

export default function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { data: incident, isLoading } = useProductionIncident(id || '');
  const updateIncident = { mutateAsync: async (_: any) => { throw new Error('Read-only'); } };
  const addComment = { mutateAsync: async (_: any) => { throw new Error('Read-only'); } };
  const [activeTab, setActiveTab] = useState<'comments' | 'history'>('comments');
  const [commentText, setCommentText] = useState('');
  const [showCommittee, setShowCommittee] = useState(false);
  const [showConvert, setShowConvert] = useState(false);
  const [slaCountdown, setSlaCountdown] = useState('');

  // SLA Timer
  useEffect(() => {
    if (!incident?.sla?.resolution_due_at) return;
    const tick = () => {
      const remaining = new Date(incident.sla!.resolution_due_at).getTime() - Date.now();
      if (remaining <= 0) { setSlaCountdown('BREACHED'); return; }
      const h = Math.floor(remaining / 3600000);
      const m = Math.floor((remaining % 3600000) / 60000);
      const s = Math.floor((remaining % 60000) / 1000);
      setSlaCountdown(`${h}h ${m}m ${s}s`);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [incident?.sla?.resolution_due_at]);

  const handleSaveComment = async () => {
    if (!commentText.trim() || !id) return;
    try {
      await addComment.mutateAsync({ incident_id: id, content: commentText.trim(), comment_type: 'update' });
      setCommentText('');
      toast.success('Comment saved');
    } catch {
      toast.error('Failed to save comment');
    }
  };

  const handleResolve = async () => {
    if (!id) return;
    try {
      await updateIncident.mutateAsync({ id, data: { status: 'resolved' as any } });
      toast.success('Incident resolved');
    } catch {
      toast.error('Failed to resolve incident');
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-6" style={{ backgroundColor: isDark ? '#0A0A0A' : '#FFFFFF' }}>
        <Skeleton className="h-6 w-48 mb-4" />
        <Skeleton className="h-8 w-96 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: isDark ? '#0A0A0A' : '#FFFFFF' }}>
        <p style={{ fontFamily: 'Inter, sans-serif', color: isDark ? '#878787' : '#94A3B8' }}>Incident not found</p>
      </div>
    );
  }

  const slaBreached = incident.sla?.resolution_breached || slaCountdown === 'BREACHED';
  const slaWarning = !slaBreached && incident.sla?.resolution_due_at &&
    (new Date(incident.sla.resolution_due_at).getTime() - Date.now()) <= 3600000;

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: isDark ? '#0A0A0A' : '#FFFFFF' }}>
      {/* Breadcrumb */}
      <div className="flex items-center justify-between px-6 shrink-0" style={{
        height: 50,
        borderBottom: isDark ? '0.75px solid rgba(255,255,255,0.08)' : '0.75px solid rgba(15,23,42,0.06)',
      }}>
        <div className="flex items-center gap-1" style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: isDark ? '#878787' : '#64748B' }}>
          <span className="cursor-pointer hover:underline" onClick={() => navigate('/incident-hub')}>Incident List</span>
          <ChevronRight size={12} />
          <span style={{ color: isDark ? '#EDEDED' : '#0F172A', fontWeight: 650 }}>{incident.incident_key || incident.jira_key || 'INC'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" style={{ borderRadius: 6, fontSize: 12 }} onClick={() => setShowConvert(true)}>Convert</Button>
          <Button size="sm" style={{ backgroundColor: '#DC2626', color: '#FFFFFF', borderRadius: 6, fontSize: 12 }} onClick={handleResolve}>Resolve</Button>
        </div>
      </div>

      {/* 2-Column Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Column */}
        <div className="flex-1 overflow-y-auto" style={{ padding: '28px 32px 40px' }}>
          {/* Title */}
          <div className="flex items-start gap-3 mb-4">
            <svg width="20" height="20" viewBox="0 0 16 16" className="shrink-0 mt-0.5">
              <path fill="#FF5630" fillRule="evenodd" d="M4.78545267,10 L11.2145473,10 L10.5007848,8 L5.49921516,8 L4.78545267,10 Z M4,11 C3.44771525,11 3,11.4477153 3,12 L3,13 L13,13 L13,12 C13,11.4477153 12.5522847,11 12,11 L4,11 Z M5.8560964,7 L10.1439036,7 L8.94181993,3.63169838 C8.8409899,3.34916733 8.61864892,3.12682636 8.33611787,3.02599632 C7.81596508,2.84036355 7.24381284,3.1115456 7.05818007,3.63169838 L5.8560964,7 Z M2,0 L14,0 C15.1045695,-2.02906125e-16 16,0.8954305 16,2 L16,14 C16,15.1045695 15.1045695,16 14,16 L2,16 C0.8954305,16 1.3527075e-16,15.1045695 0,14 L0,2 C-1.3527075e-16,0.8954305 0.8954305,2.02906125e-16 2,0 Z"/>
            </svg>
            <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 700, color: isDark ? '#EDEDED' : '#0F172A', letterSpacing: '-0.02em' }}>
              {incident.title}
            </h1>
          </div>

          {/* Status + Chips */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <StatusLozenge status={incident.status} />
            <SeverityChip severity={incident.severity} />
            <PriorityChip priority={incident.priority || 'P4'} />
            <span style={{ color: isDark ? '#878787' : '#CBD5E1' }}>&middot;</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#2563EB' }}>
              {incident.incident_key || incident.jira_key}
            </span>
            <span style={{ color: isDark ? '#878787' : '#CBD5E1' }}>&middot;</span>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: isDark ? '#878787' : '#64748B' }}>
              Opened {incident.created_at ? formatDistanceToNow(new Date(incident.created_at), { addSuffix: true }) : ''}
            </span>
          </div>

          {/* SLA Alert */}
          {(slaBreached || slaWarning) && (
            <div className="flex items-center gap-3 p-3 mb-4" style={{
              backgroundColor: isDark
                ? (slaBreached ? 'rgba(248,113,113,0.12)' : 'rgba(251,191,36,0.12)')
                : (slaBreached ? '#FEF2F2' : '#FFFBEB'),
              border: `1px solid ${isDark
                ? (slaBreached ? 'rgba(248,113,113,0.2)' : 'rgba(251,191,36,0.2)')
                : (slaBreached ? '#FECACA' : '#FDE68A')}`,
              borderRadius: 6,
            }}>
              <Clock size={16} style={{ color: slaBreached ? '#DC2626' : '#D97706' }} />
              <div>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: slaBreached ? '#DC2626' : '#D97706', fontWeight: 650 }}>
                  {slaBreached ? 'SLA BREACHED' : 'SLA breach in '}
                </span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 700, color: slaBreached ? '#DC2626' : '#D97706' }}>
                  {slaCountdown}
                </span>
              </div>
            </div>
          )}

          {/* Description */}
          <div className="mb-6">
            <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 700, color: isDark ? '#EDEDED' : '#0F172A', marginBottom: 8 }}>Description</h3>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, lineHeight: 1.75, color: isDark ? '#A1A1A1' : '#334155' }}>
              {incident.description || 'No description provided.'}
            </p>
          </div>

          {/* Tags/Labels */}
          {incident.labels && Array.isArray(incident.labels) && incident.labels.length > 0 && (
            <div className="mb-6">
              <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 700, color: isDark ? '#EDEDED' : '#0F172A', marginBottom: 8 }}>Labels</h3>
              <div className="flex flex-wrap gap-1">
                {(incident.labels as string[]).map((label: string) => (
                  <span key={label} className="px-2 py-0.5" style={{ fontSize: 11, backgroundColor: isDark ? '#1A1A1A' : '#F1F5F9', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(15,23,42,0.08)', borderRadius: 4, color: isDark ? '#A1A1A1' : '#475569' }}>{label}</span>
                ))}
              </div>
            </div>
          )}

          {/* Activity Section */}
          <div>
            <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 700, color: isDark ? '#EDEDED' : '#0F172A', marginBottom: 8 }}>Activity</h3>
            <div className="flex items-center gap-1 mb-4">
              {(['comments', 'history'] as const).map(tab => (
                <button
                  key={tab}
                  role="tab"
                  onClick={() => setActiveTab(tab)}
                  className="px-3 py-1.5 text-xs capitalize"
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: activeTab === tab ? 650 : 400,
                    color: activeTab === tab ? '#2563EB' : (isDark ? '#878787' : '#64748B'),
                    borderBottom: activeTab === tab ? '2px solid #2563EB' : '2px solid transparent',
                    borderRadius: 0,
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === 'comments' && (
              <div>
                {/* Comment Input */}
                <div className="mb-4">
                  <Textarea
                    placeholder="Add a comment..."
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, minHeight: 60, borderRadius: 4 }}
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <Button size="sm" style={{ backgroundColor: '#2563EB', borderRadius: 6 }} onClick={handleSaveComment} disabled={!commentText.trim()}>
                      Save
                    </Button>
                    <Button variant="ghost" size="sm" style={{ borderRadius: 6 }} onClick={() => setCommentText('')}>Cancel</Button>
                  </div>
                </div>
                {/* Comments List */}
                {(!incident.comments || incident.comments.length === 0) && (
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: isDark ? '#878787' : '#94A3B8' }}>No comments yet. Be the first to comment.</p>
                )}
                {incident.comments?.map((c: any) => (
                  <div key={c.id} className="mb-3 pb-3" style={{ borderBottom: isDark ? '0.75px solid rgba(255,255,255,0.08)' : '0.75px solid rgba(15,23,42,0.06)' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="rounded-full flex items-center justify-center" style={{ width: 24, height: 24, backgroundColor: isDark ? '#1A1A1A' : '#E2E8F0', fontSize: 10, fontWeight: 650, color: isDark ? '#A1A1A1' : '#475569' }}>
                        {(c.author?.full_name || c.author_name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 650, color: isDark ? '#EDEDED' : '#0F172A' }}>
                        {c.author?.full_name || c.author_name || 'User'}
                      </span>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: isDark ? '#878787' : '#94A3B8' }}>
                        {c.created_at ? formatDistanceToNow(new Date(c.created_at), { addSuffix: true }) : ''}
                      </span>
                    </div>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: isDark ? '#A1A1A1' : '#334155', lineHeight: 1.6 }}>{c.content}</p>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'history' && (
              <div>
                {(!incident.history || incident.history.length === 0) && (
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: isDark ? '#878787' : '#94A3B8' }}>No history entries.</p>
                )}
                {incident.history?.map((h: any) => (
                  <div key={h.id} className="flex items-start gap-3 mb-3 pb-3" style={{ borderBottom: isDark ? '0.75px solid rgba(255,255,255,0.08)' : '0.75px solid rgba(15,23,42,0.06)' }}>
                    <div className="shrink-0 mt-1" style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#2563EB', border: isDark ? '2px solid #0A0A0A' : '2px solid #FFFFFF', boxShadow: '0 0 0 1px #2563EB' }} />
                    <div>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 650, color: isDark ? '#EDEDED' : '#0F172A' }}>
                        {h.field_name} changed
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        {h.old_value && (h.field_name === 'status' ? <StatusLozenge status={h.old_value} /> : <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: isDark ? '#878787' : '#94A3B8' }}>{h.old_value}</span>)}
                        <span style={{ color: isDark ? '#878787' : '#94A3B8', fontSize: 11 }}>&rarr;</span>
                        {h.new_value && (h.field_name === 'status' ? <StatusLozenge status={h.new_value} /> : <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: isDark ? '#EDEDED' : '#0F172A' }}>{h.new_value}</span>)}
                      </div>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: isDark ? '#878787' : '#94A3B8' }}>
                        {h.changed_at ? formatDistanceToNow(new Date(h.changed_at), { addSuffix: true }) : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (300px rail) */}
        <div className="shrink-0 overflow-y-auto" style={{
          width: 300,
          borderLeft: isDark ? '0.75px solid rgba(255,255,255,0.08)' : '0.75px solid rgba(15,23,42,0.06)',
          padding: 16,
          backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
        }}>
          {/* Metadata Grid */}
          <div className="space-y-3">
            {[
              { label: 'Status', value: <StatusLozenge status={incident.status} /> },
              { label: 'Jira Status', value: incident.jira_status || '\u2014' },
              { label: 'Severity', value: <SeverityChip severity={incident.severity} /> },
              { label: 'Priority', value: <PriorityChip priority={incident.priority || 'P4'} /> },
              { label: 'Project', value: incident.project_name || '\u2014' },
              { label: 'Assignee', value: incident.assignee_name || 'Unassigned' },
              { label: 'Reporter', value: incident.reporter_name || '\u2014' },
              { label: 'Resolution', value: incident.resolution || '\u2014' },
            ].map(row => (
              <div key={row.label} className="flex items-center gap-2">
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: isDark ? '#878787' : '#64748B', width: 80, flexShrink: 0 }}>{row.label}</span>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: isDark ? '#EDEDED' : '#0F172A' }}>
                  {typeof row.value === 'string' ? row.value : row.value}
                </div>
              </div>
            ))}
          </div>

          {/* Custom Fields */}
          <div className="mt-4 pt-4" style={{ borderTop: isDark ? '0.75px solid rgba(255,255,255,0.08)' : '0.75px solid rgba(15,23,42,0.06)' }}>
            <div className="flex items-center gap-2 mb-2">
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: isDark ? '#878787' : '#64748B', width: 80 }}>Created</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: isDark ? '#A1A1A1' : '#64748B' }}>
                {incident.created_at ? new Date(incident.created_at).toLocaleString() : '\u2014'}
              </span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: isDark ? '#878787' : '#64748B', width: 80 }}>Updated</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: isDark ? '#A1A1A1' : '#64748B' }}>
                {incident.updated_at ? new Date(incident.updated_at).toLocaleString() : '\u2014'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ConvertDialog open={showConvert} onClose={() => setShowConvert(false)} incidentId={id || ''} />
      <ConvertDialog open={showConvert} onClose={() => setShowConvert(false)} incidentId={id || ''} />
    </div>
  );
}
