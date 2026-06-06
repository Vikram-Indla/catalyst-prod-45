import type { Meta, StoryObj } from '@storybook/react';
import { CatalystProgressTracker } from '@/components/ads/CatalystProgressTracker';

const meta: Meta<typeof CatalystProgressTracker> = {
  title: 'Components/Progress Tracker',
  component: CatalystProgressTracker,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof CatalystProgressTracker>;

export const ImportWizard: Story = {
  args: {
    stages: [
      { id: '1', label: 'Setup', status: 'visited' },
      { id: '2', label: 'Field Mapping', status: 'current' },
      { id: '3', label: 'Validation', status: 'unvisited' },
      { id: '4', label: 'Confirm', status: 'unvisited' },
    ],
  },
};

export const JiraSetup: Story = {
  args: {
    stages: [
      { id: '1', label: 'Connection', status: 'visited' },
      { id: '2', label: 'Project Mapping', status: 'visited' },
      { id: '3', label: 'Status Mapping', status: 'visited' },
      { id: '4', label: 'Sync Settings', status: 'current' },
      { id: '5', label: 'Test & Deploy', status: 'unvisited' },
    ],
  },
};

export const Complete: Story = {
  args: {
    stages: [
      { id: '1', label: 'Upload', status: 'visited' },
      { id: '2', label: 'Review', status: 'visited' },
      { id: '3', label: 'Publish', status: 'visited' },
    ],
  },
};
