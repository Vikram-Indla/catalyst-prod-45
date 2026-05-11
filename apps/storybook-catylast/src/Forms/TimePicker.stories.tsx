import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button, DatePicker, TimePicker } from "@catylast/primitives";
import { color, fontFamily, space } from "@catylast/tokens";
import { useState } from "react";

const componentDescription = `**TimePicker** is the input + time-list combo Catylast uses for picking a time of day — meeting times, reminder times, opening hours. The input accepts free typing in many shapes (\`14:30\`, \`2:30pm\`, \`230pm\`, \`9\`), and the trailing clock icon opens a popover with pre-defined options.

**Behavior:**
- Type freely — the parser understands 24h, 12h with AM/PM, and shorthand like \`9\` → \`09:00\`.
- The dropdown filters as you type so \`9\` narrows the list to entries starting with that hour.
- Arrow keys move the highlight; Enter selects; Esc closes.
- The canonical \`value\` is always 24h \`HH:mm\` regardless of display format — \`timeFormat\` is purely a display concern.

Pair with \`<DatePicker>\` for full date+time inputs. Every styling dimension is exposed as both an enum prop and a CSS variable (\`--timepicker-bg\`, \`--timepicker-radius\`, \`--timepicker-popover-bg\`, \`--timepicker-list-max-height\`, …).`;

const meta: Meta<typeof TimePicker> = {
  title: "Forms/DateTime Picker/Time Picker",
  component: TimePicker,
  parameters: {
    layout: "padded",
    docs: { description: { component: componentDescription } },
  },
  argTypes: {
    size: { control: "inline-radio", options: ["small", "medium", "large"] },
    isDisabled: { control: "boolean" },
    isInvalid: { control: "boolean" },
    isClearable: { control: "boolean" },
    timeFormat: { control: "inline-radio", options: ["HH:mm", "hh:mm A"] },
  },
};
export default meta;

type Story = StoryObj<typeof TimePicker>;

const wrapStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: space[12],
  fontFamily: fontFamily.sans,
  width: "200px",
};

const labelStyle: React.CSSProperties = {
  fontSize: "12px",
  fontFamily: fontFamily.sans,
  color: color.text.subtle,
};

// ---------- stories ----------

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "The minimum viable picker. Uncontrolled, no value, default 30-minute increments across the full 24-hour clock.",
      },
    },
  },
  render: () => (
    <div style={wrapStyle}>
      <TimePicker />
    </div>
  ),
};

export const Controlled: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Pass `value` + `onChange` for fully-controlled behaviour. Toggling between specific times shows the canonical 24h `HH:mm` string the picker stores in state.",
      },
    },
  },
  render: function ControlledStory() {
    const [time, setTime] = useState("14:30");
    return (
      <div style={wrapStyle}>
        <TimePicker value={time} onChange={setTime} aria-label="Start time" />
        <div style={labelStyle}>
          Picked: <strong>{time || "(empty)"}</strong>
        </div>
        <div style={{ display: "flex", gap: space[8] }}>
          <Button size="small" onClick={() => setTime("09:00")}>
            9:00
          </Button>
          <Button size="small" onClick={() => setTime("17:30")}>
            17:30
          </Button>
          <Button size="small" appearance="subtle" onClick={() => setTime("")}>
            Clear
          </Button>
        </div>
      </div>
    );
  },
};

export const TwelveHourFormat: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "`timeFormat=\"hh:mm A\"` displays the times in 12-hour format with an AM/PM suffix. The `value` and the underlying `times` array are still 24h — formatting is purely a display concern, so switching format never loses data.",
      },
    },
  },
  render: () => (
    <div style={wrapStyle}>
      <TimePicker
        defaultValue="14:30"
        timeFormat="hh:mm A"
        aria-label="Start time"
      />
    </div>
  ),
};

export const CustomTimes: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Pass `times` to swap the default 30-minute set for a custom list — useful for booking flows where slots are 15 minutes apart, or for an agenda with specific anchors.",
      },
    },
  },
  render: () => (
    <div style={{ ...wrapStyle, width: "auto" }}>
      <div style={wrapStyle}>
        <div style={labelStyle}>15-minute slots</div>
        <TimePicker
          defaultValue="09:30"
          times={[
            "09:00",
            "09:15",
            "09:30",
            "09:45",
            "10:00",
            "10:15",
            "10:30",
            "10:45",
            "11:00",
          ]}
        />
      </div>
      <div style={wrapStyle}>
        <div style={labelStyle}>Hourly only</div>
        <TimePicker
          defaultValue="14:00"
          times={[
            "08:00",
            "09:00",
            "10:00",
            "11:00",
            "12:00",
            "13:00",
            "14:00",
            "15:00",
            "16:00",
            "17:00",
          ]}
        />
      </div>
    </div>
  ),
};

export const BusinessHours: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Restrict the dropdown to business hours by combining `times` with `timeFormat`. Free typing still works — users typing `2pm` will get `14:00` even though it's in the dropdown.",
      },
    },
  },
  render: () => {
    const businessTimes: string[] = [];
    for (let h = 9; h <= 17; h++) {
      businessTimes.push(`${h.toString().padStart(2, "0")}:00`);
      if (h < 17) businessTimes.push(`${h.toString().padStart(2, "0")}:30`);
    }
    return (
      <div style={wrapStyle}>
        <div style={labelStyle}>9:00 am → 5:00 pm</div>
        <TimePicker
          defaultValue="14:30"
          timeFormat="hh:mm A"
          times={businessTimes}
        />
      </div>
    );
  },
};

