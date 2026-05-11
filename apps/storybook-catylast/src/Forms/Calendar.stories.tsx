import type { Meta, StoryObj } from "@storybook/react-vite";
import { Calendar, Button } from "@catylast/primitives";
import { color, fontFamily, space } from "@catylast/tokens";
import { useState } from "react";

const componentDescription = `**Calendar** is the date-grid primitive Catylast uses to build date pickers, range pickers, scheduling surfaces, and any feature that needs a month view. It is single-select on the surface but exposes a \`selected[]\` array so consumers can compose multi-day highlights, ranges, and "previously selected" trails on top of it.

Built from scratch on \`Intl.DateTimeFormat\` for locale-aware month and weekday labels — no \`date-fns\` / \`moment\` / \`luxon\` dependency. The component deals in *calendar* days (year/month/day triples) so DST shifts and locale-specific midnight quirks don't affect picking.

Every styling dimension is exposed as both an enum prop and a CSS variable (\`--cal-bg\`, \`--cal-radius\`, \`--cal-cell-size\`, \`--cal-day-bg-selected\`, …) so consumers can override per-instance via \`style\` without touching the prop API.

**Keyboard model:**

- **←/→** — previous / next day
- **↑/↓** — previous / next week
- **PageUp/PageDown** — previous / next month
- **Shift + PageUp/PageDown** — previous / next year
- **Home / End** — start / end of week
- **Enter / Space** — select the focused date
- **Esc** — blur the calendar`;

const meta: Meta<typeof Calendar> = {
  title: "Forms/Calendar",
  component: Calendar,
  parameters: {
    layout: "centered",
    docs: { description: { component: componentDescription } },
  },
  argTypes: {
    size: { control: "inline-radio", options: ["small", "medium", "large"] },
    weekStartDay: {
      control: "inline-radio",
      options: [0, 1, 6],
      description: "0 = Sunday, 1 = Monday, 6 = Saturday",
    },
    locale: {
      control: "text",
      description: "BCP-47 locale tag, e.g. en-US, en-GB, de-DE, ja-JP",
    },
  },
};
export default meta;

type Story = StoryObj<typeof Calendar>;

const padded = (children: React.ReactNode) => (
  <div
    style={{
      display: "flex",
      gap: space[24],
      flexWrap: "wrap",
      alignItems: "flex-start",
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

// Anchor the test runs to a known "today" so screenshots / interactions stay
// stable across CI runs.
const FIXED_TODAY = "2026-05-06";

// ---------- stories ----------

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "The minimum viable calendar — uncontrolled, opens on today's month, today highlighted with an accent ring. No selection until the user picks one.",
      },
    },
  },
  render: () => <Calendar today={FIXED_TODAY} />,
};

export const Controlled: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Pass `month`, `year`, and `day` together with `onSelect` / `onChange` for fully-controlled behavior. The visible month follows the props; the consumer owns the state.",
      },
    },
  },
  render: function ControlledStory() {
    const [iso, setIso] = useState("2026-05-12");
    const parts = iso.split("-").map(Number) as [number, number, number];
    return (
      <div>
        <div style={{ ...labelStyle, marginBottom: space[12] }}>
          Selected: <strong>{iso}</strong>
        </div>
        <Calendar
          today={FIXED_TODAY}
          year={parts[0]}
          month={parts[1] - 1}
          day={parts[2]}
          selected={[iso]}
          onSelect={(e: { iso: string }) => setIso(e.iso)}
          onChange={(e: { iso: string; type: "navigate" | "focus" }) => {
            if (e.type === "navigate") setIso(e.iso);
          }}
        />
      </div>
    );
  },
};

export const Selected: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "`selected` is an array of ISO date strings to highlight. Use a single value for date-picker behavior, or multiple values to surface a non-contiguous selection set (think 'days you have meetings').",
      },
    },
  },
  render: () =>
    padded(
      <>
        <div>
          <div style={labelStyle}>Single selected</div>
          <Calendar
            today={FIXED_TODAY}
            defaultMonth={4}
            defaultYear={2026}
            defaultDay={12}
            selected={["2026-05-12"]}
          />
        </div>
        <div>
          <div style={labelStyle}>Multiple selected (visual highlight)</div>
          <Calendar
            today={FIXED_TODAY}
            defaultMonth={4}
            defaultYear={2026}
            selected={[
              "2026-05-04",
              "2026-05-08",
              "2026-05-15",
              "2026-05-22",
              "2026-05-29",
            ]}
          />
        </div>
      </>,
    ),
};

export const PreviouslySelected: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "`previouslySelected` renders a small dot under each listed date — useful for showing past picks (e.g. dates already booked, days you've already submitted timesheets for).",
      },
    },
  },
  render: () => (
    <Calendar
      today={FIXED_TODAY}
      defaultMonth={4}
      defaultYear={2026}
      selected={["2026-05-12"]}
      previouslySelected={[
        "2026-05-01",
        "2026-05-04",
        "2026-05-07",
        "2026-05-10",
        "2026-05-15",
        "2026-05-20",
      ]}
    />
  ),
};

