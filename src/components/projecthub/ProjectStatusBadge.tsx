/**
 * ProjectStatusBadge — Project-specific status lozenge with correct light/dark values.
 * Uses its own color map to avoid conflicts with the generic StatusLozenge.
 */
import React from 'react';
import type { ProjectStatus } from '@/types/projecthub';

type ColorCategory = 'green' | 'blue' | 'grey';

const STATUS_MAP: Record<string, ColorCategory> = {
  active: 'green',
  complete: 'green',
  completed: 'green',
  done: 'green',
  released: 'green',
  deployed: 'green',
  planning: 'grey',
  'in progress': 'blue',
  'in_progress': 'blue',
  todo: 'grey',
  'to do': 'grey',
  'on hold': 'grey',
  'on_hold': 'grey',
  paused: 'grey',
  draft: 'grey',
  archived: 'grey',
};

const COLORS: Record<ColorCategory, { lightBg: string; lightText: string; darkBg: string; darkText: string }> = {
  green: { lightBg: '#E3FCEF', lightText: '#006644', darkBg: 'rgba(34,197,94,0.12)', darkText: '#86EFAC' },
  blue:  { lightBg: '#DEEBFF', lightText: '#0747A6', darkBg: 'rgba(37,99,235,0.12)', darkText: '#93C5FD' },
  grey:  { lightBg: '#DFE1E6', lightText: '#253858', darkBg: 'rgba(255,255,255,0.08)', darkText: '#A1A1A1' },
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const normalized = (status || '').toLowerCase().replace(/[\s_-]+/g, ' ').trim();
  const category = STATUS_MAP[normalized] || 'grey';
  const c = COLORS[category];
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 4,
        backgroundColor: isDark ? c.darkBg : c.lightBg,
        color: isDark ? c.darkText : c.lightText,
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        lineHeight: '16px',
        whiteSpace: 'nowrap',
      }}
    >
      {(status || '—').replace(/_/g, ' ').toUpperCase()}
    </span>
  );
}
