import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Avatar,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  DropdownItem,
  DropdownItemCheckbox,
  DropdownItemGroup,
  DropdownItemRadio,
  DropdownItemRadioGroup,
  IconButton,
} from "@catylast/primitives";
import { color, fontFamily, space } from "@catylast/tokens";
import { useState } from "react";

const componentDescription = `**DropdownMenu** is the disclosure menu primitive across Catylast — toolbars, table row actions, work-item-card kebabs, density switchers, anywhere a single trigger reveals a focused list of actions or settings.

The family ships from \`@catylast/primitives\` and pairs a single container with four item types:

- **DropdownMenu** — the root. Pass \`trigger\` (string for an auto-built button, or any node for a custom one) plus the items as children.
- **DropdownItem** — a regular action item. Closes the menu on click.
- **DropdownItemCheckbox** — a toggleable item. The menu stays open after click so users can flip multiple toggles.
- **DropdownItemRadio** + **DropdownItemRadioGroup** — single-select within a group.
- **DropdownItemGroup** — visually section items with an optional uppercase title and divider.

Built on Radix UI for keyboard navigation, focus trap, ARIA roles, and portaling. The visual layer is fully owned by Catylast — every dimension exposed as both an enum prop and a CSS variable (\`--ddm-bg\`, \`--ddm-radius\`, \`--ddm-item-padding-x\`, \`--ddm-item-bg-hover\`, \`--ddm-checkmark-color\`, …).

**Keyboard model:**

- **↑/↓** — move highlight between items.
- **→/←** — open / close sub-menus.
- **Enter / Space** — activate the highlighted item (or toggle a checkbox).
- **Esc** — close the menu and return focus to the trigger.
- **Type-ahead** — start typing a label to jump to that item.`;

const meta: Meta<typeof DropdownMenu> = {
  title: "Overlay/DropdownMenu",
  component: DropdownMenu,
  parameters: {
    layout: "centered",
    docs: { description: { component: componentDescription } },
  },
  argTypes: {
    placement: {
      control: "inline-radio",
      options: [
        "top",
        "right",
        "bottom",
        "left",
        "top-start",
        "top-end",
        "bottom-start",
        "bottom-end",
      ],
    },
    size: {
      control: "inline-radio",
      options: ["small", "medium", "large"],
    },
    isDisabled: { control: "boolean" },
    triggerAppearance: {
      control: "inline-radio",
      options: ["default", "primary", "subtle"],
    },
  },
};
export default meta;

type Story = StoryObj<typeof DropdownMenu>;

const wrapStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: space[16],
  padding: space[24],
  fontFamily: fontFamily.sans,
  alignItems: "flex-start",
  background: color.surface.background,
};

const labelStyle: React.CSSProperties = {
  fontSize: "12px",
  fontFamily: fontFamily.sans,
  color: color.text.subtle,
  marginBottom: space[6],
};

// ---------- stories ----------

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "The minimum viable menu — `trigger` as a string auto-builds a `<Button>` with a chevron, and items are passed as children. Each `DropdownItem` closes the menu on click and fires `onClick`.",
      },
    },
  },
  render: () => (
    <div style={wrapStyle}>
      <DropdownMenu trigger="Choose an action">
        <DropdownItem onClick={() => console.log("Edit")}>Edit</DropdownItem>
        <DropdownItem onClick={() => console.log("Move")}>Move…</DropdownItem>
        <DropdownItem onClick={() => console.log("Clone")}>Clone</DropdownItem>
        <DropdownItem onClick={() => console.log("Delete")} appearance="danger">
          Delete
        </DropdownItem>
      </DropdownMenu>
    </div>
  ),
};

