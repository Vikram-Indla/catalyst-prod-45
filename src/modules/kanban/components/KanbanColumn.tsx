// KanbanColumn component - matching HTML specification exactly

import React, { useState } from 'react';
import { KanbanTicket, StatusId, COLUMNS_CONFIG, KANBAN_COLORS, TeamMember } from '../types';
import { KanbanCard } from './KanbanCard';
import { KanbanIcons } from './KanbanIcons';

interface KanbanColumnProps {
  column: StatusId;
  tickets: KanbanTicket[];
  onDrop: (ticketId: string, newStatus: StatusId) => void;
  onCardClick: (ticket: KanbanTicket) => void;
  compactMode: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
  inSwimlane?: boolean;
  teamMembers?: TeamMember[];
}

export function KanbanColumn({ 
  column, 
  tickets, 
  onDrop, 
  onCardClick, 
  compactMode, 
  collapsed, 
  onToggleCollapse, 
  inSwimlane = false,
  teamMembers = []
}: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isHeaderHovered, setIsHeaderHovered] = useState(false);
  const columnConfig = COLUMNS_CONFIG.find(c => c.id === column);
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };
  
  const handleDragLeave = () => {
    setIsDragOver(false);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const ticketId = e.dataTransfer.getData('ticketId');
    if (ticketId) {
      onDrop(ticketId, column);
    }
  };

  if (collapsed) {
    return (
      <div
        onClick={onToggleCollapse}
        onMouseEnter={() => setIsHeaderHovered(true)}
        onMouseLeave={() => setIsHeaderHovered(false)}
        className="cursor-pointer transition-all duration-150 flex flex-col items-center py-3 flex-shrink-0"
        style={{
          width: '44px',
          minWidth: '44px',
          height: '100%',
          backgroundColor: isHeaderHovered ? 'rgba(92, 124, 92, 0.08)' : 'var(--surface-1)',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
        }}
      >
        <div 
          className="w-2.5 h-2.5 rounded-full mb-2 flex-shrink-0"
          style={{ backgroundColor: columnConfig?.color || 'var(--text-3)' }} 
        />
        <span 
          className="text-xs font-bold mb-2"
          style={{ color: 'var(--text-1)' }}
        >
          {tickets.length}
        </span>
        <span 
          className="text-[10px] font-semibold tracking-wide uppercase"
          style={{
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            transform: 'rotate(180deg)',
            color: 'var(--text-3)',
          }}
        >
          {columnConfig?.label}
        </span>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="flex flex-col flex-shrink-0 transition-all duration-150"
      style={{
        width: inSwimlane ? '280px' : '320px',
        minWidth: inSwimlane ? '280px' : '320px',
        maxWidth: inSwimlane ? '280px' : '320px',
        height: '100%',
        minHeight: 0,
        backgroundColor: isDragOver ? 'var(--accent-muted)' : 'var(--surface-2)',
        borderRadius: '8px',
        border: isDragOver ? '2px dashed var(--accent-color)' : '1px solid var(--border-color)',
      }}
    >
      {/* Column Header - Fixed height */}
      <div 
        className="flex-shrink-0 rounded-t-lg px-3 py-2.5"
        style={{
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: 'var(--surface-1)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div 
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: columnConfig?.color || 'var(--text-3)' }} 
            />
            <span 
              className="text-xs font-medium"
              style={{ color: 'var(--text-1)' }}
            >
              {columnConfig?.label}
            </span>
            <span 
              className="px-1.5 py-0.5 rounded text-[10px] font-medium"
              style={{ 
                backgroundColor: 'var(--surface-3)', 
                color: 'var(--text-2)' 
              }}
            >
              {tickets.length}
            </span>
          </div>
          {!inSwimlane && (
            <button
              onClick={onToggleCollapse}
              onMouseEnter={() => setIsHeaderHovered(true)}
              onMouseLeave={() => setIsHeaderHovered(false)}
              className="p-1 rounded transition-all cursor-pointer"
              style={{
                color: 'var(--text-3)',
                backgroundColor: isHeaderHovered ? 'rgba(92, 124, 92, 0.08)' : 'transparent',
              }}
            >
              <KanbanIcons.Minimize />
            </button>
          )}
        </div>
      </div>

      {/* Cards - Flex-grow with internal scroll */}
      <div 
        className="flex-1 overflow-y-auto p-2 flex flex-col"
        style={{ 
          gap: compactMode ? '6px' : '8px',
          minHeight: 0,
        }}
      >
        {tickets.map(ticket => (
          <KanbanCard
            key={ticket.id}
            ticket={ticket}
            onClick={onCardClick}
            compactMode={compactMode}
            teamMembers={teamMembers}
          />
        ))}
        {tickets.length === 0 && (
          <div 
            className="flex flex-col items-center gap-1.5 pt-6 pb-4 px-3"
          >
            <svg 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="1.5"
              style={{ color: 'var(--text-muted)', opacity: 0.5 }}
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
            </svg>
            <span 
              className="text-[11px]"
              style={{ color: 'var(--text-muted)' }}
            >
              No items
            </span>
            <span 
              className="text-[10px]"
              style={{ color: 'var(--text-muted)', opacity: 0.7 }}
            >
              Drag items here
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
