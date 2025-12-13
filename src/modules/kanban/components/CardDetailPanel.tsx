// CardDetailPanel - matching HTML specification exactly

import React, { useState } from 'react';
import { KanbanTicket, PRIORITIES, COLUMNS_CONFIG, DEPARTMENTS, KANBAN_COLORS, TeamMember } from '../types';
import { KanbanIcons } from './KanbanIcons';

interface CardDetailPanelProps {
  ticket: KanbanTicket;
  onClose: () => void;
  onOpenFullView?: (ticket: KanbanTicket) => void;
  teamMembers?: TeamMember[];
}

// Avatar Component
function Avatar({ member, size = 24 }: { member: { name: string; initials: string; color: string }; size?: number }) {
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
function PriorityIndicator({ priority, showLabel = false }: { priority: string; showLabel?: boolean }) {
  const p = PRIORITIES.find(pr => pr.id === priority);
  if (!p) return null;
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }} title={p.label}>
      <span style={{ fontSize: '10px' }}>{p.icon}</span>
      {showLabel && <span style={{ color: p.color, fontWeight: 500 }}>{p.label}</span>}
    </span>
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

export function CardDetailPanel({ ticket, onClose, onOpenFullView, teamMembers = [] }: CardDetailPanelProps) {
  const [editHovered, setEditHovered] = useState(false);
  const [openHovered, setOpenHovered] = useState(false);
  const [closeHovered, setCloseHovered] = useState(false);
  
  const assignee = teamMembers.find(m => m.id === ticket.assignee || m.name === ticket.assignee);
  const businessOwner = teamMembers.find(m => m.id === ticket.businessOwner || m.name === ticket.businessOwner);
  const status = COLUMNS_CONFIG.find(c => c.id === ticket.status);
  const department = DEPARTMENTS.find(d => d.id === ticket.department || d.label === ticket.department);

  const DetailRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: `1px solid ${KANBAN_COLORS.borderLight}` }}>
      <span style={{ width: '130px', fontSize: '12px', color: KANBAN_COLORS.textMuted, fontWeight: 500 }}>{label}</span>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      bottom: 0,
      width: '440px',
      backgroundColor: KANBAN_COLORS.bgCard,
      boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
      zIndex: 200,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '20px 24px',
        borderBottom: `1px solid ${KANBAN_COLORS.borderLight}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ fontSize: '15px', fontWeight: 700, color: KANBAN_COLORS.textMuted, fontFamily: 'monospace' }}>{ticket.id}</span>
          <span style={{
            padding: '5px 12px',
            borderRadius: '6px',
            backgroundColor: `${status?.color}15`,
            color: status?.color,
            fontSize: '12px',
            fontWeight: 600,
          }}>
            {status?.label}
          </span>
        </div>
        <button 
          onClick={onClose} 
          onMouseEnter={() => setCloseHovered(true)}
          onMouseLeave={() => setCloseHovered(false)}
          style={{ 
            background: 'none', 
            border: 'none', 
            padding: '8px', 
            cursor: 'pointer', 
            color: KANBAN_COLORS.textMuted,
            borderRadius: '6px',
            backgroundColor: closeHovered ? KANBAN_COLORS.greyLight : 'transparent',
          }}
        >
          <KanbanIcons.X />
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: KANBAN_COLORS.textPrimary, marginBottom: '24px', lineHeight: 1.5 }}>
          {ticket.summary}
        </h2>

        <div>
          <DetailRow label="Assignee">
            {assignee ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Avatar member={assignee} size={28} />
                <span style={{ fontSize: '13px', color: KANBAN_COLORS.textPrimary, fontWeight: 500 }}>{assignee.name}</span>
              </div>
            ) : (
              <span style={{ fontSize: '13px', color: KANBAN_COLORS.textLight }}>Unassigned</span>
            )}
          </DetailRow>

          <DetailRow label="Priority">
            <PriorityIndicator priority={ticket.priority} showLabel />
          </DetailRow>

          <DetailRow label="Business Score">
            <ScoreBadge score={ticket.score} />
          </DetailRow>

          <DetailRow label="Department">
            {department ? (
              <span style={{
                padding: '4px 10px',
                borderRadius: '6px',
                backgroundColor: `${department.color}12`,
                color: department.color,
                fontSize: '12px',
                fontWeight: 600,
              }}>
                {department.label}
              </span>
            ) : <span style={{ fontSize: '13px', color: KANBAN_COLORS.textLight }}>—</span>}
          </DetailRow>

          <DetailRow label="Business Owner">
            {businessOwner ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Avatar member={businessOwner} size={28} />
                <span style={{ fontSize: '13px', color: KANBAN_COLORS.textPrimary, fontWeight: 500 }}>{businessOwner.name}</span>
              </div>
            ) : (
              <span style={{ fontSize: '13px', color: KANBAN_COLORS.textLight }}>—</span>
            )}
          </DetailRow>

          <DetailRow label="Delivery Platform">
            <span style={{ fontSize: '13px', color: KANBAN_COLORS.textPrimary }}>{ticket.platform || '—'}</span>
          </DetailRow>

          <DetailRow label="Due Date">
            <span style={{ fontSize: '13px', color: KANBAN_COLORS.textPrimary }}>
              {ticket.dueDate ? new Date(ticket.dueDate).toLocaleDateString() : '—'}
            </span>
          </DetailRow>

          <DetailRow label="Rank">
            <span style={{ fontSize: '13px', color: KANBAN_COLORS.textPrimary }}>{ticket.rank ?? '—'}</span>
          </DetailRow>

          <DetailRow label="Days in Column">
            <DaysInColumnIndicator days={ticket.daysInColumn} />
          </DetailRow>

          {ticket.epic && (
            <DetailRow label="Epic">
              <span style={{
                padding: '4px 10px',
                borderRadius: '6px',
                backgroundColor: `${KANBAN_COLORS.purple}12`,
                color: KANBAN_COLORS.purple,
                fontSize: '12px',
                fontWeight: 600,
              }}>
                {ticket.epic}
              </span>
            </DetailRow>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: '16px 24px',
        borderTop: `1px solid ${KANBAN_COLORS.borderLight}`,
        display: 'flex',
        gap: '12px',
      }}>
        <button 
          onMouseEnter={() => setEditHovered(true)}
          onMouseLeave={() => setEditHovered(false)}
          style={{
            flex: 1,
            padding: '12px',
            border: `1px solid ${KANBAN_COLORS.borderDefault}`,
            borderRadius: '8px',
            backgroundColor: editHovered ? KANBAN_COLORS.bgHover : KANBAN_COLORS.bgCard,
            color: KANBAN_COLORS.textPrimary,
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          Edit
        </button>
        <button 
          onClick={() => onOpenFullView?.(ticket)}
          onMouseEnter={() => setOpenHovered(true)}
          onMouseLeave={() => setOpenHovered(false)}
          style={{
            flex: 1,
            padding: '12px',
            border: 'none',
            borderRadius: '8px',
            backgroundColor: openHovered ? KANBAN_COLORS.goldDark : KANBAN_COLORS.gold,
            color: 'white',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          Open Full View
        </button>
      </div>
    </div>
  );
}
