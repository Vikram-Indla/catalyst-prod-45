import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { StatusTransitionDropdown } from '@/components/workflow/StatusTransitionDropdown';

const meta: Meta<typeof StatusTransitionDropdown> = {
  title: 'Enterprise Components/Status Transition Dropdown',
  component: StatusTransitionDropdown,
  parameters: { layout: 'padded' },
};
export default meta;

export const StoryInProgress: StoryObj<typeof StatusTransitionDropdown> = {
  args: { issueType: 'Story', currentStateId: 'in_development', onTransition: fn() },
};

export const EpicBacklog: StoryObj<typeof StatusTransitionDropdown> = {
  args: { issueType: 'Epic', currentStateId: 'backlog', onTransition: fn() },
};

export const TaskDone: StoryObj<typeof StatusTransitionDropdown> = {
  args: { issueType: 'Task', currentStateId: 'done', onTransition: fn() },
};

export const Compact: StoryObj<typeof StatusTransitionDropdown> = {
  args: { issueType: 'Story', currentStateId: 'in_development', onTransition: fn(), size: 'compact' },
};

export const Disabled: StoryObj<typeof StatusTransitionDropdown> = {
  args: { issueType: 'Story', currentStateId: 'done', onTransition: fn(), isDisabled: true },
};
