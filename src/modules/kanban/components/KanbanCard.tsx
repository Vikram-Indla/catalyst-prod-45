// KanbanCard component - themed with semantic tokens

import React, { useState } from 'react';
import { KanbanTicket, PRIORITIES, DEPARTMENTS, TeamMember } from '../types';
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
    if (totalDays >= 20) return 'hsl(var(--destructive))';
    if (totalDays >= 12 && day >= 2) return 'hsl(var(--destructive))';
    if (totalDays >= 8 && day >= 3) return 'hsl(var(--destructive))';
    if (totalDays >= 5 && day === 4) return 'hsl(var(--destructive))';
    if (totalDays >= 3 && day === 3) return 'hsl(var(--y300))';
    return 'var(--text-3)';
  };

  const dotsToShow = Math.min(4, Math.ceil(days / 3));
  
  return (
    <div className="flex items-center gap-0.5" title={`${days} days in column`}>
      {Array.from({ length: dotsToShow }).map((_, i) => (
        <span
          key={i}
          className="w-[5px] h-[5px] rounded-full"
          style={{ backgroundColor: getIndicatorColor(i + 1, days) }}
        />
      ))}
      <span className="text-[10px] ml-0.5" style={{ color: 'var(--text-3)' }}>{days}d</span>
    </div>
  );
}

// Rank Badge
function RankBadge({ rank }: { rank: number | null }) {
  if (rank === null || rank === undefined) {
    return (
      <span 
        title="No rank assigned"
        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium cursor-default"
        style={{
          backgroundColor: 'var(--surface-2)',
          color: 'var(--text-3)',
        }}
      >
        Unranked
      </span>
    );
  }
  
  return (
    <span 
      title={`Rank: ${rank}`}
      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold cursor-default"
      style={{
        backgroundColor: 'var(--accent-muted)',
        color: 'var(--accent-color)',
      }}
    >
      #{rank}
    </span>
  );
}

// Avatar Component
function Avatar({ member, size = 24 }: { member: TeamMember; size?: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center font-semibold shrink-0 cursor-pointer"
      style={{
        width: size,
        height: size,
        backgroundColor: member.color,
        color: 'white',
        fontSize: size * 0.38,
        border: '2px solid var(--surface-1)',
        boxShadow: 'var(--card-shadow)',
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
    <span className="flex items-center gap-1 text-[11px]" title={p.label}>
      <span className="text-[10px]">{p.icon}</span>
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
        className="flex items-center gap-2 px-2.5 py-2 rounded-md cursor-grab transition-all duration-150"
        style={{
          backgroundColor: 'var(--surface-1)',
          border: isHovered ? '1px solid var(--border-strong)' : '1px solid var(--border-color)',
          borderLeft: `4px solid ${department?.color || 'var(--text-3)'}`,
          opacity: isDragging ? 0.6 : 1,
          boxShadow: isHovered ? 'var(--card-shadow)' : 'none',
        }}
      >
        <span className="font-semibold min-w-[56px] font-mono text-[11px]" style={{ color: 'var(--text-3)' }}>{ticket.id}</span>
        <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-xs" style={{ color: 'var(--text-1)' }}>
          {ticket.summary}
        </span>
        <RankBadge rank={ticket.rank} />
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
      className="p-3 rounded-lg cursor-grab transition-all duration-150"
      style={{
        backgroundColor: 'var(--surface-1)',
        border: isHovered ? '1px solid var(--border-strong)' : '1px solid var(--border-color)',
        borderLeft: `4px solid ${department?.color || 'var(--text-3)'}`,
        opacity: isDragging ? 0.6 : 1,
        boxShadow: isHovered ? 'var(--card-shadow)' : 'none',
        transform: isHovered ? 'translateY(-1px)' : 'none',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold font-mono" style={{ color: 'var(--text-3)' }}>{ticket.id}</span>
        </div>
        <RankBadge rank={ticket.rank} />
      </div>

      {/* Summary */}
      <p 
        className="text-[13px] font-medium leading-snug mb-2.5 line-clamp-2"
        style={{ color: 'var(--text-1)' }}
      >
        {ticket.summary}
      </p>

      {/* Business Owner & Department */}
      <div className="flex flex-wrap gap-1 mb-2.5">
        {ticket.businessOwner && (
          <span 
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium"
            style={{
              backgroundColor: 'rgba(92, 124, 92, 0.12)',
              color: 'hsl(var(--secondary-green))',
            }}
          >
            <KanbanIcons.User />
            {ticket.businessOwner}
          </span>
        )}
        {(ticket.department || department) && (
          <span 
            className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium"
            style={{
              backgroundColor: 'var(--surface-3)',
              color: 'var(--text-2)',
            }}
          >
            {department?.label || ticket.department}
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <DaysInColumnIndicator days={ticket.daysInColumn} />
        </div>
        {assignee && <Avatar member={assignee} size={26} />}
      </div>
    </div>
  );
}
