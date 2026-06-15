/**
 * Components/Layout/Molecules — auto-generated Storybook coverage
 */
import React from 'react';
import type { StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fn } from 'storybook/test';

import { AvailabilityPanel } from '@/components/layout/AvailabilityPanel';
import { HubSwitcher } from '@/components/layout/HubSwitcher';
import { ItemsDropdown } from '@/components/layout/ItemsDropdown';
import { PageChrome } from '@/components/layout/PageChrome';
import { PageHeader } from '@/components/layout/PageHeader';
import { ProfileMenu } from '@/components/layout/ProfileMenu';
import { ProjectTabBar } from '@/components/layout/ProjectTabBar';
import { ScheduleLeaveModal } from '@/components/layout/ScheduleLeaveModal';
import { SettingsMenu } from '@/components/layout/SettingsMenu';

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
function Wrap({ children }: { children: React.ReactNode }) {
  return (<QueryClientProvider client={qc}><div style={{ maxWidth: 900, padding: 16 }}>{children}</div></QueryClientProvider>);
}

export default { title: 'Components/Layout/Molecules' };

export const AvailabilityPanelDefault: StoryObj = {
  name: 'AvailabilityPanel / Default',
  render: () => <Wrap><AvailabilityPanel  /></Wrap>,
}

export const HubSwitcherDefault: StoryObj = {
  name: 'HubSwitcher / Default',
  render: () => <Wrap><HubSwitcher hub={{} as any} /></Wrap>,
}

export const ItemsDropdownDefault: StoryObj = {
  name: 'ItemsDropdown / Default',
  render: () => <Wrap><ItemsDropdown  /></Wrap>,
}

export const PageChromeDefault: StoryObj = {
  name: 'PageChrome / Default',
  render: () => <Wrap><PageChrome  /></Wrap>,
}

export const PageHeaderDefault: StoryObj = {
  name: 'PageHeader / Default',
  render: () => <Wrap><PageHeader title="Sample item title" /></Wrap>,
}

export const ProfileMenuDefault: StoryObj = {
  name: 'ProfileMenu / Default',
  render: () => <Wrap><ProfileMenu  /></Wrap>,
}

export const ScheduleLeaveModalDefault: StoryObj = {
  name: 'ScheduleLeaveModal / Default',
  render: () => <Wrap><ScheduleLeaveModal isOpen={true} onClose={fn()} /></Wrap>,
}

export const ScheduleLeaveModalOpen: StoryObj = {
  name: 'ScheduleLeaveModal / Open',
  render: () => <Wrap><ScheduleLeaveModal isOpen={true} onClose={fn()} /></Wrap>,
}

export const SettingsMenuDefault: StoryObj = {
  name: 'SettingsMenu / Default',
  render: () => <Wrap><SettingsMenu  /></Wrap>,
}

export const ProjectTabBarDefault: StoryObj = {
  name: 'ProjectTabBar / Default',
  render: () => <Wrap><ProjectTabBar projectKey="BAU-5972" /></Wrap>,
}
