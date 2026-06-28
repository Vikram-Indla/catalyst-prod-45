import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';

function MotionExamples() {
  const [hovered, setHovered] = useState<string | null>(null);
  const boxBase: React.CSSProperties = {
    width: 120, height: 48, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 'var(--ds-font-size-300)', fontWeight: 500, color: 'var(--ds-text)', cursor: 'pointer', border: '1px solid var(--ds-border)',
  };

  return (
    <div style={{ padding: 24, fontFamily: 'Atlassian Sans, -apple-system, sans-serif' }}>
      <h1 style={{ fontSize: 'var(--ds-font-size-800)', fontWeight: 653, color: 'var(--ds-text)', margin: '0 0 8px' }}>Motion</h1>
      <p style={{ fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text-subtle)', margin: '0 0 32px' }}>
        Enterprise transitions: 150ms ease for hover states. No spinning, no pulsing, no particle effects.
      </p>

      <h2 style={{ fontSize: 'var(--ds-font-size-500)', fontWeight: 653, color: 'var(--ds-text)', margin: '0 0 16px' }}>Hover brightness (approved)</h2>
      <div style={{ display: 'flex', gap: 16, marginBlockEnd: 32 }}>
        <div style={{ ...boxBase, background: 'var(--ds-background-neutral)', transition: 'filter 150ms ease', filter: hovered === 'brightness' ? 'brightness(1.08)' : 'brightness(1)' }}
          onMouseEnter={() => setHovered('brightness')} onMouseLeave={() => setHovered(null)}>Hover me</div>
        <div style={{ ...boxBase, background: 'var(--ds-background-selected-bold)', color: 'var(--ds-text-inverse)', transition: 'filter 150ms ease', filter: hovered === 'primary' ? 'brightness(1.08)' : 'brightness(1)' }}
          onMouseEnter={() => setHovered('primary')} onMouseLeave={() => setHovered(null)}>Primary</div>
      </div>

      <h2 style={{ fontSize: 'var(--ds-font-size-500)', fontWeight: 653, color: 'var(--ds-text)', margin: '0 0 16px' }}>Opacity fade (approved)</h2>
      <div style={{ display: 'flex', gap: 16, marginBlockEnd: 32 }}>
        <div style={{ ...boxBase, background: 'var(--ds-background-neutral)', transition: 'opacity 150ms ease', opacity: hovered === 'opacity' ? 0.7 : 1 }}
          onMouseEnter={() => setHovered('opacity')} onMouseLeave={() => setHovered(null)}>Disabled state</div>
      </div>

      <h2 style={{ fontSize: 'var(--ds-font-size-500)', fontWeight: 653, color: 'var(--ds-text)', margin: '0 0 16px' }}>Background transition (approved)</h2>
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
