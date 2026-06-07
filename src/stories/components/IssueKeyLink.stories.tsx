import type { Meta, StoryObj } from '@storybook/react';
import { IssueKeyLink } from '@/components/shared/IssueKeyLink';

const meta: Meta<typeof IssueKeyLink> = {
  title: 'Components/Issue Key Link',
  component: IssueKeyLink,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof IssueKeyLink>;

export const Default: Story = { args: { issueKey: 'BAU-5757' } };
export const Feature: Story = { args: { issueKey: 'BAU-3726' } };
export const Epic: Story = { args: { issueKey: 'BAU-4466' } };
