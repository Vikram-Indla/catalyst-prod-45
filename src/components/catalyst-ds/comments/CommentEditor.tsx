import * as React from 'react';
import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ads';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Bold,
  Italic,
  Underline,
  List,
  Image,
  Link2,
  Undo2,
  Redo2,
  AtSign,
  Loader2,
} from '@/lib/atlaskit-icons';
import type { CdsUser, CdsQuickReply } from '../types';
import { uploadDescriptionImage } from '@/components/shared/rich-text/atlaskit/supabaseImageUpload';

// Build a non-editable, blue-pill span for a mention. `text` should
// include the leading `@` (e.g. "@Vikram Indla").
function createMentionPill(text: string): HTMLSpanElement {
  const span = document.createElement('span');
  span.contentEditable = 'false';
  span.dataset.mention = 'true';
  span.textContent = text;
  span.style.cssText = [
    'display:inline-block',
    'padding:0 4px',
    'border-radius:3px',
    'background:var(--ds-background-information, #E9F2FF)',
    'color:var(--ds-text-brand, #0C66E4)',
    'font-weight:500',
    'margin:0 1px',
  ].join(';');
  return span;
}

// Compute the viewport-coords of `index` inside a textarea by mirroring
// its layout in a hidden div. Standard technique used by mention/emoji
// autocomplete pickers.
function getCaretCoords(
  textarea: HTMLTextAreaElement,
  index: number,
): { top: number; left: number } {
  const mirror = document.createElement('div');
  const computed = getComputedStyle(textarea);
  const props = [
    'boxSizing', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle',
    'lineHeight', 'letterSpacing', 'textTransform', 'wordSpacing',
    'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
  ];
  props.forEach((p) => {
    (mirror.style as any)[p] = (computed as any)[p];
  });
  mirror.style.position = 'absolute';
  mirror.style.visibility = 'hidden';
  mirror.style.whiteSpace = 'pre-wrap';
  mirror.style.wordWrap = 'break-word';
  mirror.style.width = `${textarea.clientWidth}px`;
  mirror.style.top = '0';
  mirror.style.left = '0';
  mirror.textContent = textarea.value.slice(0, index);
  const marker = document.createElement('span');
  marker.textContent = '​';
  mirror.appendChild(marker);
  document.body.appendChild(mirror);
  const mRect = mirror.getBoundingClientRect();
  const sRect = marker.getBoundingClientRect();
  const taRect = textarea.getBoundingClientRect();
  document.body.removeChild(mirror);
  return {
    top: taRect.top + (sRect.top - mRect.top) - textarea.scrollTop,
    left: taRect.left + (sRect.left - mRect.left) - textarea.scrollLeft,
  };
}

export interface CommentEditorProps {
  currentUser?: CdsUser;
  onSubmit: (content: string) => void | Promise<void>;
  onCancel?: () => void;
  mentionableUsers?: CdsUser[];
  quickReplies?: CdsQuickReply[];
  placeholder?: string;
  defaultValue?: string;
  isSubmitting?: boolean;
  shortcutHint?: string;
  autoFocus?: boolean;
  className?: string;
  /** Work item id — required to scope uploaded comment images per issue. */
  workItemId?: string;
}

interface ToolbarButtonProps {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
  active?: boolean;
}

function ToolbarButton({ icon, title, onClick, active }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        'h-7 w-7 flex items-center justify-center rounded',
        'text-[var(--ds-text-subtlest,var(--cp-text-secondary, #6B778C))] hover:bg-[#EBECF0] hover:text-[var(--ds-text,var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))]',
        'dark:text-[var(--ds-text-subtlest,#A1A1A1)] dark:hover:bg-[var(--ds-border,var(--cp-ink-1, #292929))] dark:hover:text-[var(--ds-text,var(--cp-bg-neutral, #EDEDED))]',
        'transition-colors duration-100',
        active && 'bg-[#EBECF0] text-[var(--ds-text,var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))] dark:bg-[var(--ds-border,var(--cp-ink-1, #292929))] dark:text-[var(--ds-text,var(--cp-bg-neutral, #EDEDED))]',
        '[&_svg]:h-4 [&_svg]:w-4'
      )}
    >
      {icon}
    </button>
  );
}

function ToolbarSep() {
  return <div className="w-px h-4 bg-[var(--ds-border,var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6)))] dark:bg-[var(--ds-border-bold,#454545)] mx-0.5" />;
}

