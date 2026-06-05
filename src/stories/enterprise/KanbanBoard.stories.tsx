import type { Meta, StoryObj } from '@storybook/react';
import { token } from '@atlaskit/tokens';
import { BoardCard, BoardColumn } from './_BoardCard';

function KanbanHarness() {
  return (
    <div style={{ display: 'flex', gap: 16, padding: 16, overflowX: 'auto', background: token('elevation.surface', '#FFFFFF') }}>
      <BoardColumn name="To Do" count={3} dotColor={token('color.icon.subtle', '#6B778C')}>
        <BoardCard card={{ key: 'BAU-5957', title: 'Update product details survey', type: 'Story', assignee: 'Ahmed Yousry', label: 'Ready for Development', labelAppearance: 'default' }} />
        <BoardCard card={{ key: 'BAU-5815', title: 'Investor fast track shipment requests', type: 'Story', assignee: 'Nada Alfassam', label: 'In Requirements', labelAppearance: 'default' }} />
      </BoardColumn>
      <BoardColumn name="In Progress" count={2} dotColor={token('color.icon.information', '#1D7AFC')}>
        <BoardCard card={{ key: 'BAU-5078', title: 'Enable Active Directory SSO login', type: 'Story', assignee: 'Ahmed Yousry', label: 'In Development', labelAppearance: 'inprogress' }} />
        <BoardCard card={{ key: 'BAU-5751', title: 'Global services – industrial auditing', type: 'QA Bug', assignee: 'Aya Ibrahims', label: 'In QA', labelAppearance: 'moved' }} />
      </BoardColumn>
      <BoardColumn name="Done" count={1} dotColor={token('color.icon.success', '#22A06B')}>
        <BoardCard card={{ key: 'BAU-5471', title: 'CLONE – NDS – Investment opportunity', type: 'Task', assignee: 'Vikram Indla', label: 'Done', labelAppearance: 'success' }} />
      </BoardColumn>
    </div>
  );
}

const meta: Meta<typeof KanbanHarness> = {
  title: 'Enterprise Components/Kanban Board',
  component: KanbanHarness,
  parameters: { layout: 'fullscreen' },
};
export default meta;
export const Default: StoryObj<typeof KanbanHarness> = {};
