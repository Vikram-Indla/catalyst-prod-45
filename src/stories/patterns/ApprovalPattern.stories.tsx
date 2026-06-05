import type { Meta, StoryObj } from '@storybook/react';
import Button from '@atlaskit/button/new';
import Lozenge from '@atlaskit/lozenge';
import CatalystAvatar from '@/components/shared/CatalystAvatar';
import { resolveAvatarUrl } from '@/lib/avatars';
import { token } from '@atlaskit/tokens';

const cardStyle: React.CSSProperties = {
  padding: 16, borderRadius: 8,
  background: token('elevation.surface', '#FFFFFF'),
  border: `1px solid ${token('color.border', '#DFE1E6')}`,
};

function ApprovalFlow() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 600 }}>
      <p style={{ font: `400 14px/20px var(--ds-font-family-body, "Atlassian Sans")`, color: token('color.text.subtle', '#44546F'), margin: 0 }}>
        Request → review → decision. An approver receives the item, sees context, and approves or rejects with a reason. Status reflects each transition.
      </p>
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBlockEnd: 12 }}>
          <span style={{ font: `600 14px/20px var(--ds-font-family-body, "Atlassian Sans")`, color: token('color.text', '#172B4D') }}>Change Request CR-204</span>
          <Lozenge appearance="moved">Pending approval</Lozenge>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBlockEnd: 12 }}>
          <CatalystAvatar size="small" src={resolveAvatarUrl('Vikram Indla') || undefined} name="Vikram Indla" />
          <span style={{ font: `400 13px/18px var(--ds-font-family-body, "Atlassian Sans")`, color: token('color.text.subtle', '#44546F') }}>Requested by Vikram Indla</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button appearance="primary">Approve</Button>
          <Button appearance="warning">Reject…</Button>
        </div>
      </div>
    </div>
  );
}

const meta: Meta<typeof ApprovalFlow> = {
  title: 'Patterns/Approval Pattern',
  component: ApprovalFlow,
  parameters: { layout: 'padded' },
};
export default meta;
export const Default: StoryObj<typeof ApprovalFlow> = {};
