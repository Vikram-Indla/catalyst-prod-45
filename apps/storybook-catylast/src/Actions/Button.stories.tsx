import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Button,
  ButtonGroup,
  IconButton,
  LinkButton,
  LinkIconButton,
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
  SplitButton,
} from "@catylast/primitives";
import { color, fontFamily, space } from "@catylast/tokens";
import { useState } from "react";

const componentDescription = `**Button** is the workhorse interactive primitive across Catylast — every Save, Cancel, Submit, "+ Create", filter, view-mode toggle, and inline action flows through it.

The full button family ships from \`@catylast/primitives\`:

- **Button** — text + optional icon, the default for any action
- **IconButton** — square icon-only button, used in toolbars and dense surfaces
- **LinkButton** — renders as \`<a>\` (or a router Link), styled like a Button
- **LinkIconButton** — IconButton rendered as an anchor
- **SplitButton** — primary action + dropdown trigger sharing a vertical seam
- **ButtonGroup** — multiple buttons grouped as one widget (gapped or segmented)

Eight **appearances**: \`default\`, \`primary\`, \`subtle\`, \`subtle-link\`, \`link\`, \`warning\`, \`danger\`, \`discovery\`.

Three **sizes**: \`small\` (24px), \`medium\` (32px), \`large\` (40px).

Three **spacing** densities: \`default\`, \`compact\`, \`none\`.

States: \`isDisabled\`, \`isLoading\`, \`isSelected\`, \`shouldFitContainer\`.

Every styling dimension is exposed as both an enum prop and a CSS variable (\`--btn-bg\`, \`--btn-radius\`, \`--btn-padding-x\`, \`--btn-shadow\`, …) so consumers can override per-instance via \`style\` without touching the prop API.`;

const meta: Meta<typeof Button> = {
  title: "Actions/Button",
  component: Button,
  parameters: {
    layout: "centered",
    docs: { description: { component: componentDescription } },
  },
  args: { children: "Button" },
  argTypes: {
    appearance: {
      control: "inline-radio",
      options: [
        "default",
        "primary",
        "subtle",
        "subtle-link",
        "link",
        "warning",
        "danger",
        "discovery",
      ],
    },
    size: {
      control: "inline-radio",
      options: ["small", "medium", "large"],
    },
    spacing: {
      control: "inline-radio",
      options: ["default", "compact", "none"],
    },
    isDisabled: { control: "boolean" },
    isLoading: { control: "boolean" },
    isSelected: { control: "boolean" },
    shouldFitContainer: { control: "boolean" },
  },
};
export default meta;

type Story = StoryObj<typeof Button>;

// ---------- shared helpers ----------

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

const APPEARANCES = [
  "default",
  "primary",
  "subtle",
  "subtle-link",
  "link",
  "warning",
  "danger",
  "discovery",
] as const;

// ---------- Button stories ----------

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "The simplest button — no appearance prop, no icons, no states. Renders the `default` appearance at `medium` size with `default` spacing.",
      },
    },
  },
  args: { children: "Save changes" },
};

export const Appearances: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Eight appearances. `default` is the workhorse; `primary` for the single most-important action on a surface; `subtle` for low-emphasis affordances inside a busy UI; `subtle-link` and `link` for inline link-styled actions; `warning` / `danger` for cautionary destructive actions; `discovery` (purple) for AI / new-feature affordances.",
      },
    },
  },
  render: () =>
    padded(
      <>
        {APPEARANCES.map((a) => (
          <div key={a}>
            <div style={labelStyle}>{a}</div>
            <Button appearance={a}>{a}</Button>
          </div>
        ))}
      </>,
    ),
};

export const Sizes: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Three size scales. `small` (24px tall) for dense surfaces (table cells, toolbars), `medium` (32px, default) for most contexts, `large` (40px) for hero CTAs and primary onboarding buttons.",
      },
    },
  },
  render: () =>
    padded(
      <>
        {(["small", "medium", "large"] as const).map((s) => (
          <div key={s}>
            <div style={labelStyle}>{s}</div>
            <Button appearance="primary" size={s}>
              {s}
            </Button>
          </div>
        ))}
      </>,
    ),
};

export const Spacing: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Horizontal padding density, independent of size. `default` is the size's standard padding; `compact` tightens it for dense surfaces; `none` zeroes padding entirely (good for `link` / `subtle-link` appearances).",
      },
    },
  },
  render: () =>
    padded(
      <>
        {(["default", "compact", "none"] as const).map((sp) => (
          <div key={sp}>
            <div style={labelStyle}>{sp}</div>
            <Button appearance="default" spacing={sp}>
              spacing = {sp}
            </Button>
          </div>
        ))}
      </>,
    ),
};

