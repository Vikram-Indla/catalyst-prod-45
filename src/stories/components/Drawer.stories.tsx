import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import Drawer from '@atlaskit/drawer';
import Button from '@atlaskit/button/new';
import { token } from '@atlaskit/tokens';

function DrawerHarness({ width }: { width: 'narrow' | 'medium' | 'wide' | 'full' }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ padding: 16 }}>
      <Button appearance="primary" onClick={() => setOpen(true)}>Open drawer</Button>
      <Drawer isOpen={open} onClose={() => setOpen(false)} width={width}>
        <div style={{ padding: 24 }}>
          <h2 style={{ font: `600 20px/24px var(--ds-font-family-body, "Atlassian Sans")`, color: token('color.text', '#172B4D'), margin: '0 0 12px' }}>
            Drawer title
          </h2>
          <p style={{ font: `400 14px/20px var(--ds-font-family-body, "Atlassian Sans")`, color: token('color.text.subtle', '#44546F'), margin: 0 }}>
            Slide-over panel for detail views, filters, and secondary flows. Press Escape or click the back arrow to close.
          </p>
        </div>
      </Drawer>
    </div>
  );
}

const meta: Meta<typeof DrawerHarness> = {
  title: 'Components/Drawer',
  component: DrawerHarness,
  parameters: { layout: 'fullscreen' },
};
export default meta;
type Story = StoryObj<typeof DrawerHarness>;

export const Medium: Story = { args: { width: 'medium' } };
export const Wide: Story = { args: { width: 'wide' } };
export const Narrow: Story = { args: { width: 'narrow' } };
