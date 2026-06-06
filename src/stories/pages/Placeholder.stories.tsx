import type { Meta, StoryObj } from '@storybook/react';

function PlaceholderPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', fontFamily: 'Atlassian Sans, -apple-system, sans-serif', background: 'var(--ds-surface, #FFFFFF)' }}>
      <header style={{ height: 56, borderBottom: '1px solid var(--ds-border, #DFE1E6)', display: 'flex', alignItems: 'center', padding: '0 24px', background: 'var(--ds-surface, #FFFFFF)' }}>
        <span style={{ fontSize: 16, fontWeight: 653, color: 'var(--ds-text, #172B4D)' }}>Catalyst</span>
      </header>
      <div style={{ display: 'flex', flex: 1 }}>
        <nav style={{ width: 240, borderRight: '1px solid var(--ds-border, #DFE1E6)', padding: 16, background: 'var(--ds-surface, #FFFFFF)' }}>
          {['For you', 'Project hub', 'Product hub', 'Releases', 'Incidents', 'Admin'].map((item) => (
            <div key={item} style={{ padding: '8px 12px', borderRadius: 4, fontSize: 14, fontWeight: 500, color: 'var(--ds-text-subtle, #42526E)', marginBlockEnd: 4 }}>{item}</div>
          ))}
        </nav>
        <main style={{ flex: 1, padding: 32 }}>
          <h1 style={{ fontSize: 24, fontWeight: 653, color: 'var(--ds-text, #172B4D)', margin: '0 0 8px' }}>Page placeholder</h1>
          <p style={{ fontSize: 14, color: 'var(--ds-text-subtle, #42526E)', margin: 0 }}>Full page stories will be added here as surfaces are documented.</p>
        </main>
      </div>
    </div>
  );
}

const meta: Meta = { title: 'Pages/Placeholder', parameters: { layout: 'fullscreen' } };
export default meta;
type Story = StoryObj;
export const Default: Story = { render: () => <PlaceholderPage /> };
