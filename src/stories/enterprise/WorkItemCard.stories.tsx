import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta = {
  title: 'Enterprise Components/Work Item Card',
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj;

export const Placeholder: Story = {
  render: () => (
    <div style={{ width: 280, padding: 12, borderRadius: 8, border: '1px solid var(--ds-border, #DFE1E6)', background: 'var(--ds-surface, #fff)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ width: 16, height: 16, borderRadius: 2, background: '#36B37E' }} />
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ds-text-subtle, #42526E)', fontFamily: 'monospace' }}>BAU-5757</span>
      </div>
      <div style={{ fontSize: 14, color: 'var(--ds-text, #172B4D)', fontWeight: 400, lineHeight: 1.4 }}>
        Implement user authentication flow
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
        <span style={{ padding: '2px 6px', borderRadius: 3, background: '#669DF1', color: '#fff', fontSize: 10, fontWeight: 700 }}>IN PROGRESS</span>
        <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#0C66E4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 600 }}>VI</span>
      </div>
    </div>
  ),
};
