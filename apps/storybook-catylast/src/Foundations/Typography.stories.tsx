import type { Meta, StoryObj } from "@storybook/react-vite";
import { Code, Heading, Metric, Text } from "@catylast/primitives";
import { color, fontFamily, radius, space } from "@catylast/tokens";

const meta: Meta = {
  title: "Foundations/Typography",
  parameters: {
    docs: {
      description: {
        component:
          "Catylast typography — four families (Heading, Body, Metric, Code) drawn from the `typography.*` semantic tokens in `@catylast/tokens`. Headings and Metric use Inter Variable at custom weight 653 (the designer's specified value, between Semibold 600 and Bold 700); body and code default to standard weights.\n\nEvery row below is rendered through the matching primitive component (`<Heading>`, `<Text>`, `<Metric>`, `<Code>`) so the page is also a live spec for the component APIs.",
      },
    },
  },
};
export default meta;

type Story = StoryObj;

// ---------------------------------------------------------------------------
// Layout helpers used by all four section stories. Each row has the same
// 4-column shape so the page reads like a spec table: Size | Token |
// Property | Preview.
// ---------------------------------------------------------------------------

const SAMPLE_TEXT =
  "Catylast tracks bug fixes and tasks across every project, helping teams quickly share knowledge and ship great work.";
const SAMPLE_DIGITS = "1234567890";

const pageStyle = {
  padding: space[24],
  background: color.surface.background,
  color: color.text.primary,
  fontFamily: fontFamily.sans,
  minHeight: "100vh",
};

const sectionStyle = {
  marginBottom: space[48],
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse" as const,
  marginTop: space[16],
};

const headerCellStyle = {
  textAlign: "left" as const,
  padding: `${space[8]} ${space[12]}`,
  fontSize: "12px",
  fontWeight: 500,
  color: color.text.subtle,
  borderBottom: `1px solid ${color.border.default}`,
  textTransform: "uppercase" as const,
  letterSpacing: "0.04em",
  verticalAlign: "bottom" as const,
};

const cellStyle = {
  padding: `${space[16]} ${space[12]}`,
  borderBottom: `1px solid ${color.border.subtle}`,
  verticalAlign: "top" as const,
};

const tokenCellStyle = {
  ...cellStyle,
  fontFamily: fontFamily.mono,
  fontSize: "12px",
  color: color.text.subtle,
  whiteSpace: "nowrap" as const,
};

const sizeCellStyle = {
  ...cellStyle,
  width: "60px",
  fontFamily: fontFamily.mono,
  fontSize: "12px",
  color: color.text.subtle,
};

const propertyCellStyle = {
  ...cellStyle,
  fontFamily: fontFamily.mono,
  fontSize: "12px",
  color: color.text.subtle,
  width: "180px",
};

function SectionTitle({ children }: { children: string }) {
  return (
    <Heading size="xxlarge" level={2} style={{ marginBottom: space[8] }}>
      {children}
    </Heading>
  );
}

function SectionLead({ children }: { children: string }) {
  return (
    <Text size="medium" color="subtle">
      {children}
    </Text>
  );
}

// ---------------------------------------------------------------------------
// Heading — 7 sizes, all weight 653
// ---------------------------------------------------------------------------

const HEADING_ROWS = [
  { size: "xxlarge", token: "font.heading.xxlarge", spec: "32 / 36 / 653" },
  { size: "xlarge", token: "font.heading.xlarge", spec: "28 / 32 / 653" },
  { size: "large", token: "font.heading.large", spec: "24 / 28 / 653" },
  { size: "medium", token: "font.heading.medium", spec: "20 / 24 / 653" },
  { size: "small", token: "font.heading.small", spec: "16 / 20 / 653" },
  { size: "xsmall", token: "font.heading.xsmall", spec: "14 / 20 / 653" },
  { size: "xxsmall", token: "font.heading.xxsmall", spec: "12 / 16 / 653" },
] as const;

