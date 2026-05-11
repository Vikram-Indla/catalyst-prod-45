import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button, DatePicker, TimePicker } from "@catylast/primitives";
import { color, fontFamily, space } from "@catylast/tokens";
import { useState } from "react";

const componentDescription = `**DatePicker** is the input + calendar combo Catylast uses everywhere a user needs to pick a single day — due dates, scheduling, deadlines, filter ranges. The input accepts free typing in a configurable format, and the trailing calendar icon opens a popover containing the full \`Calendar\` primitive.

The component composes \`Calendar\` (the date-grid primitive) inside a Radix Popover, with locale-aware parsing / formatting via \`Intl.DateTimeFormat\` so the same component works for any region without extra dependencies.

**Behavior:**
- Type the date freely in the input — the component parses on blur and commits the canonical ISO value.
- Click the calendar icon (or press \`↓\`) to open the popover and pick visually.
- Selected date highlights in the calendar; the input updates to the formatted display label.
- Clear with the \`×\` button or by emptying the input.

Every styling dimension is exposed as both an enum prop and a CSS variable (\`--datepicker-bg\`, \`--datepicker-radius\`, \`--datepicker-border-color-focus\`, …).`;

const meta: Meta<typeof DatePicker> = {
  title: "Forms/DateTime Picker/Date Picker",
  component: DatePicker,
  parameters: {
    layout: "padded",
    docs: { description: { component: componentDescription } },
  },
  argTypes: {
    size: { control: "inline-radio", options: ["small", "medium", "large"] },
    isDisabled: { control: "boolean" },
    isInvalid: { control: "boolean" },
    isClearable: { control: "boolean" },
    weekStartDay: { control: "inline-radio", options: [0, 1, 6] },
    locale: { control: "text" },
    dateFormat: { control: "text" },
  },
};
export default meta;

type Story = StoryObj<typeof DatePicker>;

const wrapStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: space[12],
  fontFamily: fontFamily.sans,
  width: "320px",
};

const labelStyle: React.CSSProperties = {
  fontSize: "12px",
  fontFamily: fontFamily.sans,
  color: color.text.subtle,
};

// Anchor "today" to a fixed date so stories stay stable across CI runs.
const FIXED_TODAY = "2026-05-07";

// ---------- stories ----------

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "The minimum viable picker. Uncontrolled, no value, default `YYYY-MM-DD` format. Click the calendar icon to open or just start typing.",
      },
    },
  },
  render: () => (
    <div style={wrapStyle}>
      <DatePicker today={FIXED_TODAY} />
    </div>
  ),
};

export const Controlled: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Pass `value` + `onChange` for fully-controlled behaviour. The input syncs on every commit, so you can derive other UI from the chosen date in real time.",
      },
    },
  },
  render: function ControlledStory() {
    const [iso, setIso] = useState("2026-05-12");
    return (
      <div style={wrapStyle}>
        <DatePicker
          today={FIXED_TODAY}
          value={iso}
          onChange={setIso}
          aria-label="Due date"
        />
        <div style={labelStyle}>
          Picked: <strong>{iso || "(empty)"}</strong>
        </div>
        <div style={{ display: "flex", gap: space[8] }}>
          <Button size="small" onClick={() => setIso("2026-05-01")}>
            Set May 1
          </Button>
          <Button size="small" onClick={() => setIso("2026-12-31")}>
            Set Dec 31
          </Button>
          <Button
            size="small"
            appearance="subtle"
            onClick={() => setIso("")}
          >
            Clear
          </Button>
        </div>
      </div>
    );
  },
};

export const CustomFormat: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "`dateFormat` controls the display + parse pattern. Tokens: `YYYY` (year), `MM` / `M` (month), `DD` / `D` (day). The component parses the same pattern the user sees, so what they type is what they pick.",
      },
    },
  },
  render: () => (
    <div style={{ ...wrapStyle, width: "auto" }}>
      <div>
        <div style={labelStyle}>YYYY-MM-DD (default)</div>
        <DatePicker today={FIXED_TODAY} defaultValue="2026-05-12" />
      </div>
      <div>
        <div style={labelStyle}>DD/MM/YYYY (UK / EU)</div>
        <DatePicker
          today={FIXED_TODAY}
          dateFormat="DD/MM/YYYY"
          defaultValue="2026-05-12"
        />
      </div>
      <div>
        <div style={labelStyle}>M/D/YYYY (US, no zero-pad)</div>
        <DatePicker
          today={FIXED_TODAY}
          dateFormat="M/D/YYYY"
          defaultValue="2026-05-12"
        />
      </div>
    </div>
  ),
};

export const MinMax: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Constrain the selectable range with `minDate` / `maxDate`. Out-of-range days disable in the calendar; the prev / next month arrows disable themselves when navigation would leave the range.",
      },
    },
  },
  render: () => (
    <div style={wrapStyle}>
      <div style={labelStyle}>May 4 – May 22, 2026</div>
      <DatePicker
        today={FIXED_TODAY}
        defaultValue="2026-05-12"
        minDate="2026-05-04"
        maxDate="2026-05-22"
      />
    </div>
  ),
};

