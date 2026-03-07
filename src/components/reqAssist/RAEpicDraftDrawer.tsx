import { useState, useEffect } from 'react';
import { X, Clock, Pencil, Archive, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { RA_KEYS } from '@/hooks/useReqAssist';
import { toast } from 'sonner';
import RAPublishEpicsModal from './RAPublishEpicsModal';

interface Epic {
  id: string;
  title: string;
  description: string | null;
  ra_tag: string | null;
  publish_status: string | null;
  complexity: string | null;
  created_at: string;
  generated_at: string | null;
}

interface Props {
  brdId: string;
  docTitle: string;
  jiraKey: string | null;
  onClose: () => void;
}

function StatusLozenge({ status }: { status: string | null }) {
  const s = status || 'draft';
  const map: Record<string, { bg: string; color: string; label: string }> = {
    draft:     { bg: '#DFE1E6', color: '#253858', label: 'DRAFT' },
    reviewed:  { bg: '#DEEBFF', color: '#0747A6', label: 'REVIEWED' },
    published: { bg: '#E3FCEF', color: '#006644', label: 'PUBLISHED' },
  };
  const m = map[s] ?? map.draft;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '0 6px', height: 20, borderRadius: 3,
      fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.03em', whiteSpace: 'nowrap',
      background: m.bg, color: m.color,
      fontFamily: "'Inter', sans-serif",
    }}>{m.label}</span>
  );
}