export const TriggerVariants: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Triggers can be the auto-built string trigger, any custom node (`<Button>`, `<IconButton>`, a chip, a card), or rendered through an explicit `<DropdownMenuTrigger asChild>` for full polymorphism. The popup behaviour stays identical.",
      },
    },
  },
  render: () => (
    <div style={{ ...wrapStyle, flexDirection: "row", flexWrap: "wrap" }}>
      <div>
        <div style={labelStyle}>String → auto-built Button</div>
        <DropdownMenu trigger="Open menu">
          <DropdownItem>Edit</DropdownItem>
          <DropdownItem>Move</DropdownItem>
          <DropdownItem>Delete</DropdownItem>
        </DropdownMenu>
      </div>
      <div>
        <div style={labelStyle}>String + primary appearance</div>
        <DropdownMenu trigger="Save options" triggerAppearance="primary">
          <DropdownItem>Save</DropdownItem>
          <DropdownItem>Save and continue</DropdownItem>
          <DropdownItem>Save as draft</DropdownItem>
        </DropdownMenu>
      </div>
      <div>
        <div style={labelStyle}>Custom Button (passed as `trigger`)</div>
        <DropdownMenu
          trigger={
            <Button appearance="discovery" iconBefore="zap" iconAfter="chevron-down">
              AI actions
            </Button>
          }
        >
          <DropdownItem>Summarise</DropdownItem>
          <DropdownItem>Translate</DropdownItem>
          <DropdownItem>Improve writing</DropdownItem>
        </DropdownMenu>
      </div>
      <div>
        <div style={labelStyle}>IconButton trigger</div>
        <DropdownMenu
          trigger={<IconButton icon="more-horizontal" label="More options" />}
        >
          <DropdownItem iconBefore="pencil">Edit</DropdownItem>
          <DropdownItem iconBefore="copy">Duplicate</DropdownItem>
          <DropdownItem iconBefore="trash" appearance="danger">
            Delete
          </DropdownItem>
        </DropdownMenu>
      </div>
      <div>
        <div style={labelStyle}>Explicit `DropdownMenuTrigger asChild`</div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button appearance="subtle" iconAfter="chevron-down">
              Custom trigger
            </Button>
          </DropdownMenuTrigger>
          <DropdownItem>One</DropdownItem>
          <DropdownItem>Two</DropdownItem>
          <DropdownItem>Three</DropdownItem>
        </DropdownMenu>
      </div>
    </div>
  ),
};

export const Items: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Items support `iconBefore`, `iconAfter` (badges, shortcut hints, trailing chevrons), and `description` for a secondary line of text. `appearance=\"danger\"` colours destructive actions; `isDisabled` greys out unavailable ones.",
      },
    },
  },
  render: () => (
    <div style={wrapStyle}>
      <DropdownMenu trigger="Edit menu">
        <DropdownItem iconBefore="copy" iconAfter={<kbd>⌘C</kbd>}>
          Copy
        </DropdownItem>
        <DropdownItem iconBefore="paperclip" iconAfter={<kbd>⌘V</kbd>}>
          Paste
        </DropdownItem>
        <DropdownItem
          iconBefore="link"
          description="Get a sharable link to this issue."
        >
          Copy link
        </DropdownItem>
        <DropdownItem
          iconBefore="bookmark"
          iconAfter={<Badge variant="primary">New</Badge>}
        >
          Add to favourites
        </DropdownItem>
        <DropdownItem isDisabled iconBefore="lock">
          Restricted (no permission)
        </DropdownItem>
        <DropdownItem
          iconBefore="trash"
          appearance="danger"
          description="Permanently remove this issue and its history."
        >
          Delete forever
        </DropdownItem>
      </DropdownMenu>
    </div>
  ),
};

export const Groups: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Wrap items in `DropdownItemGroup` to add an uppercase title and / or a divider. Mixing group types (regular items, checkboxes, radios) inside one menu is fine — the visual treatment makes the boundaries obvious.",
      },
    },
  },
  render: () => (
    <div style={wrapStyle}>
      <DropdownMenu trigger="Workflow">
        <DropdownItemGroup title="Quick actions">
          <DropdownItem iconBefore="pencil">Edit</DropdownItem>
          <DropdownItem iconBefore="copy">Duplicate</DropdownItem>
          <DropdownItem iconBefore="link">Copy link</DropdownItem>
        </DropdownItemGroup>
        <DropdownItemGroup title="Move" hasSeparator>
          <DropdownItem>Move to backlog</DropdownItem>
          <DropdownItem>Move to in-progress</DropdownItem>
          <DropdownItem>Move to done</DropdownItem>
        </DropdownItemGroup>
        <DropdownItemGroup hasSeparator>
          <DropdownItem
            iconBefore="trash"
            appearance="danger"
          >
            Archive
          </DropdownItem>
        </DropdownItemGroup>
      </DropdownMenu>
    </div>
  ),
};

export const CheckboxItems: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "`DropdownItemCheckbox` toggles independently of its siblings. The menu stays open after a click so users can flip multiple toggles in one session — closing happens via Esc, blur, or any non-checkbox `DropdownItem`.",
      },
    },
  },
  render: function CheckboxStory() {
    const [showLineNumbers, setShowLineNumbers] = useState(true);
    const [showMinimap, setShowMinimap] = useState(false);
    const [wordWrap, setWordWrap] = useState(true);
    return (
      <div style={wrapStyle}>
        <DropdownMenu trigger="View settings">
          <DropdownItemGroup title="Editor view">
            <DropdownItemCheckbox
              isSelected={showLineNumbers}
              onClick={setShowLineNumbers}
              description="Show line numbers in the gutter."
            >
              Line numbers
            </DropdownItemCheckbox>
            <DropdownItemCheckbox
              isSelected={showMinimap}
              onClick={setShowMinimap}
            >
              Minimap
            </DropdownItemCheckbox>
            <DropdownItemCheckbox
              isSelected={wordWrap}
              onClick={setWordWrap}
            >
              Soft-wrap long lines
            </DropdownItemCheckbox>
          </DropdownItemGroup>
        </DropdownMenu>
        <div style={labelStyle}>
          line numbers: <strong>{showLineNumbers ? "on" : "off"}</strong>
          {" · "}
          minimap: <strong>{showMinimap ? "on" : "off"}</strong>
          {" · "}
          word wrap: <strong>{wordWrap ? "on" : "off"}</strong>
        </div>
      </div>
    );
  },
};

