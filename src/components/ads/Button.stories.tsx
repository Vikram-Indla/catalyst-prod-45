/**
 * Button — Storybook canonical fixture.
 *
 * Every variant, state, and a11y permutation gets a named story. Each story
 * is exactly what Playwright's visual-regression project snapshots. Adding
 * a new variant to Button.tsx requires adding a story here — that's how
 * new behaviour becomes CI-covered.
 */
import type { Meta, StoryObj } from '@storybook/react';
import { Button, IconButton } from '@/components/ads';
import { Plus, Check, Trash2, ChevronDown } from 'lucide-react';

const meta: Meta<typeof Button> = {
  title: 'ADS/Button',
  component: Button,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    appearance: {
      control: 'select',
      options: ['primary', 'default', 'subtle', 'link', 'warning', 'danger'],
    },
    spacing: {
      control: 'select',
      options: ['default', 'compact', 'none'],
    },
  },
};
export default meta;

type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: { appearance: 'primary', children: 'Create' },
};

export const PrimaryWithIcon: Story = {
  args: {
    appearance: 'primary',
    iconBefore: <Plus size={14} strokeWidth={2.2} />,
    children: 'Create',
  },
};

export const Default: Story = {
  args: { appearance: 'default', children: 'Save' },
};

export const Subtle: Story = {
  args: { appearance: 'subtle', children: 'Cancel' },
};

export const Link: Story = {
  args: { appearance: 'link', children: 'Learn more' },
};

export const Warning: Story = {
  args: { appearance: 'warning', children: 'Archive' },
};

export const Danger: Story = {
  args: { appearance: 'danger', children: 'Delete', iconBefore: <Trash2 size={14} /> },
};

export const Disabled: Story = {
  args: { appearance: 'default', isDisabled: true, children: 'Disabled' },
};

export const Loading: Story = {
  args: { appearance: 'primary', isLoading: true, children: 'Creating' },
};

export const Compact: Story = {
  args: { appearance: 'default', spacing: 'compact', children: 'Add' },
};

export const IconOnly: StoryObj<typeof IconButton> = {
  render: (args) => <IconButton {...args} />,
  args: {
    icon: <ChevronDown size={14} />,
    'aria-label': 'Open menu',
  },
};

export const AllAppearances: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <Button appearance="primary">Primary</Button>
      <Button appearance="default">Default</Button>
      <Button appearance="subtle">Subtle</Button>
      <Button appearance="link">Link</Button>
      <Button appearance="warning">Warning</Button>
      <Button appearance="danger">Danger</Button>
    </div>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <Button appearance="primary" iconBefore={<Plus size={14} />}>Create</Button>
      <Button appearance="default" iconBefore={<Check size={14} />}>Confirm</Button>
      <Button appearance="danger" iconBefore={<Trash2 size={14} />}>Delete</Button>
    </div>
  ),
};
