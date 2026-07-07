/**
 * Components/Layout/Sidebars — auto-generated Storybook coverage
 */
import React from 'react';
import type { StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';

import HomeSidebar from '@/components/layout/HomeSidebar';
import { IdeationSidebar } from '@/components/layout/IdeationSidebar';
import { IncidentHubSidebar } from '@/components/layout/IncidentHubSidebar';
import { OperationsSidebar } from '@/components/layout/OperationsSidebar';
import { ProductHubSidebar } from '@/components/layout/ProductHubSidebar';
import { ProductRoomSidebar } from '@/components/layout/ProductRoomSidebar';
import { ProjectHubSidebar } from '@/components/layout/ProjectHubSidebar';
import { ReleaseHubSidebar } from '@/components/layout/ReleaseHubSidebar';
import { SidebarBase } from '@/components/layout/SidebarBase';
import { TaskHubSidebar } from '@/components/layout/TaskHubSidebar';
import { TestHubSidebar } from '@/components/layout/TestHubSidebar';
import { WikiSidebar } from '@/components/layout/WikiSidebar';

function Wrap({ children }: { children: React.ReactNode }) {
  return (<div style={{ maxWidth: 900, padding: 16 }}>{children}</div>);
}

export default { title: 'Components/Layout/Sidebars' };

export const SidebarBaseDefault: StoryObj = {
  name: 'SidebarBase / Default',
  render: () => <Wrap><SidebarBase config={{} as any} expanded={false} onToggle={fn()} /></Wrap>,
}

export const HomeSidebarDefault: StoryObj = {
  name: 'HomeSidebar / Default',
  render: () => <Wrap><HomeSidebar  /></Wrap>,
}

export const ProjectHubSidebarDefault: StoryObj = {
  name: 'ProjectHubSidebar / Default',
  render: () => <Wrap><ProjectHubSidebar expanded={false} onToggle={fn()} /></Wrap>,
}

export const ProductHubSidebarDefault: StoryObj = {
  name: 'ProductHubSidebar / Default',
  render: () => <Wrap><ProductHubSidebar expanded={false} onToggle={fn()} /></Wrap>,
}

export const IncidentHubSidebarDefault: StoryObj = {
  name: 'IncidentHubSidebar / Default',
  render: () => <Wrap><IncidentHubSidebar expanded={false} onToggle={fn()} /></Wrap>,
}

export const ReleaseHubSidebarDefault: StoryObj = {
  name: 'ReleaseHubSidebar / Default',
  render: () => <Wrap><ReleaseHubSidebar expanded={false} onToggle={fn()} /></Wrap>,
}

export const TestHubSidebarDefault: StoryObj = {
  name: 'TestHubSidebar / Default',
  render: () => <Wrap><TestHubSidebar expanded={false} onToggle={fn()} /></Wrap>,
}

export const TaskHubSidebarDefault: StoryObj = {
  name: 'TaskHubSidebar / Default',
  render: () => <Wrap><TaskHubSidebar expanded={false} onToggle={fn()} /></Wrap>,
}

export const WikiSidebarDefault: StoryObj = {
  name: 'WikiSidebar / Default',
  render: () => <Wrap><WikiSidebar expanded={false} onToggle={fn()} /></Wrap>,
}

export const IdeationSidebarDefault: StoryObj = {
  name: 'IdeationSidebar / Default',
  render: () => <Wrap><IdeationSidebar expanded={false} onToggle={fn()} /></Wrap>,
}

export const OperationsSidebarDefault: StoryObj = {
  name: 'OperationsSidebar / Default',
  render: () => <Wrap><OperationsSidebar expanded={false} onToggle={fn()} /></Wrap>,
}

export const ProductRoomSidebarDefault: StoryObj = {
  name: 'ProductRoomSidebar / Default',
  render: () => <Wrap><ProductRoomSidebar expanded={false} onToggle={fn()} /></Wrap>,
}
