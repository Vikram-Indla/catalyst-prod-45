import type { Meta, StoryObj } from "@storybook/react-vite";
import { IconButton } from "@catylast/primitives";
import { color, fontFamily, space } from "@catylast/tokens";

const componentDescription = `**IconButton** is a square, icon-only button. It shares the same appearance / size / state model as \`<Button>\` and is the right choice for toolbars, dense surfaces, and table row-actions where space is at a premium.

The \`label\` prop is required and becomes the \`aria-label\` so screen-reader users still know what the button does.`;

const meta: Meta<typeof IconButton> = {
  title: "Actions/Button/IconButton",
  component: IconButton,
  parameters: {
    layout: "centered",
    docs: { description: { component: componentDescription } },
  },
  args: {
    icon: "settings",
    label: "Settings",
  },
  argTypes: {
    appearance: {
      control: "inline-radio",
      options: [
        "default",
        "primary",
        "subtle",
        "warning",
        "danger",
        "discovery",
      ],
    },
    size: {
      control: "inline-radio",
      options: ["small", "medium", "large"],
    },
    isDisabled: { control: "boolean" },
    isLoading: { control: "boolean" },
    isSelected: { control: "boolean" },
  },
};
export default meta;

type Story = StoryObj<typeof IconButton>;

const labelStyle = {
  fontSize: "12px",
  fontFamily: fontFamily.sans,
  color: color.text.subtle,
  marginBottom: space[6],
};

const padded = (children: React.ReactNode) => (
  <div
    style={{
      display: "flex",
      gap: space[16],
      flexWrap: "wrap",
      alignItems: "flex-start",
      padding: space[24],
      background: color.surface.background,
    }}
  >
    {children}
  </div>
);

export const Default: Story = {};

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: "flex", alignItems: "center", gap: space[12] }}>
      <IconButton {...args} size="small" />
      <IconButton {...args} size="medium" />
      <IconButton {...args} size="large" />
    </div>
  ),
};

export const Appearances: Story = {
  render: () =>
    padded(
      <>
        {(
          ["default", "primary", "subtle", "warning", "danger", "discovery"] as const
        ).map((a) => (
          <div key={a}>
            <div style={labelStyle}>{a}</div>
            <IconButton icon="more-horizontal" label="More" appearance={a} />
          </div>
        ))}
      </>,
    ),
};

export const States: Story = {
  render: () =>
    padded(
      <>
        <div>
          <div style={labelStyle}>Default</div>
          <IconButton icon="star" label="Star this item" />
        </div>
        <div>
          <div style={labelStyle}>Selected</div>
          <IconButton icon="star" label="Unstar this item" isSelected />
        </div>
        <div>
          <div style={labelStyle}>Disabled</div>
          <IconButton icon="star" label="Star this item" isDisabled />
        </div>
        <div>
          <div style={labelStyle}>Loading</div>
          <IconButton icon="star" label="Star this item" isLoading />
        </div>
      </>,
    ),
};

export const ToolbarRow: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "How a toolbar row of icon buttons looks side-by-side. Pair with `<ButtonGroup isSegmented>` if you want them to read as a single segmented widget.",
      },
    },
  },
  render: () =>
    padded(
      <>
        <IconButton icon="bold" label="Bold" />
        <IconButton icon="italic" label="Italic" />
        <IconButton icon="underline" label="Underline" />
        <IconButton icon="strikethrough" label="Strikethrough" />
        <IconButton icon="code" label="Inline code" />
        <IconButton icon="link" label="Link" appearance="primary" />
        <IconButton icon="more-horizontal" label="More options" />
      </>,
    ),
};
