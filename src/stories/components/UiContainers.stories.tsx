/**
 * Components/UI/Containers — auto-generated Storybook coverage
 */
import React from 'react';
import type { StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';

import { accordion } from '@/components/ui/accordion';
import { alert } from '@/components/ui/alert';
import { calendar } from '@/components/ui/calendar';
import { card } from '@/components/ui/card';
import { form } from '@/components/ui/form';
import { hover-card } from '@/components/ui/hover-card';
import { progress } from '@/components/ui/progress';
import { radio-group } from '@/components/ui/radio-group';
import { scroll-area } from '@/components/ui/scroll-area';
import { separator } from '@/components/ui/separator';
import { skeleton } from '@/components/ui/skeleton';
import { slider } from '@/components/ui/slider';
import { switch } from '@/components/ui/switch';
import { tabs } from '@/components/ui/tabs';
import { toggle } from '@/components/ui/toggle';

function Wrap({ children }: { children: React.ReactNode }) {
  return (<div style={{ maxWidth: 900, padding: 16 }}>{children}</div>);
}

export default { title: 'Components/UI/Containers' };

export const accordionDefault: StoryObj = {
  name: 'accordion / Default',
  render: () => <Wrap><accordion  /></Wrap>,
}

export const alertDefault: StoryObj = {
  name: 'alert / Default',
  render: () => <Wrap><alert  /></Wrap>,
}

export const cardDefault: StoryObj = {
  name: 'card / Default',
  render: () => <Wrap><card  /></Wrap>,
}

export const calendarDefault: StoryObj = {
  name: 'calendar / Default',
  render: () => <Wrap><calendar  /></Wrap>,
}

export const formDefault: StoryObj = {
  name: 'form / Default',
  render: () => <Wrap><form  /></Wrap>,
}

export const hover-cardDefault: StoryObj = {
  name: 'hover-card / Default',
  render: () => <Wrap><hover-card  /></Wrap>,
}

export const progressDefault: StoryObj = {
  name: 'progress / Default',
  render: () => <Wrap><progress  /></Wrap>,
}

export const radio-groupDefault: StoryObj = {
  name: 'radio-group / Default',
  render: () => <Wrap><radio-group  /></Wrap>,
}

export const scroll-areaDefault: StoryObj = {
  name: 'scroll-area / Default',
  render: () => <Wrap><scroll-area  /></Wrap>,
}

export const separatorDefault: StoryObj = {
  name: 'separator / Default',
  render: () => <Wrap><separator  /></Wrap>,
}

export const skeletonDefault: StoryObj = {
  name: 'skeleton / Default',
  render: () => <Wrap><skeleton  /></Wrap>,
}

export const sliderDefault: StoryObj = {
  name: 'slider / Default',
  render: () => <Wrap><slider  /></Wrap>,
}

export const switchDefault: StoryObj = {
  name: 'switch / Default',
  render: () => <Wrap><switch  /></Wrap>,
}

export const tabsDefault: StoryObj = {
  name: 'tabs / Default',
  render: () => <Wrap><tabs  /></Wrap>,
}

export const toggleDefault: StoryObj = {
  name: 'toggle / Default',
  render: () => <Wrap><toggle  /></Wrap>,
}
