/**
 * Enterprise/Business Request/Sections — auto-generated Storybook coverage
 */
import React from 'react';
import type { StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fn } from 'storybook/test';

import { AutoSaveIndicator } from '@/components/business-requests/create-form/AutoSaveIndicator';
import { BRStatusEducationalPopover } from '@/components/business-requests/BRStatusEducationalPopover';
import { BrAttachmentsSection } from '@/components/catalyst-detail-views/business-request/sections/BrAttachmentsSection';
import { BrMoveProductDialog } from '@/components/catalyst-detail-views/business-request/BrMoveProductDialog';
import { DepartmentSelect } from '@/components/business-requests/DepartmentSelect';
import { FormField } from '@/components/business-requests/create-form/FormField';

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
function Wrap({ children }: { children: React.ReactNode }) {
  return (<QueryClientProvider client={qc}><div style={{ maxWidth: 900, padding: 16 }}>{children}</div></QueryClientProvider>);
}

export default { title: 'Enterprise/Business Request/Sections' };

export const BrAttachmentsSectionDefault: StoryObj = {
  name: 'BrAttachmentsSection / Default',
  render: () => <Wrap><BrAttachmentsSection request={null} /></Wrap>,
}

export const BrMoveProductDialogDefault: StoryObj = {
  name: 'BrMoveProductDialog / Default',
  render: () => <Wrap><BrMoveProductDialog isOpen={true} onClose={fn()} onUpdate={fn()} /></Wrap>,
}

export const BrMoveProductDialogOpen: StoryObj = {
  name: 'BrMoveProductDialog / Open',
  render: () => <Wrap><BrMoveProductDialog isOpen={true} onClose={fn()} onUpdate={fn()} /></Wrap>,
}

export const BRStatusEducationalPopoverDefault: StoryObj = {
  name: 'BRStatusEducationalPopover / Default',
  render: () => <Wrap><BRStatusEducationalPopover status={{} as any} /></Wrap>,
}

export const DepartmentSelectDefault: StoryObj = {
  name: 'DepartmentSelect / Default',
  render: () => <Wrap><DepartmentSelect value="test-value" onChange={fn()} /></Wrap>,
}

export const AutoSaveIndicatorDefault: StoryObj = {
  name: 'AutoSaveIndicator / Default',
  render: () => <Wrap><AutoSaveIndicator status={{} as any} /></Wrap>,
}

export const FormFieldDefault: StoryObj = {
  name: 'FormField / Default',
  render: () => <Wrap><FormField label="Sample item title" current={42} max={42} /></Wrap>,
}
