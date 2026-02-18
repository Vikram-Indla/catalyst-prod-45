// =====================================================
// TIMELINE BAR TOOLTIP — Portal-based rich hover tooltip
// =====================================================

import React from 'react';
import { createPortal } from 'react-dom';
import type { TimelineInitiative } from '@/types/producthub/initiative';
import { STATUS_CONFIG, getPriorityFromScore, hashColor, getInitialsFromName } from '@/types/producthub/initiative';
import { format } from 'date-fns';

interface TimelineBarTooltipProps {
  initiative: TimelineInitiative;
  position: { x: number; y: number };
  isVisible: boolean;
}

export const TimelineBarTooltip: React.FC<TimelineBarTooltipProps> = ({ initiative, position, isVisible }) => {
  if (!isVisible) return null;

  const statusCfg = STATUS_CONFIG[initiative.status];
  const priority = getPriorityFromScore(initiative.computed_score);
  const startStr = initiative.kickoff_date || initiative.business_ask_date;
  const endStr = initiative.target_complete;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 9999,
        background: '#ffffff',
        border: '1px solid #e4e4e7',
        borderRadius: '10px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)',
        pointerEvents: 'none',
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.15s',
        maxWidth: '340px',
        minWidth: '280px',
      }}
    >
      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          <span
            style={{
              flexShrink: 0,
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 500,
              fontFamily: "'JetBrains Mono', monospace",
              backgroundColor: 'rgba(59,130,246,0.1)',
              color: '#2563eb',
            }}
          >
            {initiative.initiative_key}
          </span>
          <span
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#18181b',
              lineHeight: '1.3',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {initiative.title}
          </span>
        </div>

        {/* Status + Priority badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '2px 8px',
              fontSize: '11px',
              fontWeight: 500,
              borderRadius: '12px',
              backgroundColor: statusCfg.bg,
              color: statusCfg.color,
            }}
          >
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: statusCfg.color,
            }} />
            {statusCfg.label}
          </span>
          <span style={{ fontSize: '11px', fontWeight: 500, color: '#71717a', textTransform: 'capitalize' }}>
            {priority} Priority
          </span>
        </div>

        {/* Date range */}
        {(startStr || endStr) && (
          <div
            style={{
              fontSize: '11px',
              color: '#71717a',
              fontFamily: "'JetBrains Mono', monospace",
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {startStr ? format(new Date(startStr), 'MMM d, yyyy') : '—'}
            {' → '}
            {endStr ? format(new Date(endStr), 'MMM d, yyyy') : '—'}
          </div>
        )}

        {/* Progress bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', color: '#71717a' }}>Progress</span>
            <span style={{ fontSize: '11px', fontWeight: 500, color: '#18181b', fontVariantNumeric: 'tabular-nums' }}>
              {initiative.progress}%
            </span>
          </div>
          <div style={{ height: '4px', backgroundColor: '#f4f4f5', borderRadius: '9999px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                borderRadius: '9999px',
                width: `${initiative.progress}%`,
                backgroundColor: statusCfg.color,
              }}
            />
          </div>
        </div>

        {/* Footer: assignee + department */}
        {(initiative.assignee_name || initiative.department_name) && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            paddingTop: '4px',
            borderTop: '1px solid #f4f4f5',
          }}>
            {initiative.assignee_name && (
              <>
                <span
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '8px',
                    fontWeight: 600,
                    color: '#ffffff',
                    flexShrink: 0,
                    backgroundColor: hashColor(initiative.initiative_key),
                  }}
                >
                  {getInitialsFromName(initiative.assignee_name)}
                </span>
                <span style={{ fontSize: '12px', color: '#18181b' }}>{initiative.assignee_name}</span>
              </>
            )}
            {initiative.assignee_name && initiative.department_name && (
              <span style={{ color: '#a1a1aa' }}>·</span>
            )}
            {initiative.department_name && (
              <span style={{ fontSize: '12px', color: '#71717a' }}>{initiative.department_name}</span>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default TimelineBarTooltip;
