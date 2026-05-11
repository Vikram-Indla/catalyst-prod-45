import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button, IconButton, Tooltip } from "@catylast/primitives";
import { space } from "@catylast/tokens";

const meta: Meta<typeof Tooltip> = {
  title: "Overlay/Tooltip",
  component: Tooltip,
};
export default meta;

type Story = StoryObj<typeof Tooltip>;

export const Default: Story = {
  render: () => (
    <div style={{ padding: space[80] }}>
      <Tooltip content="Saves the current draft">
        <Button variant="primary">Save</Button>
      </Tooltip>
    </div>
  ),
};

export const OnIconButton: Story = {
  render: () => (
    <div style={{ padding: space[80] }}>
      <Tooltip content="Settings">
        <IconButton icon="settings" label="Settings" />
      </Tooltip>
    </div>
  ),
};

export const Sides: Story = {
  render: () => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, auto)",
        gap: space[24],
        padding: space[80],
        justifyContent: "center",
      }}
    >
      {(["top", "right", "bottom", "left"] as const).map((side) => (
        <Tooltip key={side} content={`Side: ${side}`} side={side}>
          <Button>{side}</Button>
        </Tooltip>
      ))}
    </div>
  ),
};
