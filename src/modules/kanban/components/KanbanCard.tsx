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
      className="p-2.5 rounded-md cursor-grab transition-all duration-100"
      style={{
        backgroundColor: 'var(--surface-1)',
        border: isHovered ? '1px solid var(--border-strong)' : '1px solid var(--border-color)',
        borderLeft: `3px solid ${department?.color || 'var(--text-3)'}`,
        opacity: isDragging ? 0.5 : 1,
        boxShadow: isHovered ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
      }}
    >
      {/* Header - Key + Rank */}
      <div className="flex items-center justify-between mb-1.5">
        <span 
          className="text-[10px] font-semibold font-mono"
          style={{ color: 'var(--text-3)' }}
        >
          {ticket.id}
        </span>
        <RankBadge rank={ticket.rank} />
      </div>

      {/* Summary - Primary emphasis */}
      <p 
        className="text-[12px] font-medium leading-snug mb-2 line-clamp-2"
        style={{ color: 'var(--text-1)' }}
      >
        {ticket.summary}
      </p>

      {/* Chips - Owner & Department (compact) */}
      <div className="flex flex-wrap gap-1 mb-2">
        {ticket.businessOwner && (
          <span 
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium"
            style={{
              backgroundColor: 'rgba(92, 124, 92, 0.1)',
              color: 'hsl(var(--secondary-green))',
            }}
          >
            <KanbanIcons.User />
            <span className="max-w-[80px] truncate">{ticket.businessOwner}</span>
          </span>
        )}
        {(ticket.department || department) && (
          <span 
            className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium max-w-[100px] truncate"
            style={{
              backgroundColor: 'var(--surface-3)',
              color: 'var(--text-2)',
            }}
          >
            {department?.label || ticket.department}
          </span>
        )}
      </div>

      {/* Footer - Days & Avatar */}
      <div className="flex items-center justify-between">
        <DaysInColumnIndicator days={ticket.daysInColumn} />
        {assignee && <Avatar member={assignee} size={22} />}
      </div>
    </div>
  );
}
