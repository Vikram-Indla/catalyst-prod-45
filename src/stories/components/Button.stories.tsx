import type { Meta, StoryObj } from '@storybook/react';
import Button from '@atlaskit/button/new';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = { args: { appearance: 'primary', children: 'Create issue' } };
export const Subtle: Story = { args: { appearance: 'subtle', children: 'Cancel' } };
export const Default: Story = { args: { children: 'Save changes' } };
export const Danger: Story = { args: { appearance: 'danger', children: 'Delete item' } };
export const Link: Story = { args: { appearance: 'link', children: 'View details' } };
export const Disabled: Story = { args: { appearance: 'primary', children: 'Submit', isDisabled: true } };

export const AllAppearances: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <Button appearance="primary">Primary</Button>
      <Button>Default</Button>
      <Button appearance="subtle">Subtle</Button>
      <Button appearance="link">Link</Button>
      <Button appearance="danger">Danger</Button>
      <Button appearance="warning">Warning</Button>
      <Button appearance="primary" isDisabled>Disabled</Button>
    </div>
  ),
};
