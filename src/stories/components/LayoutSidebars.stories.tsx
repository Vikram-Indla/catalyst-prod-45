/**
 * Components/Layout/Sidebars — auto-generated Storybook coverage
 */
import React from 'react';
import type { StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';
import { fn } from '@storybook/test';

import HomeSidebar from '@/components/layout/HomeSidebar';
import { IdeationSidebar } from '@/components/layout/IdeationSidebar';
import { IncidentHubSidebar } from '@/components/layout/IncidentHubSidebar';
import { OperationsSidebar } from '@/components/layout/OperationsSidebar';
import { PlanHubSidebar } from '@/components/layout/PlanHubSidebar';
import { ProductHubSidebar } from '@/components/layout/ProductHubSidebar';
import { ProductRoomSidebar } from '@/components/layout/ProductRoomSidebar';
import { ProjectHubSidebar } from '@/components/layout/ProjectHubSidebar';
import { ReleaseHubSidebar } from '@/components/layout/ReleaseHubSidebar';
import { SidebarBase } from '@/components/layout/SidebarBase';
import { TaskHubSidebar } from '@/components/layout/TaskHubSidebar';
import { TeamRoomSidebar } from '@/components/layout/TeamRoomSidebar';
import { TestHubSidebar } from '@/components/layout/TestHubSidebar';
import { WikiSidebar } from '@/components/layout/WikiSidebar';

function Wrap({ children }: { children: React.ReactNode }) {
  return (<MemoryRouter><div style={{ maxWidth: 900, padding: 16 }}>{children}</div></MemoryRouter>);
}

export default { title: 'Components/Layout/Sidebars' };

export const SidebarBaseDefault: StoryObj = {
  name: 'SidebarBase / Default',
  render: () => <Wrap><SidebarBase config={{{}}} expanded=false onToggle={fn()} /></Wrap>,
}

export const HomeSidebarDefault: StoryObj = {
  name: 'HomeSidebar / Default',
  render: () => <Wrap><HomeSidebar  /></Wrap>,
}

export const ProjectHubSidebarDefault: StoryObj = {
  name: 'ProjectHubSidebar / Default',
  render: () => <Wrap><ProjectHubSidebar expanded=false onToggle={fn()} /></Wrap>,
}

export const ProductHubSidebarDefault: StoryObj = {
  name: 'ProductHubSidebar / Default',
  render: () => <Wrap><ProductHubSidebar expanded=false onToggle={fn()} /></Wrap>,
}

export const IncidentHubSidebarDefault: StoryObj = {
  name: 'IncidentHubSidebar / Default',
  render: () => <Wrap><IncidentHubSidebar expanded=false onToggle={fn()} /></Wrap>,
}

export const ReleaseHubSidebarDefault: StoryObj = {
  name: 'ReleaseHubSidebar / Default',
  render: () => <Wrap><ReleaseHubSidebar expanded=false onToggle={fn()} /></Wrap>,
}

export const TestHubSidebarDefault: StoryObj = {
  name: 'TestHubSidebar / Default',
  render: () => <Wrap><TestHubSidebar expanded=false onToggle={fn()} /></Wrap>,
}

export const TaskHubSidebarDefault: StoryObj = {
  name: 'TaskHubSidebar / Default',
  render: () => <Wrap><TaskHubSidebar expanded=false onToggle={fn()} /></Wrap>,
}

export const PlanHubSidebarDefault: StoryObj = {
  name: 'PlanHubSidebar / Default',
  render: () => <Wrap><PlanHubSidebar expanded=false onToggle={fn()} /></Wrap>,
}

export const WikiSidebarDefault: StoryObj = {
  name: 'WikiSidebar / Default',
  render: () => <Wrap><WikiSidebar expanded=false onToggle={fn()} /></Wrap>,
}

export const IdeationSidebarDefault: StoryObj = {
  name: 'IdeationSidebar / Default',
  render: () => <Wrap><IdeationSidebar expanded=false onToggle={fn()} /></Wrap>,
}

export const OperationsSidebarDefault: StoryObj = {
  name: 'OperationsSidebar / Default',
  render: () => <Wrap><OperationsSidebar expanded=false onToggle={fn()} /></Wrap>,
}

export const TeamRoomSidebarDefault: StoryObj = {
  name: 'TeamRoomSidebar / Default',
  render: () => <Wrap><TeamRoomSidebar teamId="item-1" expanded=false onToggle={fn()} selectedSprint="test-value" onSprintChange={fn()} /></Wrap>,
}

export const ProductRoomSidebarDefault: StoryObj = {
  name: 'ProductRoomSidebar / Default',
  render: () => <Wrap><ProductRoomSidebar expanded=false onToggle={fn()} /></Wrap>,
}
