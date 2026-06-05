import type { Meta, StoryObj } from '@storybook/react';
import { token } from '@atlaskit/tokens';
import Lozenge from '@atlaskit/lozenge';
import { BoardCard, BoardColumn } from './_BoardCard';

function SprintHarness() {
  return (
    <div style={{ background: token('elevation.surface', '#FFFFFF') }}>
      {/* Sprint header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, borderBottom: `1px solid ${token('color.border', '#DFE1E6')}` }}>
        <span style={{ font: `653 16px/20px var(--ds-font-family-body, "Atlassian Sans")`, color: token('color.text', '#172B4D') }}>
          Sprint 2.4 – May
        </span>
        <Lozenge appearance="inprogress">Active</Lozenge>
        <span style={{ font: `400 13px/18px var(--ds-font-family-body, "Atlassian Sans")`, color: token('color.text.subtlest', '#6B778C') }}>
          15 May – 29 May · 6 work items
        </span>
      </div>
      {/* Columns */}
      <div style={{ display: 'flex', gap: 16, padding: 16, overflowX: 'auto' }}>
        <BoardColumn name="To Do" count={2} dotColor={token('color.icon.subtle', '#6B778C')}>
          <BoardCard card={{ key: 'BAU-5957', title: 'Update product details survey', type: 'Story', assignee: 'Ahmed Yousry' }} />
          <BoardCard card={{ key: 'BAU-5958', title: 'Add price field validation rule', type: 'Sub-task', assignee: 'Amadou Ndiaye' }} />
        </BoardColumn>
        <BoardColumn name="In Progress" count={2} dotColor={token('color.icon.information', '#1D7AFC')}>
          <BoardCard card={{ key: 'BAU-5078', title: 'Enable Active Directory SSO login', type: 'Story', assignee: 'Ahmed Yousry' }} />
          <BoardCard card={{ key: 'BAU-5174', title: 'Landing Page – DGA modification', type: 'Feature', assignee: 'Nada Alfassam' }} />
        </BoardColumn>
        <BoardColumn name="In Review" count={1} dotColor={token('color.icon.information', '#1D7AFC')}>
          <BoardCard card={{ key: 'BAU-5751', title: 'Global services – industrial auditing', type: 'QA Bug', assignee: 'Aya Ibrahims' }} />
        </BoardColumn>
        <BoardColumn name="Done" count={1} dotColor={token('color.icon.success', '#22A06B')}>
          <BoardCard card={{ key: 'BAU-5471', title: 'CLONE – NDS – Investment opportunity', type: 'Task', assignee: 'Vikram Indla' }} />
        </BoardColumn>
      </div>
    </div>
  );
}

const meta: Meta<typeof SprintHarness> = {
  title: 'Enterprise Components/Sprint Board',
  component: SprintHarness,
  parameters: { layout: 'fullscreen' },
};
export default meta;
export const Default: StoryObj<typeof SprintHarness> = {};
