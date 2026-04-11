/**
 * WorkstreamDropdown - Modal-style workstream picker with colored dots
 * Extracted from TaskListRowV3 for modularity
 */

import { useState, useRef, useEffect, memo } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { getWorkstreamColor } from '@/lib/workstream-colors';
import { COLORS, WORKSTREAM_COLORS } from '@/components/planner/task-modal/colors';
import { usePlannerWorkstreams } from '../../hooks/usePlannerWorkstreams';
import type { TaskListTask } from '../../hooks/useTaskList';

export interface WorkstreamDropdownProps {
  task: TaskListTask;
  workstreamColors: { hex: string };
  width: number | string;
  onUpdate: (taskId: string, field: string, value: any) => void;
}

// Shared DropdownItem for Workstream
function WorkstreamDropdownItem({ value, color, isSelected, onClick }: { value: string; color: string; isSelected: boolean; onClick: () => void }) {
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
      <span style={{ fontSize: '14px', color: value === 'None' ? COLORS.textMuted : COLORS.textPrimary }}>{value}</span>
      {isSelected && <Check size={16} style={{ color: COLORS.accent, marginLeft: 'auto' }} />}
    </div>
  );
}

export const WorkstreamDropdown = memo(function WorkstreamDropdown({ task, workstreamColors, width, onUpdate }: WorkstreamDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { data: workstreams = [] } = usePlannerWorkstreams();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedWorkstream = workstreams.find(w => w.id === task.workstream_id);
  const displayName = selectedWorkstream?.name || task.workstream_name || 'None';
  const displayColor = selectedWorkstream?.color || WORKSTREAM_COLORS[displayName] || workstreamColors.hex || '#94a3b8';

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
            minWidth: '140px',
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
              maxHeight: '280px',
              overflowY: 'auto',
              minWidth: '180px',
            }}
          >
            {/* None option */}
            <WorkstreamDropdownItem
              value="None"
              color="#94a3b8"
              isSelected={!task.workstream_id}
              onClick={() => { onUpdate(task.id, 'workstream_id', null); setIsOpen(false); }}
            />
            {workstreams.map((ws) => {
              const color = ws.color || WORKSTREAM_COLORS[ws.name] || getWorkstreamColor(ws.name).hex;
              const isSelected = ws.id === task.workstream_id;
              return (
                <WorkstreamDropdownItem
                  key={ws.id}
                  value={ws.name}
                  color={color}
                  isSelected={isSelected}
                  onClick={() => { onUpdate(task.id, 'workstream_id', ws.id); setIsOpen(false); }}
                />
              );
            })}
          </div>
        )}
      </div>
    </td>
  );
});
