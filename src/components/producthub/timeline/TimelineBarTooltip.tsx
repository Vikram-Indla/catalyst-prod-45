// =====================================================
// TIMELINE BAR TOOLTIP — Portal-based rich hover tooltip
// =====================================================

import React from 'react';
import { createPortal } from 'react-dom';
import type { TimelineRequest } from '@/types/producthub/request';
import { STATUS_CONFIG, getPriorityFromScore, hashColor, getInitialsFromName } from '@/types/producthub/request';
import { SourceBadge } from '@/components/producthub/shared/SourceBadge';
import { format } from 'date-fns';

interface TimelineBarTooltipProps {
  request: TimelineRequest;
  position: { x: number; y: number };
  isVisible: boolean;
}

export const TimelineBarTooltip: React.FC<TimelineBarTooltipProps> = ({ request, position, isVisible }) => {
  if (!isVisible) return null;

  const statusCfg = STATUS_CONFIG[request.status];
  const priority = getPriorityFromScore(request.computed_score);
  const startStr = request.kickoff_date || request.business_ask_date;
  const endStr = request.target_complete;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 9999,
        background: 'var(--bg-app)',
        border: '1px solid #e4e4e7',
        borderRadius: '12px',
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
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', flexWrap: 'wrap' }}>
          <span
            style={{
              flexShrink: 0,
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 500,
              fontFamily: 'var(--cp-font-mono)',
              backgroundColor: 'rgba(59,130,246,0.1)',
              color: 'var(--cp-blue)',
            }}
          >
            {request.initiative_key}
          </span>
          <SourceBadge source={request.source} />
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
              flexBasis: '100%',
            }}
          >
            {request.title}
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
              fontFamily: 'var(--cp-font-mono)',
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
              {request.progress}%
            </span>
          </div>
          <div style={{ height: '4px', backgroundColor: '#f4f4f5', borderRadius: '9999px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                borderRadius: '9999px',
                width: `${request.progress}%`,
                backgroundColor: statusCfg.color,
              }}
            />
          </div>
        </div>

        {/* Footer: assignee + department */}
        {(request.assignee_name || request.department_name) && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            paddingTop: '4px',
            borderTop: '1px solid #f4f4f5',
          }}>
            {request.assignee_name && (
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
                    color: 'var(--bg-app)',
                    flexShrink: 0,
                    backgroundColor: hashColor(request.assignee_name || request.initiative_key),
                  }}
                >
                  {getInitialsFromName(request.assignee_name)}
                </span>
                <span style={{ fontSize: '12px', color: '#18181b' }}>{request.assignee_name}</span>
              </>
            )}
            {request.assignee_name && request.department_name && (
              <span style={{ color: '#a1a1aa' }}>·</span>
            )}
            {request.department_name && (
              <span style={{ fontSize: '12px', color: '#71717a' }}>{request.department_name}</span>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default TimelineBarTooltip;
