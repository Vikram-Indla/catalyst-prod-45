// ============================================================
// STATUS DROPDOWN COMPONENT V10 — Enterprise Clean
// Matches CreateTaskModal dropdown styling
// ============================================================

import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { COLORS, STATUS_COLORS } from '@/components/planner/task-modal/colors';

interface StatusDropdownProps {
  currentStatusId: string;
  currentStatus: any;
  onChange: (statusId: string) => void;
}

function useStatuses() {
  return useQuery({
    queryKey: ['planner-statuses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('planner_statuses')
        .select('*')
        .order('position');
      if (error) throw error;
      return data;
    },
  });
}

export function StatusDropdown({ currentStatusId, currentStatus, onChange }: StatusDropdownProps) {
  const { data: statuses = [] } = useStatuses();
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getStatusColor = (slug: string, name?: string) => {
    const slugColors: Record<string, string> = {
      backlog: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #94a3b8))',
      planned: 'var(--ds-text-brand, var(--ds-text-brand, #3b82f6))',
      'in-progress': 'var(--ds-text-warning, var(--ds-text-warning, #f59e0b))',
      'in progress': 'var(--ds-text-warning, var(--ds-text-warning, #f59e0b))',
      review: '#8b5cf6',
      done: 'var(--ds-text-success, var(--ds-text-success, #16a34a))',
    };
    return slugColors[slug] || STATUS_COLORS[name || ''] || 'var(--ds-text-subtlest, var(--ds-text-subtlest, #94a3b8))';
  };

  const displayName = currentStatus?.name || 'Select status';
  const displayColor = getStatusColor(currentStatus?.slug, currentStatus?.name);

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          backgroundColor: COLORS.surfaceCard,
          border: `1px solid ${isOpen ? COLORS.borderFocus : (isHovered ? COLORS.borderDefault : COLORS.borderLight)}`,
          borderRadius: '8px',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          boxShadow: isOpen ? '0 0 0 3px rgba(59, 130, 246, 0.15)' : 'none',
          minWidth: '120px',
        }}
      >
        <span
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: displayColor,
            flexShrink: 0,
          }}
        />
        <span style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: COLORS.textPrimary }}>
          {displayName}
        </span>
        <ChevronDown size={14} style={{ color: COLORS.textLight, transition: 'transform 0.2s ease', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
      </div>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            backgroundColor: COLORS.surfaceCard,
            border: `1px solid ${COLORS.borderDefault}`,
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
            zIndex: 100001,
            padding: '6px',
            minWidth: '160px',
          }}
        >
          {statuses.map((status: any) => {
            const isSelected = status.id === currentStatusId;
            const color = getStatusColor(status.slug, status.name);
            return (
              <DropdownItem
                key={status.id}
                value={status.name}
                color={color}
                isSelected={isSelected}
                onClick={() => { onChange(status.id); setIsOpen(false); }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// Shared DropdownItem Component
function DropdownItem({ value, color, isSelected, onClick }: { value: string; color: string; isSelected: boolean; onClick: () => void }) {
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
        backgroundColor: isSelected ? COLORS.accentLight : (isHovered ? COLORS.surfaceHover : 'transparent'),
        transition: 'background-color 0.1s ease'
      }}
    >
      <span
        style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          backgroundColor: color,
          flexShrink: 0,
        }}
      />
      <span style={{ fontSize: '14px', color: COLORS.textPrimary }}>{value}</span>
      {isSelected && <Check size={16} style={{ color: COLORS.accent, marginLeft: 'auto' }} />}
    </div>
  );
}
