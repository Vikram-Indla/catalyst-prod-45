import React, { useState, useCallback } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';
import { WorkItemCard } from '@/components/kanban/WorkItemCard';
import { DroppableColumn } from '@/components/kanban/KanbanColumn';
import { DENSITY_CONFIG, KANBAN_TOKENS } from '@/components/kanban/kanban-tokens';
import type { BoardIssue } from '@/components/kanban/kanban-types';
import type { AssigneeOption } from '@/components/kanban/AssigneePickerPopover';
import {
  BAU_BOARD_COLUMNS,
  BAU_BOARD_COL_MAP,
  BAU_BOARD_ISSUES_BY_ID,
  BAU_BOARD_ISSUES,
  BAU_AVATARS_BY_NAME,
  BAU_CARD_VARIANTS,
  BAU_CARD_VARIANTS_BY_ID,
} from '@/stories/fixtures/projectBoard';

const tk = KANBAN_TOKENS.light;
const d = DENSITY_CONFIG.comfortable;

const ASSIGNEE_OPTIONS: AssigneeOption[] = [
  { name: 'Vikram Indla',  email: 'vikram@example.com',  avatarUrl: null },
  { name: 'Nada Alfassam', email: 'nada@example.com',    avatarUrl: null },
  { name: 'Ahmed Yousry',  email: 'ahmed@example.com',   avatarUrl: null },
  { name: 'Andrew Fayyaz', email: 'andrew@example.com',  avatarUrl: null },
  { name: 'Yazeed Daraz',  email: 'yazeed@example.com',  avatarUrl: null },
];

const COMMON_CARD_PROPS = {
  d,
  tk,
  avatarsByName: BAU_AVATARS_BY_NAME,
  projectKey: 'BAU',
  assigneeOptions: ASSIGNEE_OPTIONS,
  boardColumns: BAU_BOARD_COLUMNS,
};

const meta: Meta = {
  title: 'Enterprise Components/Kanban Components',
  parameters: { layout: 'fullscreen' },
};
export default meta;

/* ─── Layout helpers — mimic the live board's column grid ─── */

function BoardCanvas({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: tk.pageBg,
        minHeight: '100vh',
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      {children}
    </div>
  );
}

function ColumnLabel({ name, count }: { name: string; count?: number }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        borderBottom: `1px solid ${tk.border}`,
        background: tk.headerBg,
        borderRadius: 4,
        fontSize: 'var(--ds-font-size-200)',
        fontWeight: 600,
        letterSpacing: '0.04em',
        color: tk.textPrimary,
      }}
    >
      <span>{name}</span>
      {typeof count === 'number' && (
        <span
          style={{
            fontSize: 'var(--ds-font-size-100)',
            fontWeight: 500,
            background: tk.surfaceAlt,
            color: tk.textMuted,
            padding: '1px 6px',
            borderRadius: 8,
          }}
        >
          {count}
        </span>
      )}
    </div>
  );
}

function MiniColumn({ label, count, children }: { label: string; count?: number; children: React.ReactNode }) {
  return (
    <div
      style={{
        width: 280,
        flexShrink: 0,
        background: tk.surfaceBg,
        border: `1px solid ${tk.borderSubtle}`,
        borderRadius: 6,
        padding: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <ColumnLabel name={label} count={count} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>
    </div>
  );
}

/* ─── Card variant gallery — every WorkItemCard state side-by-side ─── */

export const CardVariantsGallery: StoryObj = {
  name: 'WorkItemCard / Variants gallery',
  render: () => {
    const cellFor = (issue: BoardIssue) => (
      <WorkItemCard
        key={issue.id}
        issue={issue}
        {...COMMON_CARD_PROPS}
        onOpenDetail={fn()}
        onToggleFlag={fn()}
        onCopyLink={fn()}
        onCopyKey={fn()}
        onChangeStatus={fn()}
        onSaveSummary={fn()}
        onChangeAssignee={fn()}
        onLabelsUpdated={fn()}
        onParentChange={fn()}
        onArchive={fn()}
        onDelete={fn()}
        onMoved={fn()}
        onLinked={fn()}
      />
    );

    const groups: { label: string; issues: BoardIssue[] }[] = [
      { label: 'DEFAULT',      issues: [BAU_CARD_VARIANTS_BY_ID.get('v-default')!] },
      { label: 'FLAGGED',      issues: [BAU_CARD_VARIANTS_BY_ID.get('v-flagged')!] },
      { label: 'WITH PARENT',  issues: [BAU_CARD_VARIANTS_BY_ID.get('v-parent')!] },
      { label: 'WITH LABELS',  issues: [BAU_CARD_VARIANTS_BY_ID.get('v-labels')!] },
      { label: 'STORY POINTS', issues: [BAU_CARD_VARIANTS_BY_ID.get('v-storypoints')!] },
      { label: 'QA BUG',       issues: [BAU_CARD_VARIANTS_BY_ID.get('v-bug')!] },
      { label: 'EPIC',         issues: [BAU_CARD_VARIANTS_BY_ID.get('v-epic')!] },
      { label: 'TASK',         issues: [BAU_CARD_VARIANTS_BY_ID.get('v-task')!] },
    ];

    return (
      <BoardCanvas>
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 12 }}>
          {groups.map((g) => (
            <MiniColumn key={g.label} label={g.label} count={g.issues.length}>
              {g.issues.map(cellFor)}
            </MiniColumn>
          ))}
        </div>
      </BoardCanvas>
    );
  },
};

/* ─── Card density gallery — same card at each density preset ─── */

