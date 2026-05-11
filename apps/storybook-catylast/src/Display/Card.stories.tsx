import type { Meta, StoryObj } from "@storybook/react-vite";
import { Card } from "@catylast/card";
import { Avatar, Badge, Button } from "@catylast/primitives";
import { Icon } from "@catylast/icons";
import {
  color,
  fontFamily,
  fontSize,
  fontWeight,
  space,
} from "@catylast/tokens";
import { useState } from "react";

const componentDescription = `**Card** is the surface primitive for any contained block in Catylast — board cards, dashboard widgets, settings tiles, profile blocks, modal content surfaces. It is *not* a domain-specific component; the work-item card is built on top of it (see CLAUDE.md §17 for the architectural rationale).

The component ships **three variants**, **five states**, and **four named slots**:

- **Variants** — \`outlined\` (default — 1px border), \`elevated\` (shadow only), \`filled\` (raised surface, no border)
- **States** — default, hover (interactive only), pressed (interactive only), selected, disabled
- **Slots** — \`Card.Cover\` (full-bleed media), \`Card.Header\`, \`Card.Body\`, \`Card.Footer\`
- **Interactive** — set \`interactive\` to make the card a focusable button-shaped affordance with keyboard support (Enter / Space). Combine with \`onClick\`.

All values resolve through \`@catylast/tokens\` semantic tokens — dark mode, future themes, and high-contrast all just work.`;

const meta: Meta<typeof Card> = {
  title: "Display/Card",
  component: Card,
  parameters: {
    layout: "centered",
    docs: {
      description: { component: componentDescription },
    },
  },
  argTypes: {
    variant: {
      control: "inline-radio",
      options: ["outlined", "elevated", "filled"],
    },
    size: {
      control: "inline-radio",
      options: ["sm", "md", "lg"],
    },
    radius: {
      control: "inline-radio",
      options: ["none", "sm", "md", "lg", "xl", "full"],
    },
    padding: {
      control: "inline-radio",
      options: [undefined, "none", "sm", "md", "lg"],
    },
    elevation: {
      control: "inline-radio",
      options: [undefined, "none", "xs", "sm", "md", "lg", "xl"],
    },
    tone: {
      control: "inline-radio",
      options: ["neutral", "accent", "success", "warning", "danger"],
    },
    interactive: { control: "boolean" },
    selected: { control: "boolean" },
    disabled: { control: "boolean" },
    fullWidth: { control: "boolean" },
    coverImage: { control: "text" },
    coverHeight: { control: "text" },
    backgroundImage: { control: "text" },
    backgroundOverlay: { control: "boolean" },
  },
};
export default meta;

type Story = StoryObj<typeof Card>;

// ---------- shared helpers ----------

const titleStyle = {
  margin: 0,
  fontFamily: fontFamily.sans,
  fontSize: fontSize.md,
  fontWeight: fontWeight.semibold,
  color: color.text.primary,
};

const subStyle = {
  margin: 0,
  fontFamily: fontFamily.sans,
  fontSize: fontSize.sm,
  color: color.text.subtle,
};

const padded = (children: React.ReactNode) => (
  <div
    style={{
      padding: space[24],
      display: "flex",
      gap: space[16],
      flexWrap: "wrap",
      alignItems: "flex-start",
      background: color.surface.background,
      minHeight: "320px",
    }}
  >
    {children}
  </div>
);

// ---------- stories ----------

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Default card with header / body / footer. The slot subcomponents handle their own padding and dividing borders so authoring is always one level shallow.",
      },
    },
  },
  render: () => (
    <div style={{ width: "320px" }}>
      <Card variant="outlined">
        <Card.Header>
          <h3 style={titleStyle}>Project status</h3>
        </Card.Header>
        <Card.Body>
          <p style={subStyle}>
            Sprint 12 is on track. Three issues blocked, two ready for
            review.
          </p>
        </Card.Body>
        <Card.Footer>Updated 2 hours ago</Card.Footer>
      </Card>
    </div>
  ),
};

