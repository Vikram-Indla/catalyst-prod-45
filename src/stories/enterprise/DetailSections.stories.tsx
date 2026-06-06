/**
 * Enterprise/Detail Views/Sections — auto-generated Storybook coverage
 */
import React from 'react';
import type { StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fn } from '@storybook/test';

import { CatalystAcceptanceCriteria } from '@/components/catalyst-detail-views/shared/sections/CatalystAcceptanceCriteria';
import { CatalystAttachmentsPanel } from '@/components/catalyst-detail-views/shared/sections/CatalystAttachmentsPanel';
import { CatalystConfigureDrawer } from '@/components/catalyst-detail-views/shared/sections/CatalystConfigureDrawer';
import { CatalystParentLinker } from '@/components/catalyst-detail-views/shared/sections/CatalystParentLinker';
import { CatalystPriorityField } from '@/components/catalyst-detail-views/shared/sections/CatalystPriorityField';
import { CatalystQuickActions } from '@/components/catalyst-detail-views/shared/sections/CatalystQuickActions';
import { CatalystSeverityField } from '@/components/catalyst-detail-views/shared/sections/CatalystSeverityField';
import { CatalystTitleEditor } from '@/components/catalyst-detail-views/shared/sections/CatalystTitleEditor';
import { WorkflowViewerModal } from '@/components/catalyst-detail-views/shared/sections/WorkflowViewerModal';

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
function Wrap({ children }: { children: React.ReactNode }) {
  return (<QueryClientProvider client={qc}><MemoryRouter><div style={{ maxWidth: 900, padding: 16 }}>{children}</QueryClientProvider></MemoryRouter></div>);
}

export default { title: 'Enterprise/Detail Views/Sections' };

export const CatalystAcceptanceCriteriaDefault: StoryObj = {
  name: 'CatalystAcceptanceCriteria / Default',
  render: () => <Wrap><CatalystAcceptanceCriteria issue=null /></Wrap>,
}

export const CatalystAttachmentsPanelDefault: StoryObj = {
  name: 'CatalystAttachmentsPanel / Default',
  render: () => <Wrap><CatalystAttachmentsPanel issueId=null isOpen=true /></Wrap>,
}

export const CatalystAttachmentsPanelOpen: StoryObj = {
  name: 'CatalystAttachmentsPanel / Open',
  render: () => <Wrap><CatalystAttachmentsPanel issueId=null isOpen=true /></Wrap>,
}

export const CatalystConfigureDrawerDefault: StoryObj = {
  name: 'CatalystConfigureDrawer / Default',
  render: () => <Wrap><CatalystConfigureDrawer isOpen=true onClose={fn()} issueType="test-value" pinnedFields=[] onPinnedFieldsChange={fn()} /></Wrap>,
}

export const CatalystConfigureDrawerOpen: StoryObj = {
  name: 'CatalystConfigureDrawer / Open',
  render: () => <Wrap><CatalystConfigureDrawer isOpen=true onClose={fn()} issueType="test-value" pinnedFields=[] onPinnedFieldsChange={fn()} /></Wrap>,
}

export const CatalystParentLinkerDefault: StoryObj = {
  name: 'CatalystParentLinker / Default',
  render: () => <Wrap><CatalystParentLinker issue=null itemId="item-1" itemType={{{}}} /></Wrap>,
}

export const CatalystPriorityFieldDefault: StoryObj = {
  name: 'CatalystPriorityField / Default',
  render: () => <Wrap><CatalystPriorityField issue=null /></Wrap>,
}

export const CatalystQuickActionsDefault: StoryObj = {
  name: 'CatalystQuickActions / Default',
  render: () => <Wrap><CatalystQuickActions  /></Wrap>,
}

export const CatalystSeverityFieldDefault: StoryObj = {
  name: 'CatalystSeverityField / Default',
  render: () => <Wrap><CatalystSeverityField issue=null /></Wrap>,
}

export const CatalystTitleEditorDefault: StoryObj = {
  name: 'CatalystTitleEditor / Default',
  render: () => <Wrap><CatalystTitleEditor issue=null onTitleChange={fn()} /></Wrap>,
}

export const WorkflowViewerModalDefault: StoryObj = {
  name: 'WorkflowViewerModal / Default',
  render: () => <Wrap><WorkflowViewerModal isOpen=true onClose={fn()} /></Wrap>,
}

export const WorkflowViewerModalOpen: StoryObj = {
  name: 'WorkflowViewerModal / Open',
  render: () => <Wrap><WorkflowViewerModal isOpen=true onClose={fn()} /></Wrap>,
}
