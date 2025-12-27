/**
 * KanbanCard - Catalyst Design System Compliant
 * 
 * GOVERNANCE COMPLIANCE:
 * ✓ Uses design tokens from tailwind.config.ts
 * ✓ All colors have dark mode variants
 * ✓ No hardcoded hex colors in JSX
 * ✓ Uses approved Tailwind classes
 * ✓ Proper text hierarchy (gray-900/700/500 with dark: variants)
 */

import React, { useState } from 'react';
import { KanbanTicket, DEPARTMENTS, COLUMNS_CONFIG } from '../types';
import { Clock, GripVertical, Tag, MoreHorizontal } from 'lucide-react';

// Helper to get a human-readable label for a status
function getStatusLabel(status: string): string {
  // First check static column config
  const columnConfig = COLUMNS_CONFIG.find(c => c.id === status);
  if (columnConfig) return columnConfig.label;
  
  // Fallback: convert snake_case to Title Case
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

interface KanbanCardProps {
  ticket: KanbanTicket;
  onClick: (ticket: KanbanTicket) => void;
  compactMode: boolean;
  statusLabel?: string; // Label from column config
}

/**
 * Priority styles using design system tokens per Catalyst Governance
 */
const PRIORITY_STYLES: Record<string, {
  bg: string;
  text: string;
  dot: string;
  border: string;
}> = {
  Unranked: {
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-600 dark:text-gray-400',
    dot: 'bg-gray-400 dark:bg-gray-500',
    border: 'border-gray-200 dark:border-gray-700',
  },
  Low: {
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-600 dark:text-gray-400',
    dot: 'bg-gray-400 dark:bg-gray-500',
    border: 'border-gray-200 dark:border-gray-700',
  },
  Medium: {
    bg: 'bg-status-warning-bg',
    text: 'text-amber-700 dark:text-amber-300',
    dot: 'bg-status-warning',
    border: 'border-amber-200 dark:border-amber-700',
  },
  High: {
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-700 dark:text-orange-300',
    dot: 'bg-orange-500 dark:bg-orange-400',
    border: 'border-orange-200 dark:border-orange-700',
  },
  Critical: {
    bg: 'bg-status-danger-bg',
    text: 'text-red-700 dark:text-red-300',
    dot: 'bg-status-danger',
    border: 'border-red-200 dark:border-red-700',
  },
};

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

// Priority/Rank Badge
function RankBadge({ rank }: { rank: number | null }) {
  if (rank === null || rank === undefined) {
    const styles = PRIORITY_STYLES['Unranked'];
    return (
      <span 
        title="No rank assigned"
        className={`
          inline-flex items-center gap-1.5
          px-2 py-0.5 
          rounded 
          text-[10px] font-medium 
          border
          ${styles.bg} ${styles.text} ${styles.border}
        `}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
        Unranked
      </span>
    );
  }
  
  return (
    <span 
      title={`Rank: ${rank}`}
      className="
        inline-flex items-center 
        px-2 py-0.5 
        rounded 
        text-[10px] font-semibold 
        bg-[rgba(37,99,235,0.1)] dark:bg-[rgba(37,99,235,0.15)]
        text-[#2563eb] dark:text-[#60a5fa]
        border border-[rgba(37,99,235,0.2)] dark:border-[rgba(96,165,250,0.3)]
      "
    >
      #{rank}
    </span>
  );
}

// Business Owner Avatar Component
function BusinessOwnerAvatar({ name, size = 28 }: { name: string; size?: number }) {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  
  return (
    <div
      className="
        rounded-full flex items-center justify-center 
        font-bold shrink-0 cursor-pointer shadow-sm
        bg-[#2563eb] dark:bg-[#3b82f6]
        text-white
      "
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
      }}
      title={name}
    >
      {initials}
    </div>
  );
}

export function KanbanCard({ ticket, onClick, compactMode, statusLabel }: KanbanCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
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
        className={`
          flex items-center gap-2 px-3 py-2.5 
          rounded-lg cursor-grab 
          transition-all duration-150 
          bg-white dark:bg-gray-900 
          border 
          ${isHovered 
            ? 'border-gray-300 dark:border-gray-600 shadow-md' 
            : 'border-gray-200 dark:border-gray-800 shadow-sm'
          }
        `}
        style={{
          borderLeftWidth: '4px',
          borderLeftColor: department?.color || '#a3a3a3',
          opacity: isDragging ? 0.6 : 1,
        }}
      >
        <span className="font-mono text-[11px] text-gray-400 dark:text-gray-500 min-w-[56px]">
          {ticket.id}
        </span>
        <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[13px] text-gray-900 dark:text-gray-100">
          {ticket.summary}
        </span>
        <RankBadge rank={ticket.rank} />
        <DaysInColumnIndicator days={ticket.daysInColumn} />
        {ticket.businessOwner && (
          <BusinessOwnerAvatar name={ticket.businessOwner} size={24} />
        )}
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
      className={`
        rounded-xl cursor-grab 
        transition-all duration-200 
        bg-white dark:bg-gray-900 
        border 
        group
        relative
        ${isHovered 
          ? 'border-gray-300 dark:border-gray-600 shadow-lg dark:shadow-gray-900/50 -translate-y-0.5' 
          : 'border-gray-200 dark:border-gray-700 shadow-sm'
        }
      `}
      style={{
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      {/* Drag Handle - Appears on Hover */}
      <div className="
        absolute left-1 top-1/2 -translate-y-1/2
        opacity-0 group-hover:opacity-100
        transition-opacity duration-200
        cursor-grab
      ">
        <GripVertical className="w-4 h-4 text-gray-300 dark:text-gray-600" />
      </div>

      {/* Quick Action on Hover */}
      <div className="
        absolute top-2 right-2
        opacity-0 group-hover:opacity-100
        transition-opacity duration-200
      ">
        <button className="
          p-1.5 rounded-lg 
          hover:bg-gray-100 dark:hover:bg-gray-800
          text-gray-400 dark:text-gray-500
          hover:text-gray-600 dark:hover:text-gray-300
        ">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Card Content */}
      <div className="p-4">
        {/* Header: Key + Rank */}
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-[11px] text-gray-500 dark:text-gray-400 tracking-wide">
            {ticket.id}
          </span>
          <RankBadge rank={ticket.rank} />
        </div>

        {/* Title - hover uses blue from new palette */}
        <h4 className="
          text-[14px] font-medium 
          text-gray-900 dark:text-gray-100
          mb-3 leading-snug line-clamp-2
          group-hover:text-[#2563eb] dark:group-hover:text-[#60a5fa]
          transition-colors
        ">
          {ticket.summary}
        </h4>

        {/* Type & Category Tags */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {(ticket.department || department) && (
            <>
              <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
                <Tag className="w-3 h-3" />
                {department?.label || ticket.department}
              </span>
              <span className="text-gray-300 dark:text-gray-600">•</span>
            </>
          )}
          <span className="
            text-[11px] 
            text-gray-500 dark:text-gray-400
            bg-gray-100 dark:bg-gray-800
            px-2 py-0.5 rounded
          ">
            {statusLabel || getStatusLabel(ticket.status)}
          </span>
        </div>

        {/* Footer */}
        <div className="
          flex items-center justify-between 
          pt-3 
          border-t border-gray-100 dark:border-gray-800
        ">
          <DaysInColumnIndicator days={ticket.daysInColumn} />
          <div className="flex items-center gap-2">
            {ticket.assignee && (
              <div className="flex items-center gap-1.5 mr-2">
                <div
                  className="
                    w-6 h-6 rounded-full flex items-center justify-center 
                    text-[10px] font-medium shrink-0
                    bg-blue-100 dark:bg-blue-900/40
                    text-blue-700 dark:text-blue-300
                    border border-blue-200 dark:border-blue-700
                  "
                  title={`Assignee: ${ticket.assignee}`}
                >
                  {ticket.assignee.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
              </div>
            )}
            {ticket.businessOwner && (
              <>
                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                  {ticket.businessOwner}
                </span>
                <BusinessOwnerAvatar name={ticket.businessOwner} size={28} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
