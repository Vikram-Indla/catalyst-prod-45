// ============================================================
// CATALYST NOTIFICATION SYSTEM - MentionInput Component
// FORMAT: @[Display Name](user-uuid)
// ============================================================

import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverAnchor,
} from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

// ============================================================
// TYPES
// ============================================================

interface User {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onMentionInserted?: (user: User) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  projectId?: string;
  minRows?: number;
  maxRows?: number;
}

export interface MentionInputRef {
  focus: () => void;
  blur: () => void;
  getValue: () => string;
  getMentions: () => Array<{ userId: string; displayName: string }>;
}

// ============================================================
// MENTION REGEX PATTERNS
// ============================================================

const MENTION_PATTERN = /@\[([^\]]+)\]\(([a-f0-9-]+)\)/g;
const TRIGGER_PATTERN = /@(\w*)$/;

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

export function extractMentions(text: string): Array<{ userId: string; displayName: string }> {
  const mentions: Array<{ userId: string; displayName: string }> = [];
  let match;
  
  const regex = new RegExp(MENTION_PATTERN);
  while ((match = regex.exec(text)) !== null) {
    mentions.push({
      displayName: match[1],
      userId: match[2],
    });
  }
  
  return mentions;
}

export function mentionsToDisplay(text: string): string {
  return text.replace(MENTION_PATTERN, '@$1');
}

export function hasMentions(text: string): boolean {
  return MENTION_PATTERN.test(text);
}

// ============================================================
// COMPONENT
// ============================================================

export const MentionInput = forwardRef<MentionInputRef, MentionInputProps>(
  (
    {
      value,
      onChange,
      onMentionInserted,
      placeholder = 'Type @ to mention someone...',
      className,
      disabled = false,
      projectId,
      minRows = 3,
      maxRows = 10,
    },
    ref
  ) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [cursorPosition, setCursorPosition] = useState(0);
    const [mentionStartPosition, setMentionStartPosition] = useState<number | null>(null);

    useImperativeHandle(ref, () => ({
      focus: () => textareaRef.current?.focus(),
      blur: () => textareaRef.current?.blur(),
      getValue: () => value,
      getMentions: () => extractMentions(value),
    }));

    const { data: users = [], isLoading: usersLoading } = useQuery({
      queryKey: ['mention-users', projectId, searchQuery],
      queryFn: async () => {
        let query = supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .order('full_name');

        if (searchQuery) {
          query = query.or(
            `full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`
          );
        }

        query = query.limit(10);

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching users for mentions:', error);
          return [];
        }

        return (data || []) as User[];
      },
      enabled: showSuggestions,
      staleTime: 30 * 1000,
    });

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        const position = e.target.selectionStart || 0;
        
        onChange(newValue);
        setCursorPosition(position);

        const textUpToCursor = newValue.slice(0, position);
        const triggerMatch = textUpToCursor.match(TRIGGER_PATTERN);

        if (triggerMatch) {
          const query = triggerMatch[1] || '';
          setSearchQuery(query);
          setMentionStartPosition(position - query.length - 1);
          setShowSuggestions(true);
        } else {
          setShowSuggestions(false);
          setMentionStartPosition(null);
        }
      },
      [onChange]
    );

    const handleSelectUser = useCallback(
      (user: User) => {
        if (mentionStartPosition === null) return;

        const beforeMention = value.slice(0, mentionStartPosition);
        const afterMention = value.slice(cursorPosition);
        
        const mentionText = `@[${user.full_name}](${user.id}) `;
        const newValue = beforeMention + mentionText + afterMention;

        onChange(newValue);
        setShowSuggestions(false);
        setMentionStartPosition(null);
        setSearchQuery('');

        onMentionInserted?.(user);

        const newCursorPosition = beforeMention.length + mentionText.length;
        setTimeout(() => {
          textareaRef.current?.focus();
          textareaRef.current?.setSelectionRange(newCursorPosition, newCursorPosition);
        }, 0);
      },
      [value, mentionStartPosition, cursorPosition, onChange, onMentionInserted]
    );

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (showSuggestions) {
          if (e.key === 'Escape') {
            e.preventDefault();
            setShowSuggestions(false);
          }
        }
      },
      [showSuggestions]
    );

    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (
          textareaRef.current &&
          !textareaRef.current.contains(e.target as Node)
        ) {
          setShowSuggestions(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      textarea.style.height = 'auto';
      
      const lineHeight = 24;
      const minHeight = minRows * lineHeight;
      const maxHeight = maxRows * lineHeight;
      
      const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
      textarea.style.height = `${newHeight}px`;
    }, [value, minRows, maxRows]);

    const getInitials = (name: string) => {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    };

    return (
      <div className="relative">
        <Popover open={showSuggestions} onOpenChange={setShowSuggestions}>
          <PopoverAnchor asChild>
            <textarea
              ref={textareaRef}
              value={value}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              className={cn(
                'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
                'ring-offset-background placeholder:text-muted-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                'disabled:cursor-not-allowed disabled:opacity-50',
                'resize-none overflow-y-auto',
                className
              )}
              style={{
                minHeight: `${minRows * 24}px`,
              }}
            />
          </PopoverAnchor>

          <PopoverContent
            align="start"
            side="bottom"
            sideOffset={4}
            className="w-[280px] p-0"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <Command>
              <CommandInput
                placeholder="Search users..."
                value={searchQuery}
                onValueChange={setSearchQuery}
                className="h-9"
              />
              <CommandList>
                <CommandEmpty>
                  {usersLoading ? 'Loading...' : 'No users found'}
                </CommandEmpty>
                <CommandGroup heading="Suggestions">
                  {users.map((user) => (
                    <CommandItem
                      key={user.id}
                      value={user.full_name}
                      onSelect={() => handleSelectUser(user)}
                      className="flex items-center gap-2 px-2 py-1.5 cursor-pointer"
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(user.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-sm font-medium truncate">
                          {user.full_name}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <p className="mt-1 text-xs text-muted-foreground">
          Type @ to mention someone
        </p>
      </div>
    );
  }
);

MentionInput.displayName = 'MentionInput';

export default MentionInput;

// ============================================================
// MENTION DISPLAY COMPONENT
// ============================================================

interface MentionDisplayProps {
  text: string;
  className?: string;
}

export function MentionDisplay({ text, className }: MentionDisplayProps) {
  const parts = text.split(MENTION_PATTERN);
  
  const elements: React.ReactNode[] = [];
  
  for (let i = 0; i < parts.length; i++) {
    if (i % 3 === 0) {
      if (parts[i]) {
        elements.push(<span key={`text-${i}`}>{parts[i]}</span>);
      }
    } else if (i % 3 === 1) {
      const displayName = parts[i];
      const userId = parts[i + 1];
      elements.push(
        <span
          key={`mention-${i}`}
          className="inline-flex items-center px-1 py-0.5 rounded bg-primary/10 text-primary font-medium text-sm cursor-pointer hover:bg-primary/20 transition-colors"
          title={`User ID: ${userId}`}
          onClick={() => {
            console.log('Mention clicked:', userId);
          }}
        >
          @{displayName}
        </span>
      );
    }
  }

  return <span className={className}>{elements}</span>;
}
