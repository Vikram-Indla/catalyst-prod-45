import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@catylast/primitives";
import { color, fontFamily, fontSize, radius, space } from "@catylast/tokens";

const meta: Meta = {
  title: "Overlay/ContextMenu",
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <div style={{ padding: space[40], fontFamily: fontFamily.sans }}>
      <ContextMenu>
        <ContextMenuTrigger>
          <div
            style={{
              padding: space[40],
              border: `2px dashed ${color.border.default}`,
              borderRadius: radius.md,
              textAlign: "center",
              fontSize: fontSize.sm,
              color: color.text.subtle,
              userSelect: "none",
            }}
          >
            Right-click anywhere in this area
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuLabel>Work item</ContextMenuLabel>
          <ContextMenuItem>Create work item</ContextMenuItem>
          <ContextMenuItem>Move work item</ContextMenuItem>
          <ContextMenuItem>Change parent</ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem>Edit dates</ContextMenuItem>
          <ContextMenuItem>Edit dependencies</ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem variant="danger">Delete</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  ),
};
