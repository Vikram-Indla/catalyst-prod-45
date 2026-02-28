/**
 * StatusSummaryBar — Status-oriented summary replacing old hub-count stats bar.
 * Uses the same 3-color Jira lozenge system as StatusLozenge.
 * Computes from currently filtered items.
 */

import React from 'react';

type StatusCategory = 'todo' | 'inprogress' | 'done';

function getStatusCategory(status: string): StatusCategory {
  const normalized = status.toLowerCase().replace(/[\s_-]+/g, '').trim();

  const donePatterns = [
    'done', 'closed', 'resolved', 'complete', 'completed',
    'inproduction', 'inprod', 'released', 'shipped', 'deployed',
    'verified', 'accepted', 'approved', 'productionready', 'betaready',
  ];
  if (donePatterns.some(p => normalized.includes(p))) return 'done';

  const progressPatterns = [
    'inprogress', 'indevelopment', 'indev', 'inreview', 'endtoendtesting',
    'e2etesting', 'testing', 'readyfordevelopment', 'readyfordev',
    'readyforqa', 'readyforreview', 'readyfortest', 'development',
    'review', 'implementing', 'active', 'started', 'reopened',
    'codereview', 'uat', 'staging', 'regression', 'qavalidation',
    'inbeta', 'technicalvalidation', 'ready', 'triaging', 'triage',
    'open', 'inqa', 'inuat', 'inentityintegration', 'fixed',
    'committee', 'tocommittee', 'converted', 'onhold',
  ];
  if (progressPatterns.some(p => normalized.includes(p))) return 'inprogress';

  return 'todo';
}

interface StatusSummaryBarProps {
  items: Array<{ status: string; project?: string }>;
}

const CATEGORIES: Array<{ key: StatusCategory; label: string; bg: string; text: string }> = [
  { key: 'todo',       label: 'To Do',       bg: '#DFE1E6', text: '#44546F' },
  { key: 'inprogress', label: 'In Progress', bg: '#DEEBFF', text: '#0747A6' },
  { key: 'done',       label: 'Done',        bg: '#E3FCEF', text: '#006644' },
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
      borderBottom: '1px solid #E4E4E7',
    }}>
      {/* Left: Status breakdown */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {CATEGORIES.map(cat => (
          <div key={cat.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              minWidth: 24, height: 22, padding: '0 8px',
              borderRadius: 3, backgroundColor: cat.bg, color: cat.text,
              fontSize: 12, fontWeight: 700,
            }}>
              {counts[cat.key]}
            </span>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#3F3F46' }}>
              {cat.label}
            </span>
          </div>
        ))}
      </div>

      {/* Right: Total context */}
      <span style={{ fontSize: 12, fontWeight: 500, color: '#71717A' }}>
        <strong style={{ color: '#09090B', fontWeight: 600 }}>{total}</strong>{' '}
        items across{' '}
        <strong style={{ color: '#09090B', fontWeight: 600 }}>{projectCount}</strong>{' '}
        projects
      </span>
    </div>
  );
}
