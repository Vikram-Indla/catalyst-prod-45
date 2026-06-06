/**
 * Components/UI/Inputs — auto-generated Storybook coverage
 */
import React from 'react';
import type { StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';

import { checkbox } from '@/components/ui/checkbox';
import { input } from '@/components/ui/input';
import { label } from '@/components/ui/label';
import { select } from '@/components/ui/select';
import { textarea } from '@/components/ui/textarea';

function Wrap({ children }: { children: React.ReactNode }) {
  return (<div style={{ maxWidth: 900, padding: 16 }}>{children}</div>);
}

export default { title: 'Components/UI/Inputs' };

export const inputDefault: StoryObj = {
  name: 'input / Default',
  render: () => <Wrap><input  /></Wrap>,
}

export const labelDefault: StoryObj = {
  name: 'label / Default',
  render: () => <Wrap><label  /></Wrap>,
}

export const textareaDefault: StoryObj = {
  name: 'textarea / Default',
  render: () => <Wrap><textarea  /></Wrap>,
}

export const checkboxDefault: StoryObj = {
  name: 'checkbox / Default',
  render: () => <Wrap><checkbox  /></Wrap>,
}

export const selectDefault: StoryObj = {
  name: 'select / Default',
  render: () => <Wrap><select  /></Wrap>,
}
