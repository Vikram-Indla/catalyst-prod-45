import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Avatar,
  DEFAULT_AVATAR_PALETTE,
  type AvatarPaletteEntry,
} from "@catylast/primitives";
import { color, fontFamily, space } from "@catylast/tokens";

const componentDescription = `**Avatar** is the visual identity primitive — paired with a name in comments, mention popovers, table row-actions, profile menus, and assignee pickers.

**Behavior:**

- If \`src\` is provided and the image loads, the photo is shown.
- If \`src\` is missing or fails to load, **initials** are derived from \`name\` and rendered in a colored tile.
- The tile color is **deterministically hashed from the name** (same name → same color, every render, every surface) so a person's avatar reads as theirs at a glance even before the photo loads.

**Customising the colors:**

- Pass \`appearance\` for a named preset (\`auto\` / \`neutral\` / \`blue\` / \`green\` / \`red\` / \`yellow\` / \`purple\`).
- Pass \`palette\` (an array of \`{ bg, color, borderColor? }\` entries) to override the default 8-color set with your own — typically a brand palette.
- Override per-instance via \`style\` using the CSS variables \`--avatar-bg\`, \`--avatar-color\`, \`--avatar-border-color\` for values outside the enum vocabulary.`;

const meta: Meta<typeof Avatar> = {
  title: "Display/Avatar",
  component: Avatar,
  parameters: {
    layout: "centered",
    docs: { description: { component: componentDescription } },
  },
  args: {
    name: "Alex Doe",
  },
  argTypes: {
    size: {
      control: "inline-radio",
      options: ["xs", "sm", "md", "lg", "xl"],
    },
    appearance: {
      control: "inline-radio",
      options: [
        "auto",
        "neutral",
        "blue",
        "green",
        "red",
        "yellow",
        "purple",
      ],
    },
  },
};
export default meta;

type Story = StoryObj<typeof Avatar>;

const padded = (children: React.ReactNode) => (
  <div
    style={{
      display: "flex",
      gap: space[12],
      flexWrap: "wrap",
      alignItems: "center",
      padding: space[24],
      background: color.surface.background,
      fontFamily: fontFamily.sans,
    }}
  >
    {children}
  </div>
);

const labelStyle = {
  fontSize: "12px",
  fontFamily: fontFamily.sans,
  color: color.text.subtle,
  marginBottom: space[6],
};

// A representative team list — varied initials to show the palette spread.
const TEAM = [
  "Wasim Khan",
  "Maya Patel",
  "Alex Doe",
  "Sarah Lee",
  "Tom Williams",
  "Priya Sharma",
  "Jordan Reyes",
  "Ben Cooper",
  "Lina Rossi",
  "Carlos Mendez",
  "Aiko Tanaka",
  "Noah Schmidt",
];

// ---------- stories ----------

export const Initials: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Default behavior — initials derived from `name`, with the background color hashed deterministically from the name. The same name always produces the same color across the entire app.",
      },
    },
  },
};

export const WithImage: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "When `src` resolves successfully, the photo replaces the colored tile. The colored tile is still computed underneath in case the image fails — there's never a frame of empty grey.",
      },
    },
  },
  args: {
    src: "https://i.pravatar.cc/100?u=catylast-1",
  },
};

export const FallbackOnImageError: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "If the `src` URL fails to load, the avatar falls back to the colored-initials tile based on `name`. The hash of the name picks the tile color so the fallback is consistent with the rest of the app.",
      },
    },
  },
  args: {
    src: "https://example.invalid/missing-image.png",
    name: "Wasim Khan",
  },
};

export const Sizes: Story = {
  render: () => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: space[16],
      }}
    >
      {(["xs", "sm", "md", "lg", "xl"] as const).map((s) => (
        <div key={s}>
          <div style={labelStyle}>{s}</div>
          <Avatar name="Wasim Khan" size={s} />
        </div>
      ))}
    </div>
  ),
};

export const NoName: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "When no `name` is provided, a `?` placeholder is shown on a neutral background.",
      },
    },
  },
  render: () => <Avatar />,
};

export const Team: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "A representative team list at default size. Each person's tile color is consistent across renders and across surfaces (a comment author's tile matches their tile in a mention popover, a row-selection cell, a profile menu).",
      },
    },
  },
  render: () =>
    padded(
      <>
        {TEAM.map((name) => (
          <div
            key={name}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: space[6],
              minWidth: "84px",
            }}
          >
            <Avatar name={name} size="lg" />
            <span
              style={{
                fontSize: "11px",
                color: color.text.subtle,
                fontFamily: fontFamily.sans,
                textAlign: "center",
              }}
            >
              {name}
            </span>
          </div>
        ))}
      </>,
    ),
};

