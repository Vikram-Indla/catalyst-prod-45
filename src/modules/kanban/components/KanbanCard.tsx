// KanbanCard component - Enterprise-grade design

import React, { useState } from 'react';
import { KanbanTicket, PRIORITIES, DEPARTMENTS, TeamMember } from '../types';
import { Clock, User } from 'lucide-react';

interface KanbanCardProps {
  ticket: KanbanTicket;
  onClick: (ticket: KanbanTicket) => void;
  compactMode: boolean;
  teamMembers?: TeamMember[];
}

// Days in Column Indicator
function DaysInColumnIndicator({ days }: { days: number }) {
  if (!days || days === 0) return null;
  
  return (
    <div className="flex items-center gap-1 text-gray-400 dark:text-gray-500" title={`${days} days in column`}>
      <Clock className="w-3.5 h-3.5" />
      <span className="text-[11px]">{days}d ago</span>
    </div>
  );
}

// Rank Badge
function RankBadge({ rank }: { rank: number | null }) {
  if (rank === null || rank === undefined) {
    return (
      <span 
        title="No rank assigned"
        className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800"
      >
        Unranked
      </span>
    );
  }
  
  return (
    <span 
      title={`Rank: ${rank}`}
      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-[#5c7c5c]/10 text-[#5c7c5c] dark:bg-[#5c7c5c]/20 dark:text-[#8fad8f]"
    >
      #{rank}
    </span>
  );
}

// Avatar Component
function Avatar({ member, size = 28 }: { member: TeamMember; size?: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold shrink-0 cursor-pointer shadow-sm"
      style={{
        width: size,
        height: size,
        backgroundColor: member.color || '#5c7c5c',
        color: 'white',
        fontSize: size * 0.36,
      }}
      title={member.name}
    >
      {member.initials}
    </div>
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
        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-grab transition-all duration-150 bg-white dark:bg-gray-900 border ${
          isHovered 
            ? 'border-gray-300 dark:border-gray-600 shadow-md' 
            : 'border-gray-200 dark:border-gray-800 shadow-sm'
        }`}
        style={{
          borderLeftWidth: '4px',
          borderLeftColor: department?.color || '#9ca3af',
          opacity: isDragging ? 0.6 : 1,
        }}
      >
        <span className="font-mono text-[11px] text-gray-400 dark:text-gray-500 min-w-[56px]">{ticket.id}</span>
        <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[13px] text-gray-900 dark:text-gray-100">
          {ticket.summary}
        </span>
        <RankBadge rank={ticket.rank} />
        <DaysInColumnIndicator days={ticket.daysInColumn} />
        {assignee && <Avatar member={assignee} size={24} />}
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
      className={`rounded-lg cursor-grab transition-all duration-150 bg-white dark:bg-gray-900 border ${
        isHovered 
          ? 'border-gray-300 dark:border-gray-600 shadow-md' 
          : 'border-gray-200 dark:border-gray-800 shadow-sm'
      }`}
      style={{
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      {/* Card Content */}
      <div className="p-4">
        {/* Header: Key + Rank */}
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-[11px] text-gray-400 dark:text-gray-500">
            {ticket.id}
          </span>
          <RankBadge rank={ticket.rank} />
        </div>

        {/* Title */}
        <h4 className="text-[14px] font-medium text-gray-900 dark:text-gray-100 mb-3 leading-snug line-clamp-2">
          {ticket.summary}
        </h4>

        {/* Metadata row */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {(ticket.department || department) && (
            <span className="text-[11px] text-gray-500 dark:text-gray-400 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded">
              {department?.label || ticket.department}
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
          <DaysInColumnIndicator days={ticket.daysInColumn} />
          <div className="flex items-center gap-2">
            {ticket.businessOwner && (
              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                {ticket.businessOwner}
              </span>
            )}
            {assignee ? (
              <Avatar member={assignee} size={28} />
            ) : ticket.businessOwner ? (
              <div
                className="w-7 h-7 rounded-full bg-[#5c7c5c] text-white flex items-center justify-center text-[10px] font-bold shadow-sm"
                title={ticket.businessOwner}
              >
                {ticket.businessOwner.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
