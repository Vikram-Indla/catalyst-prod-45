// KanbanColumn component - Enterprise-grade design

import React, { useState } from 'react';
import { KanbanTicket, StatusId, COLUMNS_CONFIG, TeamMember } from '../types';
import { KanbanCard } from './KanbanCard';
import { MoreHorizontal, Inbox, ChevronLeft } from 'lucide-react';

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

// Column semantic colors for header backgrounds
const COLUMN_HEADER_STYLES: Record<StatusId, { bg: string; border: string; dotColor: string }> = {
  new_request: { 
    bg: 'bg-blue-50 dark:bg-blue-950/30', 
    border: 'border-blue-100 dark:border-blue-900/50',
    dotColor: 'bg-blue-500'
  },
  analyse: { 
    bg: 'bg-amber-50 dark:bg-amber-950/30', 
    border: 'border-amber-100 dark:border-amber-900/50',
    dotColor: 'bg-amber-500'
  },
  approved: { 
    bg: 'bg-green-50 dark:bg-green-950/30', 
    border: 'border-green-100 dark:border-green-900/50',
    dotColor: 'bg-green-500'
  },
  implement: { 
    bg: 'bg-purple-50 dark:bg-purple-950/30', 
    border: 'border-purple-100 dark:border-purple-900/50',
    dotColor: 'bg-purple-500'
  },
  closed: { 
    bg: 'bg-stone-100 dark:bg-stone-900/30', 
    border: 'border-stone-200 dark:border-stone-800',
    dotColor: 'bg-stone-500'
  },
  rejected: { 
    bg: 'bg-red-50 dark:bg-red-950/30', 
    border: 'border-red-100 dark:border-red-900/50',
    dotColor: 'bg-red-500'
  },
  on_hold: { 
    bg: 'bg-orange-50 dark:bg-orange-950/30', 
    border: 'border-orange-100 dark:border-orange-900/50',
    dotColor: 'bg-orange-500'
  },
};

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
  const headerStyles = COLUMN_HEADER_STYLES[column] || COLUMN_HEADER_STYLES.new_request;
  
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
        className={`cursor-pointer transition-all duration-150 flex flex-col items-center py-3 flex-shrink-0 rounded-xl border bg-stone-50 dark:bg-stone-900/50 border-stone-200 dark:border-stone-800 ${isHeaderHovered ? 'shadow-md' : 'shadow-sm'}`}
        style={{
          width: '44px',
          minWidth: '44px',
          height: '100%',
        }}
      >
        <div className={`w-2.5 h-2.5 rounded-full mb-2 flex-shrink-0 ${headerStyles.dotColor}`} />
        <span className="text-xs font-bold mb-2 text-foreground">
          {tickets.length}
        </span>
        <span 
          className="text-[10px] font-semibold tracking-wide uppercase text-muted-foreground"
          style={{
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            transform: 'rotate(180deg)',
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
      className={`flex flex-col flex-shrink-0 transition-all duration-150 rounded-xl border shadow-sm ${
        isDragOver 
          ? 'border-2 border-dashed border-[#5c7c5c] bg-[#5c7c5c]/5' 
          : 'border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50'
      }`}
      style={{
        width: inSwimlane ? '280px' : '320px',
        minWidth: inSwimlane ? '280px' : '320px',
        maxWidth: inSwimlane ? '280px' : '320px',
        height: '100%',
        minHeight: '500px',
      }}
    >
      {/* Column Header - Enterprise style with semantic background */}
      <div className={`flex-shrink-0 rounded-t-xl px-4 py-3 border-b ${headerStyles.bg} ${headerStyles.border}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${headerStyles.dotColor}`} />
            <span className="text-[14px] font-semibold text-gray-900 dark:text-gray-100">
              {columnConfig?.label}
            </span>
            <span className="bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[12px] font-medium px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-700">
              {tickets.length}
            </span>
          </div>
          {!inSwimlane && (
            <button
              onClick={onToggleCollapse}
              onMouseEnter={() => setIsHeaderHovered(true)}
              onMouseLeave={() => setIsHeaderHovered(false)}
              className="p-1 rounded transition-all cursor-pointer text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Cards Container */}
      <div 
        className="flex-1 overflow-y-auto p-3 flex flex-col"
        style={{ 
          gap: compactMode ? '8px' : '10px',
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
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-12 h-12 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center mb-3">
              <Inbox className="w-6 h-6 text-stone-400 dark:text-stone-500" />
            </div>
            <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400 mb-1">No items</p>
            <p className="text-[12px] text-gray-400 dark:text-gray-500 text-center">
              Drag requests here or<br/>
              <button className="text-[#5c7c5c] hover:underline">create new</button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
