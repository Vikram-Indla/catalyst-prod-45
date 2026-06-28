import type { Meta, StoryObj } from '@storybook/react';

const TYPE_SCALE = [
  { size: 12, weight: 400, label: 'Caption / field value', sample: 'BAU-5957 Ready for Development' },
  { size: 12, weight: 600, label: 'Section count / column header', sample: 'ASSIGNEE' },
  { size: 13, weight: 400, label: 'Body text', sample: 'This story needs a clear acceptance criteria before development begins.' },
  { size: 14, weight: 400, label: 'Table cell / paragraph', sample: 'Implement user authentication flow with OAuth2 integration' },
  { size: 14, weight: 500, label: 'Description heading / button label', sample: 'Description' },
  { size: 16, weight: 653, label: 'Section header (Key details, Subtasks, Activity)', sample: 'Key details' },
  { size: 20, weight: 600, label: 'Card title / panel heading', sample: 'Sprint 2.4 — Feature delivery' },
  { size: 24, weight: 653, label: 'Page H1 / admin heading', sample: 'Project backlog' },
];

function TypographyScale() {
  return (
    <div style={{ padding: 24, fontFamily: 'Atlassian Sans, -apple-system, sans-serif' }}>
      <h1 style={{ fontSize: 'var(--ds-font-size-800)', fontWeight: 653, color: 'var(--ds-text)', margin: '0 0 24px' }}>
        Type Scale
      </h1>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--ds-border)', textAlign: 'left' }}>
            <th style={{ padding: '8px 16px 8px 0', fontSize: 'var(--ds-font-size-200)', fontWeight: 653, color: 'var(--ds-text-subtle)' }}>Spec</th>
            <th style={{ padding: '8px 16px 8px 0', fontSize: 'var(--ds-font-size-200)', fontWeight: 653, color: 'var(--ds-text-subtle)' }}>Role</th>
            <th style={{ padding: '8px 0', fontSize: 'var(--ds-font-size-200)', fontWeight: 653, color: 'var(--ds-text-subtle)' }}>Sample</th>
          </tr>
        </thead>
        <tbody>
          {TYPE_SCALE.map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--ds-border)' }}>
              <td style={{ padding: '12px 16px 12px 0', fontSize: 'var(--ds-font-size-200)', fontFamily: 'monospace', color: 'var(--ds-text-subtlest)', whiteSpace: 'nowrap' }}>
                {row.size}px / {row.weight}
              </td>
              <td style={{ padding: '12px 16px 12px 0', fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtle)' }}>
                {row.label}
              </td>
              <td style={{ padding: '12px 0' }}>
                <span style={{ fontSize: row.size, fontWeight: row.weight, color: 'var(--ds-text)' }}>
                  {row.sample}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const meta: Meta = {
  title: 'Foundations/Typography',
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj;

export const Scale: Story = {
  render: () => <TypographyScale />,
};
