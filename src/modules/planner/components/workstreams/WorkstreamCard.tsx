// ============================================================================
// WORKSTREAM CARD — Grid View with Lead Assignment & Hover Actions
// ============================================================================

import React, { useState } from 'react';
import { MoreHorizontal, Archive, Pencil, Trash2, ExternalLink } from 'lucide-react';
import { LeadPicker } from './LeadPicker';
import type { Workstream } from '../../hooks/usePlannerWorkstreams';

interface WorkstreamCardProps {
  workstream: Workstream;
  onLeadChange: (workstreamId: string, leadId: string | null) => void;
  onEdit: (workstreamId: string) => void;
  onArchive: (workstreamId: string) => void;
  onDelete: (workstreamId: string) => void;
  onOpenDrawer: (workstream: Workstream) => void;
}

const COLORS = {
  textPrimary: '#0f172a',
  textSecondary: 'rgba(237,237,237,0.53)',
  textMuted: '#64748b',
  textLight: '#94a3b8',
  
  surfaceCard: '#ffffff',
  surfaceHover: '#f8fafc',
  
  borderLight: '#e2e8f0',
  borderDefault: '#cbd5e1',
  
  accent: '#2563eb',
  danger: '#dc2626',
  warning: '#f59e0b',
  success: '#16a34a'
};

const HEALTH_CONFIG: Record<string, { color: string; bgColor: string; borderColor: string; label: string }> = {
  'healthy': { color: COLORS.success, bgColor: '#f0fdf4', borderColor: '#bbf7d0', label: 'On Track' },
  'at-risk': { color: COLORS.warning, bgColor: '#fffbeb', borderColor: '#fde68a', label: 'At Risk' },
  'critical': { color: COLORS.danger, bgColor: '#fef2f2', borderColor: '#fecaca', label: 'Critical' },
  'locked': { color: COLORS.textMuted, bgColor: '#f1f5f9', borderColor: '#e2e8f0', label: 'Locked' }
};

