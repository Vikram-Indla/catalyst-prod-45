import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button, Checkbox } from "@catylast/primitives";
import { color, fontFamily, space } from "@catylast/tokens";
import { useMemo, useState } from "react";

const componentDescription = `**Checkbox** is the binary-state form input across Catylast — single toggles, multi-select grids, table row selection (paired with the indeterminate "some children selected" header), and consent forms.

Built on Radix UI for the state machine + accessibility wiring; the visual layer is fully owned by Catylast.

The full state model:

- **Checked / unchecked** — \`isChecked\` (controlled) or \`defaultChecked\` (uncontrolled)
- **Indeterminate** — \`isIndeterminate\` for the "some-but-not-all" header pattern
- **Disabled** — \`isDisabled\`, no clicks, reduced opacity
- **Invalid** — \`isInvalid\`, red border (and red filled background when checked) for form errors
- **Required** — \`isRequired\`, red asterisk after the label and the native HTML attribute set

Every styling dimension is exposed as both an enum prop and a CSS variable (\`--checkbox-size\`, \`--checkbox-radius\`, \`--checkbox-bg-checked\`, …) so consumers can override per-instance via \`style\` without touching the prop API.`;

const meta: Meta<typeof Checkbox> = {
  title: "Forms/Checkbox",
  component: Checkbox,
  parameters: {
    layout: "centered",
    docs: { description: { component: componentDescription } },
  },
  argTypes: {
    size: {
      control: "inline-radio",
      options: ["small", "medium", "large"],
    },
    isChecked: { control: "boolean" },
    isIndeterminate: { control: "boolean" },
    isDisabled: { control: "boolean" },
    isInvalid: { control: "boolean" },
    isRequired: { control: "boolean" },
  },
};
export default meta;

type Story = StoryObj<typeof Checkbox>;

const padded = (children: React.ReactNode) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      gap: space[12],
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

// ---------- stories ----------

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "The simplest checkbox — uncontrolled, no label. Click to toggle.",
      },
    },
  },
};

export const WithLabel: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Pass `label` (a string or any React node) to render a clickable label next to the box. The whole label is the click target.",
      },
    },
  },
  args: { label: "I agree to the terms and conditions" },
};

export const States: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Every state side by side — unchecked, checked, indeterminate, disabled (in both checked and unchecked flavours), invalid, required.",
      },
    },
  },
  render: () =>
    padded(
      <>
        <Checkbox label="Unchecked" />
        <Checkbox label="Checked" defaultChecked />
        <Checkbox label="Indeterminate (some children selected)" isIndeterminate />
        <Checkbox label="Disabled — unchecked" isDisabled />
        <Checkbox label="Disabled — checked" isDisabled defaultChecked />
        <Checkbox label="Invalid — please re-check" isInvalid />
        <Checkbox
          label="Invalid — already checked"
          isInvalid
          defaultChecked
        />
        <Checkbox label="Email me product updates" isRequired />
      </>,
    ),
};

export const Sizes: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Three sizes. `small` (14px) for dense surfaces (table rows, compact filters), `medium` (16px, default) for most contexts, `large` (20px) for hero settings forms or touch-first surfaces.",
      },
    },
  },
  render: () =>
    padded(
      <>
        <Checkbox size="small" label="Small (14px)" defaultChecked />
        <Checkbox size="medium" label="Medium (16px) — default" defaultChecked />
        <Checkbox size="large" label="Large (20px)" defaultChecked />
      </>,
    ),
};

export const Indeterminate: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "The indeterminate state shows a horizontal dash instead of a check. Use it on a parent checkbox when *some* — but not all — of its children are checked. Toggling the parent in this state should select all (or deselect all) the children, depending on your form's logic.",
      },
    },
  },
  render: () => (
    <Checkbox
      label="Some children selected (indeterminate)"
      isIndeterminate
    />
  ),
};

