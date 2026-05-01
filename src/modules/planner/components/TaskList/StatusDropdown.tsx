/**
 * StatusDropdown - Modal-style status picker with colored dots
 * Extracted from TaskListRowV3 for modularity
 */

import { useState, useRef, useEffect, memo } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { COLORS, STATUS_COLORS } from '@/components/planner/task-modal/colors';
import type { TaskListTask } from '../../hooks/useTaskList';

export interface StatusDropdownProps {
  task: TaskListTask;
  statuses: Array<{ id: string; name: string; slug?: string; color?: string }>;
  statusConfig: { bgColor: string; borderColor: string; dotColor: string };
  width: number | string;
  onUpdate: (taskId: string, field: string, value: any) => void;
}

// Shared DropdownItem for Status
function StatusDropdownItem({ value, color, isSelected, onClick }: { value: string; color: string; isSelected: boolean; onClick: () => void }) {
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

export const StatusDropdown = memo(function StatusDropdown({ task, statuses, statusConfig, width, onUpdate }: StatusDropdownProps) {
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

  const currentStatus = statuses.find(s => s.id === task.status_id);
  const displayName = currentStatus?.name || task.status_name || 'Select status...';
  const displayColor = currentStatus?.color || statusConfig.dotColor || 'var(--ds-text-subtlest, var(--ds-text-subtlest, #94a3b8))';

  return (
    <td style={{ width }} onClick={(e) => e.stopPropagation()}>
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
            {statuses.map((status) => {
              const isSelected = status.id === task.status_id;
              const color = status.color || STATUS_COLORS[status.name] || 'var(--ds-text-subtlest, var(--ds-text-subtlest, #94a3b8))';
              return (
                <StatusDropdownItem
                  key={status.id}
                  value={status.name}
                  color={color}
                  isSelected={isSelected}
                  onClick={() => { onUpdate(task.id, 'status_id', status.id); setIsOpen(false); }}
                />
              );
            })}
          </div>
        )}
      </div>
    </td>
  );
});
