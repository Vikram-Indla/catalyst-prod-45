/**
 * Components/Common — auto-generated Storybook coverage
 */
import React from 'react';
import type { StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';

import { ModuleGate } from '@/components/common/ModuleGate';

function Wrap({ children }: { children: React.ReactNode }) {
  return (<div style={{ maxWidth: 900, padding: 16 }}>{children}</div>);
}

export default { title: 'Components/Common' };

export const ModuleGateDefault: StoryObj = {
  name: 'ModuleGate / Default',
  render: () => <Wrap><ModuleGate moduleKey="BAU-5972" /></Wrap>,
}
