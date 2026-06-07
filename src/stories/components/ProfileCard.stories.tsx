import type { Meta, StoryObj } from '@storybook/react';
import { CatalystProfileCard } from '@/components/ads/CatalystProfileCard';
import CatalystAvatar from '@/components/shared/CatalystAvatar';
import { TEAM } from '../fixtures/production-data';

const meta: Meta<typeof CatalystProfileCard> = {
  title: 'Components/Profile Card',
  component: CatalystProfileCard,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof CatalystProfileCard>;

export const Default: Story = {
  render: () => (
    <CatalystProfileCard name="Vikram Indla" role="Program Manager" email="vikram@catalyst.app">
      <span style={{ cursor: 'pointer' }}>
        <CatalystAvatar name="Vikram Indla" size="medium" />
      </span>
    </CatalystProfileCard>
  ),
};

export const TeamMembers: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      {TEAM.slice(0, 5).map((m) => (
        <CatalystProfileCard key={m.id} name={m.name} role="Team Member">
          <span style={{ cursor: 'pointer' }}>
            <CatalystAvatar name={m.name} size="medium" />
          </span>
        </CatalystProfileCard>
      ))}
    </div>
  ),
};
