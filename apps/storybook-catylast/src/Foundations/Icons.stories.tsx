import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Icon,
  iconNames,
  PriorityIcon,
  PRIORITY_NAMES,
  WORK_ITEM_TYPE_NAMES,
  WorkItemTypeIcon,
} from "@catylast/icons";
import { color, fontFamily, fontSize, radius, space } from "@catylast/tokens";

const meta: Meta = {
  title: "Foundations/Icons",
};
export default meta;

type Story = StoryObj;

export const All: Story = {
  render: () => (
    <div
      style={{
        padding: space[20],
        fontFamily: fontFamily.sans,
        color: color.text.primary,
      }}
    >
      <div
        style={{
          marginBottom: space[16],
          fontSize: fontSize.sm,
          color: color.text.subtle,
        }}
      >
        {iconNames.length} icons in the registry
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: space[8],
        }}
      >
        {iconNames.map((name) => (
          <div
            key={name}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: space[8],
              padding: space[12],
              borderRadius: radius.sm,
              border: `1px solid ${color.border.subtle}`,
              background: color.surface.raised,
            }}
          >
            <Icon name={name} size={24} />
            <div
              style={{
                fontSize: fontSize.xs,
                color: color.text.subtle,
                fontFamily: fontFamily.mono,
                textAlign: "center",
                wordBreak: "break-all",
              }}
            >
              {name}
            </div>
          </div>
        ))}
      </div>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: space[24],
        padding: space[20],
        fontFamily: fontFamily.sans,
        color: color.text.primary,
      }}
    >
      {[12, 14, 16, 20, 24, 32, 40].map((size) => (
        <div
          key={size}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: space[6],
          }}
        >
          <Icon name="check-circle" size={size} />
          <div style={{ fontSize: fontSize.xs, color: color.text.subtle }}>
            {size}px
          </div>
        </div>
      ))}
    </div>
  ),
};

export const Colors: Story = {
  render: () => (
    <div
      style={{
        display: "flex",
        gap: space[16],
        alignItems: "center",
        padding: space[20],
        fontFamily: fontFamily.sans,
      }}
    >
      <span style={{ color: color.text.primary }}>
        <Icon name="check-circle" size={24} />
      </span>
      <span style={{ color: color.text.accent }}>
        <Icon name="info" size={24} />
      </span>
      <span style={{ color: color.text.success }}>
        <Icon name="check-circle" size={24} />
      </span>
      <span style={{ color: color.text.warning }}>
        <Icon name="alert-triangle" size={24} />
      </span>
      <span style={{ color: color.text.danger }}>
        <Icon name="alert-circle" size={24} />
      </span>
    </div>
  ),
};

export const Accessible: Story = {
  render: () => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: space[12],
        padding: space[20],
        fontFamily: fontFamily.sans,
        color: color.text.primary,
        fontSize: fontSize.sm,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: space[8] }}>
        <Icon name="info" size={16} />
        <span>
          Decorative — no <code>label</code> prop, hidden from assistive tech
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: space[8] }}>
        <Icon name="info" size={16} label="More info" />
        <span>
          Labeled — <code>label="More info"</code>, exposed as an image
        </span>
      </div>
    </div>
  ),
};

// ---------- Catylast brand icon families: work-item types + priorities -----

export const WorkItemTypes: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "All 14 brand-colored work-item type icons. Each glyph keeps its native artwork and color so it stays recognizable across surfaces. Pair `WorkItemTypeIcon` with row data to render the right icon per row in the DynamicTable.",
      },
    },
  },
  render: () => (
    <div
      style={{
        padding: space[20],
        fontFamily: fontFamily.sans,
        color: color.text.primary,
      }}
    >
      <div
        style={{
          marginBottom: space[16],
          fontSize: fontSize.sm,
          color: color.text.subtle,
        }}
      >
        {WORK_ITEM_TYPE_NAMES.length} work-item types
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: space[8],
        }}
      >
        {WORK_ITEM_TYPE_NAMES.map((name) => (
          <div
            key={name}
            style={{
              display: "flex",
              alignItems: "center",
              gap: space[10],
              padding: space[12],
              borderRadius: radius.sm,
              border: `1px solid ${color.border.subtle}`,
              background: color.surface.raised,
            }}
          >
            <WorkItemTypeIcon name={name} size={20} />
            <span style={{ fontSize: fontSize.sm }}>
              {name}
            </span>
          </div>
        ))}
      </div>
    </div>
  ),
};

