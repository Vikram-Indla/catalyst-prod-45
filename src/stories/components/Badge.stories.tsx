import type { Meta, StoryObj } from '@storybook/react';
import Lozenge from '@atlaskit/lozenge';

const meta: Meta<typeof Lozenge> = {
  title: 'Components/Badge (Lozenge)',
  component: Lozenge,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof Lozenge>;

export const Default: Story = { args: { children: 'Default', appearance: 'default' } };
export const Success: Story = { args: { children: 'Done', appearance: 'success' } };
export const Removed: Story = { args: { children: 'Blocked', appearance: 'removed' } };
export const Moved: Story = { args: { children: 'In review', appearance: 'moved' } };
export const New: Story = { args: { children: 'New', appearance: 'new' } };
export const InProgress: Story = { args: { children: 'In progress', appearance: 'inprogress' } };
export const Bold: Story = { args: { children: 'Done', appearance: 'success', isBold: true } };

export const AllAppearances: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <Lozenge appearance="default">Default</Lozenge>
      <Lozenge appearance="success">Success</Lozenge>
      <Lozenge appearance="removed">Removed</Lozenge>
      <Lozenge appearance="moved">Moved</Lozenge>
      <Lozenge appearance="new">New</Lozenge>
      <Lozenge appearance="inprogress">In progress</Lozenge>
    </div>
  ),
};

export const AllBold: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <Lozenge appearance="default" isBold>Default</Lozenge>
      <Lozenge appearance="success" isBold>Success</Lozenge>
      <Lozenge appearance="removed" isBold>Removed</Lozenge>
      <Lozenge appearance="moved" isBold>Moved</Lozenge>
      <Lozenge appearance="new" isBold>New</Lozenge>
      <Lozenge appearance="inprogress" isBold>In progress</Lozenge>
    </div>
  ),
};
