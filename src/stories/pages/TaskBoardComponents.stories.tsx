/**
 * Pages/Tasks/Board Components — auto-generated Storybook coverage
 */
import React from 'react';
import type { StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fn } from '@storybook/test';

import { AddColumnModal } from '@/modules/tasks/components/boards/AddColumnModal';
import { BoardColumn } from '@/modules/tasks/components/boards/BoardColumn';
import { ColumnActions } from '@/modules/tasks/components/boards/ColumnActions';
import { ColumnHeader } from '@/modules/tasks/components/boards/ColumnHeader';
import { SortableColumn } from '@/modules/tasks/components/boards/SortableColumn';

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
function Wrap({ children }: { children: React.ReactNode }) {
  return (<QueryClientProvider client={qc}><MemoryRouter><div style={{ maxWidth: 900, padding: 16 }}>{children}</MemoryRouter></QueryClientProvider></div>);
}

export default { title: 'Pages/Tasks/Board Components' };

export const AddColumnModalDefault: StoryObj = {
  name: 'AddColumnModal / Default',
  render: () => <Wrap><AddColumnModal open=true onOpenChange={fn()} /></Wrap>,
}

export const AddColumnModalOpen: StoryObj = {
  name: 'AddColumnModal / Open',
  render: () => <Wrap><AddColumnModal open=true onOpenChange={fn()} open={true} /></Wrap>,
}

export const BoardColumnDefault: StoryObj = {
  name: 'BoardColumn / Default',
  render: () => <Wrap><BoardColumn column={{{}}} tasks=[] /></Wrap>,
}

export const ColumnActionsDefault: StoryObj = {
  name: 'ColumnActions / Default',
  render: () => <Wrap><ColumnActions column={{{}}} /></Wrap>,
}

export const ColumnHeaderDefault: StoryObj = {
  name: 'ColumnHeader / Default',
  render: () => <Wrap><ColumnHeader column={{{}}} /></Wrap>,
}

export const SortableColumnDefault: StoryObj = {
  name: 'SortableColumn / Default',
  render: () => <Wrap><SortableColumn column={{{}}} tasks=[] /></Wrap>,
}
