import type { Meta, StoryObj } from '@storybook/react';
import Lozenge from '@atlaskit/lozenge';
import { token } from '@atlaskit/tokens';

const STAGES: { name: string; appearance: 'default' | 'inprogress' | 'success'; active?: boolean }[] = [
  { name: 'To Do', appearance: 'default' },
  { name: 'In Progress', appearance: 'inprogress', active: true },
  { name: 'In Review', appearance: 'inprogress' },
  { name: 'Done', appearance: 'success' },
];

function WorkflowFlow() {
  return (
    <div style={{ maxWidth: 720 }}>
      <p style={{ font: `400 14px/20px var(--ds-font-family-body, "Atlassian Sans")`, color: token('color.text.subtle', '#44546F'), margin: '0 0 16px' }}>
        Status moves left-to-right through workflow stages. Allowed transitions are enforced server-side; the status pill is the single transition control.
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {STAGES.map((s, i) => (
          <span key={s.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span style={{
              padding: s.active ? '4px 10px' : 0,
              borderRadius: 6,
              outline: s.active ? `2px solid ${token('color.border.selected', '#0052CC')}` : 'none',
            }}>
              <Lozenge appearance={s.appearance}>{s.name}</Lozenge>
            </span>
            {i < STAGES.length - 1 && (
              <svg width="20" height="12" viewBox="0 0 20 12" fill={token('color.icon.subtle', '#6B778C')} aria-hidden="true">
                <path d="M14 1l5 5-5 5V7H1V5h13V1z" />
              </svg>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

const meta: Meta<typeof WorkflowFlow> = {
  title: 'Patterns/Workflow Pattern',
  component: WorkflowFlow,
  parameters: { layout: 'padded' },
};
export default meta;
export const Default: StoryObj<typeof WorkflowFlow> = {};
