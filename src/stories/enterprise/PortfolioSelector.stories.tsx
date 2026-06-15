import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';
import { ReleaseSelector } from '@/features/release-compare/components/ReleaseSelector';

const meta: Meta<typeof ReleaseSelector> = {
  title: 'Enterprise Components/Portfolio Selector',
  component: ReleaseSelector,
  parameters: { layout: 'padded' },
};
export default meta;

export const Default: StoryObj<typeof ReleaseSelector> = {
  args: {
    availableReleases: [
      { id: 'r1', name: 'Sprint 2.1', startDate: '2026-05-01', endDate: '2026-05-15' },
      { id: 'r2', name: 'Sprint 2.2', startDate: '2026-05-15', endDate: '2026-05-30' },
      { id: 'r3', name: 'Sprint 2.3', startDate: '2026-06-01', endDate: '2026-06-15' },
    ] as any,
    selectedIds: ['r1'],
    onSelectionChange: fn(),
  },
};
