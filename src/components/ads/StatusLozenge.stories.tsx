/**
 * StatusLozenge — the 3-colour guardrail.
 *
 * These three canonical stories (Todo / InProgress / Done) are the
 * bg/fg contract that the colour-audit visual-regression test pins at
 * 0.01 pixel delta. Any drift indicates a token bump or a theme-bridge
 * regression.
 */
import type { Meta, StoryObj } from '@storybook/react';
import { StatusLozenge, toStatusCategory } from '@/components/ads';

const meta: Meta<typeof StatusLozenge> = {
  title: 'ADS/StatusLozenge',
  component: StatusLozenge,
  argTypes: {
    status: {
      control: 'select',
      options: ['todo', 'inProgress', 'done'],
    },
  },
};
export default meta;

type Story = StoryObj<typeof StatusLozenge>;

export const Todo: Story = {
  args: { status: 'todo', children: 'TO DO' },
};

export const InProgress: Story = {
  args: { status: 'inProgress', children: 'IN PROGRESS' },
};

export const Done: Story = {
  args: { status: 'done', children: 'DONE' },
};

export const AllThree: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8 }}>
      <StatusLozenge status="todo">TO DO</StatusLozenge>
      <StatusLozenge status="inProgress">IN PROGRESS</StatusLozenge>
      <StatusLozenge status="done">DONE</StatusLozenge>
    </div>
  ),
};

/**
 * Demonstrates toStatusCategory — the edge adapter from raw Jira/Catalyst
 * strings to the canonical bucket. If the label is unknown, falls back to
 * 'todo' (grey) rather than throwing.
 */
export const ViaEdgeAdapter: Story = {
  render: () => {
    const rawLabels: Array<[string, string]> = [
      ['Backlog', 'BACKLOG'],
      ['Selected for Development', 'SELECTED'],
      ['In Review', 'IN REVIEW'],
      ['Done', 'DONE'],
      ['Released', 'RELEASED'],
      ['Some New Status', 'UNKNOWN'],
    ];
    return (
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {rawLabels.map(([raw, display]) => (
          <StatusLozenge key={raw} status={toStatusCategory(raw)}>{display}</StatusLozenge>
        ))}
      </div>
    );
  },
};
