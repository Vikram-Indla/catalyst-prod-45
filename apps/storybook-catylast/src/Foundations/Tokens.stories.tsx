import type { Meta, StoryObj } from "@storybook/react-vite";
import type { CSSProperties } from "react";
import {
  color,
  space,
  radius,
  fontFamily,
  fontSize,
  fontWeight,
  elevation,
} from "@catylast/tokens";

const meta: Meta = {
  title: "Foundations/Tokens",
  parameters: {
    layout: "fullscreen",
  },
};
export default meta;

type Story = StoryObj;

const sectionStyle: CSSProperties = {
  padding: "32px",
  background: color.surface.background,
  color: color.text.primary,
  fontFamily: fontFamily.sans,
  minHeight: "100vh",
  boxSizing: "border-box",
};

const groupStyle: CSSProperties = {
  marginBottom: "40px",
};

const groupHeading: CSSProperties = {
  fontSize: fontSize.xl,
  fontWeight: fontWeight.semibold,
  marginBottom: "16px",
  color: color.text.primary,
};

const subHeading: CSSProperties = {
  fontSize: fontSize.sm,
  fontWeight: fontWeight.medium,
  marginTop: "20px",
  marginBottom: "8px",
  color: color.text.subtle,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

function Swatch({ name, value }: { name: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "8px",
        borderRadius: radius.sm,
        border: `1px solid ${color.border.subtle}`,
      }}
    >
      <div
        style={{
          width: "40px",
          height: "40px",
          background: value,
          borderRadius: radius.sm,
          border: `1px solid ${color.border.default}`,
          flexShrink: 0,
        }}
      />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.medium }}>
          {name}
        </div>
        <div
          style={{
            fontSize: fontSize.xs,
            color: color.text.subtle,
            fontFamily: fontFamily.mono,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

function ColorRamp({
  name,
  ramp,
}: {
  name: string;
  ramp: Record<string, string>;
}) {
  return (
    <>
      <div style={subHeading}>{name}</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "8px",
        }}
      >
        {Object.entries(ramp).map(([shade, value]) => (
          <Swatch key={shade} name={`${name}.${shade}`} value={value} />
        ))}
      </div>
    </>
  );
}

function SemanticGroup({
  name,
  group,
}: {
  name: string;
  group: Record<string, string>;
}) {
  return (
    <>
      <div style={subHeading}>{name}</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: "8px",
        }}
      >
        {Object.entries(group).map(([key, value]) => (
          <Swatch key={key} name={`${name}.${key}`} value={value} />
        ))}
      </div>
    </>
  );
}

export const Colors: Story = {
  render: () => (
    <div style={sectionStyle}>
      <div style={groupStyle}>
        <div style={groupHeading}>Color — Primitive ramps</div>
        <ColorRamp name="neutral" ramp={color.neutral} />
        <ColorRamp name="blue" ramp={color.blue} />
        <ColorRamp name="red" ramp={color.red} />
        <ColorRamp name="yellow" ramp={color.yellow} />
        <ColorRamp name="green" ramp={color.green} />
        <ColorRamp name="purple" ramp={color.purple} />
      </div>
      <div style={groupStyle}>
        <div style={groupHeading}>Color — Semantic</div>
        <SemanticGroup name="surface" group={color.surface} />
        <SemanticGroup name="text" group={color.text} />
        <SemanticGroup name="border" group={color.border} />
        <SemanticGroup name="accent" group={color.accent} />
        <SemanticGroup name="danger" group={color.danger} />
        <SemanticGroup name="success" group={color.success} />
        <SemanticGroup name="warning" group={color.warning} />
      </div>
    </div>
  ),
};

export const Spacing: Story = {
  render: () => (
    <div style={sectionStyle}>
      <div style={groupHeading}>Spacing</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {Object.entries(space).map(([key, value]) => (
          <div
            key={key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              fontSize: fontSize.sm,
            }}
          >
            <div
              style={{
                width: "60px",
                fontFamily: fontFamily.mono,
                color: color.text.subtle,
              }}
            >
              space[{key}]
            </div>
            <div
              style={{
                height: "20px",
                width: value,
                background: color.accent.background,
                borderRadius: radius.xs,
              }}
            />
            <div
              style={{
                fontFamily: fontFamily.mono,
                color: color.text.subtle,
              }}
            >
              {`var(--catylast-space-${key})`}
            </div>
          </div>
        ))}
      </div>
    </div>
  ),
};

export const Radius: Story = {
  render: () => (
    <div style={sectionStyle}>
      <div style={groupHeading}>Radius</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: "16px",
        }}
      >
        {Object.entries(radius).map(([key, value]) => (
          <div
            key={key}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
              padding: "12px",
            }}
          >
            <div
              style={{
                width: "100%",
                aspectRatio: "1 / 1",
                background: color.surface.raised,
                border: `1px solid ${color.border.default}`,
                borderRadius: value,
              }}
            />
            <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.medium }}>
              radius.{key}
            </div>
          </div>
        ))}
      </div>
    </div>
  ),
};

export const Typography: Story = {
  render: () => (
    <div style={sectionStyle}>
      <div style={groupHeading}>Typography</div>
      <div style={subHeading}>Font sizes</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {Object.entries(fontSize).map(([key, value]) => (
          <div
            key={key}
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "16px",
            }}
          >
            <div
              style={{
                width: "60px",
                fontSize: fontSize.xs,
                fontFamily: fontFamily.mono,
                color: color.text.subtle,
              }}
            >
              {key}
            </div>
            <div style={{ fontSize: value }}>The quick brown fox jumps</div>
          </div>
        ))}
      </div>
      <div style={subHeading}>Font weights</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {Object.entries(fontWeight).map(([key, value]) => (
          <div
            key={key}
            style={{
              fontSize: fontSize.lg,
              fontWeight: value,
            }}
          >
            {key} — The quick brown fox jumps
          </div>
        ))}
      </div>
    </div>
  ),
};

export const Elevation: Story = {
  render: () => (
    <div style={sectionStyle}>
      <div style={groupHeading}>Elevation</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: "32px",
          padding: "32px",
        }}
      >
        {Object.entries(elevation).map(([key, value]) => (
          <div
            key={key}
            style={{
              padding: "24px",
              background: color.surface.raised,
              borderRadius: radius.md,
              boxShadow: value,
              fontSize: fontSize.sm,
              fontWeight: fontWeight.medium,
              textAlign: "center",
            }}
          >
            elevation.{key}
          </div>
        ))}
      </div>
    </div>
  ),
};
