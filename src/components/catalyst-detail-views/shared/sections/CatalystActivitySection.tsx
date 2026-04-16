/**
 * CANONICAL — Activity section (Comments + History tabs) for all CatalystView* components.
 * Change here → updates all work item types.
 *
 * Uses the canonical CatalystRichTextEditor in "comment" mode for rich text comments
 * with image management, formatting, and ADF output.
 *
 * Comments are stored as ADF JSON in ph_comments.body. Legacy HTML comments are
 * rendered as-is for backward compatibility.
 */
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { MessageSquare, Clock, List, Pencil, MoreHorizontal, Copy, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCatalystComments } from '../hooks/useCatalystComments';
import { useCatalystActivity } from '../hooks/useCatalystActivity';
import { CatalystRichTextEditor } from '@/components/shared/rich-text';
import { AdfDescriptionRenderer } from '@/modules/project-work-hub/components/AdfDescriptionRenderer';
import { adfToHtml } from '@/modules/project-work-hub/utils/adfToHtml';
import {
  fmtDate, getInitials, getAvatarColor,
} from '@/modules/project-work-hub/components/dialogs/story-detail-modules/helpers';

interface CatalystActivitySectionProps {
  itemId: string;
  isOpen: boolean;
}

/* ── Detect if comment body is ADF JSON vs legacy HTML ── */
function isAdfContent(body: string): boolean {
  if (!body || !body.trim().startsWith('{')) return false;
  try {
    const parsed = JSON.parse(body);
    return parsed?.type === 'doc' && parsed?.version !== undefined;
  } catch { return false; }
}

/* ── Render a single comment body (ADF or legacy HTML) ── */
function CommentBody({ body, issueKey }: { body: string; issueKey?: string }) {
  if (isAdfContent(body)) {
    const parsed = JSON.parse(body);
    const html = adfToHtml(parsed);
    if (html) {
      return (
        <div className="cv-desc-body" style={{ fontSize: 14, color: '#172B4D', lineHeight: 1.6 }}>
          <AdfDescriptionRenderer html={html} issueKey={issueKey} />
        </div>
      );
    }
  }
  // Legacy HTML or plain text
  return (
    <div
      className="catalyst-comment-body"
      style={{ fontSize: 14, color: '#172B4D', lineHeight: 1.6 }}
      dangerouslySetInnerHTML={{ __html: body }}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'IMG') {
          const src = (target as HTMLImageElement).src;
          if (src) window.open(src, '_blank', 'noopener,noreferrer');
        }
      }}
    />
  );
}

