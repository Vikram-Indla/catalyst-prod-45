/**
 * Components/Layout/Shell — auto-generated Storybook coverage
 */
import React from 'react';
import type { StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fn } from '@storybook/test';

import { EnterpriseSidebar } from '@/components/layout/EnterpriseSidebar';
import { GlobalMobileDrawer } from '@/components/layout/GlobalMobileDrawer';
import { GlobalPageHeader } from '@/components/layout/GlobalPageHeader';
import { GlobalSearch } from '@/components/layout/GlobalSearch';
import { HubPageHeader } from '@/components/layout/HubPageHeader';
import { HubSurface } from '@/components/layout/HubSurface';
import { ItemsDropdown } from '@/components/layout/dropdowns/ItemsDropdown';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { MobileMenuDrawer } from '@/components/layout/MobileMenuDrawer';
import { ProjectSidebar } from '@/components/layout/ProjectSidebar';
import { ReleasesManagementSidebar } from '@/components/layout/ReleasesManagementSidebar';
import { ResponsivePageContainer } from '@/components/layout/ResponsivePageContainer';
import { RoomContentShell } from '@/components/layout/RoomContentShell';
import { StarredDropdown } from '@/components/layout/dropdowns/StarredDropdown';
import { TestManagementSidebar } from '@/components/layout/TestManagementSidebar';
import { UnifiedSidebar } from '@/components/layout/UnifiedSidebar';

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
function Wrap({ children }: { children: React.ReactNode }) {
  return (<QueryClientProvider client={qc}><MemoryRouter><div style={{ maxWidth: 900, padding: 16 }}>{children}</QueryClientProvider></MemoryRouter></div>);
}

export default { title: 'Components/Layout/Shell' };

export const GlobalSearchDefault: StoryObj = {
  name: 'GlobalSearch / Default',
  render: () => <Wrap><GlobalSearch  /></Wrap>,
}

export const GlobalPageHeaderDefault: StoryObj = {
  name: 'GlobalPageHeader / Default',
  render: () => <Wrap><GlobalPageHeader sectionLabel=[] pageTitle="Sample item title" /></Wrap>,
}

export const GlobalMobileDrawerDefault: StoryObj = {
  name: 'GlobalMobileDrawer / Default',
  render: () => <Wrap><GlobalMobileDrawer open=true onClose={fn()} /></Wrap>,
}

export const GlobalMobileDrawerOpen: StoryObj = {
  name: 'GlobalMobileDrawer / Open',
  render: () => <Wrap><GlobalMobileDrawer open=true onClose={fn()} open={true} /></Wrap>,
}

export const HubPageHeaderDefault: StoryObj = {
  name: 'HubPageHeader / Default',
  render: () => <Wrap><HubPageHeader title="Sample item title" /></Wrap>,
}

export const HubSurfaceDefault: StoryObj = {
  name: 'HubSurface / Default',
  render: () => <Wrap><HubSurface  /></Wrap>,
}

export const MobileBottomNavDefault: StoryObj = {
  name: 'MobileBottomNav / Default',
  render: () => <Wrap><MobileBottomNav  /></Wrap>,
}

export const MobileMenuDrawerDefault: StoryObj = {
  name: 'MobileMenuDrawer / Default',
  render: () => <Wrap><MobileMenuDrawer open=true onClose={fn()} /></Wrap>,
}

export const MobileMenuDrawerOpen: StoryObj = {
  name: 'MobileMenuDrawer / Open',
  render: () => <Wrap><MobileMenuDrawer open=true onClose={fn()} open={true} /></Wrap>,
}

export const RoomContentShellDefault: StoryObj = {
  name: 'RoomContentShell / Default',
  render: () => <Wrap><RoomContentShell  /></Wrap>,
}

export const ResponsivePageContainerDefault: StoryObj = {
  name: 'ResponsivePageContainer / Default',
  render: () => <Wrap><ResponsivePageContainer  /></Wrap>,
}

export const EnterpriseSidebarDefault: StoryObj = {
  name: 'EnterpriseSidebar / Default',
  render: () => <Wrap><EnterpriseSidebar expanded=false onToggle={fn()} /></Wrap>,
}

export const UnifiedSidebarDefault: StoryObj = {
  name: 'UnifiedSidebar / Default',
  render: () => <Wrap><UnifiedSidebar workspaceType={{{}}} entityId="item-1" expanded=false onToggle={fn()} /></Wrap>,
}

export const ProjectSidebarDefault: StoryObj = {
  name: 'ProjectSidebar / Default',
  render: () => <Wrap><ProjectSidebar projectId="item-1" expanded=false onToggle={fn()} /></Wrap>,
}

export const ItemsDropdownDefault: StoryObj = {
  name: 'ItemsDropdown / Default',
  render: () => <Wrap><ItemsDropdown onClose={fn()} /></Wrap>,
}

export const StarredDropdownDefault: StoryObj = {
  name: 'StarredDropdown / Default',
  render: () => <Wrap><StarredDropdown onClose={fn()} /></Wrap>,
}

export const ReleasesManagementSidebarDefault: StoryObj = {
  name: 'ReleasesManagementSidebar / Default',
  render: () => <Wrap><ReleasesManagementSidebar expanded=false onToggle={fn()} /></Wrap>,
}

export const TestManagementSidebarDefault: StoryObj = {
  name: 'TestManagementSidebar / Default',
  render: () => <Wrap><TestManagementSidebar expanded=false onToggle={fn()} /></Wrap>,
}
