/**
 * Components/Shared/Molecules — auto-generated Storybook coverage
 */
import React from 'react';
import type { StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';

import { CatalystPageHeader } from '@/components/shared/CatalystPageHeader';
import { CommandCenterHeader } from '@/components/shared/CommandCenterHeader';
import { DrawerPanel } from '@/components/shared/DrawerPanel';
import { IssueNavChevrons } from '@/components/shared/IssueNavChevrons';
import { ListScreenToolbar } from '@/components/shared/ListScreenToolbar';
import { QuickAddRow } from '@/components/shared/QuickAddRow';
import { ResizableTableHeader } from '@/components/shared/ResizableTableHeader';
import { RightDetailsPanel } from '@/components/shared/RightDetailsPanel';

function Wrap({ children }: { children: React.ReactNode }) {
  return (<div style={{ maxWidth: 900, padding: 16 }}>{children}</div>);
}

export default { title: 'Components/Shared/Molecules' };

export const DrawerPanelDefault: StoryObj = {
  name: 'DrawerPanel / Default',
  render: () => <Wrap><DrawerPanel  /></Wrap>,
}

export const RightDetailsPanelDefault: StoryObj = {
  name: 'RightDetailsPanel / Default',
  render: () => <Wrap><RightDetailsPanel open={true} onClose={fn()} title="Sample item title" tabs={[]} /></Wrap>,
}

export const RightDetailsPanelOpen: StoryObj = {
  name: 'RightDetailsPanel / Open',
  render: () => <Wrap><RightDetailsPanel open={true} onClose={fn()} title="Sample item title" tabs={[]} open={true} /></Wrap>,
}

export const ListScreenToolbarDefault: StoryObj = {
  name: 'ListScreenToolbar / Default',
  render: () => <Wrap><ListScreenToolbar  /></Wrap>,
}

export const CommandCenterHeaderDefault: StoryObj = {
  name: 'CommandCenterHeader / Default',
  render: () => <Wrap><CommandCenterHeader title="Sample item title" /></Wrap>,
}

export const CatalystPageHeaderDefault: StoryObj = {
  name: 'CatalystPageHeader / Default',
  render: () => <Wrap><CatalystPageHeader title="Sample item title" /></Wrap>,
}

export const IssueNavChevronsDefault: StoryObj = {
  name: 'IssueNavChevrons / Default',
  render: () => <Wrap><IssueNavChevrons  /></Wrap>,
}

export const QuickAddRowDefault: StoryObj = {
  name: 'QuickAddRow / Default',
  render: () => <Wrap><QuickAddRow columnsCount={5} label="Sample item title" placeholder="test-value" createType={{} as any} /></Wrap>,
}

export const ResizableTableHeaderDefault: StoryObj = {
  name: 'ResizableTableHeader / Default',
  render: () => <Wrap><ResizableTableHeader colKey="BAU-5972" label="Sample item title" width={42} onResizeStart={fn()} onDragStart={fn()} onDragOver={fn()} onDragEnd={fn()} /></Wrap>,
}