export const Icons: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "`iconBefore` and `iconAfter` accept either a registered icon name (string) or any React node. Icon size auto-scales with button size.",
      },
    },
  },
  render: () =>
    padded(
      <>
        <Button appearance="primary" iconBefore="check">
          Approve
        </Button>
        <Button appearance="default" iconAfter="chevron-down">
          More options
        </Button>
        <Button appearance="subtle" iconBefore="pencil" iconAfter="external-link">
          Edit and open
        </Button>
        <Button
          appearance="discovery"
          iconBefore={<span aria-hidden>✨</span>}
        >
          Custom node icon
        </Button>
      </>,
    ),
};

export const States: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "`isDisabled` — reduced opacity, no clicks, no focus on Tab. `isLoading` — spinner over the label, width preserved, no clicks. `isSelected` — accent border + tinted background; pair with `aria-pressed` semantics for a toggle.",
      },
    },
  },
  render: () =>
    padded(
      <>
        <div>
          <div style={labelStyle}>Default</div>
          <Button appearance="primary">Save</Button>
        </div>
        <div>
          <div style={labelStyle}>Disabled</div>
          <Button appearance="primary" isDisabled>
            Save
          </Button>
        </div>
        <div>
          <div style={labelStyle}>Loading</div>
          <Button appearance="primary" isLoading>
            Save
          </Button>
        </div>
        <div>
          <div style={labelStyle}>Selected</div>
          <Button appearance="default" isSelected>
            Filter on
          </Button>
        </div>
      </>,
    ),
};

export const FullWidth: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "`shouldFitContainer` stretches the button to fill its parent. Use for full-width form submit buttons on mobile or in narrow side panels.",
      },
    },
  },
  render: () => (
    <div style={{ width: "320px", padding: space[24] }}>
      <Button appearance="primary" shouldFitContainer iconBefore="check">
        Submit application
      </Button>
    </div>
  ),
};

export const PolymorphicAs: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Pass `as` to render the button as a different element or component. Use `as=\"a\"` for plain anchors, or `as={RouterLink}` for client-side routing.",
      },
    },
  },
  render: () =>
    padded(
      <>
        <Button as="a" href="#" appearance="primary" iconBefore="external-link">
          As anchor
        </Button>
        <Button as="div" appearance="subtle">
          As div (no semantics)
        </Button>
      </>,
    ),
};

// ---------- IconButton ----------

export const IconButtons: Story = {
  name: "IconButton — appearances",
  parameters: {
    docs: {
      description: {
        story:
          "`<IconButton>` is square, icon-only, and shares the same appearance / size / state model as `<Button>`. The `label` prop is required and becomes the `aria-label`.",
      },
    },
  },
  render: () =>
    padded(
      <>
        {APPEARANCES.filter((a) => a !== "subtle-link" && a !== "link").map(
          (a) => (
            <div key={a}>
              <div style={labelStyle}>{a}</div>
              <IconButton icon="more-horizontal" label="More" appearance={a} />
            </div>
          ),
        )}
      </>,
    ),
};

export const IconButtonSizes: Story = {
  name: "IconButton — sizes",
  parameters: {
    docs: {
      description: {
        story:
          "Three sizes: `small` (24×24), `medium` (32×32), `large` (40×40). Icon glyph size auto-scales.",
      },
    },
  },
  render: () =>
    padded(
      <>
        {(["small", "medium", "large"] as const).map((s) => (
          <div key={s}>
            <div style={labelStyle}>{s}</div>
            <IconButton icon="settings" label="Settings" size={s} />
          </div>
        ))}
      </>,
    ),
};

export const IconButtonStates: Story = {
  name: "IconButton — states",
  render: () =>
    padded(
      <>
        <div>
          <div style={labelStyle}>Default</div>
          <IconButton icon="star" label="Star" />
        </div>
        <div>
          <div style={labelStyle}>Selected</div>
          <IconButton icon="star" label="Unstar" isSelected />
        </div>
        <div>
          <div style={labelStyle}>Disabled</div>
          <IconButton icon="star" label="Star" isDisabled />
        </div>
        <div>
          <div style={labelStyle}>Loading</div>
          <IconButton icon="star" label="Star" isLoading />
        </div>
      </>,
    ),
};

// ---------- LinkButton ----------

