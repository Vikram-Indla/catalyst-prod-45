import * as React from 'react';
import { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ads';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
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
    const [isFocused, setIsFocused] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [attachedImages, setAttachedImages] = useState<{ url: string; filename: string }[]>(initialSplit.imgs);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      if (autoFocus) textareaRef.current?.focus();
    }, [autoFocus]);

    // Re-sync the split when defaultValue changes (e.g. edit-mode mounts).
    // Belt-and-braces — useState's initial value already covers fresh mounts;
    // this catches any remount-without-key edge case.
    const lastDefaultRef = useRef(defaultValue);
    useEffect(() => {
      if (defaultValue !== lastDefaultRef.current) {
        lastDefaultRef.current = defaultValue;
        setValue(initialSplit.text);
        setAttachedImages(initialSplit.imgs);
      }
    }, [defaultValue, initialSplit]);

    useEffect(() => {
      const handleKeydown = (e: KeyboardEvent) => {
        if (e.key === 'm' || e.key === 'M') {
          const tag = (e.target as HTMLElement)?.tagName;
          if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;
          e.preventDefault();
          textareaRef.current?.focus();
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

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
          e.preventDefault();
          handleSubmit();
        }
        if (e.key === 'Escape' && onCancel) {
          e.preventDefault();
          onCancel();
        }
      },
      [handleSubmit, onCancel]
    );

    const handleMentionSelect = useCallback(
      (user: CdsUser) => {
        const mention = `@[${user.name}](${user.id})`;
        setValue((prev) => prev + mention + ' ');
        setMentionOpen(false);
        setMentionSearch('');
        textareaRef.current?.focus();
      },
      []
    );

    const handleQuickReply = useCallback(
      (template: string) => {
        setValue(template);
        textareaRef.current?.focus();
      },
      []
    );

    const insertAtCursor = useCallback((text: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      setValue((prev) => prev.slice(0, start) + text + prev.slice(end));
      requestAnimationFrame(() => {
        textarea.focus();
        const pos = start + text.length;
        textarea.setSelectionRange(pos, pos);
      });
    }, []);

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

    const wrapText = useCallback((prefix: string, suffix: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = value.slice(start, end);
      const newVal = value.slice(0, start) + prefix + selected + suffix + value.slice(end);
      setValue(newVal);
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(start + prefix.length, end + prefix.length);
      });
    }, [value]);

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
                  <ToolbarButton icon={<Bold />} title="Bold (Ctrl+B)" onClick={() => wrapText('**', '**')} />
                  <ToolbarButton icon={<Italic />} title="Italic (Ctrl+I)" onClick={() => wrapText('_', '_')} />
                  <ToolbarButton icon={<Underline />} title="Underline" onClick={() => wrapText('<u>', '</u>')} />
                  <ToolbarSep />
                  <ToolbarButton icon={<List />} title="Bullet list" onClick={() => wrapText('\n- ', '')} />
                  <ToolbarButton
                    icon={uploading ? <Loader2 className="animate-spin" /> : <Image />}
                    title={uploading ? 'Uploading…' : 'Add image'}
                    onClick={handleImagePick}
                  />
                  <ToolbarButton icon={<Link2 />} title="Add link" onClick={() => wrapText('[', '](url)')} />
                  <ToolbarSep />
                  <ToolbarButton icon={<Undo2 />} title="Undo" onClick={() => document.execCommand('undo')} />
                  <ToolbarButton icon={<Redo2 />} title="Redo" onClick={() => document.execCommand('redo')} />

                  <div className="ml-auto">
                    <Popover open={mentionOpen} onOpenChange={setMentionOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className={cn(
                            'h-7 w-7 flex items-center justify-center rounded',
                            'text-[var(--ds-text-subtlest,var(--cp-text-secondary, #6B778C))] hover:bg-[#EBECF0] hover:text-[var(--ds-text,var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))]',
                            'dark:text-[var(--ds-text-subtlest,#A1A1A1)] dark:hover:bg-[var(--ds-border,var(--cp-ink-1, #292929))] dark:hover:text-[var(--ds-text,var(--cp-bg-neutral, #EDEDED))]',
                            '[&_svg]:h-4 [&_svg]:w-4'
                          )}
                        >
                          <AtSign />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-64 p-0 z-[400]"
                        align="end"
                        side="bottom"
                      >
                        <Command>
                          <CommandInput
                            placeholder="Search users..."
                            value={mentionSearch}
                            onValueChange={setMentionSearch}
                          />
                          <CommandList>
                            <CommandEmpty>No users found.</CommandEmpty>
                            <CommandGroup heading="Team Members">
                              {mentionableUsers
                                .filter((u) => {
                                  const q = mentionSearch.toLowerCase();
                                  return (
                                    u.name.toLowerCase().includes(q) ||
                                    (u.email && u.email.toLowerCase().includes(q))
                                  );
                                })
                                .map((user) => (
                                  <CommandItem
                                    key={user.id}
                                    onSelect={() => handleMentionSelect(user)}
                                    className="cursor-pointer"
                                  >
                                    <span className="mr-2">
                                      <Avatar
                                        src={user.avatarUrl}
                                        name={user.name}
                                        size="xsmall"
                                      />
                                    </span>
                                    <div className="flex flex-col">
                                      <span className="text-[13px] font-medium">{user.name}</span>
                                      {user.email && (
                                        <span className="text-[11px] text-[var(--ds-text-subtlest,var(--cp-text-secondary, #6B778C))] dark:text-[var(--ds-text-subtlest,var(--cp-text-secondary, #878787))]">
                                          {user.email}
                                        </span>
                                      )}
                                    </div>
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleImageSelected}
              />
              <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={placeholder}
                rows={isExpanded ? 4 : 2}
                className={cn(
                  'w-full resize-none border-0 bg-transparent px-3 py-2.5',
                  'text-[14px] text-[var(--ds-text,#292A2E)] dark:text-[var(--ds-text,var(--cp-bg-neutral, #EDEDED))]',
                  'placeholder:text-[#7A869A] dark:placeholder:text-[var(--ds-text-subtlest,var(--cp-text-secondary, #878787))]',
                  'focus:outline-none focus:ring-0',
                  'transition-all duration-150'
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