const CommentEditor = React.forwardRef<HTMLDivElement, CommentEditorProps>(
  (
    {
      currentUser,
      onSubmit,
      onCancel,
      mentionableUsers = [],
      quickReplies,
      placeholder = 'Add a comment...',
      defaultValue = '',
      isSubmitting = false,
      shortcutHint = 'Pro tip: press M to comment',
      autoFocus = false,
      className,
      workItemId,
    },
    ref
  ) => {
    // Split incoming defaultValue into plain text + image attachments so
    // edit-mode shows the image preview (not raw markdown).
    const initialSplit = React.useMemo(() => {
      const re = /!\[([^\]]*)\]\(([^)]+)\)/g;
      const imgs: { url: string; filename: string }[] = [];
      const text = defaultValue.replace(re, (_, alt, url) => {
        imgs.push({ url, filename: alt || 'image' });
        return '';
      }).replace(/\n{3,}/g, '\n\n').trim();
      return { text, imgs };
    }, [defaultValue]);

    const [value, setValue] = useState(initialSplit.text);
    const [mentionOpen, setMentionOpen] = useState(false);
    const [mentionSearch, setMentionSearch] = useState('');
    const [mentionCoords, setMentionCoords] = useState<{ top: number; left: number } | null>(null);
    const [mentionIndex, setMentionIndex] = useState(0);
    const mentionRangeRef = useRef<Range | null>(null);
    const editorRef = useRef<HTMLDivElement>(null);

    const filteredMentionUsers = React.useMemo(() => {
      const q = mentionSearch.toLowerCase();
      return mentionableUsers
        .filter((u) => u.name.toLowerCase().includes(q) || (u.email && u.email.toLowerCase().includes(q)))
        .slice(0, 8);
    }, [mentionableUsers, mentionSearch]);

    useEffect(() => { setMentionIndex(0); }, [mentionSearch, mentionOpen]);
    const [isFocused, setIsFocused] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [attachedImages, setAttachedImages] = useState<{ url: string; filename: string }[]>(initialSplit.imgs);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Render `text` into the contenteditable div, converting `@Name` and
    // `@First Last` patterns into atomic pill spans (contentEditable=false
    // so the caret treats them as one unit).
    const renderInitialContent = useCallback((text: string) => {
      const root = editorRef.current;
      if (!root) return;
      root.innerHTML = '';
      const mentionRe = /@[A-Z][\w.]*(?:\s[A-Z][\w.]*)*|@\w+/g;
      let lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = mentionRe.exec(text)) !== null) {
        if (m.index > lastIndex) {
          root.appendChild(document.createTextNode(text.slice(lastIndex, m.index)));
        }
        root.appendChild(createMentionPill(m[0]));
        lastIndex = m.index + m[0].length;
      }
      if (lastIndex < text.length) {
        root.appendChild(document.createTextNode(text.slice(lastIndex)));
      }
    }, []);

    // Initialise editor on mount + when defaultValue changes (edit mode).
    const lastDefaultRef = useRef<string | null>(null);
    useEffect(() => {
      if (lastDefaultRef.current === defaultValue) return;
      lastDefaultRef.current = defaultValue;
      renderInitialContent(initialSplit.text);
      setValue(initialSplit.text);
      setAttachedImages(initialSplit.imgs);
      if (autoFocus) {
        requestAnimationFrame(() => {
          const root = editorRef.current;
          if (!root) return;
          root.focus();
          // Move caret to end
          const range = document.createRange();
          range.selectNodeContents(root);
          range.collapse(false);
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);
        });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [defaultValue]);

    useEffect(() => {
      if (autoFocus) editorRef.current?.focus();
    }, [autoFocus]);

    useEffect(() => {
      const handleKeydown = (e: KeyboardEvent) => {
        if (e.key === 'm' || e.key === 'M') {
          const tag = (e.target as HTMLElement)?.tagName;
          if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;
          e.preventDefault();
          editorRef.current?.focus();
        }
      };
      document.addEventListener('keydown', handleKeydown);
      return () => document.removeEventListener('keydown', handleKeydown);
    }, []);

    const handleSubmit = useCallback(async () => {
      const trimmed = value.trim();
      const imageMarkdown = attachedImages
        .map((img) => `![${img.filename}](${img.url})`)
        .join('\n');
      const combined = [trimmed, imageMarkdown].filter(Boolean).join('\n\n');
      if (!combined) return;
      await onSubmit(combined);
      setValue('');
      setAttachedImages([]);
    }, [value, attachedImages, onSubmit]);

    const closeMention = useCallback(() => {
      setMentionOpen(false);
      setMentionSearch('');
      setMentionCoords(null);
      mentionRangeRef.current = null;
    }, []);

    const handleMentionSelect = useCallback(
      (user: CdsUser) => {
        const range = mentionRangeRef.current;
        const root = editorRef.current;
        if (range && root) {
          // Replace the @query range with a pill span + trailing space.
          range.deleteContents();
          const pill = createMentionPill(`@${user.name}`);
          range.insertNode(pill);
          const space = document.createTextNode(' ');
          pill.after(space);
          // Move caret after the space.
          const sel = window.getSelection();
          const newRange = document.createRange();
          newRange.setStart(space, 1);
          newRange.collapse(true);
          sel?.removeAllRanges();
          sel?.addRange(newRange);
          setValue(root.textContent || '');
        }
        closeMention();
      },
      [closeMention]
    );

    // Read the text from the start of the editor to the caret, treating
    // mention pills as their textContent (so `@Name` counts as the chars
    // `@Name` even though it's a span).
    const textBeforeCaret = useCallback((): { text: string; range: Range | null } => {
      const root = editorRef.current;
      const sel = window.getSelection();
      if (!root || !sel || sel.rangeCount === 0) return { text: '', range: null };
      const liveRange = sel.getRangeAt(0);
      const range = document.createRange();
      range.setStart(root, 0);
      range.setEnd(liveRange.endContainer, liveRange.endOffset);
      return { text: range.toString(), range: liveRange.cloneRange() };
    }, []);

    const handleEditorInput = useCallback(() => {
      const root = editorRef.current;
      if (!root) return;
      setValue(root.textContent || '');

      const { text: before } = textBeforeCaret();
      const at = before.lastIndexOf('@');
      // Detect `@query` immediately before the caret. The `@` must be at
      // the start of the editor or follow whitespace, and the query must
      // not contain whitespace.
      if (at !== -1 && (at === 0 || /\s/.test(before[at - 1]))) {
        const query = before.slice(at + 1);
        if (!/\s/.test(query)) {
          // Build a Range that covers `@query` so we can later replace it.
          const sel = window.getSelection();
          const live = sel?.rangeCount ? sel.getRangeAt(0) : null;
          if (live) {
            // Walk back `query.length + 1` chars from the caret to find
            // the start of `@`.
            const mention = document.createRange();
            mention.setEnd(live.endContainer, live.endOffset);
            let remaining = query.length + 1;
            const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
            // Find the text nodes leading up to caret and accumulate from end.
            const textNodes: Text[] = [];
            let n: Node | null;
            while ((n = walker.nextNode())) textNodes.push(n as Text);
            for (let i = textNodes.length - 1; i >= 0; i--) {
              const tn = textNodes[i];
              const len = i === textNodes.length - 1 && tn === live.endContainer
                ? live.endOffset
                : tn.length;
              if (remaining <= len) {
                mention.setStart(tn, len - remaining);
                remaining = 0;
                break;
              }
              remaining -= len;
            }
            if (remaining === 0) {
              mentionRangeRef.current = mention;
              const rect = mention.getBoundingClientRect();
              setMentionOpen(true);
              setMentionSearch(query);
              setMentionCoords({ top: rect.bottom + 4, left: rect.left });
              return;
            }
          }
        }
      }
      closeMention();
    }, [textBeforeCaret, closeMention]);

    const handleEditorKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (mentionOpen && filteredMentionUsers.length > 0) {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setMentionIndex((i) => Math.min(i + 1, filteredMentionUsers.length - 1));
            return;
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            setMentionIndex((i) => Math.max(i - 1, 0));
            return;
          }
          if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            handleMentionSelect(filteredMentionUsers[mentionIndex]);
            return;
          }
        }
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
          e.preventDefault();
          handleSubmit();
        }
        if (e.key === 'Escape') {
          if (mentionOpen) {
            e.preventDefault();
            closeMention();
            return;
          }
          if (onCancel) {
            e.preventDefault();
            onCancel();
          }
        }
      },
      [handleSubmit, onCancel, mentionOpen, filteredMentionUsers, mentionIndex, handleMentionSelect, closeMention]
    );

    const handleQuickReply = useCallback(
      (template: string) => {
        const root = editorRef.current;
        if (!root) return;
        renderInitialContent(template);
        setValue(template);
        root.focus();
      },
      [renderInitialContent]
    );

    const handleImagePick = useCallback(() => {
      // Keep the toolbar open while the file picker runs.
      fileInputRef.current?.click();
    }, []);

    const handleImageSelected = useCallback(
      async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file || !workItemId) return;
        setUploading(true);
        try {
          const uploaded = await uploadDescriptionImage(file, { workItemId });
          if (uploaded?.url) {
            setAttachedImages((prev) => [...prev, { url: uploaded.url, filename: uploaded.filename }]);
          }
        } finally {
          setUploading(false);
        }
      },
      [workItemId],
    );

    // Run an execCommand on the contenteditable. Returns focus to it.
    const runCmd = useCallback((cmd: string, arg?: string) => {
      editorRef.current?.focus();
      document.execCommand(cmd, false, arg);
      setValue(editorRef.current?.textContent || '');
    }, []);

    const insertMentionTrigger = useCallback(() => {
      const root = editorRef.current;
      if (!root) return;
      root.focus();
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      // Make sure the @ has whitespace before it if needed.
      const range = sel.getRangeAt(0);
      const before = (range.startContainer.textContent || '').slice(0, range.startOffset);
      const needsSpace = before.length > 0 && !/\s$/.test(before);
      const node = document.createTextNode((needsSpace ? ' @' : '@'));
      range.insertNode(node);
      // Move caret after the inserted text.
      const newRange = document.createRange();
      newRange.setStart(node, node.length);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
      handleEditorInput();
    }, [handleEditorInput]);

    const isExpanded = isFocused || value.length > 0 || attachedImages.length > 0;

    return (
      <div ref={ref} className={cn('space-y-2', className)}>
        <div className="flex gap-3">
          {currentUser && (
            <span className="shrink-0 mt-1">
              <Avatar
                src={currentUser.avatarUrl}
                name={currentUser.name}
                size="small"
              />
            </span>
          )}

          <div className="flex-1 min-w-0">
            <div
              className={cn(
                'rounded-md border transition-colors duration-150',
                'border-[var(--ds-border,var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6)))] dark:border-[var(--ds-border,var(--cp-ink-1, #2E2E2E))]',
                isFocused && 'border-[#4C9AFF] dark:border-[#4C9AFF] ring-1 ring-[#4C9AFF]/30',
                'bg-[var(--ds-surface-sunken,#FAFBFC)] dark:bg-[var(--ds-surface-raised,var(--cp-ink-1, #1A1A1A))]'
              )}
            >
              {isExpanded && (
                <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-[var(--ds-border,var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6)))] dark:border-[var(--ds-border,var(--cp-ink-1, #2E2E2E))]">
                  <ToolbarButton icon={<Bold />} title="Bold (Ctrl+B)" onClick={() => runCmd('bold')} />
                  <ToolbarButton icon={<Italic />} title="Italic (Ctrl+I)" onClick={() => runCmd('italic')} />
                  <ToolbarButton icon={<Underline />} title="Underline" onClick={() => runCmd('underline')} />
                  <ToolbarSep />
                  <ToolbarButton icon={<List />} title="Bullet list" onClick={() => runCmd('insertUnorderedList')} />
                  <ToolbarButton
                    icon={uploading ? <Loader2 className="animate-spin" /> : <Image />}
                    title={uploading ? 'Uploading…' : 'Add image'}
                    onClick={handleImagePick}
                  />
                  <ToolbarButton
                    icon={<Link2 />}
                    title="Add link"
                    onClick={() => {
                      const url = window.prompt('Enter URL');
                      if (url) runCmd('createLink', url);
                    }}
                  />
                  <ToolbarSep />
                  <ToolbarButton icon={<Undo2 />} title="Undo" onClick={() => document.execCommand('undo')} />
                  <ToolbarButton icon={<Redo2 />} title="Redo" onClick={() => document.execCommand('redo')} />

                  <div className="ml-auto">
                    <ToolbarButton
                      icon={<AtSign />}
                      title="Mention"
                      onClick={insertMentionTrigger}
                    />
                  </div>
                </div>
              )}

              {mentionOpen && mentionCoords && createPortal(
                <div
                  data-cv-mention-picker="true"
                  className={cn(
                    'fixed z-[2000] w-64 rounded-md border',
                    'border-[var(--ds-border,#DFE1E6)] bg-[var(--ds-surface,#FFF)] dark:bg-[var(--ds-surface-raised,#1A1A1A)]',
                    'shadow-lg'
                  )}
                  style={{ top: mentionCoords.top, left: mentionCoords.left }}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <Command>
                    <CommandList>
                      <CommandEmpty>No users found.</CommandEmpty>
                      <CommandGroup heading="Team Members">
                        {filteredMentionUsers.map((user, i) => (
                          <CommandItem
                            key={user.id}
                            onSelect={() => handleMentionSelect(user)}
                            onMouseEnter={() => setMentionIndex(i)}
                            className={cn(
                              'cursor-pointer',
                              i === mentionIndex && 'bg-[var(--ds-background-neutral-subtle-hovered,#F4F5F7)] dark:bg-[var(--ds-border,#292929)]'
                            )}
                          >
                            <span className="mr-2">
                              <Avatar src={user.avatarUrl} name={user.name} size="xsmall" />
                            </span>
                            <div className="flex flex-col">
                              <span className="text-[13px] font-medium">{user.name}</span>
                              {user.email && (
                                <span className="text-[11px] text-[var(--ds-text-subtlest,#6B778C)] dark:text-[var(--ds-text-subtlest,#878787)]">
                                  {user.email}
                                </span>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </div>,
                document.body
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleImageSelected}
              />
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleEditorInput}
                onKeyDown={handleEditorKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                data-placeholder={placeholder}
                className={cn(
                  'cv-comment-editor-content w-full border-0 bg-transparent px-3 py-2.5',
                  'text-[14px] text-[var(--ds-text,#292A2E)] dark:text-[var(--ds-text,var(--cp-bg-neutral, #EDEDED))]',
                  'focus:outline-none focus:ring-0',
                  'min-h-[60px] whitespace-pre-wrap break-words',
                  'transition-all duration-150',
                  'empty:before:content-[attr(data-placeholder)] empty:before:text-[#7A869A] empty:before:dark:text-[var(--ds-text-subtlest,#878787)]'
                )}
              />
              {/* Attached-image previews — rendered from state, not the textarea text. */}
              {attachedImages.length > 0 && (
                <div className="flex flex-wrap gap-2 px-3 pb-2">
                  {attachedImages.map((img, i) => (
                    <div key={`${img.url}-${i}`} className="relative">
                      <img
                        src={img.url}
                        alt=""
                        className="h-20 max-w-[200px] rounded border border-[var(--ds-border,#DFE1E6)] object-cover"
                      />
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setAttachedImages((prev) => prev.filter((_, idx) => idx !== i))}
                        aria-label="Remove image"
                        className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-[var(--ds-background-neutral-bold,#44546F)] text-white flex items-center justify-center text-[12px] leading-none"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {isExpanded && (
              <>
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    size="sm"
                    onClick={handleSubmit}
                    disabled={(!value.trim() && attachedImages.length === 0) || isSubmitting}
                    className="h-8 px-4 text-[13px] font-medium"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save'
                    )}
                  </Button>
                  {onCancel && (
                    <button
                      type="button"
                      onClick={onCancel}
                      className="text-[13px] font-medium text-[var(--ds-text-subtlest,var(--cp-text-secondary, #6B778C))] hover:text-[var(--ds-text,var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))] dark:text-[var(--ds-text-subtlest,#A1A1A1)] dark:hover:text-[var(--ds-text,var(--cp-bg-neutral, #EDEDED))] transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>

                {quickReplies && quickReplies.length > 0 && (
                  <div className="flex items-center gap-3 mt-2">
                    {quickReplies.map((qr) => (
                      <button
                        key={qr.label}
                        type="button"
                        onClick={() => handleQuickReply(qr.template)}
                        className={cn(
                          'text-[12px] text-[var(--ds-text-subtlest,var(--cp-text-secondary, #6B778C))] dark:text-[var(--ds-text-subtlest,var(--cp-text-secondary, #878787))]',
                          'hover:text-[var(--ds-text,var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))] dark:hover:text-[var(--ds-text,var(--cp-bg-neutral, #EDEDED))]',
                          'hover:underline transition-colors cursor-pointer'
                        )}
                      >
                        {qr.label}
                      </button>
                    ))}
                  </div>
                )}

                {shortcutHint && (
                  <p className="text-[12px] text-[var(--ds-text-subtlest,var(--cp-text-secondary, #6B778C))] dark:text-[var(--ds-text-subtlest,var(--cp-text-secondary, #878787))] mt-1.5">
                    {shortcutHint.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
                      part.startsWith('**') ? (
                        <span key={i} className="font-semibold text-[var(--ds-text,var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))] dark:text-[var(--ds-text,var(--cp-bg-neutral, #EDEDED))]">
                          {part.replace(/\*\*/g, '')}
                        </span>
                      ) : (
                        <React.Fragment key={i}>{part}</React.Fragment>
                      )
                    )}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }
);
CommentEditor.displayName = 'CommentEditor';

export { CommentEditor };