export const DisabledDates: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Pass an array of ISO strings to `disabledDates` to gate specific days (booked dates, weekends, holidays). Disabled days render with a strikethrough and don't fire `onChange`.",
      },
    },
  },
  render: () => (
    <div style={wrapStyle}>
      <div style={labelStyle}>Weekends disabled</div>
      <DatePicker
        today={FIXED_TODAY}
        defaultValue="2026-05-12"
        disabledDates={[
          "2026-05-02",
          "2026-05-03",
          "2026-05-09",
          "2026-05-10",
          "2026-05-16",
          "2026-05-17",
          "2026-05-23",
          "2026-05-24",
          "2026-05-30",
          "2026-05-31",
        ]}
      />
    </div>
  ),
};

export const Locales: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Month and weekday labels go through `Intl.DateTimeFormat`. Pair `locale` with `weekStartDay` so the calendar grid feels native to the region.",
      },
    },
  },
  render: () => (
    <div
      style={{
        display: "flex",
        gap: space[16],
        flexWrap: "wrap",
        fontFamily: fontFamily.sans,
      }}
    >
      {[
        { l: "en-US", title: "English (US)", week: 0 as const, fmt: "M/D/YYYY" },
        { l: "en-GB", title: "English (UK)", week: 1 as const, fmt: "DD/MM/YYYY" },
        { l: "de-DE", title: "Deutsch (DE)", week: 1 as const, fmt: "DD.MM.YYYY" },
        { l: "ja-JP", title: "日本語 (JP)", week: 0 as const, fmt: "YYYY/MM/DD" },
      ].map(({ l, title, week, fmt }) => (
        <div key={l} style={{ width: "240px" }}>
          <div style={labelStyle}>{title}</div>
          <DatePicker
            today={FIXED_TODAY}
            defaultValue="2026-05-12"
            locale={l}
            weekStartDay={week}
            dateFormat={fmt}
          />
        </div>
      ))}
    </div>
  ),
};

export const Sizes: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Three sizes — `small` for dense surfaces, `medium` (default) for most contexts, `large` for hero forms.",
      },
    },
  },
  render: () => (
    <div style={wrapStyle}>
      {(["small", "medium", "large"] as const).map((s) => (
        <div key={s}>
          <div style={labelStyle}>{s}</div>
          <DatePicker
            today={FIXED_TODAY}
            defaultValue="2026-05-12"
            size={s}
          />
        </div>
      ))}
    </div>
  ),
};

export const Invalid: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "`isInvalid` flips the border to the danger color and sets `aria-invalid`. Pair with an inline error message below the picker — color alone is not enough.",
      },
    },
  },
  render: () => (
    <div style={wrapStyle}>
      <DatePicker
        today={FIXED_TODAY}
        defaultValue="2026-05-12"
        isInvalid
        aria-label="Due date"
      />
      <div style={{ ...labelStyle, color: color.text.danger }}>
        Due date must be after the start date.
      </div>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div style={wrapStyle}>
      <DatePicker
        today={FIXED_TODAY}
        defaultValue="2026-05-12"
        isDisabled
        aria-label="Due date"
      />
    </div>
  ),
};

export const NotClearable: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Set `isClearable={false}` for forms where a date is mandatory and the user shouldn't be able to wipe the value back to empty. The trailing icon stays — only the `×` clear button is removed.",
      },
    },
  },
  render: () => (
    <div style={wrapStyle}>
      <DatePicker
        today={FIXED_TODAY}
        defaultValue="2026-05-12"
        isClearable={false}
      />
    </div>
  ),
};

export const CssVariableEscapeHatch: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Every prop maps to a CSS variable on the picker root. Override the same variables via `style` for branded colors, custom corner radii, or unusual sizing.",
      },
    },
  },
  render: () => (
    <div style={wrapStyle}>
      <DatePicker
        today={FIXED_TODAY}
        defaultValue="2026-05-12"
        style={
          {
            "--datepicker-bg": "var(--catylast-color-purple-50)",
            "--datepicker-border-color": "var(--catylast-color-purple-300)",
            "--datepicker-border-color-focus":
              "var(--catylast-color-purple-500)",
            "--datepicker-radius": "999px",
            "--datepicker-padding-x": "16px",
            "--datepicker-icon-color": "var(--catylast-color-purple-600)",
          } as React.CSSProperties
        }
      />
    </div>
  ),
};

export const FormShowcase: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "How DatePicker composes inside a real form — paired with TimePicker for a full datetime input, with submit and validation.",
      },
    },
  },
  render: function FormShowcaseStory() {
    const [date, setDate] = useState("2026-05-12");
    const [time, setTime] = useState("14:30");
    const [submitted, setSubmitted] = useState<string | null>(null);
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(`${date}T${time}`);
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
            When is the meeting?
          </div>
          <div style={{ display: "flex", gap: space[8] }}>
            <DatePicker
              today={FIXED_TODAY}
              value={date}
              onChange={setDate}
              aria-label="Meeting date"
            />
            <TimePicker
              value={time}
              onChange={setTime}
              aria-label="Meeting time"
            />
          </div>
        </div>
        <div style={{ display: "flex", gap: space[8] }}>
          <Button appearance="primary" type="submit">
            Schedule
          </Button>
          <Button
            appearance="subtle"
            onClick={() => {
              setDate("");
              setTime("");
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
            Submitted: <strong>{submitted}</strong>
          </div>
        )}
      </form>
    );
  },
};
