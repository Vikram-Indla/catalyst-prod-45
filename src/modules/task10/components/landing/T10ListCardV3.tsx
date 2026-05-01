// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10ListCardV3
// Purpose: Individual list card with current week progress and past weeks
// Matches reference screenshot design - supports both T10ListSummary and T10ListCardView
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { Plus, MoreVertical, ChevronDown, Pencil, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatT10Date, getT10SlotsAvailable } from '../../utils';
import type { T10ListCardView } from '../../types/listCards';

interface T10ListCardV3Props {
  list: T10ListCardView;
  onCardClick: () => void;
  onStartWeek: () => void;
  onRename: () => void;
  onDelete: () => void;
}

export function T10ListCardV3({ 
  list, 
  onCardClick, 
  onStartWeek, 
  onRename, 
  onDelete 
}: T10ListCardV3Props) {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [showPastWeeks, setShowPastWeeks] = useState(false);
  
  // Use embedded data from the view - no additional fetching needed!
  const hasCurrentWeek = !!list.current_week_id;
  const completedCount = list.completed_count || 0;
  const totalCount = list.total_count || 0;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const slotsAvailable = list.slots_available || getT10SlotsAvailable(totalCount);
  const pastWeeks = list.past_weeks || [];

  const weekLabel = list.week_start 
    ? formatT10Date(list.week_start)
    : '';

  const createdLabel = `Created · ${formatT10Date(list.created_at)}`;

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const handleRenameClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    onRename();
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    onDelete();
  };

  const handlePastWeeksToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowPastWeeks(!showPastWeeks);
  };

  const handleWeekClick = (weekId: string) => {
    navigate(`/priorities/list/${list.id}/week/${weekId}`);
  };

  // Close menu when clicking outside
  React.useEffect(() => {
    if (showMenu) {
      const handleClickOutside = () => setShowMenu(false);
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showMenu]);

  return (
    <div
      onClick={hasCurrentWeek ? onCardClick : undefined}
      style={{
        backgroundColor: 'var(--ds-surface, #ffffff)',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '20px 24px',
        cursor: hasCurrentWeek ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        marginBottom: 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--ds-text-disabled, #cbd5e1)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--ds-border, #e2e8f0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Header Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Key Badge */}
          <span
            style={{
              padding: '4px 10px',
              fontSize: '12px',
              fontWeight: 600,
              fontFamily: 'monospace',
              color: 'var(--ds-text-brand, #3b82f6)',
              backgroundColor: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: '6px',
            }}
          >
            {list.key}
          </span>
          
          {/* Name */}
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ds-text, #0f172a)', margin: 0 }}>
            {list.name}
          </h3>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Created Date (kept in header to avoid extra vertical space) */}
          <span style={{ fontSize: '12px', color: 'var(--t10-text-tertiary)' }}>{createdLabel}</span>

          {/* Status Badge */}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: list.status === 'active' ? 'var(--ds-text-success, #16a34a)' : 'var(--ds-text-subtlest, #64748b)',
              backgroundColor: list.status === 'active' ? 'rgba(22, 163, 74, 0.08)' : 'var(--ds-surface-sunken, #f1f5f9)',
              borderRadius: '99px',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: list.status === 'active' ? 'var(--ds-text-success, #22c55e)' : 'var(--ds-text-subtlest, #94a3b8)',
              }}
            />
            {list.status === 'active' ? 'Active' : 'Inactive'}
          </span>

          {/* Menu Button */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={handleMenuClick}
              style={{
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                color: 'var(--ds-text-subtlest, #94a3b8)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--ds-surface-sunken, #f1f5f9)';
                e.currentTarget.style.color = 'var(--ds-text-subtlest, #64748b)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--ds-text-subtlest, #94a3b8)';
              }}
            >
              <MoreVertical size={16} />
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '4px',
                  width: '140px',
                  backgroundColor: 'var(--ds-surface, #ffffff)',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  zIndex: 50,
                  padding: '4px',
                }}
              >
                <button
                  type="button"
                  onClick={handleRenameClick}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    fontSize: '13px',
                    color: 'var(--ds-text-subtle, #475569)',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--ds-surface-sunken, #f1f5f9)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <Pencil size={14} />
                  Rename
                </button>
                <button
                  type="button"
                  onClick={handleDeleteClick}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    fontSize: '13px',
                    color: 'var(--ds-text-danger, #ef4444)',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--ds-background-danger, #fef2f2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Current Week Section */}
      {hasCurrentWeek ? (
        <div style={{ marginBottom: pastWeeks.length > 0 ? '8px' : '0' }}>
          <p style={{ fontSize: '14px', color: 'var(--ds-text-subtlest, #64748b)', margin: '0 0 8px 0' }}>
            Week of <strong style={{ color: 'var(--ds-text, #0f172a)', fontWeight: 600 }}>{weekLabel}</strong>
          </p>
          
          {/* Progress Bar */}
          <div style={{ height: '6px', backgroundColor: 'var(--ds-border, #e2e8f0)', borderRadius: '4px', marginBottom: '8px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${progressPercent}%`,
                background: progressPercent === 100 
                  ? 'linear-gradient(90deg, var(--ds-text-success, #22c55e), #4ade80)' 
                  : 'linear-gradient(90deg, var(--ds-text-brand, #3b82f6), var(--ds-text-brand, #60a5fa))',
                borderRadius: '4px',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          
          {/* Stats */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
            <span style={{ color: 'var(--ds-text-brand, #3b82f6)', fontWeight: 600 }}>{completedCount}</span>
            <span style={{ color: 'var(--ds-text-subtlest, #64748b)' }}>of {totalCount} completed</span>
            {slotsAvailable > 0 && totalCount > 0 && (
              <>
                <span style={{ color: 'var(--ds-text-disabled, #cbd5e1)' }}>·</span>
                <span style={{ color: '#0d9488', fontWeight: 500 }}>{slotsAvailable} slots available</span>
              </>
            )}
          </div>
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '10px 14px',
            backgroundColor: 'var(--t10-bg-subtle)',
            border: '1px dashed var(--t10-border-default)',
            borderRadius: '12px',
            marginBottom: pastWeeks.length > 0 ? '8px' : '0',
          }}
        >
          <span
            style={{
              fontSize: '13px',
              color: 'var(--t10-text-tertiary)',
              whiteSpace: 'nowrap',
            }}
          >
            No active week
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStartWeek();
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              backgroundColor: 'var(--t10-accent)',
              color: 'var(--ds-surface, #ffffff)',
              fontSize: '12px',
              fontWeight: 600,
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--t10-accent-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--t10-accent)')}
          >
            <Plus size={16} />
            Start this week
          </button>
        </div>
      )}

      {/* Past Weeks Accordion */}
      {pastWeeks.length > 0 && (
        <>
          <button
            type="button"
            onClick={handlePastWeeksToggle}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 0',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--ds-text-subtlest, #64748b)',
              width: '100%',
              justifyContent: 'flex-start',
            }}
          >
            <ChevronDown 
              size={14} 
              style={{ 
                transform: showPastWeeks ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
              }} 
            />
            Past Weeks
            <span
              style={{
                marginLeft: '4px',
                padding: '2px 8px',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--ds-text-brand, #3b82f6)',
                backgroundColor: 'rgba(59, 130, 246, 0.08)',
                borderRadius: '4px',
              }}
            >
              {pastWeeks.length}
            </span>
          </button>

          {showPastWeeks && (
            <div
              style={{
                marginLeft: '8px',
                paddingLeft: '12px',
                borderLeft: '2px solid #3b82f6',
                marginTop: '4px',
              }}
            >
              {pastWeeks.slice(0, 5).map((week) => {
                const weekProgress = week.total_count > 0 
                  ? (week.completed_count / week.total_count) * 100 
                  : 0;
                const isComplete = weekProgress === 100 && week.total_count > 0;
                
                return (
                  <div
                    key={week.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleWeekClick(week.id);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--ds-surface-sunken, #f1f5f9)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: isComplete ? 'var(--ds-text-success, #22c55e)' : 'var(--ds-text-disabled, #cbd5e1)',
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ds-text-subtle, #475569)' }}>
                      {formatT10Date(week.week_start)} - {formatT10Date(week.week_end)}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--ds-text-subtlest, #94a3b8)', marginLeft: 'auto' }}>
                      {week.completed_count}/{week.total_count} completed
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default T10ListCardV3;
