/**
 * Styled Workstream Select - TaskBoardModal Style
 * Portal-based dropdown with collision avoidance
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useUserRole } from '@/hooks/useUserRole';

// Colors from TaskBoardModal
const COLORS = {
  textPrimary: '#0f172a',
  textLight: '#94a3b8',
  surfaceCard: '#ffffff',
  surfaceHover: '#f1f5f9',
  borderLight: '#e2e8f0',
  borderDefault: '#cbd5e1',
  borderFocus: '#3b82f6',
  accentLight: '#dbeafe'
};

interface Workstream {
  id: string;
  name: string;
  color: string;
}

interface StyledWorkstreamSelectProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function StyledWorkstreamSelect({ value, onChange, error }: StyledWorkstreamSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { isAdmin, isSuperAdmin, isLoading: roleLoading } = useUserRole();
  
  const canAccessAll = isAdmin || isSuperAdmin;

  // Fetch accessible workstreams based on user role
  const { data: workstreams = [], isLoading } = useQuery({
    queryKey: ['planner-workstreams-select', user?.id, canAccessAll],
    queryFn: async () => {
      if (!user) return [];

      if (canAccessAll) {
        const { data, error } = await supabase
          .from('planner_workstreams')
          .select('id, name, color')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });
        
        if (error) throw error;
        return data as Workstream[];
      }

      const { data: memberships, error: memberError } = await supabase
        .from('workstream_members')
        .select(`
          workstream_id,
          workstream:planner_workstreams(id, name, color, is_active)
        `)
        .eq('user_id', user.id);
      
      if (memberError) throw memberError;

      return (memberships || [])
        .filter(m => (m.workstream as any)?.is_active)
        .map(m => m.workstream as Workstream);
    },
    enabled: !!user && !roleLoading,
    staleTime: 5 * 60 * 1000,
  });

  const selected = workstreams.find(w => w.id === value);

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
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current && !triggerRef.current.contains(target)) {
        const portalContent = document.querySelector('[data-styled-workstream-dropdown]');
        if (portalContent && portalContent.contains(target)) return;
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => document.removeEventListener('mousedown', handleClickOutside, true);
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleSelect = useCallback((ws: Workstream) => {
    onChange(ws.id);
    setIsOpen(false);
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
        Workstream <span style={{ color: '#ef4444' }}>*</span>
      </span>

      {/* TRIGGER */}
      <div
        ref={triggerRef}
        onClick={() => !isLoading && setIsOpen(!isOpen)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 14px',
          backgroundColor: COLORS.surfaceCard,
          border: `1px solid ${error ? '#ef4444' : (isOpen ? COLORS.borderFocus : (isHovered ? COLORS.borderDefault : COLORS.borderLight))}`,
          borderRadius: '10px',
          cursor: isLoading ? 'wait' : 'pointer',
          transition: 'all 0.15s ease',
          boxShadow: isOpen ? '0 0 0 3px rgba(59, 130, 246, 0.15)' : 'none',
          opacity: isLoading ? 0.6 : 1
        }}
      >
        {isLoading ? (
          <>
            <Loader2 size={16} style={{ color: COLORS.textLight, animation: 'spin 1s linear infinite' }} />
            <span style={{ flex: 1, fontSize: '14px', color: COLORS.textLight }}>Loading...</span>
          </>
        ) : selected ? (
          <>
            <span 
              style={{ 
                width: '10px', 
                height: '10px', 
                borderRadius: '50%', 
                backgroundColor: selected.color,
                flexShrink: 0
              }} 
            />
            <span style={{ flex: 1, fontSize: '14px', fontWeight: 500, color: COLORS.textPrimary }}>
              {selected.name}
            </span>
          </>
        ) : (
          <span style={{ flex: 1, fontSize: '14px', color: COLORS.textLight }}>
            Select workstream...
          </span>
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

      {error && (
        <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: 500 }}>{error}</span>
      )}

      {/* PORTAL DROPDOWN */}
      {isOpen && position && createPortal(
        <div
          data-styled-workstream-dropdown
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: position.top,
            left: position.left,
            width: Math.max(position.width, 200),
            backgroundColor: COLORS.surfaceCard,
            border: `1px solid ${COLORS.borderDefault}`,
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.25)',
            zIndex: 500,
            padding: '6px',
            maxHeight: '280px',
            overflowY: 'auto'
          }}
        >
          {workstreams.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', fontSize: '14px', color: COLORS.textLight }}>
              No workstreams available
            </div>
          ) : (
            workstreams.map((ws) => (
              <DropdownItem
                key={ws.id}
                name={ws.name}
                color={ws.color}
                isSelected={ws.id === value}
                onClick={() => handleSelect(ws)}
              />
            ))
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

// Sub-component
function DropdownItem({ name, color, isSelected, onClick }: {
  name: string;
  color: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);

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
      <span 
        style={{ 
          width: '10px', 
          height: '10px', 
          borderRadius: '50%', 
          backgroundColor: color,
          flexShrink: 0
        }} 
      />
      <span style={{ flex: 1, fontSize: '14px', color: COLORS.textPrimary }}>{name}</span>
      {isSelected && <Check size={16} style={{ color: '#2563eb' }} />}
    </div>
  );
}