export default function RAEpicDraftDrawer({ brdId, docTitle, jiraKey, onClose }: Props) {
  const qc = useQueryClient();
  const [epics, setEpics] = useState<Epic[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [showPublish, setShowPublish] = useState(false);
  const [markingReviewed, setMarkingReviewed] = useState(false);

  useEffect(() => {
    fetchEpics();
  }, [brdId]);

  const fetchEpics = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('brd_epics')
      .select('id, title, description, ra_tag, publish_status, complexity, created_at, generated_at')
      .eq('brd_id', brdId)
      .order('created_at', { ascending: true });
    if (!error && data) setEpics(data);
    setLoading(false);
  };

  const generatedAt = epics[0]?.generated_at || epics[0]?.created_at;
  const daysAgo = generatedAt ? Math.floor((Date.now() - new Date(generatedAt).getTime()) / 86400000) : 0;
  const isStale = daysAgo > 3;
  const hasDrafts = epics.some(e => (e.publish_status || 'draft') === 'draft');
  const overallStatus = epics.every(e => e.publish_status === 'published') ? 'published'
    : epics.every(e => e.publish_status === 'reviewed' || e.publish_status === 'published') ? 'reviewed'
    : 'draft';

  const handleMarkReviewed = async () => {
    setMarkingReviewed(true);
    await (supabase as any)
      .from('brd_epics')
      .update({ publish_status: 'reviewed' })
      .eq('brd_id', brdId)
      .in('publish_status', ['draft', null]);
    await fetchEpics();
    qc.invalidateQueries({ queryKey: RA_KEYS.all });
    toast.success('All drafts marked as reviewed');
    setMarkingReviewed(false);
  };

  const handleArchiveEpic = async (epicId: string) => {
    await (supabase as any).from('brd_epics').delete().eq('id', epicId);
    setEpics(prev => prev.filter(e => e.id !== epicId));
    toast.success('Epic archived');
    qc.invalidateQueries({ queryKey: RA_KEYS.all });
  };

  return (
    <>
      {/* Backdrop */}
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.3)', zIndex: 60 }} onClick={onClose} />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 480,
        background: '#FFFFFF', zIndex: 70, display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 24px rgba(0,0,0,0.1)',
        fontFamily: "'Inter', sans-serif",
      }}>
        {/* Header */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '0.75px solid #E2E8F0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0, fontFamily: "'Sora', sans-serif" }}>
                  Epic Drafts
                </h2>
                <StatusLozenge status={overallStatus} />
              </div>
              <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>
                {docTitle} · {epics.length} epics{generatedAt ? ` · Generated ${daysAgo === 0 ? 'today' : daysAgo === 1 ? 'yesterday' : `${daysAgo}d ago`}` : ''}
              </p>
            </div>
            <button onClick={onClose} style={{
              width: 28, height: 28, borderRadius: 4, border: 'none',
              background: 'transparent', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', color: '#64748B',
            }}>
              <X size={16} />
            </button>
          </div>

          {/* Staleness banner */}
          {isStale && (
            <div style={{
              marginTop: 12, background: '#FFFBEB', border: '1px solid #FDE68A',
              color: '#92400E', borderRadius: 6, padding: '8px 12px',
              display: 'flex', alignItems: 'center', gap: 8, fontSize: 12,
            }}>
              <Clock size={14} style={{ flexShrink: 0 }} />
              Generated {daysAgo} days ago · Review before publishing
            </div>
          )}
        </div>

        {/* Epic list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <Loader2 size={20} color="#64748B" style={{ animation: 'ra-epic-spin 0.8s linear infinite' }} />
            </div>
          ) : epics.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#94A3B8', fontSize: 13, padding: 40 }}>No epics found</p>
          ) : (
            epics.map(epic => (
              <div
                key={epic.id}
                style={{
                  background: '#FFFFFF', border: '0.75px solid #E2E8F0', borderRadius: 6,
                  padding: 12, marginBottom: 8, position: 'relative',
                }}
                onMouseEnter={() => setHoveredId(epic.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {/* ra_tag chip */}
                <div style={{ marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{
                    display: 'inline-block',
                    background: '#F1F5F9', color: '#475569',
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                    padding: '2px 6px', borderRadius: 4,
                  }}>
                    {epic.ra_tag || `DFT-${String(epicIdx + 1).padStart(3, '0')}`}
                  </span>
                  <StatusLozenge status={epic.publish_status} />
                </div>

                {/* Title */}
                <p style={{ fontSize: 13, fontWeight: 650, color: '#0F172A', margin: '4px 0 0' }}>{epic.title}</p>

                {/* Description */}
                {epic.description && (
                  <p style={{
                    fontSize: 13, color: '#475569', margin: '4px 0 0',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>{epic.description}</p>
                )}

                {/* Hover actions */}
                {hoveredId === epic.id && (
                  <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                    <button style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontSize: 11, color: '#475569', background: 'transparent',
                      border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: 3,
                    }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.04)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <Pencil size={11} /> Edit
                    </button>
                    <button
                      onClick={() => handleArchiveEpic(epic.id)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: 11, color: '#475569', background: 'transparent',
                        border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: 3,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; e.currentTarget.style.color = '#DC2626'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#475569'; }}
                    >
                      <Archive size={11} /> Archive
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px', borderTop: '0.75px solid #E2E8F0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 13, color: '#475569' }}>
            {epics.length} draft{epics.length !== 1 ? 's' : ''}{jiraKey ? ` · ${jiraKey}` : ''}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            {hasDrafts && (
              <button
                onClick={handleMarkReviewed}
                disabled={markingReviewed}
                style={{
                  padding: '6px 14px', fontSize: 12, fontWeight: 500, borderRadius: 6,
                  border: '0.75px solid #CBD5E1', background: '#FFFFFF', color: '#334155',
                  cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                }}
              >
                {markingReviewed ? 'Marking…' : 'Mark Reviewed'}
              </button>
            )}
            <button
              onClick={() => setShowPublish(true)}
              style={{
                padding: '6px 14px', fontSize: 12, fontWeight: 600, borderRadius: 6,
                border: 'none', background: '#2563EB', color: '#FFFFFF',
                cursor: 'pointer', fontFamily: "'Inter', sans-serif",
              }}
            >
              Publish to Project →
            </button>
          </div>
        </div>
      </div>

      {/* Publish modal */}
      {showPublish && (
        <RAPublishEpicsModal
          brdId={brdId}
          epics={epics}
          onClose={() => setShowPublish(false)}
          onPublished={() => {
            setShowPublish(false);
            fetchEpics();
            qc.invalidateQueries({ queryKey: RA_KEYS.all });
            qc.invalidateQueries({ queryKey: ['brd_documents'] });
            onClose();
          }}
        />
      )}

      <style>{`
        @keyframes ra-epic-spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
