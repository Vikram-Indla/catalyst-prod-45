import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';

function MotionExamples() {
  const [hovered, setHovered] = useState<string | null>(null);
  const boxBase: React.CSSProperties = {
    width: 120, height: 48, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 13, fontWeight: 500, color: 'var(--ds-text, #172B4D)', cursor: 'pointer', border: '1px solid var(--ds-border, #DFE1E6)',
  };

  return (
    <div style={{ padding: 24, fontFamily: 'Atlassian Sans, -apple-system, sans-serif' }}>
      <h1 style={{ fontSize: 24, fontWeight: 653, color: 'var(--ds-text, #172B4D)', margin: '0 0 8px' }}>Motion</h1>
      <p style={{ fontSize: 14, color: 'var(--ds-text-subtle, #42526E)', margin: '0 0 32px' }}>
        Enterprise transitions: 150ms ease for hover states. No spinning, no pulsing, no particle effects.
      </p>

      <h2 style={{ fontSize: 16, fontWeight: 653, color: 'var(--ds-text, #172B4D)', margin: '0 0 16px' }}>Hover brightness (approved)</h2>
      <div style={{ display: 'flex', gap: 16, marginBlockEnd: 32 }}>
        <div style={{ ...boxBase, background: 'var(--ds-background-neutral, #F1F2F4)', transition: 'filter 150ms ease', filter: hovered === 'brightness' ? 'brightness(1.08)' : 'brightness(1)' }}
          onMouseEnter={() => setHovered('brightness')} onMouseLeave={() => setHovered(null)}>Hover me</div>
        <div style={{ ...boxBase, background: 'var(--ds-background-selected-bold, #0C66E4)', color: 'var(--ds-text-inverse, #FFFFFF)', transition: 'filter 150ms ease', filter: hovered === 'primary' ? 'brightness(1.08)' : 'brightness(1)' }}
          onMouseEnter={() => setHovered('primary')} onMouseLeave={() => setHovered(null)}>Primary</div>
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 653, color: 'var(--ds-text, #172B4D)', margin: '0 0 16px' }}>Opacity fade (approved)</h2>
      <div style={{ display: 'flex', gap: 16, marginBlockEnd: 32 }}>
        <div style={{ ...boxBase, background: 'var(--ds-background-neutral, #F1F2F4)', transition: 'opacity 150ms ease', opacity: hovered === 'opacity' ? 0.7 : 1 }}
          onMouseEnter={() => setHovered('opacity')} onMouseLeave={() => setHovered(null)}>Disabled state</div>
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 653, color: 'var(--ds-text, #172B4D)', margin: '0 0 16px' }}>Background transition (approved)</h2>
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ ...boxBase, background: hovered === 'bg' ? 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))' : 'transparent', transition: 'background 150ms ease', border: 'none' }}
          onMouseEnter={() => setHovered('bg')} onMouseLeave={() => setHovered(null)}>Row hover</div>
      </div>
    </div>
  );
}

const meta: Meta = { title: 'Foundations/Motion', parameters: { layout: 'padded' } };
export default meta;
type Story = StoryObj;
export const Transitions: Story = { render: () => <MotionExamples /> };
