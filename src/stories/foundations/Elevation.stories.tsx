import type { Meta, StoryObj } from '@storybook/react';

const ELEVATIONS = [
  { name: 'surface (default)', token: '--ds-surface', fallback: '#FFFFFF', shadow: 'none', description: 'Flat page background. No elevation.' },
  { name: 'surface.raised', token: '--ds-surface-raised', fallback: '#FFFFFF', shadow: '0 1px 1px rgba(9,30,66,0.25), 0 0 1px rgba(9,30,66,0.31)', description: 'Cards, table containers, content blocks.' },
  { name: 'surface.overlay', token: '--ds-surface-overlay', fallback: '#FFFFFF', shadow: '0 4px 8px -2px rgba(9,30,66,0.25), 0 0 1px rgba(9,30,66,0.31)', description: 'Modals, dropdowns, popovers.' },
  { name: 'surface.sunken', token: '--ds-surface-sunken', fallback: '#F7F8F9', shadow: 'none', description: 'Recessed areas, code blocks, input backgrounds.' },
];

function ElevationDemo() {
  return (
    <div style={{ padding: 32, fontFamily: 'Atlassian Sans, -apple-system, sans-serif', background: 'var(--ds-surface-sunken)', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 'var(--ds-font-size-800)', fontWeight: 653, color: 'var(--ds-text)', margin: '0 0 24px' }}>Elevation</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
        {ELEVATIONS.map((e) => (
          <div key={e.name} style={{ background: `var(${e.token}, ${e.fallback})`, boxShadow: e.shadow, borderRadius: 8, padding: 24, border: e.shadow === 'none' ? '1px solid var(--ds-border)' : 'none' }}>
            <div style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 600, color: 'var(--ds-text)', marginBlockEnd: 4 }}>{e.name}</div>
            <div style={{ fontSize: 'var(--ds-font-size-200)', fontFamily: 'monospace', color: 'var(--ds-text-subtlest)', marginBlockEnd: 8 }}>var({e.token})</div>
            <div style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtle)' }}>{e.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const meta: Meta = { title: 'Foundations/Elevation', parameters: { layout: 'fullscreen' } };
export default meta;
type Story = StoryObj;
export const Surfaces: Story = { render: () => <ElevationDemo /> };
