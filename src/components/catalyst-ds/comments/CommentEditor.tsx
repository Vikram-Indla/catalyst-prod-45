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
} from 'lucide-react';
import type { CdsUser, CdsQuickReply } from '../types';

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
      onClick={onClick}
      className={cn(
        'h-7 w-7 flex items-center justify-center rounded',
        'text-[var(--ds-text-subtlest, #6B778C)] hover:bg-[#EBECF0] hover:text-[var(--ds-text, #172B4D)]',
        'dark:text-[var(--ds-text-subtlest, #A1A1A1)] dark:hover:bg-[var(--ds-border, #292929)] dark:hover:text-[var(--ds-text, #EDEDED)]',
        'transition-colors duration-100',
        active && 'bg-[#EBECF0] text-[var(--ds-text, #172B4D)] dark:bg-[var(--ds-border, #292929)] dark:text-[var(--ds-text, #EDEDED)]',
        '[&_svg]:h-4 [&_svg]:w-4'
      )}
    >
      {icon}
    </button>
  );
}

function ToolbarSep() {
  return <div className="w-px h-4 bg-[var(--ds-border, #DFE1E6)] dark:bg-[var(--ds-border-bold, #454545)] mx-0.5" />;
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
    },
    ref
  ) => {
    const [value, setValue] = useState(defaultValue);
    const [mentionOpen, setMentionOpen] = useState(false);
    const [mentionSearch, setMentionSearch] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
      if (autoFocus) textareaRef.current?.focus();
    }, [autoFocus]);

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
      if (!trimmed) return;
      await onSubmit(trimmed);
      setValue('');
    }, [value, onSubmit]);

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

    const isExpanded = isFocused || value.length > 0;

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
                'border-[var(--ds-border, #DFE1E6)] dark:border-[var(--ds-border, #2E2E2E)]',
                isFocused && 'border-[#4C9AFF] dark:border-[#4C9AFF] ring-1 ring-[#4C9AFF]/30',
                'bg-[var(--ds-surface-sunken, #FAFBFC)] dark:bg-[var(--ds-surface-raised, #1A1A1A)]'
              )}
            >
              {isExpanded && (
                <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-[var(--ds-border, #DFE1E6)] dark:border-[var(--ds-border, #2E2E2E)]">
                  <ToolbarButton icon={<Bold />} title="Bold (Ctrl+B)" onClick={() => wrapText('**', '**')} />
                  <ToolbarButton icon={<Italic />} title="Italic (Ctrl+I)" onClick={() => wrapText('_', '_')} />
                  <ToolbarButton icon={<Underline />} title="Underline" onClick={() => wrapText('<u>', '</u>')} />
                  <ToolbarSep />
                  <ToolbarButton icon={<List />} title="Bullet list" onClick={() => wrapText('\n- ', '')} />
                  <ToolbarButton icon={<Image />} title="Add image" onClick={() => wrapText('![', '](url)')} />
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
                            'text-[var(--ds-text-subtlest, #6B778C)] hover:bg-[#EBECF0] hover:text-[var(--ds-text, #172B4D)]',
                            'dark:text-[var(--ds-text-subtlest, #A1A1A1)] dark:hover:bg-[var(--ds-border, #292929)] dark:hover:text-[var(--ds-text, #EDEDED)]',
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
                                        <span className="text-[11px] text-[var(--ds-text-subtlest, #6B778C)] dark:text-[var(--ds-text-subtlest, #878787)]">
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
                  'text-[13px] text-[var(--ds-text, #172B4D)] dark:text-[var(--ds-text, #EDEDED)]',
                  'placeholder:text-[#7A869A] dark:placeholder:text-[var(--ds-text-subtlest, #878787)]',
                  'focus:outline-none focus:ring-0',
                  'transition-all duration-150'
                )}
              />
            </div>

            {isExpanded && (
              <>
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    size="sm"
                    onClick={handleSubmit}
                    disabled={!value.trim() || isSubmitting}
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
                      className="text-[13px] font-medium text-[var(--ds-text-subtlest, #6B778C)] hover:text-[var(--ds-text, #172B4D)] dark:text-[var(--ds-text-subtlest, #A1A1A1)] dark:hover:text-[var(--ds-text, #EDEDED)] transition-colors"
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
                          'text-[12px] text-[var(--ds-text-subtlest, #6B778C)] dark:text-[var(--ds-text-subtlest, #878787)]',
                          'hover:text-[var(--ds-text, #172B4D)] dark:hover:text-[var(--ds-text, #EDEDED)]',
                          'hover:underline transition-colors cursor-pointer'
                        )}
                      >
                        {qr.label}
                      </button>
                    ))}
                  </div>
                )}

                {shortcutHint && (
                  <p className="text-[12px] text-[var(--ds-text-subtlest, #6B778C)] dark:text-[var(--ds-text-subtlest, #878787)] mt-1.5">
                    {shortcutHint.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
                      part.startsWith('**') ? (
                        <span key={i} className="font-semibold text-[var(--ds-text, #172B4D)] dark:text-[var(--ds-text, #EDEDED)]">
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