export function CatalystActivitySection({ itemId, isOpen }: CatalystActivitySectionProps) {
  const { data: comments = [] } = useCatalystComments(itemId, isOpen);
  const { data: activityLog = [] } = useCatalystActivity(itemId, isOpen);
  const [activeTab, setActiveTab] = useState<'comments' | 'history' | 'all'>('comments');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [commentMenuId, setCommentMenuId] = useState<string | null>(null);
  // Key to force-remount the add-comment editor after submit
  const [addEditorKey, setAddEditorKey] = useState(0);

  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Current user profile for comment avatar
  const { data: currentProfile } = useQuery({
    queryKey: ['profile', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name, avatar_url, email').eq('id', user!.id).single();
      return data;
    },
  });

  // Add comment
  const addCommentMutation = useMutation({
    mutationFn: async (body: string) => {
      await supabase.from('ph_comments').insert({ work_item_id: itemId, body, author_id: user!.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cv-comments', itemId] });
      // Reset the editor by remounting it
      setAddEditorKey(k => k + 1);
      toast.success('Comment added');
    },
  });

  // Edit comment
  const editCommentMutation = useMutation({
    mutationFn: async ({ commentId, body }: { commentId: string; body: string }) => {
      await supabase.from('ph_comments').update({ body, updated_at: new Date().toISOString() }).eq('id', commentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cv-comments', itemId] });
      setEditingCommentId(null);
    },
  });

  // Delete comment
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      await supabase.from('ph_comments').delete().eq('id', commentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cv-comments', itemId] });
      toast.success('Comment deleted');
    },
  });

  return (
    <div style={{ borderTop: '1px solid #EBECF0', paddingTop: 20, marginTop: 8 }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16 }}>
        {(['comments', 'history'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{
              padding: '6px 12px', fontSize: 14,
              fontWeight: activeTab === tab ? 700 : 400,
              color: activeTab === tab ? '#172B4D' : '#5E6C84',
              background: 'none', border: 'none',
              borderBottom: activeTab === tab ? '2px solid #0052CC' : '2px solid transparent',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {tab === 'comments' ? <MessageSquare size={14} /> : <Clock size={14} />}
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Comments tab */}
      {activeTab === 'comments' && (
        <div>
          {/* Comment input — rich text with image management */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 24, alignItems: 'flex-start' }}>
            {currentProfile?.avatar_url ? (
              <img src={currentProfile.avatar_url} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, marginTop: 4 }} />
            ) : (
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: getAvatarColor(user?.id ?? ''), color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0, marginTop: 4 }}>
                {getInitials(currentProfile?.full_name)}
              </div>
            )}
            <div style={{ flex: 1 }}>
              <CatalystRichTextEditor
                key={addEditorKey}
                content=""
                onSave={(adfJson) => addCommentMutation.mutate(adfJson)}
                placeholder="Add a comment..."
                mode="comment"
                compact
                minHeight={80}
                workItemId={itemId}
                storagePath="comment-images"
                isSubmitting={addCommentMutation.isPending}
              />
            </div>
          </div>

          {/* Comments list */}
          {comments.length === 0 && (
            <div style={{ padding: '24px 0', color: '#97A0AF', fontSize: 14, textAlign: 'center' }}>No comments yet</div>
          )}
          {comments.map(c => (
            <div key={c.id} style={{ display: 'flex', gap: 8, margin: '8px 0 32px 0', minHeight: 40 }}>
              {c.author?.avatar_url ? (
                <div style={{ width: 36, height: 36, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={c.author.avatar_url} alt="" style={{ width: 32, height: 32, borderRadius: 9999, objectFit: 'cover', border: '2px solid #FFFFFF' }} />
                </div>
              ) : (
                <div style={{ width: 36, height: 36, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: getAvatarColor(c.author_id), color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, border: '2px solid #FFFFFF' }}>
                    {getInitials(c.author?.full_name)}
                  </div>
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'baseline' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#292A2E' }}>{c.author?.full_name ?? 'Unknown'}</span>
                  <span style={{ fontSize: 14, fontWeight: 400, color: '#292A2E' }}>commented</span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 400, color: '#292A2E', lineHeight: '16px' }}>{fmtDate(c.created_at)}</div>

                {editingCommentId === c.id ? (
                  <CatalystRichTextEditor
                    content={c.body}
                    onSave={(adfJson) => editCommentMutation.mutate({ commentId: c.id, body: adfJson })}
                    onCancel={() => setEditingCommentId(null)}
                    mode="comment"
                    compact
                    minHeight={80}
                    workItemId={itemId}
                    storagePath="comment-images"
                    isSubmitting={editCommentMutation.isPending}
                  />
                ) : (
                  <CommentBody body={c.body} />
                )}

                {/* Comment actions */}
                {editingCommentId !== c.id && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, position: 'relative' }}>
                    <button onClick={() => setEditingCommentId(c.id)} title="Edit"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 4, color: '#6B778C', display: 'flex', alignItems: 'center', transition: 'color 0.1s, background 0.1s' }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#172B4D'; e.currentTarget.style.background = '#F4F5F7'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = '#6B778C'; e.currentTarget.style.background = 'none'; }}
                    ><Pencil size={14} /></button>
                    <div style={{ position: 'relative' }}>
                      <button onClick={() => setCommentMenuId(commentMenuId === c.id ? null : c.id)} title="More"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 4, color: '#6B778C', display: 'flex', alignItems: 'center', transition: 'color 0.1s, background 0.1s' }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#172B4D'; e.currentTarget.style.background = '#F4F5F7'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#6B778C'; e.currentTarget.style.background = 'none'; }}
                      ><MoreHorizontal size={14} /></button>
                      {commentMenuId === c.id && (
                        <div style={{ position: 'absolute', left: 0, top: 28, background: '#FFF', border: '1px solid #DFE1E6', borderRadius: 6, boxShadow: '0 4px 16px rgba(9,30,66,0.18)', zIndex: 50, minWidth: 160, padding: '4px 0' }}>
                          <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/comment/${c.id}`); setCommentMenuId(null); toast.success('Link copied'); }}
                            style={{ width: '100%', padding: '8px 14px', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', fontSize: 13, color: '#172B4D', display: 'flex', alignItems: 'center', gap: 8, transition: 'background 0.1s' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#F4F5F7')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          ><Copy size={14} /> Copy link</button>
                          <button onClick={() => { deleteCommentMutation.mutate(c.id); setCommentMenuId(null); }}
                            style={{ width: '100%', padding: '8px 14px', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', fontSize: 13, color: '#DE350B', display: 'flex', alignItems: 'center', gap: 8, transition: 'background 0.1s' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#FFEBE6')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          ><Trash2 size={14} /> Delete</button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* History tab */}
      {activeTab === 'history' && (
        <div>
          {activityLog.length === 0 && (
            <div style={{ padding: '24px 0', color: '#97A0AF', fontSize: 14, textAlign: 'center' }}>No activity recorded</div>
          )}
          {activityLog.map(entry => (
            <div key={entry.id} style={{ display: 'flex', gap: 8, margin: '8px 0 32px 0', minHeight: 40, fontSize: 14, lineHeight: '20px', color: '#292A2E' }}>
              {entry.actor?.avatar_url ? (
                <div style={{ width: 36, height: 36, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={entry.actor.avatar_url} alt="" style={{ width: 32, height: 32, borderRadius: 9999, objectFit: 'cover', border: '2px solid #FFFFFF' }} />
                </div>
              ) : (
                <div style={{ width: 36, height: 36, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#0052CC', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, border: '2px solid #FFFFFF' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="2"><rect x="8" y="2" width="8" height="4" rx="1"/><rect x="4" y="4" width="16" height="18" rx="2"/></svg>
                  </div>
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'baseline' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#292A2E' }}>{entry.actor?.full_name ?? 'System'}</span>
                  <span style={{ fontSize: 14, fontWeight: 400, color: '#292A2E' }}>
                    {entry.action === 'field_updated' ? <>changed the <span style={{ fontWeight: 500 }}>{entry.field_name}</span></> : entry.action}
                  </span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 400, color: '#292A2E', lineHeight: '16px' }}>{fmtDate(entry.created_at)}</div>
                {(entry.old_value || entry.new_value) && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 4, fontSize: 14, color: '#505258' }}>
                    {entry.old_value && <span style={{ color: '#292A2E', fontWeight: 400 }}>{entry.old_value}</span>}
                    {entry.old_value && entry.new_value && <span style={{ color: '#505258' }}>→</span>}
                    {entry.new_value && <span style={{ color: '#292A2E', fontWeight: 400 }}>{entry.new_value}</span>}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
