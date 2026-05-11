import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@catylast/primitives";
import { color, fontSize, fontWeight, space } from "@catylast/tokens";

const meta: Meta = {
  title: "Overlay/Popover",
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <div style={{ padding: space[40] }}>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="secondary">Open popover</Button>
        </PopoverTrigger>
        <PopoverContent>
          <div
            style={{
              fontSize: fontSize.sm,
              fontWeight: fontWeight.semibold,
              color: color.text.primary,
              marginBottom: space[6],
            }}
          >
            Popover heading
          </div>
          <div style={{ fontSize: fontSize.sm, color: color.text.subtle }}>
            Popovers can hold any content. They animate, position themselves
            against the trigger, and trap focus until dismissed.
          </div>
        </PopoverContent>
      </Popover>
    </div>
  ),
};