export const WorkstreamCard: React.FC<WorkstreamCardProps> = ({
  workstream,
  onLeadChange,
  onEdit,
  onArchive,
  onDelete,
  onOpenDrawer
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const healthConfig = HEALTH_CONFIG[workstream.health] || HEALTH_CONFIG['healthy'];
  const canDelete = (workstream.taskCount || 0) === 0;

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setShowMenu(false); }}
      onClick={() => onOpenDrawer(workstream)}
      style={{
        position: 'relative',
        backgroundColor: COLORS.surfaceCard,
        border: `1px solid ${COLORS.borderLight}`,
        borderRadius: '12px',
        padding: '20px',
        transition: 'all 0.15s ease',
        boxShadow: isHovered ? '0 4px 12px rgba(0, 0, 0, 0.08)' : 'none',
        transform: isHovered ? 'translateY(-2px)' : 'none',
        borderLeftWidth: '4px',
        borderLeftColor: healthConfig.color,
        cursor: 'pointer'
      }}
    >
      {/* HEADER ROW */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '16px',
          paddingRight: '36px' // Space for kebab menu
        }}
      >
        {/* NAME */}
        <h3
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: COLORS.textPrimary,
            margin: 0,
            flex: 1
          }}
        >
          {workstream.name}
        </h3>

        {/* HEALTH BADGE */}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            backgroundColor: healthConfig.bgColor,
            border: `1px solid ${healthConfig.borderColor}`,
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 500,
            color: healthConfig.color,
            flexShrink: 0
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: healthConfig.color
            }}
          />
          {healthConfig.label}
        </span>
      </div>

      {/* LEAD SECTION */}
      <div style={{ marginBottom: '16px' }} onClick={(e) => e.stopPropagation()}>
        <label
          style={{
            display: 'block',
            fontSize: '11px',
            fontWeight: 600,
            color: COLORS.textMuted,
            textTransform: 'uppercase',
            letterSpacing: '0.03em',
            marginBottom: '6px'
          }}
        >
          Lead
        </label>
        <LeadPicker
          value={workstream.lead_id || null}
          currentLeadInfo={workstream.lead}
          onChange={(leadId) => onLeadChange(workstream.id, leadId)}
          workstreamColor={workstream.color}
          placeholder="Assign lead..."
        />
      </div>

      {/* STATS ROW */}
      <div
        style={{
          display: 'flex',
          gap: '24px',
          paddingTop: '16px',
          borderTop: `1px solid ${COLORS.borderLight}`
        }}
      >
        {/* TASKS */}
        <div>
          <div
            style={{
              fontSize: '20px',
              fontWeight: 600,
              color: COLORS.textPrimary,
              lineHeight: 1
            }}
          >
            {workstream.taskCount || 0}
          </div>
          <div
            style={{
              fontSize: '12px',
              color: COLORS.textMuted,
              marginTop: '4px'
            }}
          >
            Tasks
          </div>
        </div>

        {/* OVERDUE */}
        <div>
          <div
            style={{
              fontSize: '20px',
              fontWeight: 600,
              color: (workstream.overdueCount || 0) > 0 ? COLORS.danger : COLORS.textPrimary,
              lineHeight: 1
            }}
          >
            {workstream.overdueCount || 0}
          </div>
          <div
            style={{
              fontSize: '12px',
              color: COLORS.textMuted,
              marginTop: '4px'
            }}
          >
            Overdue
          </div>
        </div>

        {/* MEMBERS */}
        <div>
          <div
            style={{
              fontSize: '20px',
              fontWeight: 600,
              color: COLORS.textPrimary,
              lineHeight: 1
            }}
          >
            {workstream.members?.length || 0}
          </div>
          <div
            style={{
              fontSize: '12px',
              color: COLORS.textMuted,
              marginTop: '4px'
            }}
          >
            Members
          </div>
        </div>
      </div>

      {/* HOVER ACTIONS */}
      {isHovered && (
        <div
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            style={{
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: COLORS.surfaceCard,
              border: `1px solid ${COLORS.borderDefault}`,
              borderRadius: '8px',
              cursor: 'pointer',
              color: COLORS.textMuted,
              transition: 'all 0.1s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = COLORS.surfaceHover}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = COLORS.surfaceCard}
          >
            <MoreHorizontal size={16} />
          </button>

          {/* DROPDOWN MENU */}
          {showMenu && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                right: 0,
                width: '160px',
                backgroundColor: COLORS.surfaceCard,
                border: `1px solid ${COLORS.borderDefault}`,
                borderRadius: '12px',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.12)',
                zIndex: 100,
                padding: '6px',
                overflow: 'hidden'
              }}
            >
              <MenuOption 
                icon={<ExternalLink size={14} />} 
                label="View Details" 
                onClick={() => { onOpenDrawer(workstream); setShowMenu(false); }} 
              />
              <MenuOption 
                icon={<Pencil size={14} />} 
                label="Edit" 
                onClick={() => { onEdit(workstream.id); setShowMenu(false); }} 
              />
              <MenuOption 
                icon={<Archive size={14} />} 
                label="Archive" 
                onClick={() => { onArchive(workstream.id); setShowMenu(false); }} 
              />
              <div style={{ height: '1px', backgroundColor: COLORS.borderLight, margin: '6px 0' }} />
              <MenuOption 
                icon={<Trash2 size={14} />} 
                label="Delete" 
                onClick={() => { onDelete(workstream.id); setShowMenu(false); }}
                danger
                disabled={!canDelete}
                title={!canDelete ? 'Cannot delete: tasks are linked' : undefined}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Sub-component: Menu Option
const MenuOption: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  title?: string;
}> = ({ icon, label, onClick, danger, disabled, title }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={disabled}
      title={title}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        width: '100%',
        padding: '10px 12px',
        backgroundColor: isHovered && !disabled
          ? (danger ? '#fef2f2' : '#f1f5f9') 
          : 'transparent',
        border: 'none',
        borderRadius: '6px',
        fontSize: '14px',
        color: disabled ? '#94a3b8' : (danger ? '#dc2626' : 'rgba(237,237,237,0.53)'),
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit',
        textAlign: 'left',
        transition: 'background-color 0.1s ease',
        opacity: disabled ? 0.5 : 1
      }}
    >
      {icon}
      {label}
    </button>
  );
};

export default WorkstreamCard;