export const Invalid: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Use `isInvalid` to surface a validation error. The border (and filled background, when checked) flip to the danger color. Pair with an inline message below the checkbox so the reason for the error is clear.",
      },
    },
  },
  render: () =>
    padded(
      <>
        <div>
          <Checkbox label="Confirm you accept the new terms" isInvalid />
          <div
            style={{
              marginTop: space[4],
              fontSize: "12px",
              color: color.text.danger,
              fontFamily: fontFamily.sans,
            }}
          >
            Required to continue.
          </div>
        </div>
      </>,
    ),
};

export const Required: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "`isRequired` adds a red asterisk after the label and sets the native `required` attribute on the underlying input so HTML form submission validates correctly.",
      },
    },
  },
  args: { label: "I agree to the terms", isRequired: true },
};

export const Controlled: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Pass `isChecked` together with `onChange` for fully-controlled behavior. The `onChange` callback receives a boolean — toggling out of the indeterminate visual produces `true`.",
      },
    },
  },
  render: function ControlledStory() {
    const [checked, setChecked] = useState(false);
    const [indeterminate, setIndeterminate] = useState(false);
    return padded(
      <>
        <Checkbox
          label={`Controlled — currently ${
            indeterminate ? "indeterminate" : checked ? "checked" : "unchecked"
          }`}
          isChecked={checked}
          isIndeterminate={indeterminate}
          onChange={(next) => {
            setChecked(next);
            setIndeterminate(false);
          }}
        />
        <div style={{ display: "flex", gap: space[8] }}>
          <Button
            size="small"
            onClick={() => {
              setChecked(false);
              setIndeterminate(true);
            }}
          >
            Set indeterminate
          </Button>
          <Button
            size="small"
            appearance="subtle"
            onClick={() => {
              setChecked(false);
              setIndeterminate(false);
            }}
          >
            Reset
          </Button>
        </div>
      </>,
    );
  },
};

export const Group: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "The classic parent + children group with indeterminate driven by the children's state. Toggling the parent selects / deselects all children at once; toggling any child re-derives the parent's state (`all` → checked, `none` → unchecked, otherwise → indeterminate).",
      },
    },
  },
  render: function GroupStory() {
    const items = ["Email", "Push notification", "SMS", "In-app banner"];
    const [picked, setPicked] = useState<Set<string>>(new Set(["Email"]));

    const allChecked = picked.size === items.length;
    const noneChecked = picked.size === 0;

    const togglePicked = (label: string) => {
      setPicked((prev) => {
        const next = new Set(prev);
        if (next.has(label)) next.delete(label);
        else next.add(label);
        return next;
      });
    };

    const toggleAll = (next: boolean) => {
      setPicked(next ? new Set(items) : new Set());
    };

    return padded(
      <>
        <div style={labelStyle}>Notification preferences</div>
        <Checkbox
          label="All channels"
          isChecked={allChecked}
          isIndeterminate={!allChecked && !noneChecked}
          onChange={toggleAll}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: space[8],
            marginLeft: space[24],
          }}
        >
          {items.map((label) => (
            <Checkbox
              key={label}
              label={label}
              isChecked={picked.has(label)}
              onChange={() => togglePicked(label)}
            />
          ))}
        </div>
      </>,
    );
  },
};

export const FormShowcase: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "How the checkbox composes inside a real form — labels with helper text, inline validation, and a required marker. The native `required` attribute means standard HTML form submission validates without extra JS.",
      },
    },
  },
  render: function FormShowcaseStory() {
    const [agreed, setAgreed] = useState(false);
    const [marketing, setMarketing] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const showError = submitted && !agreed;

    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(true);
        }}
        style={{
          width: "360px",
          padding: space[24],
          background: color.surface.background,
          fontFamily: fontFamily.sans,
          display: "flex",
          flexDirection: "column",
          gap: space[16],
        }}
      >
        <div>
          <Checkbox
            isRequired
            isInvalid={showError}
            isChecked={agreed}
            onChange={setAgreed}
            label="I agree to the terms of service"
          />
          {showError && (
            <div
              style={{
                marginTop: space[4],
                marginLeft: "24px",
                fontSize: "12px",
                color: color.text.danger,
              }}
            >
              You must agree before continuing.
            </div>
          )}
        </div>
        <div>
          <Checkbox
            isChecked={marketing}
            onChange={setMarketing}
            label="Send me product updates"
          />
          <div
            style={{
              marginTop: space[4],
              marginLeft: "24px",
              fontSize: "12px",
              color: color.text.subtle,
            }}
          >
            One email per month, never sold.
          </div>
        </div>
        <div style={{ display: "flex", gap: space[8] }}>
          <Button appearance="primary" type="submit">
            Continue
          </Button>
          <Button
            appearance="subtle"
            onClick={() => {
              setAgreed(false);
              setMarketing(false);
              setSubmitted(false);
            }}
          >
            Reset
          </Button>
        </div>
      </form>
    );
  },
};

