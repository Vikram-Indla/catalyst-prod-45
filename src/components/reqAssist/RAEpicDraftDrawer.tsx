import { useState, useEffect } from 'react';
import { X, Clock, Pencil, Archive, Loader2, ChevronLeft } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { supabase, typedQuery } from '@/integrations/supabase/client';
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
    draft:     { bg: 'var(--ds-border, #DFE1E6)', color: '#42526E', label: 'DRAFT' },
    reviewed:  { bg: '#0C66E4', color: 'var(--ds-text-inverse, #FFFFFF)', label: 'REVIEWED' },
    published: { bg: '#1B7F37', color: 'var(--ds-text-inverse, #FFFFFF)', label: 'PUBLISHED' },
  };
  const m = map[s] ?? map.draft;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '0 6px', height: 20, borderRadius: 4,
      fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.03em', whiteSpace: 'nowrap',
      background: m.bg, color: m.color,
      fontFamily: 'var(--cp-font-body)',
    }}>{m.label}</span>
  );
}

export default function RAEpicDraftDrawer({ brdId, docTitle, jiraKey, onClose }: Props) {
  const { isDark } = useTheme();
  const qc = useQueryClient();
  const [epics, setEpics] = useState<Epic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPublish, setShowPublish] = useState(false);
  const [markingReviewed, setMarkingReviewed] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [archiveConfirmId, setArchiveConfirmId] = useState<string | null>(null);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);

  useEffect(() => { fetchEpics(); }, [brdId]);

  const fetchEpics = async () => {
    setLoading(true);
    const { data, error } = await typedQuery('brd_epics')
      .select('id, title, description, ra_tag, publish_status, complexity, created_at, generated_at')
      .eq('brd_id', brdId)
      .neq('publish_status', 'archived')
      .order('created_at', { ascending: true });
    if (!error && data) setEpics(data);
    setLoading(false);
  };

  const generatedAt = epics[0]?.generated_at || epics[0]?.created_at;
  const daysAgo = generatedAt ? Math.floor((Date.now() - new Date(generatedAt).getTime()) / 86400000) : 0;
  const isStale = daysAgo > 3;
  const hasDrafts = epics.some(e => (e.publish_status || 'draft') === 'draft');

  const handleMarkReviewed = async () => {
    setMarkingReviewed(true);
    await typedQuery('brd_epics')
      .update({ publish_status: 'reviewed' })
      .eq('brd_id', brdId)
      .in('publish_status', ['draft', null]);
    await fetchEpics();
    qc.invalidateQueries({ queryKey: RA_KEYS.all });
    toast.success('All drafts marked as reviewed');
    setMarkingReviewed(false);
  };

  const startEdit = (epic: Epic) => {
    setEditingId(epic.id);
    setEditTitle(epic.title);
    setEditDesc(epic.description || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
    setEditDesc('');
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSavingEdit(true);
    const { error } = await typedQuery('brd_epics')
      .update({ title: editTitle, description: editDesc || null })
      .eq('id', editingId);
    if (error) {
      toast.error('Failed to save: ' + error.message);
    } else {
      setEpics(prev => prev.map(e => e.id === editingId ? { ...e, title: editTitle, description: editDesc || null } : e));
      toast.success('Epic updated');
      cancelEdit();
    }
    setSavingEdit(false);
  };

  const handleArchiveEpic = async (epicId: string) => {
    await typedQuery('brd_epics')
      .update({ publish_status: 'archived' })
      .eq('id', epicId);
    setEpics(prev => prev.filter(e => e.id !== epicId));
    setArchiveConfirmId(null);
    toast.success('Epic archived');
    qc.invalidateQueries({ queryKey: RA_KEYS.all });
  };

  return (
    <>
      {/* Backdrop */}
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.30)', zIndex: 60 }} onClick={onClose} />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 480,
        background: 'var(--cp-float)', zIndex: 70, display: 'flex', flexDirection: 'column',
        borderLeft: '0.75px solid rgba(15,23,42,0.10)', fontFamily: 'var(--cp-font-body)',
      }}>

        {/* D10: Panel Header — STICKY */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '0.75px solid var(--divider)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'var(--cp-float)', flexShrink: 0,
          position: 'sticky', top: 0, zIndex: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden', flex: 1 }}>
            <button onClick={onClose} style={{
              width: 28, height: 28, borderRadius: 4, border: 'none', flexShrink: 0,
              background: 'transparent', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', color: 'var(--fg-3)',
            }}>
              <ChevronLeft size={18} />
            </button>
            <h2 style={{
              fontSize: 16, fontWeight: 650, color: 'var(--fg-1)', margin: 0,
              fontFamily: 'var(--cp-font-heading)', whiteSpace: 'nowrap',
              overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              Epics{jiraKey ? ` · ${jiraKey}` : ''}
            </h2>
            <span style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '1px 8px', borderRadius: 12,
              border: '1px solid rgba(15,23,42,0.15)', background: 'var(--bg-app)',
              fontSize: 12, fontWeight: 600, color: 'var(--fg-2)',
              fontFamily: 'var(--cp-font-body)', whiteSpace: 'nowrap',
            }}>
              {epics.length}
            </span>
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 4, border: 'none', flexShrink: 0,
            background: 'transparent', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', color: 'var(--fg-3)',
          }}>
            <X size={18} />
          </button>
        </div>

        {/* Staleness banner */}
        {isStale && (
          <div style={{
            margin: '12px 20px 0', background: '#0C66E4', border: '1px solid #B3D4FF',
            color: 'var(--ds-text-inverse, #FFFFFF)', borderRadius: 6, padding: '8px 12px',
            display: 'flex', alignItems: 'center', gap: 8, fontSize: 12,
            fontFamily: 'var(--cp-font-body)',
          }}>
            <Clock size={14} style={{ flexShrink: 0 }} />
            Generated {daysAgo} days ago · Review before publishing
          </div>
        )}

        {/* ── Epic list ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <Loader2 size={20} color="var(--fg-3)" style={{ animation: 'ra-epic-spin 0.8s linear infinite' }} />
            </div>
          ) : epics.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--fg-4)', fontSize: 13, padding: 40 }}>No epics found</p>
          ) : (
            epics.map((epic, epicIdx) => {
              const isEditing = editingId === epic.id;
              const isArchiveConfirm = archiveConfirmId === epic.id;
              const isHovered = hoveredCardId === epic.id;

              return (
                <div
                  key={epic.id}
                  onMouseEnter={() => setHoveredCardId(epic.id)}
                  onMouseLeave={() => setHoveredCardId(null)}
                  style={{
                    background: isHovered ? 'rgba(37,99,235,0.02)' : 'var(--bg-app)',
                    border: `0.75px solid ${isHovered ? 'rgba(15,23,42,0.16)' : 'rgba(15,23,42,0.10)'}`,
                    borderRadius: 6,
                    /* D02: Blue border for default, no purple */
                    borderLeft: '3px solid var(--divider)',
                    padding: '14px 16px',
                    marginBottom: 8,
                    boxShadow: isHovered
                      ? '0 2px 8px rgba(15,23,42,0.10)'
                      : '0 1px 3px rgba(15,23,42,0.06)',
                    transition: 'box-shadow 150ms ease, background 150ms ease, border-color 150ms ease',
                  }}
                >
                  {/* Top row: ra_tag chip + status lozenge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {/* D01: Epic key badge — neutral grey, not purple */}
                    <span style={{
                      display: 'inline-flex', alignItems: 'center',
                      background: 'var(--cp-bg-sunken, #F1F5F9)',
                      border: isDark ? '0.75px solid #2E2E2E' : '0.75px solid #CBD5E1',
                      borderRadius: 4,
                      padding: '2px 8px',
                      fontFamily: 'var(--cp-font-mono)',
                      fontSize: 11, fontWeight: 600, color: 'var(--fg-2)',
                    }}>
                      {epic.ra_tag || `DFT-${String(epicIdx + 1).padStart(3, '0')}`}
                    </span>
                    <StatusLozenge status={epic.publish_status} />
                  </div>

                  {isEditing ? (
                    <div style={{ marginTop: 8 }}>
                      <input
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        style={{
                          width: '100%', fontSize: 14, fontWeight: 650, color: 'var(--fg-1)',
                          border: '1px solid #CBD5E1', borderRadius: 4, padding: '6px 8px',
                          fontFamily: 'var(--cp-font-body)', outline: 'none',
                        }}
                        onFocus={e => (e.currentTarget.style.borderColor = 'var(--cp-blue)')}
                        onBlur={e => (e.currentTarget.style.borderColor = 'var(--ds-text-disabled, #CBD5E1)')}
                      />
                      <textarea
                        value={editDesc}
                        onChange={e => setEditDesc(e.target.value)}
                        rows={3}
                        style={{
                          width: '100%', fontSize: 13, color: 'var(--fg-2)', marginTop: 6,
                          border: '1px solid #CBD5E1', borderRadius: 4, padding: '6px 8px',
                          fontFamily: 'var(--cp-font-body)', resize: 'vertical', outline: 'none',
                          lineHeight: 1.5,
                        }}
                        onFocus={e => (e.currentTarget.style.borderColor = 'var(--cp-blue)')}
                        onBlur={e => (e.currentTarget.style.borderColor = 'var(--ds-text-disabled, #CBD5E1)')}
                      />
                      <div style={{ display: 'flex', gap: 6, marginTop: 8, justifyContent: 'flex-end' }}>
                        <button onClick={cancelEdit} style={{
                          padding: '4px 12px', fontSize: 12, fontWeight: 500, borderRadius: 6,
                          border: '0.75px solid rgba(15,23,42,0.15)', background: 'var(--bg-app)',
                          color: 'var(--fg-3)', cursor: 'pointer', fontFamily: 'var(--cp-font-body)',
                        }}>Cancel</button>
                        <button onClick={saveEdit} disabled={savingEdit} style={{
                          padding: '4px 12px', fontSize: 12, fontWeight: 600, borderRadius: 6,
                          border: 'none', background: 'var(--cp-blue)', color: 'var(--ds-text-inverse, #FFFFFF)',
                          cursor: 'pointer', fontFamily: 'var(--cp-font-body)',
                        }}>{savingEdit ? 'Saving…' : 'Save'}</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p style={{
                        fontSize: 14, fontWeight: 650, color: 'var(--fg-1)',
                        margin: '8px 0 0', fontFamily: 'var(--cp-font-body)',
                      }}>
                        {epic.title}
                      </p>
                      {epic.description && (
                        <p style={{
                          fontSize: 13, fontWeight: 400, color: 'var(--fg-2)',
                          margin: '4px 0 0', lineHeight: 1.5,
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                          overflow: 'hidden', fontFamily: 'var(--cp-font-body)',
                        }}>
                          {epic.description}
                        </p>
                      )}
                      {isArchiveConfirm ? (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          marginTop: 10, fontSize: 12,
                        }}>
                          <span style={{ color: 'var(--fg-2)', fontFamily: 'var(--cp-font-body)' }}>Archive this epic?</span>
                          <button onClick={() => setArchiveConfirmId(null)} style={{
                            height: 28, padding: '0 10px', fontSize: 12, fontWeight: 500,
                            borderRadius: 6, border: isDark ? '0.75px solid #2E2E2E' : '0.75px solid rgba(15,23,42,0.15)',
                            background: 'var(--cp-bg-elevated, #FFFFFF)', color: 'var(--fg-2)', cursor: 'pointer',
                            fontFamily: 'var(--cp-font-body)',
                          }}>Cancel</button>
                          <button onClick={() => handleArchiveEpic(epic.id)} style={{
                            height: 28, padding: '0 10px', fontSize: 12, fontWeight: 600,
                            borderRadius: 6, border: '0.75px solid rgba(220,38,38,0.3)',
                            background: 'rgba(220,38,38,0.04)', color: 'var(--sem-danger)',
                            cursor: 'pointer', fontFamily: 'var(--cp-font-body)',
                          }}>Confirm</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
                          <button
                            onClick={() => startEdit(epic)}
                            style={{
                              height: 28, padding: '0 10px',
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              fontSize: 12, fontWeight: 500, color: 'var(--fg-2)',
                              border: '0.75px solid rgba(15,23,42,0.15)', borderRadius: 6,
                              background: 'var(--cp-bg-elevated, #FFFFFF)', cursor: 'pointer',
                              fontFamily: 'var(--cp-font-body)',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = isDark ? 'var(--cp-bg-surface, #242528)' : 'rgba(37,99,235,0.04)')}
                            onMouseLeave={e => (e.currentTarget.style.background = isDark ? 'var(--cp-bg-surface, #242528)' : 'var(--bg-app)')}
                          >
                            <Pencil size={13} /> Edit
                          </button>
                          <button
                            onClick={() => setArchiveConfirmId(epic.id)}
                            style={{
                              height: 28, padding: '0 10px',
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              fontSize: 12, fontWeight: 500, color: 'var(--fg-3)',
                              border: '0.75px solid rgba(15,23,42,0.15)', borderRadius: 6,
                              background: 'var(--bg-app)', cursor: 'pointer',
                              fontFamily: 'var(--cp-font-body)',
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.background = 'rgba(220,38,38,0.04)';
                              e.currentTarget.style.color = 'var(--sem-danger)';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.background = 'var(--bg-app)';
                              e.currentTarget.style.color = 'var(--fg-3)';
                            }}
                          >
                            <Archive size={13} /> Archive
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* ── Panel Footer ── */}
        <div style={{
          padding: '12px 20px',
          borderTop: '0.75px solid rgba(15,23,42,0.08)',
          background: 'var(--cp-float)', flexShrink: 0,
        }}>
          <div style={{
            fontSize: 12, color: 'var(--fg-3)', marginBottom: 10,
            fontFamily: 'var(--cp-font-body)',
          }}>
            {epics.length} draft{epics.length !== 1 ? 's' : ''}{jiraKey ? ` · ${jiraKey}` : ''}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {hasDrafts && (
              <button
                onClick={handleMarkReviewed}
                disabled={markingReviewed}
                style={{
                  flex: 1, height: 50, fontSize: 13, fontWeight: 600,
                  borderRadius: 6, border: '0.75px solid rgba(15,23,42,0.15)',
                  background: 'var(--bg-app)', color: 'var(--fg-2)',
                  cursor: 'pointer', fontFamily: 'var(--cp-font-body)',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(15,23,42,0.04)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-app)')}
              >
                {markingReviewed ? 'Marking…' : 'Mark Reviewed'}
              </button>
            )}
            <button
              onClick={() => setShowPublish(true)}
              style={{
                flex: 1, height: 50, fontSize: 13, fontWeight: 600,
                borderRadius: 6, border: 'none',
                background: 'var(--cp-blue)', color: 'var(--ds-text-inverse, #FFFFFF)',
                cursor: 'pointer', fontFamily: 'var(--cp-font-body)',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--ds-background-brand-bold-hovered, #1D4ED8)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--cp-blue)')}
            >
              Publish to Project →
            </button>
          </div>
        </div>
      </div>

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

      <style>{`@keyframes ra-epic-spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
