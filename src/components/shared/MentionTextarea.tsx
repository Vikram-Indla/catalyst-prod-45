// ============================================================
// MENTION TEXTAREA COMPONENT
// Rich textarea with @mention dropdown for tagging users
// ============================================================

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useMentionableUsers, MentionableUser } from '@/hooks/useMentionableUsers';
import { cn } from '@/lib/utils';
import Fuse from 'fuse.js';

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  disabled?: boolean;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

export function MentionTextarea({
  value,
  onChange,
  placeholder = 'Type @ to mention someone...',
  className,
  minHeight = '80px',
  disabled = false,
  onKeyDown,
}: MentionTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartPos, setMentionStartPos] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

  const { data: users = [] } = useMentionableUsers();

  // Fuse.js for fuzzy search
  const fuse = useMemo(() => {
    return new Fuse(users, {
      keys: ['name', 'email'],
      threshold: 0.3,
      ignoreLocation: true,
    });
  }, [users]);

  // Filter users based on query
  const filteredUsers = useMemo(() => {
    if (!mentionQuery) return users.slice(0, 8);
    return fuse.search(mentionQuery).map(r => r.item).slice(0, 8);
  }, [fuse, mentionQuery, users]);

  // Calculate dropdown position
  const updateDropdownPosition = useCallback(() => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const rect = textarea.getBoundingClientRect();
    
    // Get cursor position approximately
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 20;
    const lines = value.substring(0, textarea.selectionStart).split('\n');
    const currentLineIndex = lines.length - 1;
    
    const top = rect.top + window.scrollY + (currentLineIndex * lineHeight) + lineHeight + 4;
    const left = rect.left + window.scrollX + 8;
    
    setDropdownPosition({ top, left });
  }, [value]);

  // Handle input changes
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    onChange(newValue);

    // Check for @ trigger
    const textBeforeCursor = newValue.substring(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@([a-zA-Z0-9._-]*)$/);

    if (atMatch) {
      setShowDropdown(true);
      setMentionQuery(atMatch[1] || '');
      setMentionStartPos(cursorPos - atMatch[0].length);
      setSelectedIndex(0);
      updateDropdownPosition();
    } else {
      setShowDropdown(false);
      setMentionQuery('');
    }
  }, [onChange, updateDropdownPosition]);

  // Insert mention into text
  const insertMention = useCallback((user: MentionableUser) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const cursorPos = textarea.selectionStart;
    
    // Replace @query with @name
    const beforeMention = value.substring(0, mentionStartPos);
    const afterMention = value.substring(cursorPos);
    
    // Use email username if available, otherwise use formatted name
    const mentionHandle = user.email 
      ? user.email.split('@')[0] 
      : user.name.replace(/\s+/g, '_').toLowerCase();
    
    const newValue = `${beforeMention}@${mentionHandle} ${afterMention}`;
    onChange(newValue);
    
    // Reset state
    setShowDropdown(false);
    setMentionQuery('');
    
    // Focus and set cursor after mention
    setTimeout(() => {
      const newCursorPos = mentionStartPos + mentionHandle.length + 2; // +2 for @ and space
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      textarea.focus();
    }, 0);
  }, [value, mentionStartPos, onChange]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showDropdown && filteredUsers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredUsers.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredUsers.length) % filteredUsers.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(filteredUsers[selectedIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowDropdown(false);
        return;
      }
    }
    
    onKeyDown?.(e);
  }, [showDropdown, filteredUsers, selectedIndex, insertMention, onKeyDown]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowDropdown(false);
    };
    
    if (showDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showDropdown]);

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm",
          "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        style={{ minHeight }}
      />
      
      {/* Mention dropdown */}
      {showDropdown && filteredUsers.length > 0 && createPortal(
        <div
          className="fixed z-[99999] w-72 max-h-64 overflow-auto rounded-lg border border-border bg-popover shadow-xl animate-in fade-in-0 zoom-in-95"
          style={{ 
            top: dropdownPosition.top, 
            left: dropdownPosition.left,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="py-1">
            <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border">
              People
            </div>
            {filteredUsers.map((user, index) => (
              <button
                key={user.id}
                type="button"
                onClick={() => insertMention(user)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors",
                  index === selectedIndex 
                    ? "bg-accent text-accent-foreground" 
                    : "hover:bg-accent/50"
                )}
              >
                <Avatar className="h-7 w-7">
                  <AvatarImage src={user.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                    {user.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{user.name}</div>
                  {user.role && (
                    <div className="text-xs text-muted-foreground truncate">
                      {user.role}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// Inline mention text display component
interface MentionTextProps {
  text: string;
  className?: string;
}

export function MentionText({ text, className }: MentionTextProps) {
  // Parse @mentions and render them as highlighted spans
  const parts = text.split(/(@[a-zA-Z0-9._-]+)/g);
  
  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.startsWith('@')) {
          return (
            <span 
              key={i} 
              className="text-primary font-medium bg-primary/10 rounded px-1"
            >
              {part}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}
