import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';
import { CatalystKeyDetails, CatalystTitleEditor, CatalystQuickActions, StatusLozengeDropdown } from '@/components/catalyst-detail-views/shared/sections';
import { Description } from '@/components/catalyst-detail-views/shared/sections/Description';
import { ISSUES } from '../fixtures/production-data';

const issue = { ...ISSUES.story, id: 'ph-001', description_adf: null, deleted_at: null, sprint_release: null, project_key: 'BAU', assignee_account_id: 'u1', reporter_account_id: 'u2' };

const meta: Meta = {
  title: 'Enterprise Components/Detail View Sections',
  parameters: { layout: 'padded' },
};
export default meta;

export const TitleEditor: StoryObj = {
  render: () => <div style={{ maxWidth: 700 }}><CatalystTitleEditor issue={issue as any} onSave={fn()} /></div>,
};
export const QuickActions: StoryObj = {
  render: () => <div style={{ maxWidth: 700 }}><CatalystQuickActions /></div>,
};
export const KeyDetails: StoryObj = {
  render: () => <div style={{ maxWidth: 700 }}><CatalystKeyDetails issue={issue as any} itemType="story" /></div>,
};
export const DescriptionSection: StoryObj = {
  render: () => <div style={{ maxWidth: 700 }}><Description issue={issue as any} /></div>,
};
export const StatusPillInProgress: StoryObj = {
  render: () => <StatusLozengeDropdown status="In Development" statusCategory="indeterminate" onStatusChange={fn()} issueType="Story" />,
};
export const StatusPillDone: StoryObj = {
  render: () => <StatusLozengeDropdown status="Done" statusCategory="done" onStatusChange={fn()} issueType="Story" />,
};