export const DisabledDates: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Pass `disabled` (an array of ISO date strings) to make specific dates unselectable. Disabled dates show with reduced opacity and strikethrough, and don't fire `onSelect`.",
      },
    },
  },
  render: () => (
    <Calendar
      today={FIXED_TODAY}
      defaultMonth={4}
      defaultYear={2026}
      disabled={[
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
  ),
};

export const MinMaxRange: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "`minDate` and `maxDate` clamp the selectable range. Days outside the range are disabled; the prev / next month buttons disable themselves when navigation would leave the range.",
      },
    },
  },
  render: () => (
    <Calendar
      today={FIXED_TODAY}
      defaultMonth={4}
      defaultYear={2026}
      minDate="2026-05-04"
      maxDate="2026-05-22"
      selected={["2026-05-12"]}
    />
  ),
};

export const WeekStartDay: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Set the first column of the grid via `weekStartDay`. `0` = Sunday (default, US), `1` = Monday (ISO 8601, most of Europe), `6` = Saturday (Saudi Arabia, Yemen, …).",
      },
    },
  },
  render: () =>
    padded(
      <>
        <div>
          <div style={labelStyle}>weekStartDay = 0 (Sunday)</div>
          <Calendar
            today={FIXED_TODAY}
            defaultMonth={4}
            defaultYear={2026}
            weekStartDay={0}
          />
        </div>
        <div>
          <div style={labelStyle}>weekStartDay = 1 (Monday)</div>
          <Calendar
            today={FIXED_TODAY}
            defaultMonth={4}
            defaultYear={2026}
            weekStartDay={1}
          />
        </div>
        <div>
          <div style={labelStyle}>weekStartDay = 6 (Saturday)</div>
          <Calendar
            today={FIXED_TODAY}
            defaultMonth={4}
            defaultYear={2026}
            weekStartDay={6}
          />
        </div>
      </>,
    ),
};

export const Locales: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Month and weekday labels are rendered through `Intl.DateTimeFormat`, so any BCP-47 locale tag works without an extra dependency.",
      },
    },
  },
  render: () =>
    padded(
      <>
        {[
          { l: "en-US", title: "English (US)" },
          { l: "en-GB", title: "English (UK)" },
          { l: "de-DE", title: "Deutsch (DE)" },
          { l: "ja-JP", title: "日本語 (JP)" },
          { l: "ar-SA", title: "العربية (SA)" },
        ].map(({ l, title }) => (
          <div key={l}>
            <div style={labelStyle}>{title}</div>
            <Calendar
              today={FIXED_TODAY}
              defaultMonth={4}
              defaultYear={2026}
              locale={l}
              weekStartDay={l === "en-US" ? 0 : 1}
            />
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
          "Three sizes. `small` for embedded date pickers in dense surfaces, `medium` (default) for most contexts, `large` for hero scheduling pages.",
      },
    },
  },
  render: () =>
    padded(
      <>
        {(["small", "medium", "large"] as const).map((s) => (
          <div key={s}>
            <div style={labelStyle}>{s}</div>
            <Calendar
              today={FIXED_TODAY}
              defaultMonth={4}
              defaultYear={2026}
              size={s}
              selected={["2026-05-12"]}
            />
          </div>
        ))}
      </>,
    ),
};

export const CssVariableEscapeHatch: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Every prop maps to a CSS variable on the calendar root (`--cal-bg`, `--cal-radius`, `--cal-cell-size`, `--cal-day-radius`, `--cal-day-bg-selected`, …). Power users can override the same variables directly via `style` for values outside the enum vocabulary — square cells, brand colors, custom corner radii.",
      },
    },
  },
  render: () =>
    padded(
      <>
        <div>
          <div style={labelStyle}>Branded purple selection</div>
          <Calendar
            today={FIXED_TODAY}
            defaultMonth={4}
            defaultYear={2026}
            selected={["2026-05-12"]}
            style={
              {
                "--cal-radius": "16px",
                "--cal-day-bg-selected": "var(--catylast-color-purple-500)",
                "--cal-day-bg-selected-hover":
                  "var(--catylast-color-purple-600)",
                "--cal-day-color-selected": "var(--catylast-color-neutral-0)",
                "--cal-shadow": "0 8px 24px rgba(120, 80, 200, 0.18)",
              } as React.CSSProperties
            }
          />
        </div>
        <div>
          <div style={labelStyle}>Square cells, sharp corners</div>
          <Calendar
            today={FIXED_TODAY}
            defaultMonth={4}
            defaultYear={2026}
            selected={["2026-05-12"]}
            style={
              {
                "--cal-radius": "0",
                "--cal-day-radius": "0",
                "--cal-cell-size": "32px",
              } as React.CSSProperties
            }
          />
        </div>
      </>,
    ),
};

