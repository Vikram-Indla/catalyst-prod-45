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
        className="cursor-pointer transition-all duration-150 flex flex-col items-center py-3.5"
        style={{
          width: '48px',
          minHeight: inSwimlane ? '200px' : '100%',
          backgroundColor: isHeaderHovered ? 'var(--surface-3)' : 'var(--surface-1)',
          borderRadius: '10px',
          border: '1px solid var(--border-color)',
        }}
      >
        <div 
          className="w-3 h-3 rounded mb-2.5"
          style={{ backgroundColor: columnConfig?.color || 'var(--text-3)' }} 
        />
        <span 
          className="text-sm font-bold mb-2.5"
          style={{ color: 'var(--text-1)' }}
        >
          {tickets.length}
        </span>
        <span 
          className="text-xs font-semibold tracking-wide"
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
      className="flex flex-col transition-all duration-150 h-full"
      style={{
        width: inSwimlane ? '260px' : '300px',
        minWidth: inSwimlane ? '260px' : '300px',
        backgroundColor: isDragOver ? 'var(--accent-muted)' : 'var(--surface-2)',
        borderRadius: '10px',
        border: isDragOver ? '2px dashed var(--accent-color)' : '1px solid var(--border-color)',
      }}
    >
      {/* Column Header - Sticky */}
      <div 
        className="sticky top-0 z-10 rounded-t-[10px] px-3 py-3"
        style={{
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: 'var(--surface-1)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div 
              className="w-3 h-3 rounded"
              style={{ backgroundColor: columnConfig?.color || 'var(--text-3)' }} 
            />
            <span 
              className="text-[13px] font-bold"
              style={{ color: 'var(--text-1)' }}
            >
              {columnConfig?.label}
            </span>
            <span 
              className="px-2.5 py-0.5 rounded-full text-[11px] font-bold"
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
              className="p-1.5 rounded-md transition-all cursor-pointer"
              style={{
                color: 'var(--text-3)',
                backgroundColor: isHeaderHovered ? 'var(--surface-2)' : 'transparent',
              }}
            >
              <KanbanIcons.Minimize />
            </button>
          )}
        </div>
      </div>

      {/* Cards - scrollable */}
      <div 
        className="flex-1 overflow-y-auto p-2 flex flex-col"
        style={{ gap: compactMode ? '6px' : '8px' }}
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
            className="py-6 px-4 text-center text-xs"
            style={{ color: 'var(--text-muted)' }}
          >
            No items
          </div>
        )}
      </div>
    </div>
  );
}
