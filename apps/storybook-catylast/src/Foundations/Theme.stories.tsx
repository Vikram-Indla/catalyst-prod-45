import type { Meta, StoryObj } from "@storybook/react-vite";
import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";
import {
  color,
  fontFamily,
  fontSize,
  fontWeight,
  radius,
  space,
} from "@catylast/tokens";
import { ThemeProvider, ThemeScope, useTheme } from "@catylast/theme";

const meta: Meta = {
  title: "Foundations/Theme",
};
export default meta;

type Story = StoryObj;

const surfaceStyle: CSSProperties = {
  background: color.surface.background,
  color: color.text.primary,
  padding: space[20],
  borderRadius: radius.md,
  border: `1px solid ${color.border.default}`,
  fontFamily: fontFamily.sans,
};

function Card({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div style={surfaceStyle}>
      <div
        style={{
          fontSize: fontSize.md,
          fontWeight: fontWeight.semibold,
          marginBottom: space[8],
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: fontSize.sm, color: color.text.subtle }}>
        {children}
      </div>
    </div>
  );
}

export const Scope: Story = {
  name: "ThemeScope",
  render: () => (
    <div
      style={{
        display: "grid",
        gap: space[16],
        gridTemplateColumns: "1fr 1fr 1fr",
        fontFamily: fontFamily.sans,
      }}
    >
      <ThemeScope mode="light" style={{ padding: space[12] }}>
        <Card title="mode='light'">
          Forces this subtree to render in the light theme regardless of the
          global theme.
        </Card>
      </ThemeScope>
      <ThemeScope mode="dark" style={{ padding: space[12] }}>
        <Card title="mode='dark'">
          Forces this subtree to render in the dark theme.
        </Card>
      </ThemeScope>
      <ThemeScope mode="system" style={{ padding: space[12] }}>
        <Card title="mode='system'">
          Resolves to the user's OS preference and live-updates if it
          changes.
        </Card>
      </ThemeScope>
    </div>
  ),
};

function ProviderControls() {
  const { mode, resolvedMode, setMode } = useTheme();
  const modes = ["light", "dark", "system"] as const;
  return (
    <div style={surfaceStyle}>
      <div style={{ marginBottom: space[12], fontSize: fontSize.sm }}>
        <strong>mode:</strong> <code>{mode}</code>
        {"  "}
        <strong>resolvedMode:</strong> <code>{resolvedMode}</code>
      </div>
      <div style={{ display: "flex", gap: space[8] }}>
        {modes.map((m) => {
          const active = mode === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              style={{
                padding: `${space[6]} ${space[12]}`,
                background: active
                  ? color.accent.background
                  : color.surface.raised,
                color: active ? color.accent.text : color.text.primary,
                border: `1px solid ${active ? color.accent.background : color.border.default}`,
                borderRadius: radius.sm,
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: fontSize.sm,
                fontWeight: fontWeight.medium,
              }}
            >
              {m}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const Provider: Story = {
  name: "ThemeProvider + useTheme",
  render: function ProviderStory() {
    const [el, setEl] = useState<HTMLElement | null>(null);
    return (
      <div ref={setEl} style={{ padding: space[16], fontFamily: fontFamily.sans }}>
        <div
          style={{
            fontSize: fontSize.sm,
            color: color.text.subtle,
            marginBottom: space[12],
          }}
        >
          A locally-scoped ThemeProvider — its <code>target</code> is this
          wrapper, so toggling here doesn't disturb the rest of Storybook.
        </div>
        <ThemeProvider target={el} defaultMode="light">
          <ProviderControls />
        </ThemeProvider>
      </div>
    );
  },
};
