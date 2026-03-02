/**
 * AttentionCard — Individual urgency item card.
 */
import React from 'react';
import type { AttentionItem } from './hooks/useAttentionItems';

const F = {
  inter: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif",
  mono: "'JetBrains Mono', 'SF Mono', monospace",
};

const URGENCY_STYLES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  blocked:    { bg: '#FFF1F0', text: '#CF1322', border: '#FFD6D6', dot: '#CF1322' },
  overdue:    { bg: '#FFF7E6', text: '#AD6800', border: '#FFE7BA', dot: '#FA8C16' },
  aging:      { bg: '#FFF7E6', text: '#AD6800', border: '#FFE7BA', dot: '#FAAD14' },
  unassigned: { bg: '#F0F5FF', text: '#2F54EB', border: '#D6E4FF', dot: '#597EF7' },
};

const PROJECT_COLORS: Record<string, string> = {
  BAU: '#4C6EF5', SIMP: '#FA8C16', MDT: '#52C41A', ICP: '#722ED1',
  IP: '#13C2C2', IRP: '#EB2F96', MWR: '#FAAD14', TAH: '#1890FF',
};

const TYPE_COLORS: Record<string, string> = {
  Story: '#4C6EF5', Defect: '#CF1322', Task: '#13C2C2', Epic: '#722ED1',
  Bug: '#CF1322', 'Sub-task': '#8B8FA3',
};

export function AttentionCard({ item, onClick }: { item: AttentionItem; onClick: (key: string) => void }) {
  const urgStyle = URGENCY_STYLES[item.urgency] || URGENCY_STYLES.unassigned;

  return (
    <button
      onClick={() => onClick(item.itemKey)}
      style={{
        display: 'flex', flexDirection: 'column', gap: 4, width: '100%',
        padding: '12px 14px', background: '#FFFFFF',
        border: `1px solid ${urgStyle.border}`, borderRadius: 8,
        borderLeft: `3px solid ${urgStyle.dot}`,
        cursor: 'pointer', textAlign: 'left',
        transition: 'all 120ms',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = '#FAFBFC'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      {/* Top row: key + type + days */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: F.mono, fontSize: 11, fontWeight: 600, color: '#4C6EF5' }}>
          {item.itemKey}
        </span>
        <span style={{
          fontSize: 10, fontWeight: 600, color: TYPE_COLORS[item.type] || '#8B8FA3',
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
        fontSize: 13, fontWeight: 500, color: '#1A1D23', fontFamily: F.inter,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {item.title}
      </span>
      {/* Bottom row: reason + assignee + project */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#8B8FA3', fontFamily: F.inter }}>
        <span>{item.reason}</span>
        {item.assignee && (
          <>
            <span>→</span>
            <span>{item.assignee}</span>
          </>
        )}
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: PROJECT_COLORS[item.projectKey] || '#8B8FA3' }} />
          {item.projectKey}
        </span>
      </div>
    </button>
  );
}
