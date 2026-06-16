/**
 * Pages/Tasks/Board Components — realistic mocks matching app usage
 */
import React from 'react';
import type { StoryObj } from '@storybook/react';
import { DndContext } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { fn } from 'storybook/test';

import { AddColumnModal } from '@/modules/tasks/components/boards/AddColumnModal';
import { BoardColumn } from '@/modules/tasks/components/boards/BoardColumn';
import { ColumnActions } from '@/modules/tasks/components/boards/ColumnActions';
import { ColumnHeader } from '@/modules/tasks/components/boards/ColumnHeader';
import { SortableColumn } from '@/modules/tasks/components/boards/SortableColumn';

import { MOCK_BOARD_COLUMNS, MOCK_BOARD_TASKS } from '@/stories/fixtures/planner';

function Wrap({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return <div style={{ maxWidth: wide ? 1200 : 900, padding: 16 }}>{children}</div>;
}

function DndWrap({ children, items }: { children: React.ReactNode; items: string[] }) {
  return (
    <DndContext>
      <SortableContext items={items} strategy={horizontalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

export default { title: 'Pages/Tasks/Board Components' };

export const BoardColumnDefault: StoryObj = {
  name: 'BoardColumn / Default',
  render: () => {
    const column = MOCK_BOARD_COLUMNS[2];
    const tasks = MOCK_BOARD_TASKS.filter((t) => t.status_id === column.id);
    return (
      <Wrap wide>
        <DndWrap items={[column.id]}>
          <div style={{ width: 320 }}>
            <BoardColumn column={column} tasks={tasks} onTaskClick={fn()} onAddTask={fn()} />
          </div>
        </DndWrap>
      </Wrap>
    );
  },
};

export const ColumnHeaderDefault: StoryObj = {
  name: 'ColumnHeader / Default',
  render: () => (
    <Wrap>
      <div style={{ display: 'grid', gap: 12, maxWidth: 360 }}>
        {MOCK_BOARD_COLUMNS.slice(0, 3).map((col) => (
          <ColumnHeader key={col.id} column={col} onAddTask={fn()} />
        ))}
      </div>
    </Wrap>
  ),
};

export const ColumnActionsDefault: StoryObj = {
  name: 'ColumnActions / Default',
  render: () => (
    <Wrap>
      <ColumnActions column={MOCK_BOARD_COLUMNS[2]} />
    </Wrap>
  ),
};

export const SortableColumnDefault: StoryObj = {
  name: 'SortableColumn / Default',
  render: () => {
    const column = MOCK_BOARD_COLUMNS[1];
    const tasks = MOCK_BOARD_TASKS.filter((t) => t.status_id === column.id);
    return (
      <Wrap wide>
        <DndWrap items={MOCK_BOARD_COLUMNS.map((c) => c.id)}>
          <div style={{ width: 320 }}>
            <SortableColumn column={column} tasks={tasks} onTaskClick={fn()} onAddTask={fn()} />
          </div>
        </DndWrap>
      </Wrap>
    );
  },
};

export const AddColumnModalDefault: StoryObj = {
  name: 'AddColumnModal / Open',
  render: () => (
    <Wrap>
      <AddColumnModal open={true} onOpenChange={fn()} />
    </Wrap>
  ),
};