// ---------- recipes ----------

export const DatePickerRecipe: Story = {
  name: "Recipe — date picker",
  parameters: {
    docs: {
      description: {
        story:
          "Pair a `Calendar` with a trigger button to build a date picker. The Catylast app ships its own `DatePicker` component on top of this primitive; the snippet below shows how the two compose.",
      },
    },
  },
  render: function DatePickerStory() {
    const [iso, setIso] = useState<string | null>(null);
    return (
      <div style={{ width: "320px", padding: space[24] }}>
        <div style={{ ...labelStyle, marginBottom: space[12] }}>
          Pick a date
        </div>
        <Calendar
          today={FIXED_TODAY}
          selected={iso ? [iso] : []}
          onSelect={(e) => setIso(e.iso)}
        />
        <div
          style={{
            marginTop: space[16],
            fontFamily: fontFamily.sans,
            fontSize: "13px",
            color: color.text.subtle,
          }}
        >
          Selected: <strong>{iso ?? "(none)"}</strong>
        </div>
        <div style={{ marginTop: space[12], display: "flex", gap: space[8] }}>
          <Button appearance="primary" isDisabled={!iso}>
            Confirm
          </Button>
          <Button appearance="subtle" onClick={() => setIso(null)}>
            Clear
          </Button>
        </div>
      </div>
    );
  },
};

export const RangeRecipe: Story = {
  name: "Recipe — range picker",
  parameters: {
    docs: {
      description: {
        story:
          "Build a range picker by wrapping the calendar in a tiny state machine that tracks `start` / `end`. The first click sets `start` (and clears `end`); the second click sets `end` and fills the days between as `selected`. The third click resets and starts a new range.",
      },
    },
  },
  render: function RangeStory() {
    const [start, setStart] = useState<string | null>("2026-05-08");
    const [end, setEnd] = useState<string | null>("2026-05-15");

    const range = (() => {
      if (!start) return [] as string[];
      if (!end) return [start];
      const sorted = [start, end].sort();
      const a = sorted[0] as string;
      const b = sorted[1] as string;
      const out: string[] = [];
      const aParts = a.split("-").map(Number) as [number, number, number];
      const bParts = b.split("-").map(Number) as [number, number, number];
      const cur = new Date(aParts[0], aParts[1] - 1, aParts[2]);
      const stop = new Date(bParts[0], bParts[1] - 1, bParts[2]);
      while (cur <= stop) {
        const y = cur.getFullYear();
        const m = `${cur.getMonth() + 1}`.padStart(2, "0");
        const d = `${cur.getDate()}`.padStart(2, "0");
        out.push(`${y}-${m}-${d}`);
        cur.setDate(cur.getDate() + 1);
      }
      return out;
    })();

    const onPick = (iso: string) => {
      if (!start || (start && end)) {
        setStart(iso);
        setEnd(null);
      } else {
        if (iso < start) {
          setEnd(start);
          setStart(iso);
        } else {
          setEnd(iso);
        }
      }
    };

    return (
      <div>
        <div style={{ ...labelStyle, marginBottom: space[12] }}>
          Range:{" "}
          <strong>
            {start ?? "(none)"} → {end ?? "(open)"}
          </strong>
        </div>
        <Calendar
          today={FIXED_TODAY}
          defaultMonth={4}
          defaultYear={2026}
          selected={range}
          onSelect={(e) => onPick(e.iso)}
        />
      </div>
    );
  },
};

// ---------- big interactive showcase ----------

export const Showcase: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Everything wired together — controlled selection, previously-selected trail, a min/max guard rail, locale-aware labels, custom CSS-variable theming.",
      },
    },
  },
  render: function ShowcaseStory() {
    const [iso, setIso] = useState("2026-05-12");
    return (
      <div style={{ padding: space[24] }}>
        <Calendar
          today={FIXED_TODAY}
          defaultMonth={4}
          defaultYear={2026}
          weekStartDay={1}
          locale="en-GB"
          selected={[iso]}
          previouslySelected={[
            "2026-05-01",
            "2026-05-04",
            "2026-05-07",
            "2026-05-22",
          ]}
          disabled={["2026-05-09", "2026-05-10", "2026-05-16", "2026-05-17"]}
          minDate="2026-05-01"
          maxDate="2026-05-31"
          onSelect={(e) => setIso(e.iso)}
        />
        <div
          style={{
            marginTop: space[16],
            fontFamily: fontFamily.sans,
            fontSize: "13px",
            color: color.text.subtle,
          }}
        >
          Picked: <strong>{iso}</strong>
        </div>
      </div>
    );
  },
};
