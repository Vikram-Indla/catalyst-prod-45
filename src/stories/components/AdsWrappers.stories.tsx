/**
 * Components/ADS/Wrappers — auto-generated Storybook coverage
 */
import React from 'react';
import type { StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';

import { AtlaskitPageShell } from '@/components/ads/AtlaskitPageShell';
import { DynamicTable } from '@/components/ads/DynamicTable';
import { Heading } from '@/components/ads/Heading';
import { PageHeader } from '@/components/ads/PageHeader';
import { Popup } from '@/components/ads/Popup';
import { ProgressBar } from '@/components/ads/ProgressBar';
import { SectionMessage } from '@/components/ads/SectionMessage';
import { Textfield } from '@/components/ads/Textfield';
import { ThemeToggle } from '@/components/ads/ThemeToggle';
import { TruncateCell } from '@/components/ads/TruncateCell';

function Wrap({ children }: { children: React.ReactNode }) {
  return (<div style={{ maxWidth: 900, padding: 16 }}>{children}</div>);
}

export default { title: 'Components/ADS/Wrappers' };

export const AtlaskitPageShellDefault: StoryObj = {
  name: 'AtlaskitPageShell / Default',
  render: () => <Wrap><AtlaskitPageShell  /></Wrap>,
}

export const DynamicTableDefault: StoryObj = {
  name: 'DynamicTable / Default',
  render: () => <Wrap><DynamicTable head={{{}}} rows=[] /></Wrap>,
}

export const DynamicTableLoading: StoryObj = {
  name: 'DynamicTable / Loading',
  render: () => <Wrap><DynamicTable head={{{}}} rows=[] isLoading={true} /></Wrap>,
}

export const HeadingDefault: StoryObj = {
  name: 'Heading / Default',
  render: () => <Wrap><Heading  /></Wrap>,
}

export const PageHeaderDefault: StoryObj = {
  name: 'PageHeader / Default',
  render: () => <Wrap><PageHeader title={{{}}} /></Wrap>,
}

export const PopupDefault: StoryObj = {
  name: 'Popup / Default',
  render: () => <Wrap><Popup  /></Wrap>,
}

export const ProgressBarDefault: StoryObj = {
  name: 'ProgressBar / Default',
  render: () => <Wrap><ProgressBar value=42 /></Wrap>,
}

export const SectionMessageDefault: StoryObj = {
  name: 'SectionMessage / Default',
  render: () => <Wrap><SectionMessage  /></Wrap>,
}

export const TextfieldDefault: StoryObj = {
  name: 'Textfield / Default',
  render: () => <Wrap><Textfield  /></Wrap>,
}

export const ThemeToggleDefault: StoryObj = {
  name: 'ThemeToggle / Default',
  render: () => <Wrap><ThemeToggle  /></Wrap>,
}

export const TruncateCellDefault: StoryObj = {
  name: 'TruncateCell / Default',
  render: () => <Wrap><TruncateCell text="test-value" /></Wrap>,
}
