// KanbanCard component - matching HTML specification exactly

import React, { useState } from 'react';
import { KanbanTicket, PRIORITIES, DEPARTMENTS, KANBAN_COLORS, TeamMember } from '../types';
import { KanbanIcons } from './KanbanIcons';

interface KanbanCardProps {
  ticket: KanbanTicket;
  onClick: (ticket: KanbanTicket) => void;
  compactMode: boolean;
  teamMembers?: TeamMember[];
}

// Days in Column Indicator
function DaysInColumnIndicator({ days }: { days: number }) {
  if (!days || days === 0) return null;
  
  const getIndicatorColor = (day: number, totalDays: number) => {
    if (totalDays >= 20) return KANBAN_COLORS.danger;
    if (totalDays >= 12 && day >= 2) return KANBAN_COLORS.danger;
    if (totalDays >= 8 && day >= 3) return KANBAN_COLORS.danger;
    if (totalDays >= 5 && day === 4) return KANBAN_COLORS.danger;
    if (totalDays >= 3 && day === 3) return KANBAN_COLORS.warning;
    return KANBAN_COLORS.grey;
  };

  const dotsToShow = Math.min(4, Math.ceil(days / 3));
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }} title={`${days} days in column`}>
      {Array.from({ length: dotsToShow }).map((_, i) => (
        <span
          key={i}
          style={{
            width: '5px',
            height: '5px',
            borderRadius: '50%',
            backgroundColor: getIndicatorColor(i + 1, days),
          }}
        />
      ))}
      <span style={{ fontSize: '10px', color: KANBAN_COLORS.textMuted, marginLeft: '3px' }}>{days}d</span>
    </div>
  );
}

// Score Badge
function ScoreBadge({ score }: { score: number | null }) {
  if (score === null || score === undefined) {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '3px',
        padding: '2px 6px',
        borderRadius: '4px',
        backgroundColor: KANBAN_COLORS.greyLight,
        color: KANBAN_COLORS.textMuted,
        fontSize: '10px',
        fontWeight: 500,
      }}>
        <KanbanIcons.StarOutline /> Unscored
      </span>
    );
  }
  
  const getScoreColor = (s: number) => {
    if (s >= 80) return KANBAN_COLORS.success;
    if (s >= 60) return KANBAN_COLORS.info;
    if (s >= 40) return KANBAN_COLORS.warning;
    return KANBAN_COLORS.danger;
  };
  
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '3px',
      padding: '2px 6px',
      borderRadius: '4px',
      backgroundColor: `${getScoreColor(score)}15`,
      color: getScoreColor(score),
      fontSize: '10px',
      fontWeight: 600,
    }}>
      <KanbanIcons.Star /> {score}
    </span>
  );
}

// Avatar Component
function Avatar({ member, size = 24 }: { member: TeamMember; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: member.color,
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.38,
        fontWeight: 600,
        flexShrink: 0,
        cursor: 'pointer',
        border: '2px solid white',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}
      title={member.name}
    >
      {member.initials}
    </div>
  );
}

// Priority Indicator
function PriorityIndicator({ priority }: { priority: string }) {
  const p = PRIORITIES.find(pr => pr.id === priority);
  if (!p) return null;
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }} title={p.label}>
      <span style={{ fontSize: '10px' }}>{p.icon}</span>
    </span>
  );
}

export function KanbanCard({ ticket, onClick, compactMode, teamMembers = [] }: KanbanCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  const assignee = teamMembers.find(m => m.id === ticket.assignee || m.name === ticket.assignee);
  const department = DEPARTMENTS.find(d => d.id === ticket.department || d.label === ticket.department);
  
  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.setData('ticketId', ticket.id);
    e.dataTransfer.effectAllowed = 'move';
  };
  
  const handleDragEnd = () => {
    setIsDragging(false);
  };

  if (compactMode) {
    return (
      <div
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={() => onClick?.(ticket)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 10px',
          backgroundColor: KANBAN_COLORS.bgCard,
          borderRadius: '6px',
          border: `1px solid ${isHovered ? KANBAN_COLORS.borderDefault : KANBAN_COLORS.borderLight}`,
          borderLeft: `4px solid ${department?.color || KANBAN_COLORS.grey}`,
          cursor: 'grab',
          opacity: isDragging ? 0.6 : 1,
          fontSize: '12px',
          transition: 'all 0.15s ease',
          boxShadow: isHovered ? '0 2px 8px rgba(0,0,0,0.08)' : '0 1px 2px rgba(0,0,0,0.04)',
        }}
      >
        <span style={{ color: KANBAN_COLORS.textMuted, fontWeight: 600, minWidth: '56px', fontFamily: 'monospace', fontSize: '11px' }}>{ticket.id}</span>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: KANBAN_COLORS.textPrimary }}>
          {ticket.summary}
        </span>
        <ScoreBadge score={ticket.score} />
        <DaysInColumnIndicator days={ticket.daysInColumn} />
        {assignee && <Avatar member={assignee} size={22} />}
      </div>
    );
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => onClick?.(ticket)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        padding: '12px',
        backgroundColor: KANBAN_COLORS.bgCard,
        borderRadius: '8px',
        border: `1px solid ${isHovered ? KANBAN_COLORS.borderDefault : KANBAN_COLORS.borderLight}`,
        borderLeft: `4px solid ${department?.color || KANBAN_COLORS.grey}`,
        cursor: 'grab',
        opacity: isDragging ? 0.6 : 1,
        transition: 'all 0.15s ease',
        boxShadow: isHovered ? '0 4px 12px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.04)',
        transform: isHovered ? 'translateY(-1px)' : 'none',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: KANBAN_COLORS.textMuted, fontFamily: 'monospace' }}>{ticket.id}</span>
        </div>
        <ScoreBadge score={ticket.score} />
      </div>

      {/* Summary */}
      <p style={{
        fontSize: '13px',
        fontWeight: 500,
        color: KANBAN_COLORS.textPrimary,
        lineHeight: 1.4,
        marginBottom: '10px',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        {ticket.summary}
      </p>

      {/* Epic & Department */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '10px' }}>
        {ticket.epic && (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            backgroundColor: `${KANBAN_COLORS.purple}12`,
            borderRadius: '4px',
            fontSize: '10px',
            color: KANBAN_COLORS.purple,
            fontWeight: 500,
          }}>
            <KanbanIcons.Layers />
            {ticket.epic}
          </span>
        )}
        {department && (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '3px 8px',
            backgroundColor: `${department.color}12`,
            borderRadius: '4px',
            fontSize: '10px',
            color: department.color,
            fontWeight: 500,
          }}>
            {department.label}
          </span>
        )}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <DaysInColumnIndicator days={ticket.daysInColumn} />
        </div>
        {assignee && <Avatar member={assignee} size={26} />}
      </div>
    </div>
  );
}
