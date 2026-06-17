/**
 * Components/Shared/Table — auto-generated Storybook coverage
 */
import React from 'react';
import type { StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';

import { BulkFooterBar } from '@/components/shared/JiraTable/BulkFooterBar';
import { ColumnVisibilityMenu } from '@/components/shared/dynamic-table/ColumnVisibilityMenu';
import { DynamicTable } from '@/components/shared/dynamic-table/DynamicTable';
import { flags } from '@/components/shared/JiraTable/flags';

function Wrap({ children }: { children: React.ReactNode }) {
  return (<div style={{ maxWidth: 900, padding: 16 }}>{children}</div>);
}

export default { title: 'Components/Shared/Table' };

export const BulkFooterBarDefault: StoryObj = {
  name: 'BulkFooterBar / Default',
  render: () => <Wrap><BulkFooterBar selectedCount={5} onDeselectAll={fn()} /></Wrap>,
}

export const flagsDefault: StoryObj = {
  name: 'flags / Default',
  render: () => <Wrap><flags  /></Wrap>,
}

export const ColumnVisibilityMenuDefault: StoryObj = {
  name: 'ColumnVisibilityMenu / Default',
  render: () => <Wrap><ColumnVisibilityMenu  /></Wrap>,
}

export const DynamicTableDefault: StoryObj = {
  name: 'DynamicTable / Default',
  render: () => <Wrap><DynamicTable  /></Wrap>,
}
