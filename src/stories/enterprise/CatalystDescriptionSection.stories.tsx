import type { Meta, StoryObj } from '@storybook/react';
import { CatalystDescriptionSection } from '@/components/catalyst-detail-views/shared/sections/CatalystDescriptionSection';
import { ISSUES } from '../fixtures/production-data';

const meta: Meta<typeof CatalystDescriptionSection> = {
  title: 'Enterprise Components/Catalyst Description Section',
  component: CatalystDescriptionSection,
  parameters: { layout: 'padded' },
};
export default meta;

export const WithText: StoryObj<typeof CatalystDescriptionSection> = {
  args: { issue: { ...ISSUES.story, description_adf: null, id: 'ph-001' } as any },
};
export const Empty: StoryObj<typeof CatalystDescriptionSection> = {
  args: { issue: { ...ISSUES.story, description_text: null, description_adf: null, id: 'ph-002' } as any },
};
export const CustomLabel: StoryObj<typeof CatalystDescriptionSection> = {
  args: { issue: { ...ISSUES.story, description_adf: null, id: 'ph-003' } as any, label: 'Acceptance Criteria' },
};