export const RadioGroup: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "`DropdownItemRadioGroup` enforces single-select. Toggling one radio deselects the others. Pair with `value` + `onChange` for fully-controlled behaviour, or use `defaultValue` for uncontrolled.",
      },
    },
  },
  render: function RadioStory() {
    const [density, setDensity] = useState("comfortable");
    return (
      <div style={wrapStyle}>
        <DropdownMenu trigger={`Density: ${density}`}>
          <DropdownItemRadioGroup
            title="Row density"
            value={density}
            onChange={setDensity}
          >
            <DropdownItemRadio
              id="compact"
              description="Tight rows for scanning many records."
            >
              Compact
            </DropdownItemRadio>
            <DropdownItemRadio id="comfortable">Comfortable</DropdownItemRadio>
            <DropdownItemRadio
              id="spacious"
              description="Roomy rows for inline-edit-heavy tables."
            >
              Spacious
            </DropdownItemRadio>
          </DropdownItemRadioGroup>
        </DropdownMenu>
        <div style={labelStyle}>
          Selected: <strong>{density}</strong>
        </div>
      </div>
    );
  },
};

export const SubMenu: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Nest a `<DropdownMenuSub>` block to create a sub-menu — the outer item shows a trailing chevron and opens the sub-popup on hover or `→`. Sub-menus inherit the parent's `size` automatically.",
      },
    },
  },
  render: () => (
    <div style={wrapStyle}>
      <DropdownMenu trigger="Move issue">
        <DropdownItem iconBefore="check">Mark as done</DropdownItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger iconBefore="folder">
            Move to project…
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownItem>Catylast (CAT)</DropdownItem>
            <DropdownItem>Mobile (MOB)</DropdownItem>
            <DropdownItem>Backend (BE)</DropdownItem>
            <DropdownItem>Design system (DS)</DropdownItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger iconBefore="user">
            Assign to…
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownItem>
              <Avatar size="sm" name="Wasim Khan" /> Wasim Khan
            </DropdownItem>
            <DropdownItem>
              <Avatar size="sm" name="Maya Patel" /> Maya Patel
            </DropdownItem>
            <DropdownItem>
              <Avatar size="sm" name="Sarah Lee" /> Sarah Lee
            </DropdownItem>
            <DropdownItem>
              <Avatar size="sm" name="Tom Williams" /> Tom Williams
            </DropdownItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownItem appearance="danger" iconBefore="trash">
          Archive
        </DropdownItem>
      </DropdownMenu>
    </div>
  ),
};

export const Sizes: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Three sizes scale padding and font size together. The size propagates to all items via context — sub-menus and nested groups inherit automatically.",
      },
    },
  },
  render: () => (
    <div style={{ ...wrapStyle, flexDirection: "row", gap: space[24] }}>
      {(["small", "medium", "large"] as const).map((s) => (
        <div key={s}>
          <div style={labelStyle}>{s}</div>
          <DropdownMenu trigger={s} size={s}>
            <DropdownItem iconBefore="copy">Copy</DropdownItem>
            <DropdownItem iconBefore="paperclip">Paste</DropdownItem>
            <DropdownItem iconBefore="trash" appearance="danger">
              Delete
            </DropdownItem>
          </DropdownMenu>
        </div>
      ))}
    </div>
  ),
};

export const Placements: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "`placement` accepts the four sides plus their `-start` / `-end` variants. Radix flips placement automatically when the popup would clip the viewport.",
      },
    },
  },
  render: () => (
    <div
      style={{
        ...wrapStyle,
        flexDirection: "row",
        flexWrap: "wrap",
        gap: space[12],
      }}
    >
      {(
        [
          "top",
          "bottom",
          "left",
          "right",
          "top-start",
          "top-end",
          "bottom-start",
          "bottom-end",
        ] as const
      ).map((p) => (
        <DropdownMenu key={p} trigger={p} placement={p}>
          <DropdownItem>One</DropdownItem>
          <DropdownItem>Two</DropdownItem>
          <DropdownItem>Three</DropdownItem>
        </DropdownMenu>
      ))}
    </div>
  ),
};