export const TypeToFilter: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Type a hour into the input — `9` narrows the dropdown to times starting with `9` (`9:00`, `9:30`, `9:00 PM`, etc. depending on format). Try typing `1` for ten / eleven / twelve / one o\'clock variants.',
      },
    },
  },
  render: () => (
    <div style={wrapStyle}>
      <div style={labelStyle}>Try typing "9" or "14"</div>
      <TimePicker placeholder="Type to filter…" />
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div style={wrapStyle}>
      {(["small", "medium", "large"] as const).map((s) => (
        <div key={s}>
          <div style={labelStyle}>{s}</div>
          <TimePicker defaultValue="14:30" size={s} />
        </div>
      ))}
    </div>
  ),
};

export const Invalid: Story = {
  render: () => (
    <div style={wrapStyle}>
      <TimePicker defaultValue="14:30" isInvalid aria-label="Start time" />
      <div style={{ ...labelStyle, color: color.text.danger }}>
        Pick a time within working hours.
      </div>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div style={wrapStyle}>
      <TimePicker defaultValue="14:30" isDisabled aria-label="Start time" />
    </div>
  ),
};

export const NotClearable: Story = {
  render: () => (
    <div style={wrapStyle}>
      <TimePicker defaultValue="14:30" isClearable={false} />
    </div>
  ),
};

export const CssVariableEscapeHatch: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Override the underlying CSS variables for branded colors, custom corner radii, or wider popovers.",
      },
    },
  },
  render: () => (
    <div style={wrapStyle}>
      <TimePicker
        defaultValue="14:30"
        style={
          {
            "--timepicker-bg": "var(--catylast-color-blue-50)",
            "--timepicker-border-color": "var(--catylast-color-blue-300)",
            "--timepicker-border-color-focus":
              "var(--catylast-color-blue-500)",
            "--timepicker-radius": "999px",
            "--timepicker-padding-x": "16px",
            "--timepicker-icon-color": "var(--catylast-color-blue-600)",
            "--timepicker-popover-width": "220px",
          } as React.CSSProperties
        }
      />
    </div>
  ),
};

export const PairedWithDatePicker: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "The natural pairing — a `DatePicker` and a `TimePicker` side-by-side give you a full datetime input. The two share size and visual treatment so the row reads as one widget.",
      },
    },
  },
  render: function PairedStory() {
    const [date, setDate] = useState("2026-05-12");
    const [time, setTime] = useState("14:30");
    return (
      <div style={wrapStyle}>
        <div style={labelStyle}>Meeting starts at…</div>
        <div style={{ display: "flex", gap: space[8] }}>
          <DatePicker value={date} onChange={setDate} aria-label="Date" />
          <TimePicker value={time} onChange={setTime} aria-label="Time" />
        </div>
        <div style={labelStyle}>
          ISO: <strong>{date && time ? `${date}T${time}` : "(incomplete)"}</strong>
        </div>
      </div>
    );
  },
};

export const FormShowcase: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "How TimePicker composes inside a real form — required + invalid states, native form submission via the `name` attribute, validation on blur.",
      },
    },
  },
  render: function FormShowcaseStory() {
    const [start, setStart] = useState("09:00");
    const [end, setEnd] = useState("17:00");
    const invalidEnd = Boolean(start && end && end <= start);
    const [submitted, setSubmitted] = useState<string | null>(null);
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (invalidEnd) return;
          setSubmitted(`${start} – ${end}`);
        }}
        style={{
          ...wrapStyle,
          width: "auto",
          padding: space[24],
          background: color.surface.background,
          border: `1px solid ${color.border.subtle}`,
          borderRadius: "8px",
          maxWidth: "440px",
        }}
      >
        <div>
          <div style={{ ...labelStyle, marginBottom: space[4] }}>
            Working hours
          </div>
          <div style={{ display: "flex", gap: space[8], alignItems: "center" }}>
            <TimePicker
              value={start}
              onChange={setStart}
              aria-label="Start time"
              name="start"
            />
            <span style={labelStyle}>to</span>
            <TimePicker
              value={end}
              onChange={setEnd}
              isInvalid={invalidEnd}
              aria-label="End time"
              name="end"
            />
          </div>
          {invalidEnd && (
            <div
              style={{
                ...labelStyle,
                color: color.text.danger,
                marginTop: space[4],
              }}
            >
              End time must be after start time.
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: space[8] }}>
          <Button appearance="primary" type="submit" isDisabled={invalidEnd}>
            Save
          </Button>
          <Button
            appearance="subtle"
            onClick={() => {
              setStart("");
              setEnd("");
              setSubmitted(null);
            }}
          >
            Reset
          </Button>
        </div>
        {submitted && (
          <div
            style={{
              ...labelStyle,
              padding: space[8],
              background: color.surface.raised,
              borderRadius: "6px",
              fontFamily: "monospace",
            }}
          >
            Saved: <strong>{submitted}</strong>
          </div>
        )}
      </form>
    );
  },
};
