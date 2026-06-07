import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { RichTextEditor } from '@/components/business-requests/RichTextEditor';

function EditorHarness({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial);
  return (
    <div style={{ maxWidth: 720 }}>
      <RichTextEditor value={value} onChange={setValue} placeholder="Describe the business request…" />
    </div>
  );
}

const meta: Meta<typeof EditorHarness> = {
  title: 'Enterprise Components/Rich Text Editor (Custom)',
  component: EditorHarness,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof EditorHarness>;

export const WithContent: Story = { args: { initial: '<p>Investors must be able to submit fast-track shipment requests directly from the portal.</p><ul><li>Auto-route to operations</li><li>SLA tracking enabled</li></ul>' } };
export const Empty: Story = { args: { initial: '' } };
