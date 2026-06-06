/**
 * Pages/Tasks/Drawer Sections — auto-generated Storybook coverage
 */
import React from 'react';
import type { StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fn } from '@storybook/test';

import { ActivitySection } from '@/modules/tasks/components/TaskDetailDrawer/ActivitySection';
import { AttachmentsSection } from '@/modules/tasks/components/TaskDetailDrawer/AttachmentsSection';
import { ChecklistSection } from '@/modules/tasks/components/TaskDetailDrawer/ChecklistSection';
import { CollapsibleSection } from '@/modules/tasks/components/TaskDetailDrawer/CollapsibleSection';
import { DrawerFooter } from '@/modules/tasks/components/TaskDetailDrawer/DrawerFooter';
import { InlineEditable } from '@/modules/tasks/components/TaskDetailDrawer/InlineEditable';
import { LeadNotesTab } from '@/modules/tasks/components/TaskDetailDrawer/LeadNotesTab';
import { QuickActions } from '@/modules/tasks/components/TaskDetailDrawer/QuickActions';
import { SavingIndicator } from '@/modules/tasks/components/TaskDetailDrawer/SavingIndicator';
import { SectionHeader } from '@/modules/tasks/components/TaskDetailDrawer/SectionHeader';
import { StatusDropdown } from '@/modules/tasks/components/TaskDetailDrawer/StatusDropdown';
import { TaskDescription } from '@/modules/tasks/components/TaskDetailDrawer/TaskDescription';

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
function Wrap({ children }: { children: React.ReactNode }) {
  return (<QueryClientProvider client={qc}><MemoryRouter><div style={{ maxWidth: 900, padding: 16 }}>{children}</MemoryRouter></QueryClientProvider></div>);
}

export default { title: 'Pages/Tasks/Drawer Sections' };

export const ActivitySectionDefault: StoryObj = {
  name: 'ActivitySection / Default',
  render: () => <Wrap><ActivitySection taskId="item-1" comments=[] activity=[] /></Wrap>,
}

export const AttachmentsSectionDefault: StoryObj = {
  name: 'AttachmentsSection / Default',
  render: () => <Wrap><AttachmentsSection taskId="item-1" attachments=[] /></Wrap>,
}

export const ChecklistSectionDefault: StoryObj = {
  name: 'ChecklistSection / Default',
  render: () => <Wrap><ChecklistSection taskId="item-1" items=[] /></Wrap>,
}

export const CollapsibleSectionDefault: StoryObj = {
  name: 'CollapsibleSection / Default',
  render: () => <Wrap><CollapsibleSection title="Sample item title" count=5 icon={{<span>Content</span>}} /></Wrap>,
}

export const DrawerFooterDefault: StoryObj = {
  name: 'DrawerFooter / Default',
  render: () => <Wrap><DrawerFooter task={{{}}} onDelete={fn()} onDuplicate={fn()} /></Wrap>,
}

export const InlineEditableDefault: StoryObj = {
  name: 'InlineEditable / Default',
  render: () => <Wrap><InlineEditable value="test-value" onChange={fn()} /></Wrap>,
}

export const LeadNotesTabDefault: StoryObj = {
  name: 'LeadNotesTab / Default',
  render: () => <Wrap><LeadNotesTab taskId="item-1" workstreamId="test-value" /></Wrap>,
}

export const QuickActionsDefault: StoryObj = {
  name: 'QuickActions / Default',
  render: () => <Wrap><QuickActions taskId="item-1" taskKey="BAU-5972" /></Wrap>,
}

export const SavingIndicatorDefault: StoryObj = {
  name: 'SavingIndicator / Default',
  render: () => <Wrap><SavingIndicator status={{{}}} /></Wrap>,
}

export const SectionHeaderDefault: StoryObj = {
  name: 'SectionHeader / Default',
  render: () => <Wrap><SectionHeader icon={{{}}} title="Sample item title" /></Wrap>,
}

export const StatusDropdownDefault: StoryObj = {
  name: 'StatusDropdown / Default',
  render: () => <Wrap><StatusDropdown currentStatusId="item-1" currentStatus={{{}}} onChange={fn()} /></Wrap>,
}

export const TaskDescriptionDefault: StoryObj = {
  name: 'TaskDescription / Default',
  render: () => <Wrap><TaskDescription taskId="item-1" /></Wrap>,
}
