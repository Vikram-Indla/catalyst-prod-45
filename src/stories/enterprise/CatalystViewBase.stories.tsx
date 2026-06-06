/**
 * Enterprise/CatalystViewBase — auto-generated Storybook coverage
 */
import React from 'react';
import type { StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fn } from '@storybook/test';

import CatalystDetailRouter from '@/components/catalyst-detail-views/CatalystDetailRouter';
import CatalystViewBusinessRequest.v3 from '@/components/catalyst-detail-views/business-request/CatalystViewBusinessRequest.v3';
import { BrSidebarAdapter } from '@/components/catalyst-detail-views/business-request/sections/BrSidebarAdapter';
import { CatalystAssessmentFeatureField } from '@/components/catalyst-detail-views/shared/sections/CatalystAssessmentFeatureField';
import { CatalystMdtRefField } from '@/components/catalyst-detail-views/shared/sections/CatalystMdtRefField';
import { CatalystViewBase } from '@/components/catalyst-detail-views/shared/CatalystViewBase';
import { KeyboardShortcuts } from '@/components/business-requests/create-form/KeyboardShortcuts';
import { RichTextEditor } from '@/components/business-requests/RichTextEditor';

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
function Wrap({ children }: { children: React.ReactNode }) {
  return (<QueryClientProvider client={qc}><MemoryRouter><div style={{ maxWidth: 900, padding: 16 }}>{children}</QueryClientProvider></MemoryRouter></div>);
}

export default { title: 'Enterprise/CatalystViewBase' };

export const CatalystViewBaseDefault: StoryObj = {
  name: 'CatalystViewBase / Default',
  render: () => <Wrap><CatalystViewBase isOpen=true onClose={fn()} itemType="test-value" itemKey="test-value" /></Wrap>,
}

export const CatalystViewBaseOpen: StoryObj = {
  name: 'CatalystViewBase / Open',
  render: () => <Wrap><CatalystViewBase isOpen=true onClose={fn()} itemType="test-value" itemKey="test-value" /></Wrap>,
}

export const CatalystDetailRouterDefault: StoryObj = {
  name: 'CatalystDetailRouter / Default',
  render: () => <Wrap><CatalystDetailRouter  /></Wrap>,
}

export const CatalystAssessmentFeatureFieldDefault: StoryObj = {
  name: 'CatalystAssessmentFeatureField / Default',
  render: () => <Wrap><CatalystAssessmentFeatureField issue=null /></Wrap>,
}

export const CatalystMdtRefFieldDefault: StoryObj = {
  name: 'CatalystMdtRefField / Default',
  render: () => <Wrap><CatalystMdtRefField issue=null /></Wrap>,
}

export const BrSidebarAdapterDefault: StoryObj = {
  name: 'BrSidebarAdapter / Default',
  render: () => <Wrap><BrSidebarAdapter  /></Wrap>,
}

export const CatalystViewBusinessRequest.v3Default: StoryObj = {
  name: 'CatalystViewBusinessRequest.v3 / Default',
  render: () => <Wrap><CatalystViewBusinessRequest.v3  /></Wrap>,
}

export const RichTextEditorDefault: StoryObj = {
  name: 'RichTextEditor / Default',
  render: () => <Wrap><RichTextEditor value="test-value" onChange={fn()} /></Wrap>,
}

export const KeyboardShortcutsDefault: StoryObj = {
  name: 'KeyboardShortcuts / Default',
  render: () => <Wrap><KeyboardShortcuts  /></Wrap>,
}
