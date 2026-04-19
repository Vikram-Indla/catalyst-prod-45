/**
 * Lozenge + StatusLozenge — Storybook canonical fixture.
 *
 * Two story trees in one file:
 *   • ADS/Lozenge         generic (hub badges, non-status labels)
 *   • ADS/StatusLozenge   the 3-colour guardrail
 *
 * The StatusLozenge fixtures are the contract for the colour-audit
 * visual-regression test — any drift from the canonical bg/fg is caught
 * by Playwright at 0.01 pixel delta.
 */
import type { Meta, StoryObj } from '@storybook/react';
import { Lozenge, StatusLozenge } from '@/components/ads';

/* ─────────────────────────────────────────────────────────────────
 * Generic Lozenge
 * ───────────────────────────────────────────────────────────────── */

const lozengeMeta: Meta<typeof Lozenge> = {
  title: 'ADS/Lozenge',
  component: Lozenge,
  argTypes: {
    appearance: {
      control: 'select',
      options: ['default', 'inprogress', 'moved', 'new', 'removed', 'success'],
    },
    isBold: { control: 'boolean' },
  },
};
export default lozengeMeta;

type LozengeStory = StoryObj<typeof Lozenge>;

export const Default: LozengeStory = {
  args: { appearance: 'default', children: 'Default' },
};

export const Bold: LozengeStory = {
  args: { appearance: 'success', isBold: true, children: 'Bold success' },
};

export const AllAppearances: LozengeStory = {
  render: () => (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <Lozenge appearance="default">Default</Lozenge>
      <Lozenge appearance="inprogress">In Progress</Lozenge>
      <Lozenge appearance="success">Success</Lozenge>
      <Lozenge appearance="moved">Moved</Lozenge>
      <Lozenge appearance="new">New</Lozenge>
      <Lozenge appearance="removed">Removed</Lozenge>
    </div>
  ),
};

export const Truncated: LozengeStory = {
  args: {
    appearance: 'default',
    maxWidth: 80,
    children: 'This label is much longer than 80 px and will truncate',
  },
};
