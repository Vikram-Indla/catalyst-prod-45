import type { Meta, StoryObj } from '@storybook/react';
import { GlobalSearch } from '@/components/layout/GlobalSearch';

const meta: Meta<typeof GlobalSearch> = {
  title: 'Enterprise Components/Global Search',
  component: GlobalSearch,
  parameters: { layout: 'padded' },
};
export default meta;

export const Expanded: StoryObj<typeof GlobalSearch> = {
  args: { collapsed: false },
};
export const Collapsed: StoryObj<typeof GlobalSearch> = {
  args: { collapsed: true },
};
