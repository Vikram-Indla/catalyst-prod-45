/**
 * ProposalTable — shared JiraTable wrapper for AI proposal review modals.
 *
 * Used by EpicProposalModal, StoryProposalModal, SubtaskProposalModal.
 * Columns: type-icon | title (flex) | assignee (editable).
 * Selection via JiraTable selectable prop.
 * Inline bulk-assign bar shown when selection > 0.
 */
import React, { useMemo, useState } from 'react';
import { token } from '@atlaskit/tokens';
import Avatar from '@atlaskit/avatar';
import Button from '@atlaskit/button/new';
import {
  JiraTable,
  makeAssigneeEditCell,
  type AssigneeChoice,
} from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable/types';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';

export interface ProposalRow {
  id: string;
  title: string;
  issueType: string;
  meta?: string;
  assignee: AssigneeChoice | null;
}

interface ProposalTableProps {
  rows: ProposalRow[];
  selection: Set<string>;
  onSelectionChange: (next: Set<string>) => void;
  onAssigneeChange: (rowId: string, assignee: AssigneeChoice | null) => void;
  onBulkAssign: (assignee: AssigneeChoice | null) => void;
  assigneeOptions: AssigneeChoice[];
}

export function ProposalTable({
  rows,
  selection,
  onSelectionChange,
  onAssigneeChange,
  onBulkAssign,
  assigneeOptions,
}: ProposalTableProps) {
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [bulkSearch, setBulkSearch] = useState('');

  const filteredBulkOptions = useMemo(() => {
    const q = bulkSearch.trim().toLowerCase();
    return q ? assigneeOptions.filter((o) => o.name.toLowerCase().includes(q)) : assigneeOptions;
  }, [assigneeOptions, bulkSearch]);

  const columns: Column<ProposalRow>[] = useMemo(
    () => [
      {
        id: 'type',
        label: '',
        width: 3,
        alwaysVisible: true,
        cell: ({ row }) => (
          <span style={{ display: 'flex', alignItems: 'center', paddingLeft: 4 }}>
            <JiraIssueTypeIcon type={row.issueType} size={16} />
          </span>
        ),
      },
      {
        id: 'title',
        label: 'Title',
        flex: true,
        alwaysVisible: true,
        cell: ({ row }) => (
          <span style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            overflow: 'hidden',
          }}>
            <span style={{
              fontSize: 14,
              fontWeight: 400,
              color: token('color.text', 'var(--ds-text, #172B4D)'),
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {row.title}
            </span>
            {row.meta && (
              <span style={{
                fontSize: 11,
                color: token('color.text.subtlest', 'var(--ds-text-subtlest, #6B778C)'),
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {row.meta}
              </span>
            )}
          </span>
        ),
      },
      {
        id: 'assignee',
        label: 'Assignee',
        width: 16,
        cell: makeAssigneeEditCell<ProposalRow>({
          getAssignee: (row) => row.assignee,
          options: assigneeOptions,
          onChange: (row, next) => onAssigneeChange(row.id, next),
        }),
      },
    ],
    [assigneeOptions, onAssigneeChange],
  );

  return (
    <div style={{ position: 'relative' }}>
      {/* Bulk assign bar — shown when rows are selected */}
      {selection.size > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '6px 8px',
          background: token('color.background.selected', 'var(--ds-background-selected, #E9F2FF)'),
          borderRadius: 3,
          marginBottom: 8,
          border: `1px solid ${token('color.border.selected', 'var(--ds-background-information-bold, #0C66E4)')}`,
          position: 'relative',
        }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: token('color.text', 'var(--ds-text, #172B4D)') }}>
            {selection.size} selected
          </span>
          <div style={{ position: 'relative' }}>
            <Button
              appearance="subtle"
              spacing="compact"
              onClick={() => { setBulkAssignOpen((v) => !v); setBulkSearch(''); }}
            >
              Assign to…
            </Button>
            {bulkAssignOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  left: 0,
                  background: token('color.background.overlay', 'var(--ds-surface, #FFFFFF)'),
                  border: `1px solid ${token('color.border', 'var(--ds-border, #DFE1E6)')}`,
                  borderRadius: 4,
                  boxShadow: token('elevation.shadow.overlay', '0 8px 16px var(--ds-shadow-raised, rgba(9,30,66,0.25))'),
                  padding: '4px 0',
                  minWidth: 220,
                  maxHeight: 240,
                  overflowY: 'auto',
                  zIndex: 9999,
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div style={{ padding: '6px 8px' }}>
                  <input
                    autoFocus
                    placeholder="Search people…"
                    value={bulkSearch}
                    onChange={(e) => setBulkSearch(e.target.value)}
                    style={{
                      width: '100%',
                      border: `1px solid ${token('color.border', 'var(--ds-border, #DFE1E6)')}`,
                      borderRadius: 3,
                      padding: '4px 6px',
                      fontSize: 13,
                      outline: 'none',
                      boxSizing: 'border-box',
                      color: token('color.text', 'var(--ds-text, #172B4D)'),
                      background: token('color.background.input', 'var(--ds-surface-sunken, #F7F8F9)'),
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => { onBulkAssign(null); setBulkAssignOpen(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', padding: '6px 12px', border: 'none',
                    background: 'transparent', cursor: 'pointer', fontSize: 13,
                    color: token('color.text', 'var(--ds-text, #172B4D)'),
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = token('color.background.neutral.subtle.hovered', 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))'); }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <Avatar size="xsmall" appearance="circle" />
                  Unassigned
                </button>
                {filteredBulkOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => { onBulkAssign(opt); setBulkAssignOpen(false); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      width: '100%', padding: '6px 12px', border: 'none',
                      background: 'transparent', cursor: 'pointer', fontSize: 13,
                      color: token('color.text', 'var(--ds-text, #172B4D)'),
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = token('color.background.neutral.subtle.hovered', 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))'); }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <Avatar size="xsmall" name={opt.name} src={opt.avatarUrl ?? undefined} appearance="circle" />
                    {opt.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button
            appearance="subtle"
            spacing="compact"
            onClick={() => onSelectionChange(new Set())}
          >
            Clear
          </Button>
        </div>
      )}

      <div
        style={{ maxHeight: '50vh', overflowY: 'auto', borderRadius: 3 }}
        onClick={() => bulkAssignOpen && setBulkAssignOpen(false)}
      >
        <JiraTable<ProposalRow>
          columns={columns}
          data={rows}
          getRowId={(row) => row.id}
          selectable
          selection={selection}
          onSelectionChange={onSelectionChange}
          showRowCount={false}
          density="compact"
          ariaLabel="Proposal review table"
        />
      </div>
    </div>
  );
}