export const Variants: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Three variants for three contexts: **outlined** is the workhorse (subtle 1px border, no shadow); **elevated** lifts the card off the page when it's the primary focus; **filled** uses a raised surface tint and is good when the surrounding page already uses an outline (e.g. inside a panel).",
      },
    },
  },
  render: () =>
    padded(
      <>
        {(["outlined", "elevated", "filled"] as const).map((v) => (
          <div key={v} style={{ width: "240px" }}>
            <Card variant={v}>
              <Card.Header>
                <strong style={titleStyle}>{v}</strong>
              </Card.Header>
              <Card.Body>
                <p style={subStyle}>
                  The same body copy in each variant — note how the surface
                  treatment changes around it.
                </p>
              </Card.Body>
            </Card>
          </div>
        ))}
      </>,
    ),
};

export const States: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "**Hover** and **pressed** only apply when the card is `interactive`. **Selected** indicates a card is part of a selection set (e.g. multi-select board). **Disabled** desaturates the card, removes the focus ring, and is excluded from the tab order.",
      },
    },
  },
  render: () =>
    padded(
      <>
        <div style={{ width: "220px" }}>
          <Card>
            <Card.Body>
              <strong style={titleStyle}>Default</strong>
              <p style={subStyle}>Static card, no interaction affordance.</p>
            </Card.Body>
          </Card>
        </div>
        <div style={{ width: "220px" }}>
          <Card interactive onClick={() => undefined}>
            <Card.Body>
              <strong style={titleStyle}>Interactive</strong>
              <p style={subStyle}>
                Hover, press, and focus this card with the keyboard.
              </p>
            </Card.Body>
          </Card>
        </div>
        <div style={{ width: "220px" }}>
          <Card interactive selected onClick={() => undefined}>
            <Card.Body>
              <strong style={titleStyle}>Selected</strong>
              <p style={subStyle}>
                Accent border + tinted background — same as for selection in
                the rest of the design system.
              </p>
            </Card.Body>
          </Card>
        </div>
        <div style={{ width: "220px" }}>
          <Card interactive disabled onClick={() => undefined}>
            <Card.Body>
              <strong style={titleStyle}>Disabled</strong>
              <p style={subStyle}>
                Not focusable, not clickable, desaturated. Hover and active
                effects suppressed.
              </p>
            </Card.Body>
          </Card>
        </div>
      </>,
    ),
};

export const Slots: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "All slots are optional. **Cover** is full-bleed (no padding) — drop an `<img>` straight in and it fills edge-to-edge. **Header** and **Footer** share a hairline border with **Body**, so they only show as separate regions when present.",
      },
    },
  },
  render: () =>
    padded(
      <>
        <div style={{ width: "260px" }}>
          <Card variant="outlined">
            <Card.Cover>
              <div
                style={{
                  height: "120px",
                  background:
                    "linear-gradient(135deg, var(--catylast-color-blue-400), var(--catylast-color-purple-500))",
                }}
              />
            </Card.Cover>
            <Card.Header>
              <h3 style={titleStyle}>Cover + Header + Body</h3>
            </Card.Header>
            <Card.Body>
              <p style={subStyle}>
                A hero card layout — colored cover band on top, dense header,
                body copy underneath.
              </p>
            </Card.Body>
          </Card>
        </div>
        <div style={{ width: "260px" }}>
          <Card variant="outlined">
            <Card.Body>
              <strong style={titleStyle}>Body only</strong>
              <p style={subStyle}>
                The simplest shape — drop content directly into the body
                without header or footer borders.
              </p>
            </Card.Body>
          </Card>
        </div>
        <div style={{ width: "260px" }}>
          <Card variant="elevated">
            <Card.Body>
              <strong style={titleStyle}>Body + Footer</strong>
              <p style={subStyle}>
                Useful when you have a primary action under the content.
              </p>
            </Card.Body>
            <Card.Footer>
              <Button variant="primary" size="sm">
                Open
              </Button>
            </Card.Footer>
          </Card>
        </div>
      </>,
    ),
};

