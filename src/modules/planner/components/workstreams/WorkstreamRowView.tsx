// ============================================================================
// WorkstreamRow + ActionButton — Table row for list view
// Extracted from WorkstreamsPage.tsx
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronDown,
  User,
  Archive,
  Edit2,
  Trash2,
} from 'lucide-react';
import { Workstream } from '../../hooks/usePlannerWorkstreams';
import { COLORS, TeamMember, formatDate } from './workstreams-constants';
import { LeadPickerDropdown } from './WorkstreamLeadPickerDropdown';

// ============================================================================
// ActionButton
// ============================================================================

const ActionButton: React.FC<{
  icon: React.ReactNode;
  title: string;
  danger?: boolean;
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
}> = ({ icon, title, danger, onClick, disabled }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onClick(e);
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={title}
      disabled={disabled}
      style={{
        width: '32px',
        height: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isHovered && !disabled ? (danger ? COLORS.dangerBg : COLORS.surfaceHover) : 'transparent',
        border: `1px solid ${isHovered && !disabled ? (danger ? COLORS.dangerBorder : COLORS.borderLight) : 'transparent'}`,
        borderRadius: '6px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        color: isHovered && !disabled ? (danger ? COLORS.danger : COLORS.textSecondary) : COLORS.textMuted,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {icon}
    </button>
  );
};

// ============================================================================
// WorkstreamRow
// ============================================================================

export const WorkstreamRow: React.FC<{
  workstream: Workstream;
  lead: TeamMember | null;
  iconColor: string;
  allUsers: TeamMember[];
  isDropdownOpen: boolean;
  leadSearchQuery: string;
  onToggleDropdown: () => void;
  onLeadSearchChange: (query: string) => void;
  onAssignLead: (user: TeamMember | null) => void;
  dropdownRef?: React.RefObject<HTMLDivElement>;
  onRowClick: () => void;
  onArchive: (e: React.MouseEvent) => void;
  onEdit: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  onMembersClick: (e: React.MouseEvent) => void;
}> = ({
  workstream,
  lead,
  iconColor,
  allUsers,
  isDropdownOpen,
  leadSearchQuery,
  onToggleDropdown,
  onLeadSearchChange,
  onAssignLead,
  dropdownRef,
  onRowClick,
  onArchive,
  onEdit,
  onDelete,
  onMembersClick,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  // Update anchor rect when dropdown opens
  useEffect(() => {
    if (isDropdownOpen && buttonRef.current) {
      setAnchorRect(buttonRef.current.getBoundingClientRect());
    }
  }, [isDropdownOpen]);
  const healthConfig = {
    healthy: { label: 'On Track', bg: COLORS.successBg, color: COLORS.success },
    'at-risk': { label: 'At Risk', bg: COLORS.warningBg, color: COLORS.warningText },
    critical: { label: 'Critical', bg: COLORS.dangerBg, color: COLORS.danger },
    locked: { label: 'Locked', bg: COLORS.surfaceHover, color: COLORS.textMuted },
  }[workstream.health || 'healthy'] || { label: 'On Track', bg: COLORS.successBg, color: COLORS.success };

  return (
    <tr
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onRowClick}
      style={{
        borderBottom: `1px solid ${COLORS.surfaceHover}`,
        backgroundColor: isHovered ? COLORS.surfacePage : 'transparent',
        cursor: 'pointer',
      }}
    >
      {/* NAME CELL */}
      <td style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              minWidth: '40px',
              minHeight: '40px',
              borderRadius: '12px',
              background: iconColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              fontWeight: 700,
              color: 'var(--ds-surface, #ffffff)',
              flexShrink: 0,
            }}
          >
            {workstream.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: COLORS.textPrimary }}>
              {workstream.name}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                color: COLORS.textMuted,
              }}
            >
              <span
                style={{
                  fontFamily: '"SF Mono", Monaco, monospace',
                  fontSize: '11px',
                  fontWeight: 500,
                  backgroundColor: COLORS.surfaceHover,
                  padding: '2px 6px',
                  borderRadius: '4px',
                }}
              >
                {workstream.code || workstream.key_prefix || workstream.name.substring(0, 3).toUpperCase()}
              </span>
              <span>·</span>
              <span>Created {formatDate(workstream.created_at || new Date().toISOString())}</span>
            </div>
          </div>
        </div>
      </td>

      {/* LEAD CELL */}
      <td style={{ padding: '16px 20px', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
        <div ref={dropdownRef}>
          <button
            ref={buttonRef}
            onClick={(e) => {
              e.stopPropagation();
              onToggleDropdown();
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 10px',
              backgroundColor: 'transparent',
              border: `1px solid ${isHovered || isDropdownOpen ? COLORS.borderDefault : 'transparent'}`,
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {lead ? (
              <>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    minWidth: '28px',
                    minHeight: '28px',
                    borderRadius: '50%',
                    backgroundColor: lead.avatarColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--ds-surface, #ffffff)',
                    flexShrink: 0,
                  }}
                >
                  {lead.initials}
                </div>
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: 500,
                    color: COLORS.textPrimary,
                  }}
                >
                  {lead.name}
                </span>
              </>
            ) : (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  color: COLORS.textLight,
                }}
              >
                <User size={18} />
                Unassigned
              </span>
            )}
            <ChevronDown
              size={14}
              style={{ color: COLORS.textLight, opacity: isHovered || isDropdownOpen ? 1 : 0 }}
            />
          </button>

          {isDropdownOpen && (
            <LeadPickerDropdown
              users={allUsers}
              selectedId={lead?.id}
              searchQuery={leadSearchQuery}
              onSearchChange={onLeadSearchChange}
              onSelect={onAssignLead}
              showRemove={!!lead}
              anchorRect={anchorRect}
            />
          )}
        </div>
      </td>

      {/* HEALTH CELL */}
      <td style={{ padding: '16px 20px' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            backgroundColor: healthConfig.bg,
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 500,
            color: healthConfig.color,
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: healthConfig.color,
            }}
          />
          {healthConfig.label}
        </span>
      </td>

      {/* TASKS CELL */}
      <td
        style={{
          padding: '16px 20px',
          textAlign: 'center',
          fontSize: '14px',
          fontWeight: 500,
          color: COLORS.textSecondary,
        }}
      >
        {workstream.taskCount || 0}
      </td>

      {/* OVERDUE CELL */}
      <td
        style={{
          padding: '16px 20px',
          textAlign: 'center',
          fontSize: '14px',
          fontWeight: 600,
          color: (workstream.overdueCount || 0) > 0 ? COLORS.danger : COLORS.textLight,
        }}
      >
        {workstream.overdueCount || 0}
      </td>

      {/* MEMBERS CELL */}
      <td
        style={{
          padding: '16px 20px',
          textAlign: 'center',
        }}
      >
        <button
          onClick={onMembersClick}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '28px',
            height: '28px',
            padding: '0 8px',
            backgroundColor: (workstream.members?.length || 0) > 0 ? COLORS.accentLighter : 'transparent',
            border: `1px solid ${(workstream.members?.length || 0) > 0 ? COLORS.accent : COLORS.borderLight}`,
            borderRadius: '14px',
            fontSize: '13px',
            fontWeight: 500,
            color: (workstream.members?.length || 0) > 0 ? COLORS.accent : COLORS.textMuted,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          title="View members"
        >
          {workstream.members?.length || 0}
        </button>
      </td>

      {/* ACTIONS CELL */}
      <td style={{ padding: '16px 20px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '4px',
            opacity: isHovered ? 1 : 0,
          }}
        >
          <ActionButton icon={<Archive size={16} />} title="Archive" onClick={onArchive} />
          <ActionButton icon={<Edit2 size={16} />} title="Edit" onClick={onEdit} />
          <ActionButton
            icon={<Trash2 size={16} />}
            title="Delete"
            danger
            onClick={onDelete}
            disabled={(workstream.taskCount || 0) > 0}
          />
        </div>
      </td>
    </tr>
  );
};
