/**
 * makeWorkstreamEditCell — JiraTable inline-edit factory (Task 1.1, 2026-06-16)
 *
 * Mirrors makeParentEditCell exactly. Same idle/edit/commit shape, only the
 * data field differs (workstream_id instead of parent key) and the chip
 * displays a workstream color dot + name instead of a parent type icon + key.
 *
 * Per CLAUDE.md REUSE FIRST: the new factory mirrors makeParentEditCell's
 * signature (`getValue`/`options`/`onChange`/`canEdit`) so consumers can
 * swap call sites with no surprise.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { makeWorkstreamEditCell, type WorkstreamChoice } from '../editors';

interface TaskRow {
  id: string;
  workstream_id: string | null;
}

const row: TaskRow = { id: 't1', workstream_id: 'ws1' };

const options: WorkstreamChoice[] = [
  { id: 'ws1', name: 'Platform', color: 'var(--cp-workstream-catalyst-primary, #2563eb)' },
  { id: 'ws2', name: 'Mobile', color: 'var(--ds-text-accent-orange, #FF7452)' },
];

function renderCell({
  rowOverride,
  onChange = vi.fn(),
  canEdit,
}: {
  rowOverride?: TaskRow;
  onChange?: ReturnType<typeof vi.fn>;
  canEdit?: (row: TaskRow) => boolean;
} = {}) {
  const Cell = makeWorkstreamEditCell<TaskRow>({
    getValue: (r) => options.find((o) => o.id === r.workstream_id) ?? null,
    options,
    canEdit,
    onChange,
  });
  return {
    onChange,
    ...render(<Cell row={rowOverride ?? row} value={null} commit={vi.fn()} />),
  };
}

describe('makeWorkstreamEditCell (Task 1.1)', () => {
  it('renders the current workstream chip in idle state', () => {
    renderCell();
    expect(screen.getByText('Platform')).toBeInTheDocument();
  });

  it('renders an empty placeholder when no workstream is set', () => {
    renderCell({ rowOverride: { id: 't1', workstream_id: null } });
    expect(screen.getByText(/none|—|no workstream/i)).toBeInTheDocument();
  });

  it('mirrors makeParentEditCell: returns dash (—) when non-editable and empty', () => {
    renderCell({
      rowOverride: { id: 't1', workstream_id: null },
      canEdit: () => false,
    });
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('mirrors makeParentEditCell: opens a popover trigger button when editable', () => {
    renderCell();
    // The trigger is a button (mirrors makeParentEditCell's chip-button).
    const trigger = screen.getByRole('button');
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens the picker when the trigger is clicked', () => {
    renderCell();
    fireEvent.click(screen.getByRole('button'));
    // Once open, every option from `options` must be reachable as a menuitem.
    // (mirrors makeParentEditCell: filtered list + a "No workstream" reset row.)
    expect(screen.getByText('Mobile')).toBeInTheDocument();
  });
});