export const Interactive: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'When `interactive` is set on a default `<div>` card, the component renders with `role="button"`, `tabIndex={0}`, and handles **Enter** / **Space** to fire `onClick`. The card draws a `focus-visible` ring matching the rest of the design system. Use `as="a"` and supply `href` to render the card as a real link instead.',
      },
    },
  },
  render: function InteractiveStory() {
    const [count, setCount] = useState(0);
    return (
      <div style={{ width: "300px" }}>
        <Card interactive onClick={() => setCount((c) => c + 1)}>
          <Card.Header>
            <Icon name="zap" size={16} />
            <strong style={titleStyle}>Click me</strong>
          </Card.Header>
          <Card.Body>
            <p style={subStyle}>
              Click anywhere on this card or focus it with{" "}
              <kbd>Tab</kbd> and press <kbd>Enter</kbd> or <kbd>Space</kbd>.
            </p>
          </Card.Body>
          <Card.Footer>Clicks: {count}</Card.Footer>
        </Card>
      </div>
    );
  },
};

export const SelectableGrid: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Pattern for a multi-select grid: each card is `interactive` and toggles its `selected` state on click. The browser's native focus order works out of the box.",
      },
    },
  },
  render: function SelectableGridStory() {
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const toggle = (id: string) => {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    };
    const items = [
      { id: "free", title: "Free", price: "$0", note: "Up to 5 users." },
      {
        id: "pro",
        title: "Pro",
        price: "$12",
        note: "Unlimited users + integrations.",
      },
      {
        id: "enterprise",
        title: "Enterprise",
        price: "Talk to us",
        note: "SSO, audit logs, dedicated CSM.",
      },
    ];
    return (
      <div style={{ display: "flex", gap: space[16], padding: space[24] }}>
        {items.map((it) => (
          <div key={it.id} style={{ width: "220px" }}>
            <Card
              interactive
              selected={selected.has(it.id)}
              onClick={() => toggle(it.id)}
            >
              <Card.Header>
                <strong style={titleStyle}>{it.title}</strong>
              </Card.Header>
              <Card.Body>
                <p
                  style={{
                    ...subStyle,
                    fontSize: fontSize.xl,
                    color: color.text.primary,
                    fontWeight: fontWeight.bold,
                  }}
                >
                  {it.price}
                </p>
                <p style={subStyle}>{it.note}</p>
              </Card.Body>
              <Card.Footer>
                {selected.has(it.id) ? "Selected" : "Click to select"}
              </Card.Footer>
            </Card>
          </div>
        ))}
      </div>
    );
  },
};

export const AsLink: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Pass `as="a"` (or any other tag/component) to render the card as a different element. The polymorphic typing forwards element-specific props (e.g. `href` on an anchor).',
      },
    },
  },
  render: () => (
    <div style={{ width: "300px" }}>
      <Card
        as="a"
        href="https://example.com"
        target="_blank"
        rel="noreferrer"
        interactive
        variant="elevated"
        style={{ textDecoration: "none" }}
      >
        <Card.Header>
          <Icon name="external-link" size={14} />
          <strong style={titleStyle}>Documentation</strong>
        </Card.Header>
        <Card.Body>
          <p style={subStyle}>
            Opens in a new tab. The whole card is the click target — no
            nested anchor.
          </p>
        </Card.Body>
      </Card>
    </div>
  ),
};

