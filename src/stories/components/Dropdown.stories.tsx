import type { Meta, StoryObj } from '@storybook/react';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';

const meta: Meta<typeof DropdownMenu> = {
  title: 'Components/Dropdown',
  component: DropdownMenu,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof DropdownMenu>;

export const Default: Story = {
  render: () => (
    <DropdownMenu trigger="Actions">
      <DropdownItemGroup>
        <DropdownItem>Edit issue</DropdownItem>
        <DropdownItem>Assign to me</DropdownItem>
        <DropdownItem>Add label</DropdownItem>
        <DropdownItem>Move to sprint</DropdownItem>
      </DropdownItemGroup>
      <DropdownItemGroup>
        <DropdownItem>
          <span style={{ color: 'var(--ds-text-danger)' }}>Delete issue</span>
        </DropdownItem>
      </DropdownItemGroup>
    </DropdownMenu>
  ),
};

export const MoreActions: Story = {
  render: () => (
    <DropdownMenu trigger="More">
      <DropdownItemGroup title="Actions">
        <DropdownItem>Copy issue key</DropdownItem>
        <DropdownItem>Copy issue link</DropdownItem>
        <DropdownItem>Open in Jira</DropdownItem>
      </DropdownItemGroup>
      <DropdownItemGroup title="Move">
        <DropdownItem>Move to backlog</DropdownItem>
        <DropdownItem>Move to sprint</DropdownItem>
      </DropdownItemGroup>
    </DropdownMenu>
  ),
};
