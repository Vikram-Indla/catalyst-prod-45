import type { Meta, StoryObj } from '@storybook/react';
import Button from '@atlaskit/button/new';
import Checkbox from '@atlaskit/checkbox';
import { token } from '@atlaskit/tokens';

const ROWS = ['BAU-5957', 'BAU-5078', 'BAU-5751', 'BAU-4466'];

function BulkEditFlow() {
  return (
    <div style={{ maxWidth: 720 }}>
      <p style={{ font: `400 14px/20px var(--ds-font-family-body, "Atlassian Sans")`, color: token('color.text.subtle', '#44546F'), margin: '0 0 12px' }}>
        Multi-select rows, then act on the whole set from a bottom-anchored action bar — Edit / Move / Transition / Delete. Mirrors Jira's bulk-change wizard.
      </p>
      <div style={{ border: `1px solid ${token('color.border', '#DFE1E6')}`, borderRadius: 8, overflow: 'hidden' }}>
        {ROWS.map((k, i) => (
          <div key={k} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px',
            background: i < 2 ? token('color.background.selected', '#E9F2FF') : token('elevation.surface', '#FFFFFF'),
            borderBottom: i < ROWS.length - 1 ? `1px solid ${token('color.border', '#DFE1E6')}` : 'none',
          }}>
            <Checkbox isChecked={i < 2} label="" />
            <span style={{ font: `500 13px/18px var(--ds-font-family-code, monospace)`, color: token('color.link', '#0052CC') }}>{k}</span>
          </div>
        ))}
      </div>
      <div style={{
        marginBlockStart: 12, padding: 12, borderRadius: 8,
        background: token('elevation.surface.overlay', '#FFFFFF'),
        border: `1px solid ${token('color.border', '#DFE1E6')}`,
        display: 'flex', alignItems: 'center', gap: 8,
        boxShadow: token('elevation.shadow.overlay', '0 4px 8px rgba(9,30,66,0.25)'),
      }}>
        <span style={{ font: `600 13px/18px var(--ds-font-family-body, "Atlassian Sans")`, color: token('color.text', '#172B4D') }}>2 selected</span>
        <span style={{ flex: 1 }} />
        <Button appearance="default" spacing="compact">Edit</Button>
        <Button appearance="default" spacing="compact">Move</Button>
        <Button appearance="default" spacing="compact">Transition</Button>
        <Button appearance="warning" spacing="compact">Delete</Button>
      </div>
    </div>
  );
}

const meta: Meta<typeof BulkEditFlow> = {
  title: 'Patterns/Bulk Edit Pattern',
  component: BulkEditFlow,
  parameters: { layout: 'padded' },
};
export default meta;
export const Default: StoryObj<typeof BulkEditFlow> = {};
