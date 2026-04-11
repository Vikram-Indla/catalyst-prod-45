import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { MessageSquare, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

// ── Mention token format: @[Full Name](userId) ──
const MENTION_TOKEN_REGEX = /@\[([^\]]+)\]\(([^)]+)\)/g;

interface MentionUser {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

/** Parse content and render mention tokens as styled spans */
function renderContentWithMentions(content: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const regex = new RegExp(MENTION_TOKEN_REGEX.source, 'g');

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(content.slice(lastIndex, match.index));
    }
    const displayName = match[1];
    nodes.push(
      <span
        key={`mention-${match.index}`}
        className="text-[#2563EB] font-medium bg-blue-50 rounded px-0.5"
      >
        @{displayName}
      </span>
    );
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < content.length) {
    nodes.push(content.slice(lastIndex));
  }
  return nodes;
}

/** Extract mentioned user IDs from content */
function extractMentionedUserIds(content: string): string[] {
  const ids: string[] = [];
  let match: RegExpExecArray | null;
  const regex = new RegExp(MENTION_TOKEN_REGEX.source, 'g');
  while ((match = regex.exec(content)) !== null) {
    ids.push(match[2]);
  }
  return [...new Set(ids)];
}

// ── ContentEditable composer helpers ──

/** Convert storage string (with @[Name](id) tokens) into HTML for contentEditable */
function storageToHtml(text: string): string {
  const regex = new RegExp(MENTION_TOKEN_REGEX.source, 'g');
  let html = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      html += escapeHtml(text.slice(lastIndex, match.index));
    }
    const displayName = match[1];
    const userId = match[2];
    html += `<span data-mention-id="${userId}" data-mention-name="${escapeAttr(displayName)}" contenteditable="false" style="color:#2563EB;font-weight:500;background:#EFF6FF;border-radius:3px;padding:0 2px;user-select:all;">@${escapeHtml(displayName)}</span>`;
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    html += escapeHtml(text.slice(lastIndex));
  }
  // Preserve newlines
  return html.replace(/\n/g, '<br>');
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(s: string): string {
  return s.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Extract storage string from contentEditable DOM */
function htmlToStorage(container: HTMLElement): string {
  let result = '';
  container.childNodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      result += node.textContent ?? '';
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      if (el.tagName === 'BR') {
        result += '\n';
      } else if (el.dataset.mentionId) {
        const name = el.dataset.mentionName ?? '';
        const id = el.dataset.mentionId;
        result += `@[${name}](${id})`;
      } else if (el.tagName === 'SPAN') {
        // Recurse for any other spans
        result += htmlToStorage(el);
      } else if (el.tagName === 'DIV') {
        // Divs created by contentEditable newlines
        if (result.length > 0 && !result.endsWith('\n')) {
          result += '\n';
        }
        result += htmlToStorage(el);
      } else {
        result += el.textContent ?? '';
      }
    }
  });
  return result;
}

/** Get plain text cursor offset in contentEditable */
function getCursorOffset(container: HTMLElement): number {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return 0;
  const range = sel.getRangeAt(0).cloneRange();
  range.selectNodeContents(container);
  range.setEnd(sel.getRangeAt(0).startContainer, sel.getRangeAt(0).startOffset);
  return range.toString().length;
}

/** Get the plain text content from contentEditable */
function getPlainText(container: HTMLElement): string {
  let result = '';
  container.childNodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      result += node.textContent ?? '';
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      if (el.tagName === 'BR') {
        result += '\n';
      } else if (el.dataset.mentionId) {
        result += `@${el.dataset.mentionName ?? ''}`;
      } else if (el.tagName === 'DIV') {
        if (result.length > 0 && !result.endsWith('\n')) result += '\n';
        result += getPlainText(el);
      } else {
        result += getPlainText(el);
      }
    }
  });
  return result;
}

