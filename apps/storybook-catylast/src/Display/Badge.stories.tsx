import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "@catylast/primitives";
import { space } from "@catylast/tokens";

const meta: Meta<typeof Badge> = {
  title: "Display/Badge",
  component: Badge,
  args: {
    children: "Badge",
  },
  argTypes: {
    variant: {
      control: "inline-radio",
      options: ["default", "primary", "success", "warning", "danger"],
    },
  },
};
export default meta;

type Story = StoryObj<typeof Badge>;

export const Default: Story = { args: { variant: "default" } };
export const Primary: Story = { args: { variant: "primary" } };
export const Success: Story = { args: { variant: "success" } };
export const Warning: Story = { args: { variant: "warning" } };
export const Danger: Story = { args: { variant: "danger" } };

export const Statuses: Story = {
  render: () => (
    <div style={{ display: "flex", gap: space[8], flexWrap: "wrap" }}>
      <Badge variant="default">To do</Badge>
      <Badge variant="primary">In progress</Badge>
      <Badge variant="success">Done</Badge>
      <Badge variant="warning">Blocked</Badge>
      <Badge variant="danger">Critical</Badge>
    </div>
  ),
};
