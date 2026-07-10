// ============================================================================
// WORKSTREAM CARD — Grid View with Lead Assignment & Hover Actions
// ============================================================================

import React, { useState } from 'react';
import { MoreHorizontal, Archive, Pencil, Trash2, ExternalLink } from '@/lib/atlaskit-icons';
import { LeadPicker } from './LeadPicker';
import type { Workstream } from '../../hooks/useTaskWorkstreams';

interface WorkstreamCardProps {
  workstream: Workstream;
  onLeadChange: (workstreamId: string, leadId: string | null) => void;
  onEdit: (workstreamId: string) => void;
  onArchive: (workstreamId: string) => void;
  onDelete: (workstreamId: string) => void;
  onOpenDrawer: (workstream: Workstream) => void;
}

const COLORS = {
  textPrimary: 'var(--ds-text)',
  textSecondary: 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2)))',
  textMuted: 'var(--ds-text-subtlest)',
  textLight: 'var(--ds-text-subtlest)',
  
  surfaceCard: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))',
  surfaceHover: 'var(--ds-surface-sunken)',
  
  borderLight: 'var(--ds-border, var(--cp-bg-sunken))',
  borderDefault: 'var(--ds-text-disabled)',
  
  accent: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))',
  danger: 'var(--ds-text-danger)',
  warning: 'var(--ds-text-warning)',
  success: 'var(--ds-text-success)'
};

const HEALTH_CONFIG: Record<string, { color: string; bgColor: string; borderColor: string; label: string }> = {
  'healthy': { color: COLORS.success, bgColor: 'var(--ds-background-success)', borderColor: 'var(--ds-background-success)', label: 'On Track' },
  'at-risk': { color: COLORS.warning, bgColor: 'var(--ds-background-warning)', borderColor: 'var(--ds-background-warning)', label: 'At Risk' },
  'critical': { color: COLORS.danger, bgColor: 'var(--ds-background-danger)', borderColor: 'var(--ds-background-danger)', label: 'Critical' },
  'locked': { color: COLORS.textMuted, bgColor: 'var(--ds-surface-sunken)', borderColor: 'var(--ds-border, var(--cp-bg-sunken))', label: 'Locked' }
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
        padding: '16px',
        transition: 'all 0.15s ease',
        boxShadow: isHovered ? '0 4px 12px var(--ds-shadow-raised)' : 'none',
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
          paddingRight: '32px' // Space for kebab menu
        }}
      >
        {/* NAME */}
        <h3
          style={{
            fontSize: 'var(--ds-font-size-500)',
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
            gap: '4px',
            padding: '4px 10px',
            backgroundColor: healthConfig.bgColor,
            border: `1px solid ${healthConfig.borderColor}`,
            borderRadius: '6px',
            fontSize: 'var(--ds-font-size-200)',
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
            fontSize: 'var(--ds-font-size-100)',
            fontWeight: 600,
            color: COLORS.textMuted,
            textTransform: 'uppercase',
            letterSpacing: '0.03em',
            marginBottom: '4px'
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
              fontSize: 'var(--ds-font-size-700)',
              fontWeight: 600,
              color: COLORS.textPrimary,
              lineHeight: 1
            }}
          >
            {workstream.taskCount || 0}
          </div>
          <div
            style={{
              fontSize: 'var(--ds-font-size-200)',
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
              fontSize: 'var(--ds-font-size-700)',
              fontWeight: 600,
              color: (workstream.overdueCount || 0) > 0 ? COLORS.danger : COLORS.textPrimary,
              lineHeight: 1
            }}
          >
            {workstream.overdueCount || 0}
          </div>
          <div
            style={{
              fontSize: 'var(--ds-font-size-200)',
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
              fontSize: 'var(--ds-font-size-700)',
              fontWeight: 600,
              color: COLORS.textPrimary,
              lineHeight: 1
            }}
          >
            {workstream.members?.length || 0}
          </div>
          <div
            style={{
              fontSize: 'var(--ds-font-size-200)',
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
                boxShadow: '0 10px 40px var(--ds-shadow-raised)',
                zIndex: 100,
                padding: '4px',
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
              <div style={{ height: '1px', backgroundColor: COLORS.borderLight, margin: '4px 0' }} />
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
        gap: '8px',
        width: '100%',
        padding: '8px 12px',
        backgroundColor: isHovered && !disabled
          ? (danger ? 'var(--ds-background-danger)' : 'var(--ds-surface-sunken)') 
          : 'transparent',
        border: 'none',
        borderRadius: '6px',
        fontSize: 'var(--ds-font-size-400)',
        color: disabled ? 'var(--ds-text-subtlest)' : (danger ? 'var(--ds-text-danger)' : 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2)))'),
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
