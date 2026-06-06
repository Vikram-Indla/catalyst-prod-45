/**
 * Components/UI/Remaining — auto-generated Storybook coverage
 */
import React from 'react';
import type { StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';

import { CatalystToast } from '@/components/ui/catalyst-toast/CatalystToast';
import { CatalystToastContainer } from '@/components/ui/catalyst-toast/CatalystToastContainer';
import { alert-dialog } from '@/components/ui/alert-dialog';
import { collapsible } from '@/components/ui/collapsible';
import { command } from '@/components/ui/command';
import { context-menu } from '@/components/ui/context-menu';
import { resizable } from '@/components/ui/resizable';
import { sonner } from '@/components/ui/sonner';
import { toast } from '@/components/ui/toast';

function Wrap({ children }: { children: React.ReactNode }) {
  return (<div style={{ maxWidth: 900, padding: 16 }}>{children}</div>);
}

export default { title: 'Components/UI/Remaining' };

export const alert-dialogDefault: StoryObj = {
  name: 'alert-dialog / Default',
  render: () => <Wrap><alert-dialog  /></Wrap>,
}

export const collapsibleDefault: StoryObj = {
  name: 'collapsible / Default',
  render: () => <Wrap><collapsible  /></Wrap>,
}

export const commandDefault: StoryObj = {
  name: 'command / Default',
  render: () => <Wrap><command  /></Wrap>,
}

export const context-menuDefault: StoryObj = {
  name: 'context-menu / Default',
  render: () => <Wrap><context-menu  /></Wrap>,
}

export const resizableDefault: StoryObj = {
  name: 'resizable / Default',
  render: () => <Wrap><resizable  /></Wrap>,
}

export const sonnerDefault: StoryObj = {
  name: 'sonner / Default',
  render: () => <Wrap><sonner  /></Wrap>,
}

export const toastDefault: StoryObj = {
  name: 'toast / Default',
  render: () => <Wrap><toast  /></Wrap>,
}

export const CatalystToastDefault: StoryObj = {
  name: 'CatalystToast / Default',
  render: () => <Wrap><CatalystToast id="item-1" type={{{}}} title="Sample item title" onClose={fn()} /></Wrap>,
}

export const CatalystToastContainerDefault: StoryObj = {
  name: 'CatalystToastContainer / Default',
  render: () => <Wrap><CatalystToastContainer toasts=[] /></Wrap>,
}