export const HeadingScale: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Seven heading sizes, all using the custom Inter Variable weight 653. Pick the visual `size` independently from the semantic `level` — for example, a small page-section heading that should still announce as `<h2>` to assistive tech: `<Heading size=\"xsmall\" level={2}>`.\n\nWithout Inter Variable loaded, weight 653 rounds to the nearest available weight (typically 700) — the headings still look bold, but not pixel-perfect. Catylast's Storybook loads `@fontsource-variable/inter` so the rendering below is accurate.",
      },
    },
  },
  render: () => (
    <div style={pageStyle}>
      <SectionTitle>Heading</SectionTitle>
      <SectionLead>
        Display weight, Inter Variable axis 653. Use one heading-1 per page;
        size is independent of semantic level.
      </SectionLead>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={headerCellStyle}>Size</th>
            <th style={headerCellStyle}>Token</th>
            <th style={headerCellStyle}>Size / line-height / weight</th>
            <th style={headerCellStyle}>Preview</th>
          </tr>
        </thead>
        <tbody>
          {HEADING_ROWS.map((row) => (
            <tr key={row.size}>
              <td style={sizeCellStyle}>{row.size}</td>
              <td style={tokenCellStyle}>{row.token}</td>
              <td style={propertyCellStyle}>{row.spec}</td>
              <td style={cellStyle}>
                <Heading size={row.size}>{SAMPLE_TEXT}</Heading>
                <Heading
                  size={row.size}
                  style={{ marginTop: space[4] }}
                >
                  {SAMPLE_DIGITS}
                </Heading>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ),
};

// ---------------------------------------------------------------------------
// Body — 4 sizes × 3 weights
// ---------------------------------------------------------------------------

const BODY_SIZES = [
  { size: "xlarge", token: "font.body.xlarge", spec: "20 / 24", isDefault: false },
  { size: "large", token: "font.body.large", spec: "16 / 24", isDefault: false },
  { size: "medium", token: "font.body.medium", spec: "14 / 20", isDefault: true },
  { size: "small", token: "font.body.small", spec: "12 / 16", isDefault: false },
] as const;

const BODY_WEIGHTS = [
  { weight: "regular", label: "Regular (400)" },
  { weight: "medium", label: "Medium (500)" },
  { weight: "bold", label: "Bold (653)" },
] as const;

export const BodyScale: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Four body sizes, each available in three weights (Regular 400, Medium 500, Bold 653 — the same custom Bold as headings, kept consistent across families). `<Text size=\"medium\">` is the default body style across the design system; unstyled paragraphs inherit its values.\n\nParagraph spacing is intentionally not part of these tokens. Apply margin / gap via your layout primitives, not the text component itself — that way the same Text style works the same in a tight cell and a long-form article.",
      },
    },
  },
  render: () => (
    <div style={pageStyle}>
      <SectionTitle>Body</SectionTitle>
      <SectionLead>
        Three weights per size. Medium (14 / 20) is the design-system default.
      </SectionLead>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={headerCellStyle}>Size</th>
            <th style={headerCellStyle}>Token</th>
            <th style={headerCellStyle}>Weight</th>
            <th style={headerCellStyle}>Preview (default mode)</th>
          </tr>
        </thead>
        <tbody>
          {BODY_SIZES.flatMap((row) =>
            BODY_WEIGHTS.map((w, idx) => (
              <tr key={`${row.size}-${w.weight}`}>
                {idx === 0 && (
                  <td
                    style={{ ...sizeCellStyle, verticalAlign: "top" }}
                    rowSpan={BODY_WEIGHTS.length}
                  >
                    {row.size}
                    {row.isDefault && (
                      <div style={{ fontSize: "11px", color: color.text.accent }}>
                        default
                      </div>
                    )}
                    <div style={{ fontSize: "11px", color: color.text.subtle }}>
                      {row.spec}
                    </div>
                  </td>
                )}
                {idx === 0 && (
                  <td
                    style={{ ...tokenCellStyle, verticalAlign: "top" }}
                    rowSpan={BODY_WEIGHTS.length}
                  >
                    {row.token}
                  </td>
                )}
                <td style={propertyCellStyle}>{w.label}</td>
                <td style={cellStyle}>
                  <Text size={row.size} weight={w.weight} as="p">
                    {SAMPLE_TEXT}
                  </Text>
                  <Text
                    size={row.size}
                    weight={w.weight}
                    style={{ marginTop: space[2], display: "block" }}
                  >
                    {SAMPLE_DIGITS}
                  </Text>
                </td>
              </tr>
            )),
          )}
        </tbody>
      </table>
    </div>
  ),
};

// ---------------------------------------------------------------------------
// Metric — 3 sizes, bold display numerals
// ---------------------------------------------------------------------------

const METRIC_ROWS = [
  { size: "large", token: "font.metric.large", spec: "28 / 32 / 653" },
  { size: "medium", token: "font.metric.medium", spec: "24 / 28 / 653" },
  { size: "small", token: "font.metric.small", spec: "16 / 20 / 653" },
] as const;