export function EntityCommentsPanel({
  entityType,
  entityId,
  title = 'Comments',
}: EntityCommentsPanelProps) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [newestFirst, setNewestFirst] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  // ── Mention state ──
  const [mentionUsers, setMentionUsers] = useState<MentionUser[]>([]);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionHighlight, setMentionHighlight] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Track if editor has content for Save button state
  const [hasContent, setHasContent] = useState(false);

  const { data: comments = [], isLoading } = useEntityComments(entityType, entityId);
  const addComment = useAddEntityComment(entityType, entityId);
  const deleteComment = useDeleteEntityComment(entityType, entityId);

  // Fetch current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, []);

  // Fetch mentionable profiles once on mount
  useEffect(() => {
    (supabase as any)
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('status', 'Active')
      .order('full_name')
      .then(({ data }: { data: MentionUser[] | null }) => {
        setMentionUsers(data ?? []);
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
        setTimeout(() => editorRef.current?.focus(), 50);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Close mention dropdown on click outside
  useEffect(() => {
    if (!mentionOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMentionOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [mentionOpen]);

  // ── Filtered mention results ──
  const filteredMentions = useMemo(() => {
    if (!mentionOpen) return [];
    const q = mentionQuery.toLowerCase();
    return mentionUsers
      .filter(u => u.full_name && u.full_name.toLowerCase().includes(q))
      .slice(0, 5);
  }, [mentionOpen, mentionQuery, mentionUsers]);

  // Close dropdown if zero results and user types a space
  useEffect(() => {
    if (mentionOpen && filteredMentions.length === 0 && mentionQuery.includes(' ')) {
      setMentionOpen(false);
    }
  }, [mentionOpen, filteredMentions.length, mentionQuery]);

  // Reset highlight when filtered list changes
  useEffect(() => {
    setMentionHighlight(0);
  }, [filteredMentions.length]);

  const sortedComments = useMemo(() =>
    [...comments].sort((a, b) => {
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return newestFirst ? db - da : da - db;
    }), [comments, newestFirst]);

  // ── Insert mention chip into contentEditable ──
  const selectMention = useCallback((user: MentionUser) => {
    const editor = editorRef.current;
    if (!editor) return;

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    // Find the '@' + query text in the current text node and replace it
    const range = sel.getRangeAt(0);
    const textNode = range.startContainer;
    if (textNode.nodeType !== Node.TEXT_NODE) {
      setMentionOpen(false);
      return;
    }

    const text = textNode.textContent ?? '';
    const cursorPos = range.startOffset;
    // Walk backwards from cursor to find '@'
    let atPos = -1;
    for (let i = cursorPos - 1; i >= 0; i--) {
      if (text[i] === '@') {
        atPos = i;
        break;
      }
    }
    if (atPos < 0) {
      setMentionOpen(false);
      return;
    }

    // Split the text node: before '@', mention chip, after cursor
    const beforeText = text.slice(0, atPos);
    const afterText = text.slice(cursorPos);

    // Create mention chip
    const chip = document.createElement('span');
    chip.dataset.mentionId = user.id;
    chip.dataset.mentionName = user.full_name ?? '';
    chip.contentEditable = 'false';
    chip.style.cssText = 'color:#2563EB;font-weight:500;background:#EFF6FF;border-radius:3px;padding:0 2px;user-select:all;';
    chip.textContent = `@${user.full_name ?? 'Unknown'}`;

    // Create trailing space text node
    const spaceNode = document.createTextNode('\u00A0');

    // Replace the text node
    const parent = textNode.parentNode!;
    if (beforeText) {
      const beforeNode = document.createTextNode(beforeText);
      parent.insertBefore(beforeNode, textNode);
    }
    parent.insertBefore(chip, textNode);
    parent.insertBefore(spaceNode, textNode);
    if (afterText) {
      textNode.textContent = afterText;
    } else {
      parent.removeChild(textNode);
    }

    // Place cursor after the space
    const newRange = document.createRange();
    newRange.setStartAfter(spaceNode);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);

    setMentionOpen(false);
    setMentionQuery('');
    updateHasContent();
  }, []);

  const updateHasContent = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) {
      setHasContent(false);
      return;
    }
    const storage = htmlToStorage(editor).trim();
    setHasContent(storage.length > 0);
  }, []);

  // ── Input handler — detect '@' trigger ──
  const handleInput = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    updateHasContent();

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    const textNode = range.startContainer;
    if (textNode.nodeType !== Node.TEXT_NODE) {
      if (mentionOpen) setMentionOpen(false);
      return;
    }

    const text = textNode.textContent ?? '';
    const cursorPos = range.startOffset;
    const textBeforeCursor = text.slice(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf('@');

    if (atIndex >= 0) {
      const charBefore = atIndex > 0 ? textBeforeCursor[atIndex - 1] : ' ';
      if (charBefore === ' ' || charBefore === '\n' || charBefore === '\u00A0' || atIndex === 0) {
        const query = textBeforeCursor.slice(atIndex + 1);
        if (!query.includes(' ') && !query.includes('\n') && !query.includes('\u00A0')) {
          setMentionOpen(true);
          setMentionQuery(query);
          return;
        }
      }
    }

    if (mentionOpen) setMentionOpen(false);
  }, [mentionOpen, updateHasContent]);

  // ── Submit with notifications ──
  const handleSubmit = async () => {
    const editor = editorRef.current;
    if (!editor) return;
    const storageContent = htmlToStorage(editor).trim();
    if (!storageContent) return;

    try {
      await addComment.mutateAsync(storageContent);
      // Clear editor
      editor.innerHTML = '';
      setHasContent(false);
      setComposerOpen(false);

      // Fire mention notifications (non-blocking)
      const mentionedIds = extractMentionedUserIds(storageContent);
      const toNotify = mentionedIds.filter(id => id !== currentUserId);
      if (toNotify.length > 0 && entityId) {
        Promise.all(
          toNotify.map(uid =>
            (supabase as any).from('tm_notifications').insert({
              user_id: uid,
              type: 'mention',
              title: 'You were mentioned in a comment',
              message: storageContent.slice(0, 120),
              entity_type: entityType,
              entity_id: entityId,
              is_read: false,
            })
          )
        ).catch(() => { /* silent */ });
      }
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
    if (editorRef.current) editorRef.current.innerHTML = '';
    setHasContent(false);
    setComposerOpen(false);
    setMentionOpen(false);
  };

  const handleQuickPill = (pill: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.textContent = pill;
    setHasContent(true);
    editor.focus();
    // Place cursor at end
    const sel = window.getSelection();
    if (sel) {
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  };

  // ── Keyboard handling in contentEditable ──
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (mentionOpen && filteredMentions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionHighlight(h => (h + 1) % filteredMentions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionHighlight(h => (h - 1 + filteredMentions.length) % filteredMentions.length);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        selectMention(filteredMentions[mentionHighlight]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMentionOpen(false);
        return;
      }
    }
    // Cmd/Ctrl+Enter to submit
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Prevent pasting rich content — paste plain text only
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  if (!entityId) return null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare size={18} className="text-muted-foreground" />
        <span className="text-[15px] font-semibold">{title}</span>
        <span className="text-[13px] text-muted-foreground">({comments.length})</span>
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
          <div className="space-y-2 relative">
            {/* ContentEditable composer */}
            <div
              ref={editorRef}
              contentEditable
              role="textbox"
              aria-multiline="true"
              data-placeholder="Add a comment... (type @ to mention)"
              onInput={handleInput}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              autoFocus
              className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                overflowY: 'auto',
                maxHeight: 200,
              }}
              suppressContentEditableWarning
            />

            {/* Mention dropdown */}
            {mentionOpen && filteredMentions.length > 0 && (
              <div
                ref={dropdownRef}
                className="absolute left-0 z-50 bg-white border border-border rounded-md shadow-md overflow-y-auto"
                style={{ width: 240, maxHeight: 180, top: 'auto', marginTop: -4 }}
              >
                {filteredMentions.map((user, idx) => {
                  const name = user.full_name || 'Unknown';
                  const bg = avatarColour(name);
                  const initials = getInitials(name);
                  return (
                    <button
                      key={user.id}
                      type="button"
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors ${
                        idx === mentionHighlight ? 'bg-muted' : 'hover:bg-muted/50'
                      }`}
                      onMouseDown={(e) => { e.preventDefault(); selectMention(user); }}
                      onMouseEnter={() => setMentionHighlight(idx)}
                    >
                      <div
                        className="flex items-center justify-center rounded-full text-white text-[10px] font-bold flex-shrink-0"
                        style={{ width: 28, height: 28, backgroundColor: bg }}
                      >
                        {initials}
                      </div>
                      <span className="truncate">{name}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Quick-reply pills */}
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PILLS.map(pill => (
                <button
                  key={pill}
                  type="button"
                  onClick={() => handleQuickPill(pill)}
                  className="text-xs border border-border rounded-full px-2 py-0.5 hover:bg-muted cursor-pointer transition-colors"
                >
                  {pill}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">⌘+Enter to submit · @ to mention</span>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={!hasContent || addComment.isPending}
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
            onClick={() => { setComposerOpen(true); setTimeout(() => editorRef.current?.focus(), 50); }}
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
                    {renderContentWithMentions(comment.content)}
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

      {/* Placeholder styles for contentEditable */}
      <style>{`
        [data-placeholder]:empty::before {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground));
          pointer-events: none;
          position: absolute;
        }
      `}</style>
    </div>
  );
}
