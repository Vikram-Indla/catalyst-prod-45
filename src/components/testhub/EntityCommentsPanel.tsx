import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MessageSquare, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useEntityComments, useAddEntityComment, useDeleteEntityComment } from '@/hooks/useEntityComments';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface EntityCommentsPanelProps {
  entityType: string;
  entityId: string | undefined;
  title?: string;
}

const AVATAR_COLOURS = ['#0052CC', '#00875A', '#FF5630', '#FF8B00', '#6554C0', '#00B8D9'];

function avatarColour(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLOURS[Math.abs(h) % AVATAR_COLOURS.length];
}

function getInitials(name?: string | null): string {
  if (!name?.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  return parts.length === 1
    ? parts[0].slice(0, 2).toUpperCase()
    : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const QUICK_PILLS = ['Looks good ✓', 'Needs review 👀', 'Blocked 🚫'];

export function EntityCommentsPanel({
  entityType,
  entityId,
  title = 'Comments',
}: EntityCommentsPanelProps) {
  const [content, setContent] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [newestFirst, setNewestFirst] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: comments = [], isLoading } = useEntityComments(entityType, entityId);
  const addComment = useAddEntityComment(entityType, entityId);
  const deleteComment = useDeleteEntityComment(entityType, entityId);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, []);

  // Keyboard shortcut: press 'c' to open composer
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'c' && !e.ctrlKey && !e.metaKey && !e.altKey
        && document.activeElement?.tagName !== 'INPUT'
        && document.activeElement?.tagName !== 'TEXTAREA'
        && !document.activeElement?.getAttribute('contenteditable')) {
        setComposerOpen(true);
        setTimeout(() => textareaRef.current?.focus(), 50);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const sortedComments = useMemo(() =>
    [...comments].sort((a, b) => {
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return newestFirst ? db - da : da - db;
    }), [comments, newestFirst]);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    try {
      await addComment.mutateAsync(content.trim());
      setContent('');
      setComposerOpen(false);
    } catch {
      toast.error('Failed to add comment');
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await deleteComment.mutateAsync(commentId);
      setConfirmDeleteId(null);
    } catch {
      toast.error('Failed to delete comment');
    }
  };

  const handleCancel = () => {
    setContent('');
    setComposerOpen(false);
  };

  if (!entityId) return null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare size={18} className="text-muted-foreground" />
        <span className="text-[15px] font-semibold">{title}</span>
        <span className="text-[13px] text-muted-foreground">({comments.length})</span>
        {/* Sort toggle — right-aligned */}
        {comments.length > 1 && (
          <button
            type="button"
            onClick={() => setNewestFirst(n => !n)}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {newestFirst ? 'Newest first' : 'Oldest first'}
          </button>
        )}
      </div>

      {/* Composer — above comment list */}
      <div className="mb-4">
        {composerOpen ? (
          <div className="space-y-2">
            <Textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Add a comment..."
              className="min-h-[80px] text-sm resize-none"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
            {/* Quick-reply pills */}
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PILLS.map(pill => (
                <button
                  key={pill}
                  type="button"
                  onClick={() => setContent(pill)}
                  className="text-xs border border-border rounded-full px-2 py-0.5 hover:bg-muted cursor-pointer transition-colors"
                >
                  {pill}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">⌘+Enter to submit</span>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={!content.trim() || addComment.isPending}
                  className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => { setComposerOpen(true); setTimeout(() => textareaRef.current?.focus(), 50); }}
            className="w-full text-left text-sm text-muted-foreground border border-border rounded-md px-3 py-2 cursor-text hover:border-foreground/30 transition-colors"
          >
            Add a comment...
          </button>
        )}
      </div>

      {/* Comment list */}
      {isLoading ? (
        <p className="text-[13px] text-muted-foreground py-3">Loading comments...</p>
      ) : sortedComments.length === 0 ? (
        <p className="text-[13px] text-muted-foreground py-3 text-center">
          No comments yet. Be the first to comment.
        </p>
      ) : (
        <div className="flex flex-col">
          {sortedComments.map((comment) => {
            const name = comment.author?.full_name ?? 'Unknown';
            const bg = avatarColour(name);
            const initials = getInitials(name);
            const isConfirming = confirmDeleteId === comment.id;
            const isOwner = currentUserId === comment.author_id;

            return (
              <div key={comment.id} className="group flex gap-2 mb-6" style={{ minHeight: 40 }}>
                {/* Avatar */}
                <div className="flex-shrink-0 flex items-start justify-center" style={{ width: 36, paddingTop: 2 }}>
                  <div
                    className="flex items-center justify-center rounded-full ring-2 ring-white text-white text-[11px] font-bold"
                    style={{ width: 32, height: 32, backgroundColor: bg }}
                  >
                    {initials}
                  </div>
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold">{name}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-[13px] leading-relaxed mt-0.5 whitespace-pre-wrap">
                    {comment.content}
                  </p>
                  {/* Delete */}
                  {isOwner && (
                    isConfirming ? (
                      <div className="flex gap-2 mt-1">
                        <button
                          type="button"
                          onClick={() => handleDelete(comment.id)}
                          className="text-xs font-semibold text-red-600 bg-transparent border-none cursor-pointer"
                        >
                          Delete?
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-xs text-muted-foreground bg-transparent border-none cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(comment.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity bg-transparent border-none cursor-pointer p-0.5 mt-1 text-muted-foreground hover:text-red-600"
                      >
                        <Trash2 size={13} />
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
