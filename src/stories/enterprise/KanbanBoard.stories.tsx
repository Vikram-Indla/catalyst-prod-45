import React, { useState, useCallback } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';
import { PragmaticBoard } from '@/components/kanban/PragmaticBoard';
import { DENSITY_CONFIG, KANBAN_TOKENS } from '@/components/kanban/kanban-tokens';
import type { BoardIssue } from '@/components/kanban/kanban-types';
import type { AssigneeOption } from '@/components/kanban/AssigneePickerPopover';
import {
  BAU_BOARD_COLUMNS,
  BAU_BOARD_COL_MAP,
  BAU_BOARD_ISSUES_BY_ID,
  BAU_AVATARS_BY_NAME,
} from '@/stories/fixtures/projectBoard';

const ASSIGNEE_OPTIONS: AssigneeOption[] = [
  { name: 'Vikram Indla',  email: 'vikram@example.com',  avatarUrl: null },
  { name: 'Nada Alfassam', email: 'nada@example.com',    avatarUrl: null },
  { name: 'Ahmed Yousry',  email: 'ahmed@example.com',   avatarUrl: null },
  { name: 'Andrew Fayyaz', email: 'andrew@example.com',  avatarUrl: null },
  { name: 'Yazeed Daraz',  email: 'yazeed@example.com',  avatarUrl: null },
];

const meta: Meta = {
  title: 'Enterprise Components/Kanban Board',
  parameters: { layout: 'fullscreen' },
};
export default meta;

function InteractiveBoard() {
  // State-backed column map so drag-and-drop visibly moves cards
  const [colMap, setColMap] = useState<Record<string, string[]>>(() => ({ ...BAU_BOARD_COL_MAP }));
  const [issuesById, setIssuesById] = useState<Map<string, BoardIssue>>(() => new Map(BAU_BOARD_ISSUES_BY_ID));

  const handleDrop = useCallback(
    (sourceCardId: string, sourceColId: string, destColId: string, insertIndex: number) => {
      setColMap((prev) => {
        const next: Record<string, string[]> = { ...prev };
        // Remove from source
        next[sourceColId] = (next[sourceColId] ?? []).filter((id) => id !== sourceCardId);
        // Insert into dest
        const dest = [...(next[destColId] ?? [])];
        dest.splice(insertIndex, 0, sourceCardId);
        next[destColId] = dest;
        return next;
      });
      // Reflect the status change on the issue itself
      setIssuesById((prev) => {
        const issue = prev.get(sourceCardId);
        const destCol = BAU_BOARD_COLUMNS.find((c) => c.id === destColId);
        if (!issue || !destCol) return prev;
        const newMap = new Map(prev);
        newMap.set(sourceCardId, { ...issue, status: destCol.statuses[0] });
        return newMap;
      });
    },
    []
  );

  const handleChangeAssignee = useCallback((issueId: string, newAssignee: string | null) => {
    setIssuesById((prev) => {
      const issue = prev.get(issueId);
      if (!issue) return prev;
      const next = new Map(prev);
      next.set(issueId, { ...issue, assigneeName: newAssignee });
      return next;
    });
  }, []);

  const handleChangeStatus = useCallback((issueId: string, newStatus: string) => {
    setIssuesById((prev) => {
      const issue = prev.get(issueId);
      if (!issue) return prev;
      const newMap = new Map(prev);
      newMap.set(issueId, { ...issue, status: newStatus });
      return newMap;
    });
    setColMap((prev) => {
      const next: Record<string, string[]> = {};
      for (const col of BAU_BOARD_COLUMNS) next[col.id] = [];
      for (const [id, ids] of Object.entries(prev)) next[id] = ids.filter((x) => x !== issueId);
      const destCol = BAU_BOARD_COLUMNS.find((c) => c.statuses.includes(newStatus));
      if (destCol) next[destCol.id] = [issueId, ...next[destCol.id]];
      return next;
    });
  }, []);

  const handleCreateInColumn = useCallback((colId: string) => {
    const col = BAU_BOARD_COLUMNS.find((c) => c.id === colId);
    const summary = window.prompt(`New issue summary for ${col?.name ?? colId}`);
    if (!summary) return;
    const id = `i-new-${Math.random().toString(36).slice(2, 8)}`;
    const newIssue: BoardIssue = {
      id,
      issueKey: `BAU-${9000 + Math.floor(Math.random() * 999)}`,
      summary,
      issueType: 'Story',
      priority: 'medium',
      status: col?.statuses[0] ?? 'Backlog',
      statusCategory: col?.category ?? 'todo',
      assigneeName: 'Vikram Indla',
      labels: [],
      sprintName: null,
      storyPoints: null,
      parentKey: null,
      parentSummary: null,
      fixVersion: null,
      isFlagged: false,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    setIssuesById((prev) => new Map(prev).set(id, newIssue));
    setColMap((prev) => ({ ...prev, [colId]: [...(prev[colId] ?? []), id] }));
  }, []);

  return (
    <div style={{ height: '100vh', width: '100%', background: KANBAN_TOKENS.light.pageBg, padding: 16, overflow: 'auto' }}>
      <PragmaticBoard
        columns={BAU_BOARD_COLUMNS}
        colMap={colMap}
        issuesById={issuesById}
        avatarsByName={BAU_AVATARS_BY_NAME}
        onCardClick={fn()}
        onDrop={handleDrop}
        d={DENSITY_CONFIG.comfortable}
        tk={KANBAN_TOKENS.light}
        projectKey="BAU"
        onChangeStatus={handleChangeStatus}
        onCreateInColumn={handleCreateInColumn}
        onCreateCard={fn()}
        onToggleFlag={fn()}
        onCopyLink={fn()}
        onCopyKey={fn()}
        onSaveSummary={fn()}
        onChangeAssignee={handleChangeAssignee}
        assigneeOptions={ASSIGNEE_OPTIONS}
        onLabelsUpdated={fn()}
        onParentChange={fn()}
        onArchive={fn()}
        onDelete={fn()}
        onMoved={fn()}
        onLinked={fn()}
      />
    </div>
  );
}

export const BAUBoard: StoryObj = {
  name: 'BAU Project Board',
  render: () => <InteractiveBoard />,
};

export const Empty: StoryObj = {
  name: 'BAU Project Board / Empty',
  render: () => (
    <div style={{ height: '100vh', width: '100%', background: KANBAN_TOKENS.light.pageBg, padding: 16, overflow: 'auto' }}>
      <PragmaticBoard
        columns={BAU_BOARD_COLUMNS}
        colMap={Object.fromEntries(BAU_BOARD_COLUMNS.map((c) => [c.id, []]))}
        issuesById={new Map()}
        avatarsByName={new Map()}
        onCardClick={fn()}
        d={DENSITY_CONFIG.comfortable}
        tk={KANBAN_TOKENS.light}
        projectKey="BAU"
        onCreateInColumn={fn()}
      />
    </div>
  ),
};

export const Loading: StoryObj = {
  name: 'BAU Project Board / Loading',
  render: () => (
    <div style={{ height: '100vh', width: '100%', background: KANBAN_TOKENS.light.pageBg, padding: 16, overflow: 'auto' }}>
      <PragmaticBoard
        columns={BAU_BOARD_COLUMNS}
        colMap={Object.fromEntries(BAU_BOARD_COLUMNS.map((c) => [c.id, []]))}
        issuesById={new Map()}
        avatarsByName={new Map()}
        onCardClick={fn()}
        d={DENSITY_CONFIG.comfortable}
        tk={KANBAN_TOKENS.light}
        projectKey="BAU"
        isLoading={true}
      />
    </div>
  ),
};
