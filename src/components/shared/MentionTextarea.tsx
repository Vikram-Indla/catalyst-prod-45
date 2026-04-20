// ============================================================
// MENTION TEXTAREA COMPONENT
// Rich textarea with @mention dropdown for tagging users
// Enterprise-level avatars with vibrant colors
// ============================================================

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
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

// Generate consistent vibrant avatar color from name
function getAvatarColor(name: string): string {
  // CLAUDE.md §L38 — hex literals only (no HSL).
  // Atlaskit avatar palette (bold, visually distinct).
  const colors = [
    '#2A6DF4',  // Blue
    '#7C3BED',  // Purple
    '#EC4699',  // Pink
    '#E54D2E',  // Red-Orange
    '#F2960D',  // Orange
    '#25A777',  // Teal
    '#0DA2E7',  // Sky Blue
    '#21C45D',  // Green
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';
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
  const dropdownRef = useRef<HTMLDivElement>(null);
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
    requestAnimationFrame(() => {
      const newCursorPos = mentionStartPos + mentionHandle.length + 2; // +2 for @ and space
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      textarea.focus();
    });
  }, [value, mentionStartPos, onChange]);

  // Handle user selection via click
  const handleUserClick = useCallback((e: React.MouseEvent, user: MentionableUser) => {
    e.preventDefault();
    e.stopPropagation();
    insertMention(user);
  }, [insertMention]);

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
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
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
      
      {/* Mention dropdown - Enterprise styled */}
      {showDropdown && filteredUsers.length > 0 && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[99999] w-80 max-h-80 overflow-auto rounded-lg border border-border bg-popover shadow-xl animate-in fade-in-0 zoom-in-95"
          style={{ 
            top: dropdownPosition.top, 
            left: dropdownPosition.left,
            backgroundColor: 'hsl(var(--popover))',
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="py-1">
            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
              People
            </div>
            {filteredUsers.map((user, index) => {
              const avatarColor = getAvatarColor(user.name);
              const isSelected = index === selectedIndex;
              
              return (
                <button
                  key={user.id}
                  type="button"
                  onMouseDown={(e) => handleUserClick(e, user)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors cursor-pointer",
                    isSelected && "bg-primary text-primary-foreground"
                  )}
                  style={{
                    backgroundColor: isSelected ? '#2A6DF4' : undefined,
                    color: isSelected ? 'white' : undefined,
                  }}
                >
                  {/* Enterprise Avatar with vibrant color */}
                  <div
                    className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-sm"
                    style={{ 
                      backgroundColor: avatarColor,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                    }}
                  >
                    {getInitials(user.name)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div 
                      className="font-medium text-sm truncate"
                      style={{ color: isSelected ? 'white' : 'hsl(var(--foreground))' }}
                    >
                      {user.name}
                    </div>
                    {user.role && (
                      <div 
                        className="text-xs truncate"
                        style={{ 
                          color: isSelected ? 'rgba(255,255,255,0.8)' : 'hsl(var(--muted-foreground))',
                        }}
                      >
                        {user.role}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
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
              className="font-medium rounded px-1"
              style={{
                color: '#2A6DF4',
                backgroundColor: 'rgba(42, 109, 244, 0.1)',
              }}
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
