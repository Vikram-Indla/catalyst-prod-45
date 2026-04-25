/**
 * AttentionCard — Individual urgency item card.
 */
import React from 'react';
import type { AttentionItem } from './hooks/useAttentionItems';

const F = {
  inter: 'var(--ds-font-family-body)',
  mono: 'var(--ds-font-family-monospaced)',
};

const URGENCY_STYLES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  blocked:    { bg: 'var(--sem-danger-bg)', text: 'var(--sem-danger)', border: 'var(--sem-danger-light)', dot: 'var(--sem-danger)' },
  overdue:    { bg: 'var(--sem-warning-bg)', text: 'var(--sem-warning)', border: 'var(--sem-warning-bg)', dot: 'var(--sem-warning)' },
  aging:      { bg: 'var(--sem-warning-bg)', text: 'var(--sem-warning)', border: 'var(--sem-warning-bg)', dot: 'var(--sem-warning)' },
  unassigned: { bg: 'var(--cp-blue-wash)', text: 'var(--cp-blue)', border: 'var(--cp-primary-20)', dot: 'var(--cp-blue-text)' },
};

const PROJECT_COLORS: Record<string, string> = {
  BAU: '#4C6EF5', SIMP: '#FA8C16', MDT: '#52C41A', ICP: '#722ED1',
  IP: '#13C2C2', IRP: '#EB2F96', MWR: '#FAAD14', TAH: '#1890FF',
};

const TYPE_COLORS: Record<string, string> = {
  Story: 'var(--cp-blue)', Defect: 'var(--sem-danger)', Task: 'var(--cp-teal-60)', Epic: '#722ED1',
  Bug: 'var(--sem-danger)', 'Sub-task': 'var(--fg-3)',
};

export function AttentionCard({ item, onClick }: { item: AttentionItem; onClick: (key: string) => void }) {
  const urgStyle = URGENCY_STYLES[item.urgency] || URGENCY_STYLES.unassigned;

  return (
    <button
      onClick={() => onClick(item.itemKey)}
      style={{
        display: 'flex', flexDirection: 'column', gap: 4, width: '100%',
        padding: '12px 14px', background: 'var(--cp-float)',
        border: `1px solid ${urgStyle.border}`, borderRadius: 8,
        borderLeft: `3px solid ${urgStyle.dot}`,
        cursor: 'pointer', textAlign: 'left',
        transition: 'all 120ms',
        position: 'relative',
        zIndex: 0,
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-1)'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.zIndex = '10'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--cp-float)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.zIndex = '0'; e.currentTarget.style.boxShadow = ''; }}
    >
      {/* Top row: key + type + days */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: F.mono, fontSize: 11, fontWeight: 600, color: 'var(--cp-blue)' }}>
          {item.itemKey}
        </span>
        <span style={{
          fontSize: 10, fontWeight: 600, color: TYPE_COLORS[item.type] || 'var(--fg-3)',
          textTransform: 'uppercase', letterSpacing: '0.04em',
        }}>
          {item.type}
        </span>
        <span style={{ marginLeft: 'auto', fontFamily: F.mono, fontSize: 11, fontWeight: 600, color: urgStyle.text }}>
          {item.daysInStatus}d
        </span>
      </div>
      {/* Title */}
      <span style={{
        fontSize: 13, fontWeight: 500, color: 'var(--fg-1)', fontFamily: F.inter,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {item.title}
      </span>
      {/* Bottom row: reason + assignee + project */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--fg-3)', fontFamily: F.inter }}>
        <span>{item.reason}</span>
        {item.assignee && (
          <>
            <span>→</span>
            <span>{item.assignee}</span>
          </>
        )}
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: PROJECT_COLORS[item.projectKey] || 'var(--fg-3)' }} />
          {item.projectKey}
        </span>
      </div>
    </button>
  );
}
