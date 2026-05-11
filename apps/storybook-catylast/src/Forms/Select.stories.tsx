import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@catylast/primitives";
import { space } from "@catylast/tokens";
import { useState } from "react";

const meta: Meta = {
  title: "Forms/Select",
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  render: function DefaultSelect() {
    const [v, setV] = useState("medium");
    return (
      <div style={{ padding: space[20] }}>
        <Select value={v} onValueChange={setV}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectLabel>Priority</SelectLabel>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectSeparator />
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  },
};

export const Sizes: Story = {
  render: function SelectSizes() {
    const [v1, setV1] = useState("md");
    const [v2, setV2] = useState("md");
    return (
      <div style={{ display: "flex", gap: space[16], padding: space[20] }}>
        <Select value={v1} onValueChange={setV1}>
          <SelectTrigger size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sm">Small</SelectItem>
            <SelectItem value="md">Medium</SelectItem>
            <SelectItem value="lg">Large</SelectItem>
          </SelectContent>
        </Select>
        <Select value={v2} onValueChange={setV2}>
          <SelectTrigger size="md">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sm">Small</SelectItem>
            <SelectItem value="md">Medium</SelectItem>
            <SelectItem value="lg">Large</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  },
};

export const GhostVariant: Story = {
  name: "Ghost variant (for inline cells)",
  render: function Ghost() {
    const [v, setV] = useState("done");
    return (
      <div style={{ padding: space[20] }}>
        <Select value={v} onValueChange={setV}>
          <SelectTrigger size="sm" variant="ghost">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todo">To do</SelectItem>
            <SelectItem value="in-progress">In progress</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  },
};

export const Disabled: Story = {
  render: () => (
    <div style={{ padding: space[20] }}>
      <Select disabled value="locked">
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="locked">Locked option</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
};
