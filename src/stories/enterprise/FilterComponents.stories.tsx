import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';
import { JiraFilterAtlaskit } from '@/components/shared/JiraFilterAtlaskit';

const meta: Meta<typeof JiraFilterAtlaskit> = {
  title: 'Enterprise Components/Filter Components',
  component: JiraFilterAtlaskit,
  parameters: { layout: 'padded' },
};
export default meta;

export const Default: StoryObj<typeof JiraFilterAtlaskit> = {
  args: {
    value: {},
    onChange: fn(),
    statuses: [
      { value: 'todo', label: 'To Do', category: 'new' },
      { value: 'inprog', label: 'In Progress', category: 'indeterminate' },
      { value: 'done', label: 'Done', category: 'done' },
    ] as any,
    assignees: [
      { value: 'u1', label: 'Vikram Indla' },
      { value: 'u2', label: 'Yazeed Daraz' },
    ] as any,
  },
};