export const PolymorphicLinkItem: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Pass `as="a"` (or any router Link) to make a `DropdownItem` navigate. The polymorphic `as` prop forwards element-specific props like `href`.',
      },
    },
  },
  render: () => (
    <div style={wrapStyle}>
      <DropdownMenu trigger="Help">
        <DropdownItem
          as="a"
          href="#docs"
          iconBefore="file-text"
          iconAfter="external-link"
        >
          Documentation
        </DropdownItem>
        <DropdownItem
          as="a"
          href="#shortcuts"
          iconBefore="terminal"
        >
          Keyboard shortcuts
        </DropdownItem>
        <DropdownItem
          as="a"
          href="#changelog"
          iconBefore="rocket"
        >
          What's new
        </DropdownItem>
      </DropdownMenu>
    </div>
  ),
};

export const CssVariableEscapeHatch: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Every prop maps to a CSS variable on the popup root or on the items. To go beyond the enum vocabulary — branded colours, custom corner radii, wider menus, alternate hover backgrounds — override the same variables via `style`.",
      },
    },
  },
  render: () => (
    <div style={wrapStyle}>
      <DropdownMenu
        trigger="Branded menu"
        triggerAppearance="primary"
        style={
          {
            "--ddm-bg": "var(--catylast-color-purple-50)",
            "--ddm-border-color": "var(--catylast-color-purple-200)",
            "--ddm-radius": "12px",
            "--ddm-shadow": "0 12px 32px rgba(120, 80, 200, 0.18)",
            "--ddm-item-radius": "8px",
            "--ddm-item-bg-hover": "var(--catylast-color-purple-100)",
            "--ddm-item-color": "var(--catylast-color-purple-700)",
            "--ddm-checkmark-color": "var(--catylast-color-purple-600)",
          } as React.CSSProperties
        }
      >
        <DropdownItem iconBefore="zap">Suggest issues</DropdownItem>
        <DropdownItem iconBefore="sparkles">Improve writing</DropdownItem>
        <DropdownItem iconBefore="bug">Find similar bugs</DropdownItem>
      </DropdownMenu>
    </div>
  ),
};

export const Showcase: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "A realistic Catylast surface — a work-item card kebab menu with a mix of regular items, a destructive item, a checkbox group, a sub-menu of statuses, and a radio group of densities. This is what consumers actually compose.",
      },
    },
  },
  render: function ShowcaseStory() {
    const [pinned, setPinned] = useState(false);
    const [watching, setWatching] = useState(true);
    const [density, setDensity] = useState("comfortable");
    const [status, setStatus] = useState("In progress");
    return (
      <div style={wrapStyle}>
        <DropdownMenu
          trigger={<IconButton icon="more-horizontal" label="More actions" />}
          placement="bottom-start"
        >
          <DropdownItemGroup title="Quick actions">
            <DropdownItem iconBefore="pencil">Edit</DropdownItem>
            <DropdownItem iconBefore="copy">Duplicate</DropdownItem>
            <DropdownItem iconBefore="link" iconAfter={<kbd>⌘L</kbd>}>
              Copy link
            </DropdownItem>
          </DropdownItemGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger iconBefore="check-circle">
              Status: {status}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownItemRadioGroup
                value={status}
                onChange={setStatus}
              >
                <DropdownItemRadio id="To do">To do</DropdownItemRadio>
                <DropdownItemRadio id="In progress">
                  In progress
                </DropdownItemRadio>
                <DropdownItemRadio id="In review">In review</DropdownItemRadio>
                <DropdownItemRadio id="Done">Done</DropdownItemRadio>
              </DropdownItemRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownItemGroup title="View" hasSeparator>
            <DropdownItemCheckbox
              isSelected={pinned}
              onClick={setPinned}
            >
              Pin to top
            </DropdownItemCheckbox>
            <DropdownItemCheckbox
              isSelected={watching}
              onClick={setWatching}
              description="Get notified about changes."
            >
              Watch this issue
            </DropdownItemCheckbox>
          </DropdownItemGroup>
          <DropdownItemRadioGroup
            title="Density"
            value={density}
            onChange={setDensity}
            hasSeparator
          >
            <DropdownItemRadio id="compact">Compact</DropdownItemRadio>
            <DropdownItemRadio id="comfortable">Comfortable</DropdownItemRadio>
            <DropdownItemRadio id="spacious">Spacious</DropdownItemRadio>
          </DropdownItemRadioGroup>
          <DropdownItemGroup hasSeparator>
            <DropdownItem iconBefore="trash" appearance="danger">
              Archive
            </DropdownItem>
          </DropdownItemGroup>
        </DropdownMenu>
        <div style={labelStyle}>
          status: <strong>{status}</strong>
          {" · "}
          density: <strong>{density}</strong>
          {" · "}
          pinned: <strong>{pinned ? "yes" : "no"}</strong>
          {" · "}
          watching: <strong>{watching ? "yes" : "no"}</strong>
        </div>
      </div>
    );
  },
};