export const Appearances: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "When you want to **force** a specific color rather than let the hash decide — `auto` (default — hash by name), `neutral` (no color signal), or any of the named presets.",
      },
    },
  },
  render: () =>
    padded(
      <>
        {(
          [
            "auto",
            "neutral",
            "blue",
            "green",
            "red",
            "yellow",
            "purple",
          ] as const
        ).map((a) => (
          <div key={a} style={{ textAlign: "center" }}>
            <div style={labelStyle}>{a}</div>
            <Avatar name="MP" size="lg" appearance={a} />
          </div>
        ))}
      </>,
    ),
};

export const CustomPalette: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Pass `palette` to override the default 8-color set with your own. The hash-by-name math runs over the supplied array, so the length and order of the palette determines which color a given name picks. Useful for matching a brand palette or a specific accessibility constraint.",
      },
    },
  },
  render: function CustomPaletteStory() {
    const brandPalette: AvatarPaletteEntry[] = [
      { bg: "#0F62FE", color: "#FFFFFF" }, // brand blue
      { bg: "#F1C21B", color: "#1F2933" }, // brand yellow
      { bg: "#198038", color: "#FFFFFF" }, // brand green
      { bg: "#D12771", color: "#FFFFFF" }, // brand pink
      { bg: "#491D8B", color: "#FFFFFF" }, // brand violet
    ];
    return padded(
      <>
        {TEAM.slice(0, 8).map((name) => (
          <div
            key={name}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: space[6],
              minWidth: "84px",
            }}
          >
            <Avatar name={name} size="lg" palette={brandPalette} />
            <span
              style={{
                fontSize: "11px",
                color: color.text.subtle,
                fontFamily: fontFamily.sans,
                textAlign: "center",
              }}
            >
              {name}
            </span>
          </div>
        ))}
      </>,
    );
  },
};

export const ExtendingTheDefaultPalette: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "If you want the default Catylast palette plus a few brand tones, spread `DEFAULT_AVATAR_PALETTE` and append your own entries. The expanded palette gives more visual variety in larger team lists.",
      },
    },
  },
  render: () => {
    const extended: AvatarPaletteEntry[] = [
      ...DEFAULT_AVATAR_PALETTE,
      { bg: "#0EA5A0", color: "#FFFFFF" }, // teal
      { bg: "#FB7185", color: "#1F2933" }, // soft pink
      { bg: "#F97316", color: "#FFFFFF" }, // orange
    ];
    return padded(
      <>
        {TEAM.map((name) => (
          <Avatar key={name} name={name} size="md" palette={extended} />
        ))}
      </>,
    );
  },
};

export const CssVariableEscapeHatch: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "For one-off overrides — a personal accent color, a special role, a holiday theme — set the underlying CSS variables directly via `style`. Inline styles win over both the `appearance` preset class and the `auto`-mode inline color so consumers always have final say.",
      },
    },
  },
  render: () =>
    padded(
      <>
        <div style={{ textAlign: "center" }}>
          <div style={labelStyle}>Default (auto)</div>
          <Avatar name="Wasim Khan" size="lg" />
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={labelStyle}>Branded — CSS vars</div>
          <Avatar
            name="Wasim Khan"
            size="lg"
            style={
              {
                "--avatar-bg":
                  "linear-gradient(135deg, var(--catylast-color-purple-500), var(--catylast-color-blue-500))",
                "--avatar-color": "#FFFFFF",
                "--avatar-border-color": "transparent",
              } as React.CSSProperties
            }
          />
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={labelStyle}>Square corners</div>
          <Avatar
            name="Wasim Khan"
            size="lg"
            style={
              {
                "--avatar-radius": "8px",
              } as React.CSSProperties
            }
          />
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={labelStyle}>Larger box</div>
          <Avatar
            name="Wasim Khan"
            size="lg"
            style={
              {
                "--avatar-size": "64px",
                "--avatar-font-size": "26px",
              } as React.CSSProperties
            }
          />
        </div>
      </>,
    ),
};

export const SameNameSameColor: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Demonstrates the deterministic hashing — three Avatars with the same `name` always pick the same color, regardless of size, surface, or render order. This is what makes a user's avatar feel like *theirs* across the whole app.",
      },
    },
  },
  render: () =>
    padded(
      <>
        {["Wasim Khan", "Maya Patel", "Sarah Lee"].map((name) => (
          <div
            key={name}
            style={{
              display: "flex",
              alignItems: "center",
              gap: space[8],
            }}
          >
            <Avatar name={name} size="sm" />
            <Avatar name={name} size="md" />
            <Avatar name={name} size="lg" />
            <span
              style={{
                fontSize: "12px",
                color: color.text.subtle,
                fontFamily: fontFamily.sans,
              }}
            >
              {name}
            </span>
          </div>
        ))}
      </>,
    ),
};