export const WorkItemComposition: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "How a work-item card looks when composed from `Card` + design system primitives. This is the pattern the Catylast app uses today; once it stabilizes across surfaces it will be promoted into a dedicated `WorkItemCard` package (see CLAUDE.md §17.3 phase 2). The point of this story is to demonstrate that the primitive is enough — no domain knowledge baked into `@catylast/card`.",
      },
    },
  },
  render: () => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 280px)",
        gap: space[16],
        padding: space[24],
      }}
    >
      <Card interactive variant="outlined">
        <Card.Header>
          <Icon
            name="bug"
            size={16}
            style={{ color: color.text.danger }}
          />
          <span
            style={{
              ...subStyle,
              fontFamily: fontFamily.mono,
              fontSize: fontSize.xs,
            }}
          >
            CAT-128
          </span>
          <span style={{ flex: 1 }} />
          <Badge variant="warning">In review</Badge>
        </Card.Header>
        <Card.Body>
          <strong style={titleStyle}>Editor crashes on slash menu</strong>
          <p style={subStyle}>
            Reported by 3 users. Repro on Chromium 120+. Fix in flight.
          </p>
        </Card.Body>
        <Card.Footer>
          <Avatar size="sm" name="Wasim Khan" />
          <span style={{ flex: 1 }} />
          <span style={subStyle}>3 SP · Due Mar 12</span>
        </Card.Footer>
      </Card>

      <Card interactive variant="outlined">
        <Card.Header>
          <Icon
            name="check-circle"
            size={16}
            style={{ color: color.text.success }}
          />
          <span
            style={{
              ...subStyle,
              fontFamily: fontFamily.mono,
              fontSize: fontSize.xs,
            }}
          >
            CAT-130
          </span>
          <span style={{ flex: 1 }} />
          <Badge variant="success">Ready</Badge>
        </Card.Header>
        <Card.Body>
          <strong style={titleStyle}>Card primitive ships at Beta</strong>
          <p style={subStyle}>
            Variants, states, slots, interactive, polymorphic — everything in
            the spec. Stories cover the matrix.
          </p>
        </Card.Body>
        <Card.Footer>
          <Avatar size="sm" name="Maya Patel" />
          <span style={{ flex: 1 }} />
          <span style={subStyle}>2 SP · Mar 14</span>
        </Card.Footer>
      </Card>
    </div>
  ),
};

// ────────── new dynamic-knob stories ──────────

export const Sizes: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "`size` (`sm` / `md` / `lg`) scales the slot padding so the same card markup can be used as a dense list row, a default board card, or a roomy hero card. Independent of `padding` (which overrides body padding only) and `radius` (which controls corners).",
      },
    },
  },
  render: () =>
    padded(
      <>
        {(["sm", "md", "lg"] as const).map((s) => (
          <div key={s} style={{ width: "240px" }}>
            <Card variant="outlined" size={s}>
              <Card.Header>
                <strong style={titleStyle}>size = {s}</strong>
              </Card.Header>
              <Card.Body>
                <p style={subStyle}>
                  Padding scales with size; corners and shadow do not.
                </p>
              </Card.Body>
              <Card.Footer>Same content, different density</Card.Footer>
            </Card>
          </div>
        ))}
      </>,
    ),
};

export const Radii: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Corner radius is its own knob — `none / sm / md / lg / xl / full`. Each value resolves through `@catylast/tokens` so the Figma swap will update the whole library at once.",
      },
    },
  },
  render: () =>
    padded(
      <>
        {(["none", "sm", "md", "lg", "xl"] as const).map((r) => (
          <div key={r} style={{ width: "180px" }}>
            <Card variant="elevated" radius={r}>
              <Card.Body>
                <strong style={titleStyle}>radius = {r}</strong>
                <p style={subStyle}>
                  Sharper or softer per-instance — no CSS override needed.
                </p>
              </Card.Body>
            </Card>
          </div>
        ))}
      </>,
    ),
};

export const Elevations: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Shadow depth is independent of variant. `none / xs / sm / md / lg / xl` map directly to the elevation tokens. Useful when the card sits inside another elevated surface and needs to recede or pop without changing its overall variant.",
      },
    },
  },
  render: () =>
    padded(
      <>
        {(["none", "xs", "sm", "md", "lg", "xl"] as const).map((e) => (
          <div key={e} style={{ width: "180px" }}>
            <Card variant="outlined" elevation={e}>
              <Card.Body>
                <strong style={titleStyle}>elevation = {e}</strong>
                <p style={subStyle}>Shadow ramps up the elevation scale.</p>
              </Card.Body>
            </Card>
          </div>
        ))}
      </>,
    ),
};

export const Padding: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Body padding override. Use this when a card needs to be denser or more spacious than the size preset would give you (e.g. a settings tile inside a list).",
      },
    },
  },
  render: () =>
    padded(
      <>
        {(["none", "sm", "md", "lg"] as const).map((p) => (
          <div key={p} style={{ width: "220px" }}>
            <Card variant="outlined" padding={p}>
              <Card.Body>
                <strong style={titleStyle}>padding = {p}</strong>
                <p style={subStyle}>
                  Body padding only — header / footer follow the size scale.
                </p>
              </Card.Body>
            </Card>
          </div>
        ))}
      </>,
    ),
};