export const CssVariableEscapeHatch: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Every prop maps to a CSS variable on the checkbox root. To go beyond the enum vocabulary — exact pixel sizes, brand colors, custom corner radii — override the same variables directly via `style`.",
      },
    },
  },
  render: () =>
    padded(
      <>
        <Checkbox
          label="Branded purple checkbox"
          defaultChecked
          style={
            {
              "--checkbox-bg-checked": "var(--catylast-color-purple-500)",
              "--checkbox-bg-checked-hover":
                "var(--catylast-color-purple-600)",
              "--checkbox-border-color-checked":
                "var(--catylast-color-purple-500)",
              "--checkbox-border-color-hover":
                "var(--catylast-color-purple-500)",
              "--checkbox-radius": "6px",
            } as React.CSSProperties
          }
        />
        <Checkbox
          label="Square box, sharp corners"
          defaultChecked
          style={
            {
              "--checkbox-radius": "0",
              "--checkbox-size": "20px",
              "--checkbox-icon-size": "14px",
            } as React.CSSProperties
          }
        />
        <Checkbox
          label="Bigger gap between box and label"
          style={
            {
              "--checkbox-gap": "16px",
            } as React.CSSProperties
          }
        />
      </>,
    ),
};

export const TableRowSelection: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "How the indeterminate header pattern looks in context. The header checkbox toggles all rows; partial selection shows the indeterminate dash. This is the same pattern `<DynamicTable>` uses internally.",
      },
    },
  },
  render: function TableSelectionStory() {
    const rows = useMemo(
      () => [
        { id: "1", title: "CAT-101", desc: "Editor crashes on slash menu" },
        { id: "2", title: "CAT-102", desc: "Calendar locale defaults wrong" },
        { id: "3", title: "CAT-103", desc: "Drag handle disappears mid-drag" },
        { id: "4", title: "CAT-104", desc: "Tokens dark-mode flicker on load" },
      ],
      [],
    );
    const [picked, setPicked] = useState<Set<string>>(new Set(["1"]));
    const allChecked = picked.size === rows.length;
    const noneChecked = picked.size === 0;

    return (
      <div
        style={{
          width: "440px",
          background: color.surface.background,
          fontFamily: fontFamily.sans,
          border: `1px solid ${color.border.subtle}`,
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: space[12],
            padding: `${space[8]} ${space[16]}`,
            borderBottom: `1px solid ${color.border.subtle}`,
            background: color.surface.raised,
            fontSize: "12px",
            color: color.text.subtle,
          }}
        >
          <Checkbox
            label={`${picked.size} selected`}
            isChecked={allChecked}
            isIndeterminate={!allChecked && !noneChecked}
            onChange={(next) =>
              setPicked(next ? new Set(rows.map((r) => r.id)) : new Set())
            }
          />
        </div>
        {rows.map((r) => (
          <div
            key={r.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: space[12],
              padding: `${space[8]} ${space[16]}`,
              borderBottom: `1px solid ${color.border.subtle}`,
              fontSize: "13px",
              color: color.text.primary,
            }}
          >
            <Checkbox
              isChecked={picked.has(r.id)}
              onChange={() =>
                setPicked((prev) => {
                  const next = new Set(prev);
                  if (next.has(r.id)) next.delete(r.id);
                  else next.add(r.id);
                  return next;
                })
              }
            />
            <strong style={{ minWidth: "72px" }}>{r.title}</strong>
            <span>{r.desc}</span>
          </div>
        ))}
      </div>
    );
  },
};
