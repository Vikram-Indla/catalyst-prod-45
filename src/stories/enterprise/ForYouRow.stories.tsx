import type { Meta, StoryObj } from '@storybook/react';
import ForYouRow from '@/components/for-you/atlaskit/ForYouRow';
import type { WorkItem } from '@/hooks/useForYouData';

const MOCK_ITEM: WorkItem = {
  id: 'BAU-5957', key: 'BAU-5957', summary: 'Implement user authentication flow with OAuth2 integration',
  mode: 'DEL', level: 'story', project: 'BAU Project', projectKey: 'BAU',
  hub: 'ProjectHub', hubLabel: 'Project hub',
  updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), createdAt: '2026-05-01T00:00:00Z',
  assignee: { id: '1', name: 'Vikram Indla', initials: 'VI', avatarColor: '#0C66E4' },
  issueType: 'Story', group: 'THIS_WEEK', starred: false,
  status: 'In Progress', priority: 'High', priorityLevel: 2,
};

const MOCK_EPIC: WorkItem = {
  ...MOCK_ITEM, id: 'BAU-4466', key: 'BAU-4466',
  summary: 'Q2 2026 Platform modernisation epic', level: 'epic', issueType: 'Epic',
  status: 'In Progress', priority: 'Medium', priorityLevel: 3,
};

const MOCK_BUG: WorkItem = {
  ...MOCK_ITEM, id: 'BAU-6012', key: 'BAU-6012',
  summary: 'Login page crashes on Safari 17 when 2FA is enabled', level: 'bug', issueType: 'QA Bug',
  status: 'To Do', priority: 'Critical', priorityLevel: 1,
};

const meta: Meta<typeof ForYouRow> = {
  title: 'Catalyst AI & Feed/For You Row',
  component: ForYouRow,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof ForYouRow>;

export const Default: Story = { args: { item: MOCK_ITEM, onSelect: () => {}, onToggleStar: () => {} } };
export const Starred: Story = { args: { item: { ...MOCK_ITEM, starred: true }, alwaysShowStar: true, onSelect: () => {}, onToggleStar: () => {} } };
export const EpicRow: Story = { args: { item: MOCK_EPIC, onSelect: () => {}, onToggleStar: () => {} } };
export const BugRow: Story = { args: { item: MOCK_BUG, onSelect: () => {}, onToggleStar: () => {} } };

export const MultipleRows: Story = {
  render: () => (
    <div style={{ maxWidth: 800, border: '1px solid var(--ds-border, #DFE1E6)', borderRadius: 8, overflow: 'hidden' }}>
      <ForYouRow item={MOCK_ITEM} onSelect={() => {}} onToggleStar={() => {}} />
      <ForYouRow item={MOCK_EPIC} onSelect={() => {}} onToggleStar={() => {}} />
      <ForYouRow item={MOCK_BUG} onSelect={() => {}} onToggleStar={() => {}} />
      <ForYouRow item={{ ...MOCK_ITEM, id: 'BAU-5800', key: 'BAU-5800', summary: 'Add dark mode support to admin dashboard', starred: true }} alwaysShowStar onSelect={() => {}} onToggleStar={() => {}} />
    </div>
  ),
};
