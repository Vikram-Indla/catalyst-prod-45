/**
 * Enterprise/Detail View Types — auto-generated Storybook coverage
 */
import React from 'react';
import type { StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fn } from 'storybook/test';

import CatalystViewEpic from '@/components/catalyst-detail-views/epic/CatalystViewEpic';
import CatalystViewFeature from '@/components/catalyst-detail-views/feature/CatalystViewFeature';
import { BrActivitySection } from '@/components/catalyst-detail-views/business-request/sections/BrActivitySection';
import { CatalystActivitySection } from '@/components/catalyst-detail-views/shared/sections/CatalystActivitySection';
import { CatalystDefectFields } from '@/components/catalyst-detail-views/defect/CatalystDefectFields';
import { CatalystDescriptionSection } from '@/components/catalyst-detail-views/shared/sections/CatalystDescriptionSection';
import { CatalystReadOnlyCustomFields } from '@/components/catalyst-detail-views/shared/sections/CatalystReadOnlyCustomFields';
import { WatchersChip } from '@/components/catalyst-detail-views/shared/WatchersChip';

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
function Wrap({ children }: { children: React.ReactNode }) {
  return (<QueryClientProvider client={qc}><div style={{ maxWidth: 900, padding: 16 }}>{children}</div></QueryClientProvider>);
}

export default { title: 'Enterprise/Detail View Types' };

export const CatalystDefectFieldsDefault: StoryObj = {
  name: 'CatalystDefectFields / Default',
  render: () => <Wrap><CatalystDefectFields issue={null} /></Wrap>,
}

export const CatalystViewEpicDefault: StoryObj = {
  name: 'CatalystViewEpic / Default',
  render: () => <Wrap><CatalystViewEpic  /></Wrap>,
}

export const CatalystViewFeatureDefault: StoryObj = {
  name: 'CatalystViewFeature / Default',
  render: () => <Wrap><CatalystViewFeature  /></Wrap>,
}

export const WatchersChipDefault: StoryObj = {
  name: 'WatchersChip / Default',
  render: () => <Wrap><WatchersChip issueKey="test-value" /></Wrap>,
}

export const CatalystActivitySectionDefault: StoryObj = {
  name: 'CatalystActivitySection / Default',
  render: () => <Wrap><CatalystActivitySection itemId="item-1" isOpen={true} /></Wrap>,
}

export const CatalystActivitySectionOpen: StoryObj = {
  name: 'CatalystActivitySection / Open',
  render: () => <Wrap><CatalystActivitySection itemId="item-1" isOpen={true} /></Wrap>,
}

export const CatalystDescriptionSectionDefault: StoryObj = {
  name: 'CatalystDescriptionSection / Default',
  render: () => <Wrap><CatalystDescriptionSection issue={null} /></Wrap>,
}

export const CatalystReadOnlyCustomFieldsDefault: StoryObj = {
  name: 'CatalystReadOnlyCustomFields / Default',
  render: () => <Wrap><CatalystReadOnlyCustomFields issue={null} /></Wrap>,
}

export const BrActivitySectionDefault: StoryObj = {
  name: 'BrActivitySection / Default',
  render: () => <Wrap><BrActivitySection requestId="item-1" isOpen={true} /></Wrap>,
}

export const BrActivitySectionOpen: StoryObj = {
  name: 'BrActivitySection / Open',
  render: () => <Wrap><BrActivitySection requestId="item-1" isOpen={true} /></Wrap>,
}
