/**
 * Components/UI/Primitives — auto-generated Storybook coverage
 */
import React from 'react';
import type { StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';

import { CatalystOwnerAvatar } from '@/components/ui/catalyst/CatalystOwnerAvatar';
import { SectionHeader } from '@/components/ui/catalyst/SectionHeader';
import { branded-checkbox } from '@/components/ui/branded-checkbox';
import { catalyst-date-picker } from '@/components/ui/catalyst-date-picker';
import { catalyst-table } from '@/components/ui/catalyst-table';
import { lookup-select } from '@/components/ui/lookup-select';
import { segmented-tabs } from '@/components/ui/segmented-tabs';
import { unified-toolbar } from '@/components/ui/unified-toolbar';
import { user-picker } from '@/components/ui/user-picker';

function Wrap({ children }: { children: React.ReactNode }) {
  return (<div style={{ maxWidth: 900, padding: 16 }}>{children}</div>);
}

export default { title: 'Components/UI/Primitives' };

export const branded-checkboxDefault: StoryObj = {
  name: 'branded-checkbox / Default',
  render: () => <Wrap><branded-checkbox checked=false onChange={fn()} /></Wrap>,
}

export const catalyst-date-pickerDefault: StoryObj = {
  name: 'catalyst-date-picker / Default',
  render: () => <Wrap><catalyst-date-picker onChange={fn()} /></Wrap>,
}

export const catalyst-tableDefault: StoryObj = {
  name: 'catalyst-table / Default',
  render: () => <Wrap><catalyst-table  /></Wrap>,
}

export const lookup-selectDefault: StoryObj = {
  name: 'lookup-select / Default',
  render: () => <Wrap><lookup-select optionSetKey="BAU-5972" value=null onChange={fn()} /></Wrap>,
}

export const segmented-tabsDefault: StoryObj = {
  name: 'segmented-tabs / Default',
  render: () => <Wrap><segmented-tabs value="test-value" onValueChange={fn()} /></Wrap>,
}

export const unified-toolbarDefault: StoryObj = {
  name: 'unified-toolbar / Default',
  render: () => <Wrap><unified-toolbar searchValue="" onSearchChange={fn()} /></Wrap>,
}

export const user-pickerDefault: StoryObj = {
  name: 'user-picker / Default',
  render: () => <Wrap><user-picker onChange={fn()} /></Wrap>,
}

export const CatalystOwnerAvatarDefault: StoryObj = {
  name: 'CatalystOwnerAvatar / Default',
  render: () => <Wrap><CatalystOwnerAvatar  /></Wrap>,
}

export const SectionHeaderDefault: StoryObj = {
  name: 'SectionHeader / Default',
  render: () => <Wrap><SectionHeader icon={{{}}} title="Sample item title" /></Wrap>,
}