export const Tones: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "An accent strip along the top edge — useful for status-coded board cards, severity callouts, or to brand a card with the team / project color. Default height is 3px; override via `toneHeight`.",
      },
    },
  },
  render: () =>
    padded(
      <>
        {(["accent", "success", "warning", "danger"] as const).map((t) => (
          <div key={t} style={{ width: "200px" }}>
            <Card variant="outlined" tone={t}>
              <Card.Header>
                <strong style={titleStyle}>tone = {t}</strong>
              </Card.Header>
              <Card.Body>
                <p style={subStyle}>
                  Color comes from the token system, so dark mode flips
                  automatically.
                </p>
              </Card.Body>
            </Card>
          </div>
        ))}
        <div style={{ width: "200px" }}>
          <Card variant="outlined" tone="accent" toneHeight={6}>
            <Card.Header>
              <strong style={titleStyle}>toneHeight = 6px</strong>
            </Card.Header>
            <Card.Body>
              <p style={subStyle}>Custom strip thickness.</p>
            </Card.Body>
          </Card>
        </div>
      </>,
    ),
};

export const CoverImage: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Pass `coverImage` (URL) to auto-render a top cover region with that image. Use `coverHeight` to control its height. Equivalent to authoring `<Card.Cover><img src='…'/></Card.Cover>` manually — but as a one-prop convenience.",
      },
    },
  },
  render: () =>
    padded(
      <>
        <div style={{ width: "260px" }}>
          <Card
            variant="outlined"
            coverImage="https://images.unsplash.com/photo-1529070538774-1843cb3265df?auto=format&fit=crop&w=600&q=60"
            coverImageAlt="Mountain landscape"
            coverHeight={140}
          >
            <Card.Header>
              <strong style={titleStyle}>Mountain Trip</strong>
            </Card.Header>
            <Card.Body>
              <p style={subStyle}>
                Cover image rendered via prop — no nested slot needed.
              </p>
            </Card.Body>
            <Card.Footer>March 12, 2026</Card.Footer>
          </Card>
        </div>
        <div style={{ width: "260px" }}>
          <Card
            variant="elevated"
            coverImage="https://images.unsplash.com/photo-1488972685288-c3fd157d7c7a?auto=format&fit=crop&w=600&q=60"
            coverHeight={180}
            radius="lg"
          >
            <Card.Body>
              <strong style={titleStyle}>Tall cover, rounded card</strong>
              <p style={subStyle}>
                Combine `coverHeight` + `radius` for a magazine-style block.
              </p>
            </Card.Body>
          </Card>
        </div>
      </>,
    ),
};

export const BackgroundImage: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Pass `backgroundImage` to render a full-bleed image behind the card content. Pair with `backgroundOverlay` (or pass a custom gradient string) so foreground text remains legible. Use `textColor` to flip the body color for dark backgrounds.",
      },
    },
  },
  render: () =>
    padded(
      <>
        <div style={{ width: "280px" }}>
          <Card
            variant="elevated"
            radius="lg"
            backgroundImage="https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=60"
            backgroundOverlay
            textColor="#fff"
            interactive
            onClick={() => undefined}
          >
            <Card.Header style={{ borderBottom: "none" }}>
              <strong style={{ ...titleStyle, color: "#fff" }}>
                Full background image
              </strong>
            </Card.Header>
            <Card.Body>
              <p style={{ ...subStyle, color: "rgba(255,255,255,0.85)" }}>
                The image fills the whole card. The overlay sits between
                the image and the content so this text stays readable.
              </p>
            </Card.Body>
            <Card.Footer
              style={{ borderTop: "none", color: "rgba(255,255,255,0.7)" }}
            >
              Click the card →
            </Card.Footer>
          </Card>
        </div>
        <div style={{ width: "280px" }}>
          <Card
            variant="outlined"
            radius="lg"
            backgroundImage="https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?auto=format&fit=crop&w=600&q=60"
            backgroundOverlay="linear-gradient(135deg, rgba(20,30,55,0.85), rgba(60,30,90,0.55))"
            textColor="#fff"
          >
            <Card.Body>
              <strong style={{ ...titleStyle, color: "#fff" }}>
                Custom overlay
              </strong>
              <p style={{ ...subStyle, color: "rgba(255,255,255,0.85)" }}>
                Pass any CSS color or gradient string to{" "}
                <code>backgroundOverlay</code> — full control over the tint.
              </p>
            </Card.Body>
          </Card>
        </div>
      </>,
    ),
};

