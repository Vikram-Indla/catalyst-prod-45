/**
 * Styled Assignee Select - TaskBoardModal Style
 * Portal-based searchable dropdown with avatars
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search, User, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Colors from TaskBoardModal
const COLORS = {
  textPrimary: '#0f172a',
  textLight: '#94a3b8',
  surfaceCard: '#ffffff',
  surfaceHover: '#f1f5f9',
  borderLight: '#e2e8f0',
  borderDefault: '#cbd5e1',
  borderFocus: '#3b82f6',
  accentLight: '#dbeafe',
  accent: '#2563eb'
};

const AVATAR_COLORS = ['#2563eb', '#0d9488', '#6b7280', '#8b5cf6', '#f97316', '#ec4899', '#14b8a6'];

function getAvatarColor(name: string): string {
  const index = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

interface Assignee {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
}

interface StyledAssigneeSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export function StyledAssigneeSelect({ value, onChange }: StyledAssigneeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [search, setSearch] = useState('');
  const triggerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch users from profiles
  const { data: users = [] } = useQuery({
    queryKey: ['create-task-assignees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .eq('approval_status', 'APPROVED')
        .order('full_name');
      
      if (error) throw error;
      return data as Assignee[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const selected = users.find(u => u.id === value);

  const filteredUsers = useMemo(() => {
    if (!search) return users;
    const lower = search.toLowerCase();
    return users.filter(u => 
      u.full_name?.toLowerCase().includes(lower) ||
      u.email?.toLowerCase().includes(lower)
    );
  }, [users, search]);

  // Get trigger position for portal
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width
      });
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current && !triggerRef.current.contains(target)) {
        const portalContent = document.querySelector('[data-styled-assignee-dropdown]');
        if (portalContent && portalContent.contains(target)) return;
        setIsOpen(false);
        setSearch('');
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => document.removeEventListener('mousedown', handleClickOutside, true);
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setSearch('');
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleSelect = useCallback((user: Assignee) => {
    onChange(user.id);
    setIsOpen(false);
    setSearch('');
  }, [onChange]);

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  }, [onChange]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {/* LABEL */}
      <span style={{
        fontSize: '11px',
        fontWeight: 600,
        color: COLORS.textLight,
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      }}>
        Assignee
      </span>

      {/* TRIGGER */}
      <div
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 14px',
          backgroundColor: COLORS.surfaceCard,
          border: `1px solid ${isOpen ? COLORS.borderFocus : (isHovered ? COLORS.borderDefault : COLORS.borderLight)}`,
          borderRadius: '10px',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          boxShadow: isOpen ? '0 0 0 3px rgba(59, 130, 246, 0.15)' : 'none'
        }}
      >
        {selected ? (
          <>
            <div 
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: getAvatarColor(selected.full_name || ''),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '10px',
                fontWeight: 700,
                flexShrink: 0
              }}
            >
              {getInitials(selected.full_name || '')}
            </div>
            <span style={{ flex: 1, fontSize: '14px', fontWeight: 500, color: COLORS.textPrimary }}>
              {selected.full_name}
            </span>
            <X 
              size={16} 
              style={{ color: COLORS.textLight, cursor: 'pointer' }} 
              onClick={handleClear}
            />
          </>
        ) : (
          <>
            <User size={18} style={{ color: COLORS.textLight }} />
            <span style={{ flex: 1, fontSize: '14px', color: COLORS.textLight }}>
              Unassigned
            </span>
          </>
        )}
        <ChevronDown 
          size={16} 
          style={{ 
            color: COLORS.textLight,
            transition: 'transform 0.2s ease',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
          }} 
        />
      </div>

      {/* PORTAL DROPDOWN */}
      {isOpen && position && createPortal(
        <div
          data-styled-assignee-dropdown
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: position.top,
            left: position.left,
            width: Math.max(position.width, 240),
            backgroundColor: COLORS.surfaceCard,
            border: `1px solid ${COLORS.borderDefault}`,
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.25)',
            zIndex: 500,
            overflow: 'hidden'
          }}
        >
          {/* SEARCH */}
          <div style={{ padding: '8px', borderBottom: `1px solid ${COLORS.borderLight}` }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: COLORS.textLight }} />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search people..."
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  fontSize: '14px',
                  color: COLORS.textPrimary,
                  backgroundColor: COLORS.surfaceHover,
                  border: `1px solid ${COLORS.borderLight}`,
                  borderRadius: '8px',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* OPTIONS */}
          <div style={{ maxHeight: '240px', overflowY: 'auto', padding: '6px' }}>
            {filteredUsers.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', fontSize: '14px', color: COLORS.textLight }}>
                No results found
              </div>
            ) : (
              filteredUsers.map((user) => (
                <AssigneeItem
                  key={user.id}
                  user={user}
                  isSelected={user.id === value}
                  onClick={() => handleSelect(user)}
                />
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// Sub-component
function AssigneeItem({ user, isSelected, onClick }: {
  user: Assignee;
  isSelected: boolean;
  onClick: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const initials = getInitials(user.full_name || '');

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 12px',
        borderRadius: '8px',
        cursor: 'pointer',
        backgroundColor: isSelected 
          ? COLORS.accentLight 
          : (isHovered ? COLORS.surfaceHover : 'transparent'),
        transition: 'background-color 0.1s ease'
      }}
    >
      <div 
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          backgroundColor: getAvatarColor(user.full_name || ''),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: '11px',
          fontWeight: 700,
          flexShrink: 0
        }}
      >
        {initials}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '14px', fontWeight: 500, color: COLORS.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user.full_name}
        </div>
        <div style={{ fontSize: '12px', color: COLORS.textLight, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user.email}
        </div>
      </div>
      {isSelected && <Check size={16} style={{ color: COLORS.accent, flexShrink: 0 }} />}
    </div>
  );
}
