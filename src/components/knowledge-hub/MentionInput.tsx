/**
 * Mention Input Component
 * Source: https://support.atlassian.com/confluence-cloud/docs/mention-a-teammate/
 * - @mentions allow users to notify others
 * - Shows autocomplete dropdown when typing @
 */
import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
}

export function MentionInput({ 
  value, 
  onChange, 
  placeholder = "Add a comment... Use @ to mention someone",
  className,
  minHeight = "80px"
}: MentionInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionStartPos, setMentionStartPos] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Fetch users for mentions
  const { data: profiles } = useQuery({
    queryKey: ['profiles-for-mentions', mentionSearch],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('id, email, full_name')
        .limit(5);
      
      if (mentionSearch) {
        query = query.or(`full_name.ilike.%${mentionSearch}%,email.ilike.%${mentionSearch}%`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Profile[];
    },
    enabled: showMentions,
  });

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    
    onChange(newValue);
    
    // Check for @ mention trigger
    const textBeforeCursor = newValue.slice(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf('@');
    
    if (atIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(atIndex + 1);
      // Only show mentions if @ is at start or after whitespace, and no space after @
      const charBeforeAt = atIndex > 0 ? newValue[atIndex - 1] : ' ';
      if ((charBeforeAt === ' ' || charBeforeAt === '\n' || atIndex === 0) && !textAfterAt.includes(' ')) {
        setShowMentions(true);
        setMentionStartPos(atIndex);
        setMentionSearch(textAfterAt);
        setSelectedIndex(0);
        return;
      }
    }
    
    setShowMentions(false);
  };

  const insertMention = (profile: Profile) => {
    const displayName = profile.full_name || profile.email.split('@')[0];
    const beforeMention = value.slice(0, mentionStartPos);
    const afterMention = value.slice(mentionStartPos + mentionSearch.length + 1);
    const newValue = `${beforeMention}@${displayName} ${afterMention}`;
    
    onChange(newValue);
    setShowMentions(false);
    setMentionSearch('');
    
    // Focus back on textarea
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newCursorPos = mentionStartPos + displayName.length + 2;
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showMentions || !profiles?.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, profiles.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && showMentions) {
      e.preventDefault();
      if (profiles[selectedIndex]) {
        insertMention(profiles[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowMentions(false);
    }
  };

  // Close mentions dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowMentions(false);
    if (showMentions) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showMentions]);

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn(className)}
        style={{ minHeight }}
      />
      
      {/* Mentions dropdown */}
      {showMentions && profiles && profiles.length > 0 && (
        <div className="absolute z-50 mt-1 w-64 bg-popover border rounded-md shadow-lg overflow-hidden">
          <div className="py-1">
            {profiles.map((profile, index) => (
              <button
                key={profile.id}
                className={cn(
                  "w-full px-3 py-2 flex items-center gap-2 text-left hover:bg-accent transition-colors",
                  index === selectedIndex && "bg-accent"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  insertMention(profile);
                }}
              >
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="bg-brand-gold/20 text-brand-gold text-xs">
                    {(profile.full_name || profile.email)[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {profile.full_name || profile.email.split('@')[0]}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {profile.email}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Renders comment text with highlighted @mentions
 */
export function CommentContent({ content }: { content: string }) {
  // Match @mentions (word after @)
  const mentionRegex = /@(\w+)/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    // Add text before mention
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }
    // Add mention as highlighted span
    parts.push(
      <span 
        key={match.index} 
        className="text-brand-gold font-medium bg-brand-gold/10 px-1 rounded"
      >
        @{match[1]}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return <span className="whitespace-pre-wrap">{parts.length > 0 ? parts : content}</span>;
}