export const LinkButtons: Story = {
  name: "LinkButton",
  parameters: {
    docs: {
      description: {
        story:
          "Renders as `<a>` by default. Pass `href` for a native anchor, or `as={RouterLink}` to integrate with Next.js / React Router. Same appearance / size / spacing API as Button.",
      },
    },
  },
  render: () =>
    padded(
      <>
        <LinkButton href="#" appearance="primary" iconAfter="external-link">
          Visit docs
        </LinkButton>
        <LinkButton href="#" appearance="default">
          About
        </LinkButton>
        <LinkButton href="#" appearance="link">
          Inline link-styled
        </LinkButton>
      </>,
    ),
};

export const LinkIconButtons: Story = {
  name: "LinkIconButton",
  parameters: {
    docs: {
      description: {
        story:
          "Anchor + IconButton combined. Useful for navigation icons (settings cog → /settings, github icon → /github).",
      },
    },
  },
  render: () =>
    padded(
      <>
        <LinkIconButton
          href="https://github.com/"
          target="_blank"
          rel="noreferrer"
          icon="external-link"
          label="GitHub repo"
        />
        <LinkIconButton href="#" icon="settings" label="Settings" />
        <LinkIconButton
          href="#"
          icon="external-link"
          label="Open external"
          appearance="primary"
        />
      </>,
    ),
};

// ---------- SplitButton ----------

export const SplitButtons: Story = {
  name: "SplitButton",
  parameters: {
    docs: {
      description: {
        story:
          "Two adjacent buttons that share a vertical seam — primary action on the left, dropdown trigger on the right. Compose a `<Menu>` around the right half for the menu's keyboard / focus behavior. Pair both halves with the same `appearance` for visual consistency.",
      },
    },
  },
  render: function SplitStory() {
    const [last, setLast] = useState("Save");
    return padded(
      <>
        <SplitButton label="Save options">
          <Button appearance="primary" onClick={() => setLast("Save")}>
            Save
          </Button>
          <Menu>
            <MenuTrigger asChild>
              <IconButton
                icon="chevron-down"
                label="Save options"
                appearance="primary"
              />
            </MenuTrigger>
            <MenuContent align="end">
              <MenuItem onSelect={() => setLast("Save and continue")}>
                Save and continue
              </MenuItem>
              <MenuItem onSelect={() => setLast("Save as draft")}>
                Save as draft
              </MenuItem>
              <MenuItem onSelect={() => setLast("Save and close")}>
                Save and close
              </MenuItem>
            </MenuContent>
          </Menu>
        </SplitButton>
        <SplitButton label="Default save options">
          <Button appearance="default" iconBefore="check">
            Approve
          </Button>
          <Menu>
            <MenuTrigger asChild>
              <IconButton
                icon="chevron-down"
                label="More approval options"
                appearance="default"
              />
            </MenuTrigger>
            <MenuContent align="end">
              <MenuItem>Approve and notify</MenuItem>
              <MenuItem>Approve silently</MenuItem>
            </MenuContent>
          </Menu>
        </SplitButton>
        <div style={labelStyle}>Last action: {last}</div>
      </>,
    );
  },
};

// ---------- ButtonGroup ----------

export const ButtonGroupGapped: Story = {
  name: "ButtonGroup — gapped",
  parameters: {
    docs: {
      description: {
        story:
          "The default `ButtonGroup` mode — a horizontal row with consistent gap between children. Use for related-but-distinct actions (Save, Cancel, Delete on a form footer).",
      },
    },
  },
  render: () =>
    padded(
      <>
        <ButtonGroup label="Form actions">
          <Button appearance="primary">Save</Button>
          <Button appearance="default">Save as draft</Button>
          <Button appearance="subtle">Cancel</Button>
        </ButtonGroup>
      </>,
    ),
};

export const ButtonGroupSegmented: Story = {
  name: "ButtonGroup — segmented",
  parameters: {
    docs: {
      description: {
        story:
          "`isSegmented` collapses the buttons into a single segmented control — adjacent borders share a seam, outside corners round as a unit, and the focused / selected segment lifts above its neighbors. Use for filters, view-modes, sort-orders that read as one widget.",
      },
    },
  },
  render: function SegmentedStory() {
    const [view, setView] = useState<"list" | "board" | "calendar">("board");
    return padded(
      <>
        <ButtonGroup label="View mode" isSegmented>
          {(["list", "board", "calendar"] as const).map((v) => (
            <Button
              key={v}
              appearance="default"
              isSelected={view === v}
              onClick={() => setView(v)}
              iconBefore={
                v === "list"
                  ? "list"
                  : v === "board"
                    ? "layout-grid"
                    : "calendar"
              }
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </Button>
          ))}
        </ButtonGroup>
        <ButtonGroup label="Text format" isSegmented>
          <IconButton icon="bold" label="Bold" />
          <IconButton icon="italic" label="Italic" />
          <IconButton icon="underline" label="Underline" />
          <IconButton icon="strikethrough" label="Strikethrough" />
        </ButtonGroup>
      </>,
    );
  },
};

