/**
 * Components/Common — auto-generated Storybook coverage
 */
import React from 'react';
import type { StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';
import { fn } from '@storybook/test';

import { ModuleGate } from '@/components/common/ModuleGate';

function Wrap({ children }: { children: React.ReactNode }) {
  return (<MemoryRouter><div style={{ maxWidth: 900, padding: 16 }}>{children}</div></MemoryRouter>);
}

export default { title: 'Components/Common' };

export const ModuleGateDefault: StoryObj = {
  name: 'ModuleGate / Default',
  render: () => <Wrap><ModuleGate moduleKey="BAU-5972" /></Wrap>,
}
