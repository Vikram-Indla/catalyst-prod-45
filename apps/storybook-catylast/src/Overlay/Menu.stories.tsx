import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  IconButton,
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MenuTrigger,
} from "@catylast/primitives";
import { space } from "@catylast/tokens";

const meta: Meta = {
  title: "Overlay/Menu",
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <div style={{ padding: space[40] }}>
      <Menu>
        <MenuTrigger asChild>
          <IconButton icon="more-horizontal" label="More actions" />
        </MenuTrigger>
        <MenuContent>
          <MenuLabel>Row actions</MenuLabel>
          <MenuItem>Edit</MenuItem>
          <MenuItem>Duplicate</MenuItem>
          <MenuItem>Move to…</MenuItem>
          <MenuSeparator />
          <MenuItem variant="danger">Delete</MenuItem>
        </MenuContent>
      </Menu>
    </div>
  ),
};
