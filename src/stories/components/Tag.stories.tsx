import type { Meta, StoryObj } from '@storybook/react';
import Lozenge from '@atlaskit/lozenge';

function TagRow() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 653, color: 'var(--ds-text-subtle, #42526E)', marginBlockEnd: 8 }}>Priority tags</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Lozenge appearance="removed" isBold>Critical</Lozenge>
          <Lozenge appearance="moved" isBold>High</Lozenge>
          <Lozenge appearance="new" isBold>Medium</Lozenge>
          <Lozenge appearance="default" isBold>Low</Lozenge>
        </div>
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 653, color: 'var(--ds-text-subtle, #42526E)', marginBlockEnd: 8 }}>Label tags (subtle)</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Lozenge appearance="default">backend</Lozenge>
          <Lozenge appearance="default">frontend</Lozenge>
          <Lozenge appearance="default">api</Lozenge>
          <Lozenge appearance="inprogress">tech-debt</Lozenge>
          <Lozenge appearance="success">shipped</Lozenge>
        </div>
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 653, color: 'var(--ds-text-subtle, #42526E)', marginBlockEnd: 8 }}>Category tags</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Lozenge appearance="inprogress">Sprint 2.4</Lozenge>
          <Lozenge appearance="new">Q2 2026</Lozenge>
          <Lozenge appearance="moved">Design review</Lozenge>
        </div>
      </div>
    </div>
  );
}

const meta: Meta = { title: 'Components/Tag', parameters: { layout: 'padded' } };
export default meta;
type Story = StoryObj;
export const Tags: Story = { render: () => <TagRow /> };
