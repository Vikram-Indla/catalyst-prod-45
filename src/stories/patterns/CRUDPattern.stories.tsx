import type { Meta, StoryObj } from '@storybook/react';
import Button from '@atlaskit/button/new';
import Lozenge from '@atlaskit/lozenge';
import { token } from '@atlaskit/tokens';

const stepStyle: React.CSSProperties = {
  padding: 16, borderRadius: 8,
  background: token('elevation.surface', '#FFFFFF'),
  border: `1px solid ${token('color.border', '#DFE1E6')}`,
};
const labelStyle: React.CSSProperties = {
  font: `600 12px/16px var(--ds-font-family-body, "Atlassian Sans")`,
  color: token('color.text.subtlest', '#6B778C'), textTransform: 'none',
};

function CRUDFlow() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 640 }}>
      <p style={{ font: `400 14px/20px var(--ds-font-family-body, "Atlassian Sans")`, color: token('color.text.subtle', '#44546F'), margin: 0 }}>
        Canonical Create / Read / Update / Delete flow. Each mutation lands in the backend, re-renders optimistically, and confirms via toast. Delete always requires a confirm dialog.
      </p>
      <div style={stepStyle}>
        <span style={labelStyle}>Create</span>
        <div style={{ marginBlockStart: 8 }}><Button appearance="primary">Create issue</Button></div>
      </div>
      <div style={stepStyle}>
        <span style={labelStyle}>Read</span>
        <div style={{ marginBlockStart: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ font: `500 13px/18px var(--ds-font-family-code, monospace)`, color: token('color.link', '#0052CC') }}>BAU-5957</span>
          <Lozenge appearance="inprogress">In Progress</Lozenge>
        </div>
      </div>
      <div style={stepStyle}>
        <span style={labelStyle}>Update</span>
        <div style={{ marginBlockStart: 8, display: 'flex', gap: 8 }}>
          <Button appearance="default">Edit</Button>
          <Button appearance="subtle">Save</Button>
        </div>
      </div>
      <div style={stepStyle}>
        <span style={labelStyle}>Delete (confirm required)</span>
        <div style={{ marginBlockStart: 8 }}><Button appearance="warning">Delete…</Button></div>
      </div>
    </div>
  );
}

const meta: Meta<typeof CRUDFlow> = {
  title: 'Patterns/CRUD Pattern',
  component: CRUDFlow,
  parameters: { layout: 'padded' },
};
export default meta;
export const Default: StoryObj<typeof CRUDFlow> = {};
