/**
 * SubtasksPanel — REAL production component.
 * Renders the actual SubtasksPanel with JiraTable, inline create, AI suggest.
 */
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';
import { SubtasksPanel } from '@/modules/project-work-hub/components/SubtasksPanel';

const meta: Meta<typeof SubtasksPanel> = {
  title: 'Enterprise Components/Subtasks Panel',
  component: SubtasksPanel,
  parameters: { layout: 'padded' },
};
export default meta;

export const StoryParent: StoryObj<typeof SubtasksPanel> = {
  args: {
    storyKey: 'BAU-5957',
    storyId: 'ph-001',
    projectKey: 'BAU',
    onSubtaskClick: fn(),
    parentIssueType: 'Story',
    parentSummary: 'Update product details survey – add price validation',
  },
};

export const EpicParent: StoryObj<typeof SubtasksPanel> = {
  args: {
    storyKey: 'BAU-4466',
    storyId: 'ph-002',
    projectKey: 'BAU',
    onSubtaskClick: fn(),
    parentIssueType: 'Epic',
    parentSummary: 'Senaei App – Revamp (UI)',
    title: 'Child work items',
  },
};

export const SubtaskParent: StoryObj<typeof SubtasksPanel> = {
  name: 'Sub-task (creation disabled)',
  args: {
    storyKey: 'BAU-5958',
    storyId: 'ph-003',
    projectKey: 'BAU',
    onSubtaskClick: fn(),
    parentIssueType: 'Sub-task',
    parentSummary: 'Add client-side validation for price field',
  },
};
