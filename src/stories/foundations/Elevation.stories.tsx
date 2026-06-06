import type { Meta, StoryObj } from '@storybook/react';

const ELEVATIONS = [
  { name: 'surface (default)', token: '--ds-surface', fallback: '#FFFFFF', shadow: 'none', description: 'Flat page background. No elevation.' },
  { name: 'surface.raised', token: '--ds-surface-raised', fallback: '#FFFFFF', shadow: '0 1px 1px rgba(9,30,66,0.25), 0 0 1px rgba(9,30,66,0.31)', description: 'Cards, table containers, content blocks.' },
  { name: 'surface.overlay', token: '--ds-surface-overlay', fallback: '#FFFFFF', shadow: '0 4px 8px -2px rgba(9,30,66,0.25), 0 0 1px rgba(9,30,66,0.31)', description: 'Modals, dropdowns, popovers.' },
  { name: 'surface.sunken', token: '--ds-surface-sunken', fallback: '#F7F8F9', shadow: 'none', description: 'Recessed areas, code blocks, input backgrounds.' },
];

function ElevationDemo() {
  return (
    <div style={{ padding: 32, fontFamily: 'Atlassian Sans, -apple-system, sans-serif', background: 'var(--ds-surface-sunken, #F7F8F9)', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 24, fontWeight: 653, color: 'var(--ds-text, #172B4D)', margin: '0 0 24px' }}>Elevation</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
        {ELEVATIONS.map((e) => (
          <div key={e.name} style={{ background: `var(${e.token}, ${e.fallback})`, boxShadow: e.shadow, borderRadius: 8, padding: 24, border: e.shadow === 'none' ? '1px solid var(--ds-border, #DFE1E6)' : 'none' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ds-text, #172B4D)', marginBlockEnd: 4 }}>{e.name}</div>
            <div style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--ds-text-subtlest, #6B778C)', marginBlockEnd: 8 }}>var({e.token})</div>
            <div style={{ fontSize: 13, color: 'var(--ds-text-subtle, #42526E)' }}>{e.description}</div>
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
