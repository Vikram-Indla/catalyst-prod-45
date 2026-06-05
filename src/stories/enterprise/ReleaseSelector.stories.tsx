import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { ReleaseSelector } from '@/features/release-compare/components/ReleaseSelector';
import type { ReleaseOption } from '@/features/release-compare/types';

const RELEASES: ReleaseOption[] = [
  { id: 'r1', version: '2.4', name: 'Senaei 2.4 – May' },
  { id: 'r2', version: '2.3', name: 'Senaei 2.3 – April' },
  { id: 'r3', version: '2.2', name: 'Senaei 2.2 – March' },
  { id: 'r4', version: '2.1', name: 'Senaei 2.1 – February' },
];

function SelectorHarness({ initial }: { initial: string[] }) {
  const [selectedIds, setSelectedIds] = useState<string[]>(initial);
  return (
    <div style={{ maxWidth: 560 }}>
      <ReleaseSelector
        availableReleases={RELEASES}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
      />
    </div>
  );
}

const meta: Meta<typeof SelectorHarness> = {
  title: 'Enterprise Components/Release Selector',
  component: SelectorHarness,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof SelectorHarness>;

export const TwoSelected: Story = { args: { initial: ['r1', 'r2'] } };
export const ThreeSelected: Story = { args: { initial: ['r1', 'r2', 'r3'] } };
