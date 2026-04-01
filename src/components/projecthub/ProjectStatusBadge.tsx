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
  planning: 'blue',
  'in progress': 'blue',
  'in_progress': 'blue',
  todo: 'blue',
  'to do': 'blue',
  'on hold': 'grey',
  'on_hold': 'grey',
  paused: 'grey',
  draft: 'grey',
  archived: 'grey',
};

const COLORS: Record<ColorCategory, { lightBg: string; lightText: string; darkBg: string; darkText: string }> = {
  green: { lightBg: '#DCFCE7', lightText: '#166534', darkBg: '#1A2A1E', darkText: '#86EFAC' },
  blue:  { lightBg: '#DBEAFE', lightText: '#1E40AF', darkBg: '#1E2636', darkText: '#93C5FD' },
  grey:  { lightBg: '#F3F4F6', lightText: '#4B5563', darkBg: '#2C2926', darkText: '#B8BCC8' },
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
        borderRadius: 3,
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
      {(status || '—').toUpperCase()}
    </span>
  );
}
