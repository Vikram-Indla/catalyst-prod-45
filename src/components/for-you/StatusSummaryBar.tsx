/**
 * StatusSummaryBar — Theme-aware
 */

import React from 'react';

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

interface StatusSummaryBarProps {
  items: Array<{ status: string; project?: string }>;
}

const CATEGORIES: Array<{ key: StatusCategory; label: string; bgVar: string; textVar: string }> = [
  { key: 'todo',       label: 'To Do',       bgVar: 'var(--cp-lz-gy-bg)', textVar: 'var(--cp-lz-gy-t)' },
  { key: 'inprogress', label: 'In Progress', bgVar: 'var(--cp-lz-bl-bg)', textVar: 'var(--cp-lz-bl-t)' },
  { key: 'done',       label: 'Done',        bgVar: 'var(--cp-lz-gn-bg)', textVar: 'var(--cp-lz-gn-t)' },
];

export function StatusSummaryBar({ items }: StatusSummaryBarProps) {
  if (items.length === 0) return null;

  const counts: Record<StatusCategory, number> = { todo: 0, inprogress: 0, done: 0 };
  items.forEach(item => { counts[getStatusCategory(item.status)]++; });

  const total = items.length;
  const projectCount = new Set(items.map(i => i.project).filter(Boolean)).size;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 0',
      marginBottom: 12,
      borderBottom: '1px solid var(--cp-bd)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
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
      </div>

      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--cp-t3)' }}>
        <strong style={{ color: 'var(--cp-t1)', fontWeight: 600 }}>{total}</strong>{' '}
        items across{' '}
        <strong style={{ color: 'var(--cp-t1)', fontWeight: 600 }}>{projectCount}</strong>{' '}
        projects
      </span>
    </div>
  );
}
