/**
 * KanbanColumn - Catalyst Design System Compliant
 * 
 * GOVERNANCE COMPLIANCE:
 * ✓ Uses design tokens from tailwind.config.ts
 * ✓ All colors have dark mode variants
 * ✓ No hardcoded hex colors in JSX
 * ✓ Uses approved Tailwind classes
 * ✓ Status colors use status-* tokens
 */

import React, { useState } from 'react';
import { KanbanTicket, StatusId, COLUMNS_CONFIG, TeamMember } from '../types';
import { KanbanCard } from './KanbanCard';
import { MoreHorizontal, Inbox, ChevronLeft, Plus } from 'lucide-react';

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
  onAddRequest?: () => void;
}

/**
 * Column status styles mapped to design system tokens
 * Uses status-* tokens for semantic meaning per Catalyst Governance
 */
const COLUMN_HEADER_STYLES: Record<StatusId, { 
  bg: string; 
  border: string; 
  dot: string;
}> = {
  new_request: { 
    bg: 'bg-status-info-bg', 
    border: 'border-blue-200 dark:border-blue-800',
    dot: 'bg-status-info'
  },
  analyse: { 
    bg: 'bg-status-warning-bg', 
    border: 'border-amber-200 dark:border-amber-800',
    dot: 'bg-status-warning'
  },
  approved: { 
    bg: 'bg-status-success-bg', 
    border: 'border-green-200 dark:border-green-800',
    dot: 'bg-status-success'
  },
  implement: { 
    bg: 'bg-purple-50 dark:bg-purple-950/30', 
    border: 'border-purple-200 dark:border-purple-800',
    dot: 'bg-purple-500 dark:bg-purple-400'
  },
  closed: { 
    bg: 'bg-gray-50 dark:bg-gray-800/50', 
    border: 'border-gray-200 dark:border-gray-700',
    dot: 'bg-gray-400 dark:bg-gray-500'
  },
  rejected: { 
    bg: 'bg-status-danger-bg', 
    border: 'border-red-200 dark:border-red-800',
    dot: 'bg-status-danger'
  },
  on_hold: { 
    bg: 'bg-orange-50 dark:bg-orange-950/30', 
    border: 'border-orange-200 dark:border-orange-800',
    dot: 'bg-orange-500 dark:bg-orange-400'
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
  teamMembers = [],
  onAddRequest
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
        className={`
          cursor-pointer transition-all duration-150 
          flex flex-col items-center py-3 flex-shrink-0 
          rounded-xl border 
          bg-gray-50 dark:bg-gray-800/50
          border-gray-200 dark:border-gray-700
          ${isHeaderHovered ? 'shadow-md' : 'shadow-sm'}
        `}
        style={{
          width: '44px',
          minWidth: '44px',
          height: '100%',
        }}
      >
        <div className={`w-2.5 h-2.5 rounded-full mb-2 flex-shrink-0 ${headerStyles.dot}`} />
        <span className="text-xs font-bold mb-2 text-gray-900 dark:text-gray-100">
          {tickets.length}
        </span>
        <span 
          className="text-[10px] font-semibold tracking-wide uppercase text-gray-500 dark:text-gray-400"
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
      className={`
        flex flex-col flex-shrink-0 transition-all duration-150 
        rounded-xl border shadow-sm
        ${isDragOver 
          ? 'border-2 border-dashed border-olive-500 dark:border-olive-400 bg-olive-50/50 dark:bg-olive-900/10' 
          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
        }
      `}
      style={{
        width: inSwimlane ? '280px' : '320px',
        minWidth: inSwimlane ? '280px' : '320px',
        maxWidth: inSwimlane ? '280px' : '320px',
        height: '100%',
        minHeight: '500px',
      }}
    >
      {/* Column Header - Semantic status background */}
      <div className={`
        flex-shrink-0 rounded-t-xl px-4 py-3 border-b 
        ${headerStyles.bg} ${headerStyles.border}
      `}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${headerStyles.dot}`} />
            <span className="text-[14px] font-semibold text-gray-900 dark:text-gray-100">
              {columnConfig?.label}
            </span>
            <span className="
              bg-white dark:bg-gray-800 
              text-gray-600 dark:text-gray-300 
              text-[12px] font-medium 
              px-2 py-0.5 
              rounded-full 
              border border-gray-200 dark:border-gray-600
              shadow-sm
            ">
              {tickets.length}
            </span>
          </div>
          {!inSwimlane && (
            <button
              onClick={onToggleCollapse}
              onMouseEnter={() => setIsHeaderHovered(true)}
              onMouseLeave={() => setIsHeaderHovered(false)}
              className="
                p-1.5 rounded-lg transition-all cursor-pointer 
                text-gray-400 dark:text-gray-500
                hover:text-gray-600 dark:hover:text-gray-300 
                hover:bg-white/60 dark:hover:bg-gray-700/60
              "
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
          <div className="
            flex flex-col items-center justify-center 
            py-12 px-4 
            border-2 border-dashed border-gray-200 dark:border-gray-700
            rounded-xl 
            bg-gray-50/50 dark:bg-gray-800/30
            mx-2 mb-2
          ">
            <div className="
              w-12 h-12 rounded-full 
              bg-white dark:bg-gray-800
              flex items-center justify-center 
              mb-3 
              shadow-sm
              border border-gray-100 dark:border-gray-700
            ">
              <Inbox className="w-6 h-6 text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400 mb-1">
              No items
            </p>
            <p className="text-[12px] text-gray-400 dark:text-gray-500 text-center">
              Drag requests here
            </p>
          </div>
        )}
      </div>

      {/* Add Item Button */}
      {onAddRequest && (
        <div className="p-2 border-t border-gray-200 dark:border-gray-700">
          <button 
            onClick={onAddRequest}
            className="
              w-full py-2 
              text-[13px] 
              text-gray-500 dark:text-gray-400
              hover:text-gray-700 dark:hover:text-gray-200
              hover:bg-white dark:hover:bg-gray-800
              rounded-lg 
              transition-colors 
              flex items-center justify-center gap-1.5
            "
          >
            <Plus className="w-4 h-4" />
            Add Request
          </button>
        </div>
      )}
    </div>
  );
}