export const ButtonGroupVertical: Story = {
  name: "ButtonGroup — vertical",
  parameters: {
    docs: {
      description: {
        story:
          "`orientation=\"vertical\"` stacks the buttons. Combine with `isSegmented` for a side-rail switcher (think Figma's left rail tools).",
      },
    },
  },
  render: () =>
    padded(
      <>
        <ButtonGroup label="Side rail" orientation="vertical" isSegmented>
          <IconButton icon="panel-left" label="Home" size="large" />
          <IconButton icon="search" label="Search" size="large" />
          <IconButton icon="flag" label="Notifications" size="large" />
          <IconButton icon="settings" label="Settings" size="large" />
        </ButtonGroup>
      </>,
    ),
};

// ---------- escape hatch ----------

export const CssVariableEscapeHatch: Story = {
  name: "CSS variable escape hatch",
  parameters: {
    docs: {
      description: {
        story:
          "Every prop maps to a CSS variable on the root element (`--btn-bg`, `--btn-color`, `--btn-radius`, `--btn-padding-x`, `--btn-shadow`, …). Power users can override the same variables directly via `style` for values outside the enum vocabulary — exact pixel sizes, brand colors, custom shadows.",
      },
    },
  },
  render: () =>
    padded(
      <>
        <Button
          style={
            {
              "--btn-bg": "var(--catylast-color-purple-500)",
              "--btn-bg-hover": "var(--catylast-color-purple-600)",
              "--btn-color": "var(--catylast-color-neutral-0)",
              "--btn-radius": "999px",
              "--btn-padding-x": "20px",
              "--btn-shadow": "0 6px 18px rgba(120, 80, 200, 0.35)",
            } as React.CSSProperties
          }
        >
          Branded pill
        </Button>
        <Button
          appearance="primary"
          style={
            {
              "--btn-radius": "0",
              "--btn-min-height": "48px",
              "--btn-font-size": "16px",
              "--btn-padding-x": "32px",
            } as React.CSSProperties
          }
        >
          Square hero
        </Button>
      </>,
    ),
};

// ---------- showcase ----------

export const Showcase: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Everything wired together — appearances, sizes, icon slots, link buttons, split buttons, segmented and vertical groups. This is what a real Catylast surface ends up using.",
      },
    },
  },
  render: function ShowcaseStory() {
    const [filter, setFilter] = useState<"all" | "open" | "done">("open");
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: space[24],
          padding: space[24],
          background: color.surface.background,
          fontFamily: fontFamily.sans,
        }}
      >
        <div style={{ display: "flex", gap: space[8], alignItems: "center" }}>
          <Button appearance="primary" iconBefore="plus">
            Create issue
          </Button>
          <SplitButton label="Save options">
            <Button appearance="default" iconBefore="check">
              Save
            </Button>
            <Menu>
              <MenuTrigger asChild>
                <IconButton
                  icon="chevron-down"
                  label="Save options"
                  appearance="default"
                />
              </MenuTrigger>
              <MenuContent align="end">
                <MenuItem>Save and continue</MenuItem>
                <MenuItem>Save and close</MenuItem>
              </MenuContent>
            </Menu>
          </SplitButton>
          <Button appearance="subtle">Cancel</Button>
          <span style={{ flex: 1 }} />
          <Button appearance="discovery" iconBefore="zap">
            Try with AI
          </Button>
        </div>
        <ButtonGroup label="Filter" isSegmented>
          {(["all", "open", "done"] as const).map((f) => (
            <Button
              key={f}
              appearance="default"
              isSelected={filter === f}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </ButtonGroup>
        <div style={{ display: "flex", gap: space[8] }}>
          <IconButton icon="bold" label="Bold" />
          <IconButton icon="italic" label="Italic" />
          <IconButton icon="underline" label="Underline" />
          <IconButton icon="link" label="Link" appearance="primary" />
          <IconButton icon="more-horizontal" label="More" />
        </div>
        <div style={{ display: "flex", gap: space[12], alignItems: "center" }}>
          <LinkButton href="#" appearance="link" iconAfter="external-link">
            View documentation
          </LinkButton>
          <LinkButton href="#" appearance="subtle-link">
            Privacy
          </LinkButton>
        </div>
        <div style={{ display: "flex", gap: space[8] }}>
          <Button appearance="warning" iconBefore="alert-triangle">
            Move to archive
          </Button>
          <Button appearance="danger" iconBefore="trash">
            Delete permanently
          </Button>
        </div>
      </div>
    );
  },
};
