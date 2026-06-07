/**
 * Components/Layout/Atoms — auto-generated Storybook coverage
 */
import React from 'react';
import type { StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';
import { fn } from '@storybook/test';

import { ActiveHubLabel } from '@/components/layout/ActiveHubLabel';
import { ChangeNumberSelect } from '@/components/common/ChangeNumberSelect';
import { FeatureComingSoon } from '@/components/common/FeatureComingSoon';
import { HubTile } from '@/components/layout/HubTile';
import { NotificationItem } from '@/components/layout/NotificationItem';
import { ProductHeaderChip } from '@/components/layout/ProductHeaderChip';
import { ProjectHeaderChip } from '@/components/layout/ProjectHeaderChip';
import { ProjectHeaderChipIcons } from '@/components/layout/ProjectHeaderChipIcons';

function Wrap({ children }: { children: React.ReactNode }) {
  return (<MemoryRouter><div style={{ maxWidth: 900, padding: 16 }}>{children}</div></MemoryRouter>);
}

export default { title: 'Components/Layout/Atoms' };

export const ActiveHubLabelDefault: StoryObj = {
  name: 'ActiveHubLabel / Default',
  render: () => <Wrap><ActiveHubLabel  /></Wrap>,
}

export const HubTileDefault: StoryObj = {
  name: 'HubTile / Default',
  render: () => <Wrap><HubTile label="Sample item title" color={{{}}} /></Wrap>,
}

export const NotificationItemDefault: StoryObj = {
  name: 'NotificationItem / Default',
  render: () => <Wrap><NotificationItem  /></Wrap>,
}

export const ProductHeaderChipDefault: StoryObj = {
  name: 'ProductHeaderChip / Default',
  render: () => <Wrap><ProductHeaderChip productCode="test-value" /></Wrap>,
}

export const ProjectHeaderChipDefault: StoryObj = {
  name: 'ProjectHeaderChip / Default',
  render: () => <Wrap><ProjectHeaderChip  /></Wrap>,
}

export const ProjectHeaderChipIconsDefault: StoryObj = {
  name: 'ProjectHeaderChipIcons / Default',
  render: () => <Wrap><ProjectHeaderChipIcons  /></Wrap>,
}

export const FeatureComingSoonDefault: StoryObj = {
  name: 'FeatureComingSoon / Default',
  render: () => <Wrap><FeatureComingSoon  /></Wrap>,
}

export const ChangeNumberSelectDefault: StoryObj = {
  name: 'ChangeNumberSelect / Default',
  render: () => <Wrap><ChangeNumberSelect value="test-value" onChange={fn()} /></Wrap>,
}
