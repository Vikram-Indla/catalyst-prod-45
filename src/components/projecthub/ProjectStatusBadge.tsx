/**
 * ProjectStatusBadge — Project-specific status lozenge with correct light/dark values.
 * Uses its own color map to avoid conflicts with the generic StatusLozenge.
 */
import React from 'react';
import type { ProjectStatus } from '@/types/projecthub';

type ColorCategory = 'green' | 'blue' | 'grey';

const STATUS_MAP: Record<string, ColorCategory> = {
  active: 'blue',
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
  green: { lightBg: '#14892C', lightText: '#FFFFFF', darkBg: '#14892C', darkText: '#FFFFFF' },
  blue:  { lightBg: '#0052CC', lightText: '#FFFFFF', darkBg: '#0052CC', darkText: '#FFFFFF' },
  grey:  { lightBg: '#42526E', lightText: '#FFFFFF', darkBg: '#42526E', darkText: '#FFFFFF' },
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
