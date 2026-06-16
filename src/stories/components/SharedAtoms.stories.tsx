/**
 * Components/Shared/Atoms — auto-generated Storybook coverage
 */
import React from 'react';
import type { StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';

import RelativeTime from '@/components/shared/RelativeTime';
import { AutoSyncCard } from '@/components/shared/AutoSyncCard';
import { ComingSoonPage } from '@/components/shared/ComingSoonPage';
import { HealthBadge } from '@/components/shared/HealthBadge';
import { KPIWidgetCard } from '@/components/shared/KPIWidgetCard';
import { PageContainer } from '@/components/shared/PageContainer';
import { ProjectIcon } from '@/components/shared/ProjectIcon';
import { SurfaceCard } from '@/components/shared/SurfaceCard';
import { TechnicalScoreBadge } from '@/components/shared/TechnicalScoreBadge';
import { WorkItemStarButton } from '@/components/shared/WorkItemStarButton';

function Wrap({ children }: { children: React.ReactNode }) {
  return (<div style={{ maxWidth: 900, padding: 16 }}>{children}</div>);
}

export default { title: 'Components/Shared/Atoms' };

export const HealthBadgeDefault: StoryObj = {
  name: 'HealthBadge / Default',
  render: () => <Wrap><HealthBadge health="green" /></Wrap>,
}

export const SurfaceCardDefault: StoryObj = {
  name: 'SurfaceCard / Default',
  render: () => <Wrap><SurfaceCard  /></Wrap>,
}

export const PageContainerDefault: StoryObj = {
  name: 'PageContainer / Default',
  render: () => <Wrap><PageContainer  /></Wrap>,
}

export const RelativeTimeDefault: StoryObj = {
  name: 'RelativeTime / Default',
  render: () => <Wrap><RelativeTime iso={null} /></Wrap>,
}

export const ProjectIconDefault: StoryObj = {
  name: 'ProjectIcon / Default',
  render: () => <Wrap><ProjectIcon  /></Wrap>,
}

export const WorkItemStarButtonDefault: StoryObj = {
  name: 'WorkItemStarButton / Default',
  render: () => <Wrap><WorkItemStarButton itemId="item-1" itemType={{} as any} /></Wrap>,
}

export const AutoSyncCardDefault: StoryObj = {
  name: 'AutoSyncCard / Default',
  render: () => <Wrap><AutoSyncCard scheduleKeys={[]} /></Wrap>,
}

export const ComingSoonPageDefault: StoryObj = {
  name: 'ComingSoonPage / Default',
  render: () => <Wrap><ComingSoonPage title="Sample item title" /></Wrap>,
}

export const TechnicalScoreBadgeDefault: StoryObj = {
  name: 'TechnicalScoreBadge / Default',
  render: () => <Wrap><TechnicalScoreBadge score={null} /></Wrap>,
}

export const KPIWidgetCardDefault: StoryObj = {
  name: 'KPIWidgetCard / Default',
  render: () => <Wrap><KPIWidgetCard title="Sample item title" value={{} as any} /></Wrap>,
}