export const CardDensityGallery: StoryObj = {
  name: 'WorkItemCard / Density gallery',
  render: () => {
    const issue = BAU_CARD_VARIANTS_BY_ID.get('v-parent')!;
    const densities: { label: string; key: 'compact' | 'dense' | 'comfortable' }[] = [
      { label: 'COMPACT',     key: 'compact' },
      { label: 'DENSE',       key: 'dense' },
      { label: 'COMFORTABLE', key: 'comfortable' },
    ];
    return (
      <BoardCanvas>
        <div style={{ display: 'flex', gap: 12 }}>
          {densities.map((dn) => (
            <MiniColumn key={dn.key} label={dn.label}>
              <WorkItemCard
                issue={issue}
                {...COMMON_CARD_PROPS}
                d={DENSITY_CONFIG[dn.key]}
                onOpenDetail={fn()}
              />
            </MiniColumn>
          ))}
        </div>
      </BoardCanvas>
    );
  },
};

/* ─── Cards inside columns — same data as the BAU board ─── */

export const CardsInsideColumns: StoryObj = {
  name: 'WorkItemCard / Inside BAU columns',
  render: () => {
    const issuesGroupedByCol = BAU_BOARD_COLUMNS.map((col) => ({
      col,
      issues: BAU_BOARD_COL_MAP[col.id]
        .map((id) => BAU_BOARD_ISSUES_BY_ID.get(id))
        .filter((x): x is BoardIssue => !!x),
    }));
    return (
      <BoardCanvas>
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 12 }}>
          {issuesGroupedByCol.map(({ col, issues }) => (
            <MiniColumn key={col.id} label={col.name} count={issues.length}>
              {issues.map((issue) => (
                <WorkItemCard
                  key={issue.id}
                  issue={issue}
                  {...COMMON_CARD_PROPS}
                  onOpenDetail={fn()}
                  onChangeAssignee={fn()}
                />
              ))}
              {issues.length === 0 && (
                <div
                  style={{
                    padding: '24px 12px',
                    textAlign: 'center',
                    color: tk.textMuted,
                    fontSize: 'var(--ds-font-size-200)',
                  }}
                >
                  No items
                </div>
              )}
            </MiniColumn>
          ))}
        </div>
      </BoardCanvas>
    );
  },
};

/* ─── DroppableColumn — interactive, with state-backed assignee + create ─── */

function InteractiveDroppableColumns() {
  const [issuesById, setIssuesById] = useState<Map<string, BoardIssue>>(() => new Map(BAU_BOARD_ISSUES_BY_ID));
  const [colMap, setColMap] = useState<Record<string, string[]>>(() => ({ ...BAU_BOARD_COL_MAP }));

  const onChangeAssignee = useCallback((issueId: string, newAssignee: string | null) => {
    setIssuesById((prev) => {
      const issue = prev.get(issueId);
      if (!issue) return prev;
      const next = new Map(prev);
      next.set(issueId, { ...issue, assigneeName: newAssignee });
      return next;
    });
  }, []);

  const onChangeStatus = useCallback((issueId: string, newStatus: string) => {
    setIssuesById((prev) => {
      const issue = prev.get(issueId);
      if (!issue) return prev;
      const next = new Map(prev);
      next.set(issueId, { ...issue, status: newStatus });
      return next;
    });
    setColMap((prev) => {
      const next: Record<string, string[]> = {};
      for (const c of BAU_BOARD_COLUMNS) next[c.id] = [];
      for (const [k, ids] of Object.entries(prev)) next[k] = ids.filter((x) => x !== issueId);
      const destCol = BAU_BOARD_COLUMNS.find((c) => c.statuses.includes(newStatus));
      if (destCol) next[destCol.id] = [issueId, ...next[destCol.id]];
      return next;
    });
  }, []);

  return (
    <BoardCanvas>
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto' }}>
        {BAU_BOARD_COLUMNS.map((col, idx) => (
          <div key={col.id} style={{ width: 280, flexShrink: 0, height: 600 }}>
            <DroppableColumn
              column={col}
              issueIds={colMap[col.id] ?? []}
              issuesById={issuesById}
              avatarsByName={BAU_AVATARS_BY_NAME}
              onCardClick={fn()}
              isFirst={idx === 0}
              d={d}
              tk={tk}
              projectKey="BAU"
              assigneeOptions={ASSIGNEE_OPTIONS}
              boardColumns={BAU_BOARD_COLUMNS}
              onChangeAssignee={onChangeAssignee}
              onChangeStatus={onChangeStatus}
              onToggleFlag={fn()}
              onCopyLink={fn()}
              onCopyKey={fn()}
              onSaveSummary={fn()}
              onLabelsUpdated={fn()}
              onParentChange={fn()}
              onArchive={fn()}
              onDelete={fn()}
              onMoved={fn()}
              onLinked={fn()}
            />
          </div>
        ))}
      </div>
    </BoardCanvas>
  );
}

export const ColumnsInteractive: StoryObj = {
  name: 'DroppableColumn / All BAU columns',
  render: () => <InteractiveDroppableColumns />,
};

export const ColumnEmpty: StoryObj = {
  name: 'DroppableColumn / Empty',
  render: () => (
    <BoardCanvas>
      <div style={{ width: 280, height: 400 }}>
        <DroppableColumn
          column={BAU_BOARD_COLUMNS[0]}
          issueIds={[]}
          issuesById={new Map()}
          avatarsByName={new Map()}
          onCardClick={fn()}
          isFirst={true}
          d={d}
          tk={tk}
          projectKey="BAU"
        />
      </div>
    </BoardCanvas>
  ),
};