export const CoverPlusBackground: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Both at once — `coverImage` renders a top cover region while `backgroundImage` fills the rest of the card. Stacking pattern for hero blocks where the cover is the primary focus and the background adds atmosphere.",
      },
    },
  },
  render: () => (
    <div style={{ padding: space[24], background: color.surface.background }}>
      <div style={{ width: "320px" }}>
        <Card
          variant="elevated"
          radius="lg"
          coverImage="https://images.unsplash.com/photo-1517816743773-6e0fd518b4a6?auto=format&fit=crop&w=600&q=60"
          coverHeight={140}
          backgroundImage="https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7?auto=format&fit=crop&w=600&q=60"
          backgroundOverlay="linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,255,255,0.96))"
          tone="accent"
        >
          <Card.Header>
            <strong style={titleStyle}>Catylast launch</strong>
          </Card.Header>
          <Card.Body>
            <p style={subStyle}>
              Cover photo on top, soft branded background underneath, accent
              strip across the very top edge — every layer composable.
            </p>
          </Card.Body>
          <Card.Footer>Read announcement →</Card.Footer>
        </Card>
      </div>
    </div>
  ),
};

export const FullyCustom: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "All knobs at once. The Storybook controls panel exposes every prop — drag them around to verify nothing is locked.",
      },
    },
  },
  args: {
    variant: "elevated",
    size: "lg",
    radius: "xl",
    padding: "lg",
    elevation: "lg",
    tone: "accent",
    interactive: true,
    coverImage:
      "https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&w=600&q=60",
    coverHeight: 160,
  },
  render: (args) => (
    <div style={{ padding: space[24], width: "360px" }}>
      <Card {...args}>
        <Card.Header>
          <strong style={titleStyle}>FullyCustom</strong>
        </Card.Header>
        <Card.Body>
          <p style={subStyle}>
            Edit any control on the right — radius, size, elevation, tone,
            cover image, or paint your own background and overlay. Defaults
            still flow from the design tokens, so dark mode flips work
            automatically when you switch the theme.
          </p>
        </Card.Body>
        <Card.Footer>Theme-aware, fully composable</Card.Footer>
      </Card>
    </div>
  ),
};

export const CssVariableEscapeHatch: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Every prop maps to a CSS variable on the root element (`--card-radius`, `--card-shadow`, `--card-padding`, `--card-tone-color`, `--card-bg-image`, …). Power users can override the same variables directly via `style` for values outside the enum vocabulary — e.g. an exact 14px radius, or a specific brand shadow.",
      },
    },
  },
  render: () => (
    <div style={{ padding: space[24], width: "320px" }}>
      <Card
        variant="outlined"
        style={
          {
            "--card-radius": "14px",
            "--card-shadow": "0 12px 32px rgba(20, 30, 90, 0.18)",
            "--card-tone-color": "var(--catylast-color-purple-500)",
            "--card-tone-height": "4px",
            "--card-padding": "20px",
          } as React.CSSProperties
        }
      >
        <Card.Header>
          <strong style={titleStyle}>Direct CSS-variable override</strong>
        </Card.Header>
        <Card.Body>
          <p style={subStyle}>
            Radius 14px, custom brand-blue shadow, purple 4px tone strip,
            20px body padding — all set via inline <code>style</code>{" "}
            without touching the component prop API.
          </p>
        </Card.Body>
      </Card>
    </div>
  ),
};
