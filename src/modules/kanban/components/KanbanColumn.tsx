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
        style={{
          width: '48px',
          minHeight: inSwimlane ? '200px' : '500px',
          backgroundColor: isHeaderHovered ? KANBAN_COLORS.bgHover : KANBAN_COLORS.bgCard,
          borderRadius: '10px',
          border: `1px solid ${KANBAN_COLORS.borderLight}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '14px 0',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        <div style={{
          width: '12px',
          height: '12px',
          borderRadius: '4px',
          backgroundColor: columnConfig?.color || KANBAN_COLORS.grey,
          marginBottom: '10px',
        }} />
        <span style={{ 
          fontSize: '14px', 
          fontWeight: 700, 
          color: KANBAN_COLORS.textPrimary, 
          marginBottom: '10px',
        }}>
          {tickets.length}
        </span>
        <span style={{
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
          transform: 'rotate(180deg)',
          fontSize: '12px',
          fontWeight: 600,
          color: KANBAN_COLORS.textMuted,
          letterSpacing: '0.5px',
        }}>
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
      style={{
        width: inSwimlane ? '260px' : '300px',
        minWidth: inSwimlane ? '260px' : '300px',
        backgroundColor: isDragOver ? KANBAN_COLORS.bgSelected : KANBAN_COLORS.bgColumn,
        borderRadius: '10px',
        border: isDragOver ? `2px dashed ${KANBAN_COLORS.gold}` : `1px solid ${KANBAN_COLORS.borderLight}`,
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.15s ease',
      }}
    >
      {/* Column Header */}
      <div style={{
        padding: '14px 12px',
        borderBottom: `1px solid ${KANBAN_COLORS.borderLight}`,
        backgroundColor: KANBAN_COLORS.bgCard,
        borderRadius: '10px 10px 0 0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '4px',
              backgroundColor: columnConfig?.color || KANBAN_COLORS.grey,
            }} />
            <span style={{ fontSize: '13px', fontWeight: 700, color: KANBAN_COLORS.textPrimary }}>
              {columnConfig?.label}
            </span>
            <span style={{
              padding: '3px 10px',
              borderRadius: '12px',
              backgroundColor: KANBAN_COLORS.champagneLight,
              color: KANBAN_COLORS.bronzeDark,
              fontSize: '11px',
              fontWeight: 700,
            }}>
              {tickets.length}
            </span>
          </div>
          {!inSwimlane && (
            <button
              onClick={onToggleCollapse}
              onMouseEnter={() => setIsHeaderHovered(true)}
              onMouseLeave={() => setIsHeaderHovered(false)}
              style={{
                background: 'none',
                border: 'none',
                padding: '6px',
                cursor: 'pointer',
                color: KANBAN_COLORS.textMuted,
                borderRadius: '6px',
                transition: 'all 0.15s',
                backgroundColor: isHeaderHovered ? KANBAN_COLORS.greyLight : 'transparent',
              }}
            >
              <KanbanIcons.Minimize />
            </button>
          )}
        </div>
      </div>

      {/* Cards */}
      <div style={{
        flex: 1,
        padding: '8px',
        overflowY: 'auto',
        maxHeight: inSwimlane ? '320px' : 'calc(100vh - 260px)',
        display: 'flex',
        flexDirection: 'column',
        gap: compactMode ? '6px' : '8px',
      }}>
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
          <div style={{
            padding: '24px 16px',
            textAlign: 'center',
            color: KANBAN_COLORS.textLight,
            fontSize: '12px',
          }}>
            No items
          </div>
        )}
      </div>
    </div>
  );
}