export const MetricScale: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Bold display numerals for KPIs, dashboard cards, story-point chips, and progress percentages. Same custom 653 weight as Heading and the Bold body variant. Catylast bakes `font-variant-numeric: tabular-nums` into `<Metric>` by default so vertically-stacked numbers line up — try removing the property in DevTools to see how much narrower the column becomes when proportional figures slip in.",
      },
    },
  },
  render: () => (
    <div style={pageStyle}>
      <SectionTitle>Metric</SectionTitle>
      <SectionLead>
        Bold display numerals with tabular figures. For dashboard KPIs and
        progress chips.
      </SectionLead>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={headerCellStyle}>Size</th>
            <th style={headerCellStyle}>Token</th>
            <th style={headerCellStyle}>Size / line-height / weight</th>
            <th style={headerCellStyle}>Preview</th>
          </tr>
        </thead>
        <tbody>
          {METRIC_ROWS.map((row) => (
            <tr key={row.size}>
              <td style={sizeCellStyle}>{row.size}</td>
              <td style={tokenCellStyle}>{row.token}</td>
              <td style={propertyCellStyle}>{row.spec}</td>
              <td style={cellStyle}>
                <Metric size={row.size}>60% complete</Metric>
                <div style={{ marginTop: space[6] }}>
                  <Metric size={row.size}>5 in review</Metric>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ),
};

// ---------------------------------------------------------------------------
// Code — monospace inline + block
// ---------------------------------------------------------------------------

export const CodeStyle: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Inline code or full block. Both use JetBrains Mono Variable — the brand monospace face — at 12 / 20. The `<Code>` primitive defaults to inline; pass `block` for a `<pre><code>` wrapper that preserves whitespace and scrolls horizontally.",
      },
    },
  },
  render: () => (
    <div style={pageStyle}>
      <SectionTitle>Code</SectionTitle>
      <SectionLead>
        JetBrains Mono Variable, 12 / 20. Inline and block styles share the
        same `font.code` token.
      </SectionLead>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={headerCellStyle}>Application</th>
            <th style={headerCellStyle}>Token</th>
            <th style={headerCellStyle}>Property</th>
            <th style={headerCellStyle}>Preview</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={sizeCellStyle}>Inline</td>
            <td style={tokenCellStyle}>font.code</td>
            <td style={propertyCellStyle}>12 / 20 / 400</td>
            <td style={cellStyle}>
              <Text size="medium">
                Reference a ticket like <Code>IRP-42</Code> or a function
                like <Code>formatTicketKey()</Code> inline with prose.
              </Text>
            </td>
          </tr>
          <tr>
            <td style={sizeCellStyle}>Block</td>
            <td style={tokenCellStyle}>font.code</td>
            <td style={propertyCellStyle}>12 / 20 / 400</td>
            <td style={cellStyle}>
              <Code block>{`const x = 1 + 2;
console.log("Catylast tracks tickets", { id: x });
return x;`}</Code>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  ),
};

// ---------------------------------------------------------------------------
// Overview — every family on one page for cross-family comparison
// ---------------------------------------------------------------------------

export const Overview: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Every typography family on one page so you can see the relative weight, size, and rhythm at a glance. Use this story as the integration sanity-check after migrating a component — if the visual hierarchy below feels off, the migration drifted somewhere.",
      },
    },
  },
  render: () => (
    <div style={pageStyle}>
      <section style={sectionStyle}>
        <Heading size="xxlarge" level={1} style={{ marginBottom: space[4] }}>
          Heading xxlarge
        </Heading>
        <Heading size="xlarge" level={2} style={{ marginBottom: space[4] }}>
          Heading xlarge
        </Heading>
        <Heading size="large" level={2} style={{ marginBottom: space[4] }}>
          Heading large
        </Heading>
        <Heading size="medium" level={3} style={{ marginBottom: space[4] }}>
          Heading medium
        </Heading>
        <Heading size="small" level={4} style={{ marginBottom: space[4] }}>
          Heading small
        </Heading>
        <Heading size="xsmall" level={5} style={{ marginBottom: space[4] }}>
          Heading xsmall
        </Heading>
        <Heading size="xxsmall" level={6}>
          Heading xxsmall
        </Heading>
      </section>

      <section style={sectionStyle}>
        <Heading size="medium" level={2} style={{ marginBottom: space[12] }}>
          Body
        </Heading>
        <Text size="xlarge" as="p">
          Body xlarge — Inter Variable, 20px / 24, regular. Used for hero
          subheadings and feature callouts.
        </Text>
        <Text size="large" as="p">
          Body large — 16px / 24, regular. Comfortable for long-form copy.
        </Text>
        <Text size="medium" as="p">
          Body medium — 14px / 20, regular. The default for everything from
          form labels to table cells.
        </Text>
        <Text size="small" color="subtle" as="p">
          Body small — 12px / 16, regular. Captions, helper text, metadata.
        </Text>
      </section>

      <section style={sectionStyle}>
        <Heading size="medium" level={2} style={{ marginBottom: space[12] }}>
          Metric
        </Heading>
        <div style={{ display: "flex", gap: space[24], alignItems: "baseline" }}>
          <KpiCard label="Tickets resolved" value="247" size="large" />
          <KpiCard label="In review" value="18" size="medium" />
          <KpiCard label="Blocked" value="3" size="small" />
        </div>
      </section>

      <section style={sectionStyle}>
        <Heading size="medium" level={2} style={{ marginBottom: space[12] }}>
          Code
        </Heading>
        <Text size="medium" as="p">
          Reference a ticket like <Code>IRP-42</Code> inline. Block style
          below:
        </Text>
        <Code block>{`import { Heading, Text, Metric, Code } from "@catylast/primitives";

export function MyPage() {
  return <Heading size="large">Welcome to Catylast</Heading>;
}`}</Code>
      </section>
    </div>
  ),
};

function KpiCard({
  label,
  value,
  size,
}: {
  label: string;
  value: string;
  size: "large" | "medium" | "small";
}) {
  return (
    <div
      style={{
        padding: space[16],
        background: color.surface.raised,
        border: `1px solid ${color.border.subtle}`,
        borderRadius: radius.md,
        minWidth: "160px",
      }}
    >
      <Text size="small" color="subtle">
        {label}
      </Text>
      <div style={{ marginTop: space[4] }}>
        <Metric size={size}>{value}</Metric>
      </div>
    </div>
  );
}
