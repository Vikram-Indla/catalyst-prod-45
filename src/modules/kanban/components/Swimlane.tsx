// Swimlane component - matching HTML specification exactly

import React, { useMemo, useState } from 'react';
import { KanbanTicket, StatusId, COLUMNS_CONFIG, KANBAN_COLORS, TeamMember } from '../types';
import { KanbanColumn } from './KanbanColumn';
import { KanbanIcons } from './KanbanIcons';

interface SwimlaneProps {
  label: string;
  color?: string;
  icon?: string;
  tickets: KanbanTicket[];
  count: number;
  onDrop: (ticketId: string, newStatus: StatusId) => void;
  onCardClick: (ticket: KanbanTicket) => void;
  compactMode: boolean;
  collapsedColumns: StatusId[];
  onToggleColumnCollapse: (columnId: StatusId) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  teamMembers?: TeamMember[];
}

export function Swimlane({ 
  label, 
  color, 
  icon, 
  tickets, 
  count,
  onDrop, 
  onCardClick, 
  compactMode, 
  collapsedColumns, 
  onToggleColumnCollapse, 
  isExpanded, 
  onToggleExpand,
  teamMembers = []
}: SwimlaneProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  const ticketsByColumn = useMemo(() => {
    const grouped: Record<StatusId, KanbanTicket[]> = {} as Record<StatusId, KanbanTicket[]>;
    COLUMNS_CONFIG.forEach(col => {
      grouped[col.id] = tickets.filter(t => t.status === col.id);
    });
    return grouped;
  }, [tickets]);

  return (
    <div style={{
      backgroundColor: KANBAN_COLORS.bgCard,
      borderRadius: '12px',
      border: `1px solid ${KANBAN_COLORS.borderLight}`,
      marginBottom: '16px',
      overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      {/* Swimlane Header */}
      <div
        onClick={onToggleExpand}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          padding: '14px 20px',
          backgroundColor: isExpanded ? KANBAN_COLORS.bgHover : (isHovered ? KANBAN_COLORS.bgHover : KANBAN_COLORS.bgCard),
          borderBottom: isExpanded ? `1px solid ${KANBAN_COLORS.borderLight}` : 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          cursor: 'pointer',
          transition: 'background-color 0.15s',
        }}
      >
        <span style={{ 
          color: KANBAN_COLORS.textMuted, 
          transform: isExpanded ? 'rotate(90deg)' : 'none', 
          transition: 'transform 0.2s',
        }}>
          <KanbanIcons.ChevronRight />
        </span>
        {color && (
          <div style={{
            width: '14px',
            height: '14px',
            borderRadius: '4px',
            backgroundColor: color,
          }} />
        )}
        {icon && <span style={{ fontSize: '16px' }}>{icon}</span>}
        <span style={{ fontSize: '14px', fontWeight: 700, color: KANBAN_COLORS.textPrimary }}>{label}</span>
        <span style={{
          padding: '4px 12px',
          borderRadius: '12px',
          backgroundColor: KANBAN_COLORS.champagneLight,
          color: KANBAN_COLORS.bronzeDark,
          fontSize: '12px',
          fontWeight: 700,
        }}>
          {count}
        </span>
      </div>

      {/* Swimlane Content */}
      {isExpanded && (
        <div style={{
          padding: '16px',
          overflowX: 'auto',
          backgroundColor: KANBAN_COLORS.bgHover,
        }}>
          <div style={{
            display: 'flex',
            gap: '12px',
            minWidth: 'max-content',
          }}>
            {COLUMNS_CONFIG.map(column => (
              <KanbanColumn
                key={column.id}
                column={column.id}
                tickets={ticketsByColumn[column.id] || []}
                onDrop={onDrop}
                onCardClick={onCardClick}
                compactMode={compactMode}
                collapsed={collapsedColumns.includes(column.id)}
                onToggleCollapse={() => onToggleColumnCollapse(column.id)}
                inSwimlane={true}
                teamMembers={teamMembers}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
