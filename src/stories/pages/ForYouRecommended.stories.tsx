import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RecommendedPanel from '@/components/for-you/atlaskit/RecommendedPanel';
import { SummarizeDigestModal, type DigestMention } from '@/components/for-you/atlaskit/SummarizeDigestModal';
import type { WorkItem, RecommendedMention, RecommendedComment } from '@/hooks/useForYouData';

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
function Wrap({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={qc}><div style={{ maxWidth: 900, padding: 16 }}>{children}</div></QueryClientProvider>;
}

const mockMentions: RecommendedMention[] = [
  {
    commentId: 'jc-100', phCommentId: 'pc-100',
    commentBody: 'Hey @Vikram Indla can you take a look at this? The validation is failing on the add-item form when the user submits without filling required fields.',
    commentCreatedAt: new Date(Date.now() - 3_600_000).toISOString(),
    issueKey: 'BAU-5972', issueId: 'i1', issueSummary: 'Industrial Capabilities: Add Item Interface',
    issueType: 'QA Bug', issueStatus: 'In QA', issueStatusCategory: 'indeterminate',
    projectKey: 'BAU', projectName: 'Senaei BAU',
    mentionerId: 'u2', mentionerName: 'Yazeed Daraz', mentionerAvatarUrl: undefined,
  },
  {
    commentId: 'jc-101', phCommentId: 'pc-101',
    commentBody: '@Vikram Indla the deployment is ready for review. All tests passing on staging.',
    commentCreatedAt: new Date(Date.now() - 7_200_000).toISOString(),
    issueKey: 'BAU-5831', issueId: 'i2', issueSummary: 'Upgrade to Production — Request deployment',
    issueType: 'Story', issueStatus: 'In Development', issueStatusCategory: 'indeterminate',
    projectKey: 'BAU', projectName: 'Senaei BAU',
    mentionerId: 'u3', mentionerName: 'Andrew Fayyaz', mentionerAvatarUrl: undefined,
  },
];

const mockComments: RecommendedComment[] = [
  {
    commentId: 'jc-200', phCommentId: 'pc-200',
    commentBody: 'I have finished the migration for the first 3 tables. Moving on to the user_roles table next.',
    commentCreatedAt: new Date(Date.now() - 14_400_000).toISOString(),
    issueKey: 'BAU-4521', issueId: 'i3', issueSummary: 'Decoupling Upgrade to Establish from Supported Services',
    issueType: 'Feature', issueStatus: 'Done', issueStatusCategory: 'done',
    projectKey: 'BAU', projectName: 'Senaei BAU',
    authorId: 'u4', authorName: 'Imran Aslam', authorAvatarUrl: undefined,
  },
];

const mockItems: WorkItem[] = [];

// ─── RecommendedPanel ──────────────────────────────────────────────────────

const meta: Meta<typeof RecommendedPanel> = {
  title: 'Pages/For You/RecommendedPanel',
  component: RecommendedPanel,
  decorators: [(Story) => <Wrap><Story /></Wrap>],
  args: {
    items: mockItems,
    mentions: mockMentions,
    comments: mockComments,
    isLoading: false,
    onSelect: fn(),
    onToggleStar: fn(),
    currentUserName: 'Vikram Indla',
  },
};

export default meta;
type Story = StoryObj<typeof RecommendedPanel>;

export const WithMentionsAndComments: Story = {};

export const Loading: Story = {
  args: { items: [], mentions: [], comments: [], isLoading: true },
};

export const Empty: Story = {
  args: { items: [], mentions: [], comments: [], isLoading: false },
};

export const MentionsOnly: Story = {
  args: { comments: [] },
};

export const CommentsOnly: Story = {
  args: { mentions: [] },
};

// ─── SummarizeDigestModal ──────────────────────────────────────────────────

const digestMentions: DigestMention[] = [
  { commentId: 'jc-100', mentionerName: 'Yazeed Daraz', issueKey: 'BAU-5972', issueSummary: 'Industrial Capabilities: Add Item Interface', commentBody: 'Hey @Vikram can you take a look at the validation failures on the add-item form?' },
  { commentId: 'jc-101', mentionerName: 'Andrew Fayyaz', issueKey: 'BAU-5831', issueSummary: 'Upgrade to Production — Request deployment', commentBody: 'The deployment is ready for review. All tests passing on staging.' },
  { commentId: 'jc-102', mentionerName: 'Nada Alfassam', issueKey: 'BAU-4489', issueSummary: 'Unified Search', commentBody: '@Vikram the search results ranking needs your input before we can ship.' },
];

export const DigestModalOpen: StoryObj = {
  name: 'SummarizeDigestModal / Open',
  render: () => (
    <Wrap>
      <SummarizeDigestModal
        open={true}
        onClose={fn()}
        mentions={digestMentions}
        onReply={fn()}
        onDismiss={fn()}
        onOpenTicket={fn()}
      />
    </Wrap>
  ),
};
