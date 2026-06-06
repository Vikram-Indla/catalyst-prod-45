import type { Meta, StoryObj } from '@storybook/react';
import { CatalystDrawer } from '@/components/ads/CatalystDrawer';
import { useState } from 'react';
import Button from '@atlaskit/button/new';

function DrawerDemo({ width }: { width?: 'narrow' | 'medium' | 'wide' | 'full' }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button appearance="primary" onClick={() => setOpen(true)}>Open {width || 'wide'} drawer</Button>
      <CatalystDrawer isOpen={open} onClose={() => setOpen(false)} label="Detail drawer" width={width}>
        <div style={{ padding: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 16px 0' }}>Drawer content</h2>
          <p style={{ fontSize: 14, color: 'var(--ds-text-subtle, #42526E)' }}>
            This is a Catalyst drawer using @atlaskit/drawer with ADS tokens.
          </p>
        </div>
      </CatalystDrawer>
    </>
  );
}

const meta: Meta = {
  title: 'Components/Drawer',
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj;

export const Wide: Story = { render: () => <DrawerDemo width="wide" /> };
export const Narrow: Story = { render: () => <DrawerDemo width="narrow" /> };
export const Medium: Story = { render: () => <DrawerDemo width="medium" /> };
export const Full: Story = { render: () => <DrawerDemo width="full" /> };
