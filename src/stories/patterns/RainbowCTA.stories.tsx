import type { Meta, StoryObj } from '@storybook/react';
import { CatyRainbowCTA } from '@/components/for-you/atlaskit/CatyRainbowCTA';

function RainbowCTAPattern() {
  return (
    <div style={{ maxWidth: 600, fontFamily: 'Atlassian Sans, -apple-system, sans-serif' }}>
      <h2 style={{ fontSize: 16, fontWeight: 653, color: 'var(--ds-text, #172B4D)', margin: '0 0 8px' }}>Rainbow CTA pattern</h2>
      <p style={{ fontSize: 13, color: 'var(--ds-text-subtle, #42526E)', margin: '0 0 24px' }}>
        Static conic-gradient rainbow border on AI-branded CTAs only. No rotation, no animation. The rainbow is the AI signifier.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[
          { ctx: 'Themify', label: 'Ask Caty - Themify' },
          { ctx: 'Triage stale items', label: 'Ask Caty - Triage stale' },
          { ctx: 'Board health', label: 'Ask Caty - Board health' },
          { ctx: 'Workload risk', label: 'Ask Caty - Workload risk' },
        ].map((v) => (
          <div key={v.ctx} style={{ padding: 16, border: '1px solid var(--ds-border, #DFE1E6)', borderRadius: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtlest, #6B778C)', marginBlockEnd: 8 }}>{v.ctx}</div>
            <CatyRainbowCTA label={v.label} onClick={() => {}} align="left" />
          </div>
        ))}
        <div style={{ padding: 16, border: '1px solid var(--ds-border, #DFE1E6)', borderRadius: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtlest, #6B778C)', marginBlockEnd: 8 }}>Loading state</div>
          <CatyRainbowCTA label="Ask Caty - Thinking" onClick={() => {}} isLoading align="left" />
        </div>
      </div>
    </div>
  );
}

const meta: Meta = { title: 'Patterns/Rainbow CTA', parameters: { layout: 'padded' } };
export default meta;
type Story = StoryObj;
export const AllVariants: Story = { render: () => <RainbowCTAPattern /> };
