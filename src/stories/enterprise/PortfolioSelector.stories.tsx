import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import Select from '@atlaskit/select';
import { token } from '@atlaskit/tokens';

const PROJECTS = [
  { label: 'BAU – Senaei BAU', value: 'BAU' },
  { label: 'MWR – MIM Website Revamp', value: 'MWR' },
  { label: 'INV – Investor Journey', value: 'INV' },
  { label: 'MDT – Ministry Digital Transformation', value: 'MDT' },
];

function PortfolioHarness() {
  const [selected, setSelected] = useState([PROJECTS[0], PROJECTS[1]]);
  return (
    <div style={{ maxWidth: 480, padding: 16 }}>
      <div style={{ font: `600 12px/16px var(--ds-font-family-body, "Atlassian Sans")`, color: token('color.text.subtlest', '#6B778C'), marginBlockEnd: 6 }}>
        Portfolio scope
      </div>
      <Select
        inputId="portfolio-select"
        isMulti
        options={PROJECTS}
        value={selected}
        onChange={(v) => setSelected(v as typeof selected)}
        placeholder="Select projects…"
      />
    </div>
  );
}

const meta: Meta<typeof PortfolioHarness> = {
  title: 'Enterprise Components/Portfolio Selector',
  component: PortfolioHarness,
  parameters: { layout: 'padded' },
};
export default meta;
export const Default: StoryObj<typeof PortfolioHarness> = {};