export const Priorities: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Six priority tiers — `none`, `lowest`, `low`, `medium`, `high`, `highest`. Each glyph uses its semantic color (red for highest, blue for low, etc.). `PRIORITY_ORDER` exposes a numeric ordering for sortable priority columns.",
      },
    },
  },
  render: () => (
    <div
      style={{
        padding: space[20],
        fontFamily: fontFamily.sans,
        color: color.text.primary,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: space[8],
        }}
      >
        {PRIORITY_NAMES.map((name) => (
          <div
            key={name}
            style={{
              display: "flex",
              alignItems: "center",
              gap: space[10],
              padding: space[12],
              borderRadius: radius.sm,
              border: `1px solid ${color.border.subtle}`,
              background: color.surface.raised,
            }}
          >
            <PriorityIcon name={name} size={20} />
            <span style={{ fontSize: fontSize.sm }}>{name}</span>
          </div>
        ))}
      </div>
    </div>
  ),
};

export const PreviewTitle: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Both `WorkItemTypeIcon` and `PriorityIcon` accept a `previewTitle` prop. `false` (default) renders the glyph alone — perfect for dense table cells. `true` renders the canonical label inline. Pass a custom string to override the label.",
      },
    },
  },
  render: () => (
    <div
      style={{
        padding: space[20],
        fontFamily: fontFamily.sans,
        color: color.text.primary,
        display: "flex",
        flexDirection: "column",
        gap: space[24],
      }}
    >
      <div>
        <div
          style={{
            marginBottom: space[8],
            fontSize: fontSize.xs,
            fontWeight: 600,
            textTransform: "uppercase",
            color: color.text.subtle,
            letterSpacing: "0.04em",
          }}
        >
          Work-item type — icon only vs icon + label
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: space[12],
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: space[6],
              padding: space[12],
              borderRadius: radius.sm,
              border: `1px solid ${color.border.subtle}`,
              background: color.surface.raised,
            }}
          >
            <div
              style={{ fontSize: fontSize.xs, color: color.text.subtle }}
            >
              previewTitle = false (default)
            </div>
            <div style={{ display: "flex", gap: space[12] }}>
              <WorkItemTypeIcon name="epic" size={18} />
              <WorkItemTypeIcon name="qa-bug" size={18} />
              <WorkItemTypeIcon name="story" size={18} />
              <WorkItemTypeIcon name="feature" size={18} />
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: space[6],
              padding: space[12],
              borderRadius: radius.sm,
              border: `1px solid ${color.border.subtle}`,
              background: color.surface.raised,
            }}
          >
            <div
              style={{ fontSize: fontSize.xs, color: color.text.subtle }}
            >
              previewTitle = true
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: space[4] }}>
              <WorkItemTypeIcon name="epic" size={18} previewTitle />
              <WorkItemTypeIcon name="qa-bug" size={18} previewTitle />
              <WorkItemTypeIcon name="story" size={18} previewTitle />
              <WorkItemTypeIcon name="feature" size={18} previewTitle />
            </div>
          </div>
        </div>
      </div>
      <div>
        <div
          style={{
            marginBottom: space[8],
            fontSize: fontSize.xs,
            fontWeight: 600,
            textTransform: "uppercase",
            color: color.text.subtle,
            letterSpacing: "0.04em",
          }}
        >
          Priority — icon only vs icon + label
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: space[12],
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: space[6],
              padding: space[12],
              borderRadius: radius.sm,
              border: `1px solid ${color.border.subtle}`,
              background: color.surface.raised,
            }}
          >
            <div
              style={{ fontSize: fontSize.xs, color: color.text.subtle }}
            >
              previewTitle = false (default)
            </div>
            <div style={{ display: "flex", gap: space[16] }}>
              <PriorityIcon name="highest" size={18} />
              <PriorityIcon name="high" size={18} />
              <PriorityIcon name="medium" size={18} />
              <PriorityIcon name="low" size={18} />
              <PriorityIcon name="lowest" size={18} />
              <PriorityIcon name="none" size={18} />
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: space[6],
              padding: space[12],
              borderRadius: radius.sm,
              border: `1px solid ${color.border.subtle}`,
              background: color.surface.raised,
            }}
          >
            <div
              style={{ fontSize: fontSize.xs, color: color.text.subtle }}
            >
              previewTitle = true
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: space[4],
              }}
            >
              <PriorityIcon name="highest" size={18} previewTitle />
              <PriorityIcon name="high" size={18} previewTitle />
              <PriorityIcon name="medium" size={18} previewTitle />
              <PriorityIcon name="low" size={18} previewTitle />
              <PriorityIcon name="lowest" size={18} previewTitle />
              <PriorityIcon name="none" size={18} previewTitle />
            </div>
          </div>
        </div>
      </div>
    </div>
  ),
};
