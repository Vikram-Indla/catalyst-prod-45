/**
 * BacklogStatusBar — Status counts + Overdue toggle + Filter slot
 * Matches For You StatusSummaryBar pattern.
 * Theme-aware via cp-* tokens from product-backlog.css.
 */

import React from 'react';
import type { Initiative, InitiativeStatus } from '@/types/initiative';

type StatusBucket = 'todo' | 'inprogress' | 'done';

const TERMINAL: InitiativeStatus[] = ['done', 'cancelled'];
const IN_PROGRESS: InitiativeStatus[] = ['under_implementation', 'implementation_review', 'analysis'];

function getStatusBucket(status: InitiativeStatus): StatusBucket {
  const normalized = status.toLowerCase().replace(/[\s_-]+/g, '');
  if (['done', 'cancelled', 'completed', 'closed', 'resolved', 'released', 'shipped', 'approved'].some(p => normalized.includes(p))) return 'done';
  if (['inprogress', 'inreview', 'indevelopment', 'active', 'started', 'testing', 'development', 'review', 'uat', 'staging'].some(p => normalized.includes(p))) return 'inprogress';
  return 'todo';
}

const CATEGORIES: Array<{ key: StatusBucket; label: string }> = [
  { key: 'todo', label: 'To Do' },
  { key: 'inprogress', label: 'In Progress' },
  { key: 'done', label: 'Done' },
];

interface BacklogStatusBarProps {
  items: Initiative[];
  overdueCount: number;
  overdueActive: boolean;
  onOverdueToggle: () => void;
  filterSlot: React.ReactNode;
}

export function BacklogStatusBar({
  items,
  overdueCount,
  overdueActive,
  onOverdueToggle,
  filterSlot,
}: BacklogStatusBarProps) {
  const counts: Record<StatusBucket, number> = { todo: 0, inprogress: 0, done: 0 };
  items.forEach(item => { counts[getStatusBucket(item.status)]++; });

  return (
    <>
      {CATEGORIES.map(cat => (
        <div key={cat.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            minWidth: 24, height: 22, padding: '0 8px',
            borderRadius: 4,
            backgroundColor: cat.key === 'todo'
              ? 'var(--cp-lozenge-grey-bg)'
              : cat.key === 'inprogress'
                ? 'var(--cp-lozenge-blue-bg)'
                : 'var(--cp-lozenge-green-bg)',
            color: cat.key === 'todo'
              ? 'var(--cp-lozenge-grey-text)'
              : cat.key === 'inprogress'
                ? 'var(--cp-lozenge-blue-text)'
                : 'var(--cp-lozenge-green-text)',
            fontSize: 12, fontWeight: 700,
            fontFamily: 'var(--cp-font-mono)',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {counts[cat.key]}
          </span>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--cp-text-tertiary)' }}>
            {cat.label}
          </span>
        </div>
      ))}

      {/* Overdue toggle chip */}
      <button
        onClick={onOverdueToggle}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          height: 26,
          padding: '0 10px',
          borderRadius: 9999,
          fontSize: 12,
          fontWeight: overdueActive ? 600 : 500,
          cursor: 'pointer',
          transition: 'all 120ms cubic-bezier(0.4,0,0.2,1)',
          border: overdueActive ? '1px solid rgba(220, 38, 38, 0.3)' : '1px solid var(--cp-border-default)',
          background: overdueActive ? 'rgba(220, 38, 38, 0.08)' : 'transparent',
          color: overdueActive ? '#DC2626' : 'var(--cp-text-secondary)',
          fontFamily: 'var(--cp-font-body)',
        }}
      >
        Overdue
        {overdueCount > 0 && (
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            fontFamily: 'var(--cp-font-mono)',
            fontVariantNumeric: 'tabular-nums',
            background: overdueActive ? 'rgba(220, 38, 38, 0.15)' : 'rgba(220, 38, 38, 0.08)',
            color: '#DC2626',
            borderRadius: 9999,
            padding: '1px 6px',
            minWidth: 18,
            textAlign: 'center',
          }}>
            {overdueCount}
          </span>
        )}
      </button>

      {filterSlot}

      {/* Total summary — right-aligned */}
      <span style={{
        fontSize: 12, fontWeight: 500, color: 'var(--cp-text-tertiary)',
        marginLeft: 'auto', fontFamily: 'var(--cp-font-body)',
      }}>
        <strong style={{ color: 'var(--cp-text-primary)', fontWeight: 600 }}>{items.length}</strong>
        {' '}initiatives
      </span>
    </>
  );
}
