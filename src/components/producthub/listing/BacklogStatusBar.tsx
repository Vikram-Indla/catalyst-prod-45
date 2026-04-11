/**
 * BacklogStatusBar — Status counts + Overdue toggle + Filter slot
 * Pixel-identical to For You StatusSummaryBar.
 * Uses same cp-lz-* tokens and getStatusCategory logic.
 */

import React from 'react';
import type { Initiative } from '@/types/initiative';

type StatusCategory = 'todo' | 'inprogress' | 'done';

function getStatusCategory(status: string): StatusCategory {
  const normalized = status.toLowerCase().replace(/[\s_-]+/g, '').trim();
  const donePatterns = [
    'done', 'closed', 'resolved', 'complete', 'completed',
    'inproduction', 'inprod', 'released', 'shipped', 'deployed',
    'verified', 'accepted', 'approved', 'productionready', 'betaready', 'fixed',
  ];
  if (donePatterns.some(p => normalized.includes(p))) return 'done';
  const progressPatterns = [
    'inprogress', 'indevelopment', 'indev', 'inreview', 'endtoendtesting',
    'e2etesting', 'testing', 'readyfordevelopment', 'readyfordev',
    'readyforqa', 'readyforreview', 'readyfortest', 'development',
    'review', 'implementing', 'active', 'started', 'reopened',
    'codereview', 'uat', 'staging', 'regression', 'qavalidation',
    'inbeta', 'technicalvalidation', 'triaging', 'triage',
    'inqa', 'inuat', 'inentityintegration',
    'committee', 'tocommittee', 'converted', 'onhold',
  ];
  if (progressPatterns.some(p => normalized.includes(p))) return 'inprogress';
  return 'todo';
}

const CATEGORIES: Array<{ key: StatusCategory; label: string; bgVar: string; textVar: string }> = [
  { key: 'todo',       label: 'To Do',        bgVar: 'var(--cp-lz-gy-bg)', textVar: 'var(--cp-lz-gy-t)' },
  { key: 'inprogress', label: 'In Progress',  bgVar: 'var(--cp-lz-bl-bg)', textVar: 'var(--cp-lz-bl-t)' },
  { key: 'done',       label: 'Done',         bgVar: 'var(--cp-lz-gn-bg)', textVar: 'var(--cp-lz-gn-t)' },
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
  const counts: Record<StatusCategory, number> = { todo: 0, inprogress: 0, done: 0 };
  items.forEach(item => { counts[getStatusCategory(item.status)]++; });

  return (
    <>
      {CATEGORIES.map(cat => (
        <div key={cat.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            minWidth: 24, height: 22, padding: '0 8px',
            borderRadius: 4, backgroundColor: cat.bgVar, color: cat.textVar,
            fontSize: 12, fontWeight: 700,
          }}>
            {counts[cat.key]}
          </span>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--cp-t3)' }}>
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
      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--cp-t3)', marginLeft: 'auto' }}>
        <strong style={{ color: 'var(--cp-t1)', fontWeight: 600 }}>{items.length}</strong>
        {' '}initiatives
      </span>
    </>
  );
}
