/**
 * Pages/Tasks/Workstreams — auto-generated Storybook coverage
 */
import React from 'react';
import type { StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fn } from '@storybook/test';

import { ArchivedWorkstreamsView } from '@/modules/tasks/components/workstreams/ArchivedWorkstreamsView';
import { CreateWorkstreamModal } from '@/modules/tasks/components/workstreams/CreateWorkstreamModal';
import { LeadPicker } from '@/modules/tasks/components/workstreams/LeadPicker';
import { WorkstreamDrawer } from '@/modules/tasks/components/workstreams/WorkstreamDrawer';
import { WorkstreamLeadPickerDropdown } from '@/modules/tasks/components/workstreams/WorkstreamLeadPickerDropdown';
import { WorkstreamMembersDialog } from '@/modules/tasks/components/workstreams/WorkstreamMembersDialog';
import { WorkstreamQuickEditDialog } from '@/modules/tasks/components/workstreams/WorkstreamQuickEditDialog';
import { WorkstreamRowView } from '@/modules/tasks/components/workstreams/WorkstreamRowView';
import { WorkstreamSummaryCard } from '@/modules/tasks/components/workstreams/WorkstreamSummaryCard';
import { WorkstreamTableHeader } from '@/modules/tasks/components/workstreams/WorkstreamTableHeader';
import { WorkstreamViewToggle } from '@/modules/tasks/components/workstreams/WorkstreamViewToggle';

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
function Wrap({ children }: { children: React.ReactNode }) {
  return (<QueryClientProvider client={qc}><MemoryRouter><div style={{ maxWidth: 900, padding: 16 }}>{children}</QueryClientProvider></MemoryRouter></div>);
}

export default { title: 'Pages/Tasks/Workstreams' };

export const ArchivedWorkstreamsViewDefault: StoryObj = {
  name: 'ArchivedWorkstreamsView / Default',
  render: () => <Wrap><ArchivedWorkstreamsView workstreams=[] isLoading=false onBack={fn()} /></Wrap>,
}

export const ArchivedWorkstreamsViewLoading: StoryObj = {
  name: 'ArchivedWorkstreamsView / Loading',
  render: () => <Wrap><ArchivedWorkstreamsView workstreams=[] isLoading=false onBack={fn()} /></Wrap>,
}

export const CreateWorkstreamModalDefault: StoryObj = {
  name: 'CreateWorkstreamModal / Default',
  render: () => <Wrap><CreateWorkstreamModal isOpen=true onClose={fn()} /></Wrap>,
}

export const CreateWorkstreamModalOpen: StoryObj = {
  name: 'CreateWorkstreamModal / Open',
  render: () => <Wrap><CreateWorkstreamModal isOpen=true onClose={fn()} /></Wrap>,
}

export const LeadPickerDefault: StoryObj = {
  name: 'LeadPicker / Default',
  render: () => <Wrap><LeadPicker value=null /></Wrap>,
}

export const WorkstreamDrawerDefault: StoryObj = {
  name: 'WorkstreamDrawer / Default',
  render: () => <Wrap><WorkstreamDrawer workstream=null isOpen=true onClose={fn()} /></Wrap>,
}

export const WorkstreamDrawerOpen: StoryObj = {
  name: 'WorkstreamDrawer / Open',
  render: () => <Wrap><WorkstreamDrawer workstream=null isOpen=true onClose={fn()} /></Wrap>,
}

export const WorkstreamLeadPickerDropdownDefault: StoryObj = {
  name: 'WorkstreamLeadPickerDropdown / Default',
  render: () => <Wrap><WorkstreamLeadPickerDropdown  /></Wrap>,
}

export const WorkstreamMembersDialogDefault: StoryObj = {
  name: 'WorkstreamMembersDialog / Default',
  render: () => <Wrap><WorkstreamMembersDialog open=true onOpenChange={fn()} workstream=null /></Wrap>,
}

export const WorkstreamMembersDialogOpen: StoryObj = {
  name: 'WorkstreamMembersDialog / Open',
  render: () => <Wrap><WorkstreamMembersDialog open=true onOpenChange={fn()} workstream=null open={true} /></Wrap>,
}

export const WorkstreamQuickEditDialogDefault: StoryObj = {
  name: 'WorkstreamQuickEditDialog / Default',
  render: () => <Wrap><WorkstreamQuickEditDialog  /></Wrap>,
}

export const WorkstreamRowViewDefault: StoryObj = {
  name: 'WorkstreamRowView / Default',
  render: () => <Wrap><WorkstreamRowView  /></Wrap>,
}

export const WorkstreamSummaryCardDefault: StoryObj = {
  name: 'WorkstreamSummaryCard / Default',
  render: () => <Wrap><WorkstreamSummaryCard  /></Wrap>,
}

export const WorkstreamTableHeaderDefault: StoryObj = {
  name: 'WorkstreamTableHeader / Default',
  render: () => <Wrap><WorkstreamTableHeader  /></Wrap>,
}

export const WorkstreamViewToggleDefault: StoryObj = {
  name: 'WorkstreamViewToggle / Default',
  render: () => <Wrap><WorkstreamViewToggle  /></Wrap>,
}
