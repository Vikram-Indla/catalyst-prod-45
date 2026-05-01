/**
 * ProjectStatusBadge — 3-colour pale lozenge guardrail (matches For You page).
 * Grey  → bg:var(--ds-border, #DFE1E6)  text:var(--ds-text, #253858)  → Planning / On Hold / Archived
 * Blue  → bg:#DEEBFF  text:#0747A6  → Active / In Progress
 * Green → bg:#E3FCEF  text:#006644  → Completed / Done
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
  cancelled: 'grey',
};

const COLORS: Record<ColorCategory, { bg: string; text: string }> = {
  grey:  { bg: 'var(--ds-border, var(--ds-border, #DFE1E6))', text: 'var(--ds-text, var(--ds-text, #253858))' },
  blue:  { bg: '#DEEBFF', text: '#0747A6' },
  green: { bg: '#E3FCEF', text: '#006644' },
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const normalized = (status || '').toLowerCase().replace(/[\s_-]+/g, ' ').trim();
  const category = STATUS_MAP[normalized] || 'grey';
  const c = COLORS[category];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 20,
        padding: '0 6px',
        borderRadius: 3,
        backgroundColor: c.bg,
        color: c.text,
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.03em',
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      {(status || '—').replace(/_/g, ' ').toUpperCase()}
    </span>
  );
}
