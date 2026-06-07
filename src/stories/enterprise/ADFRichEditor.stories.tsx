import type { Meta, StoryObj } from '@storybook/react';
import { RichTextEditor } from '@/components/catalyst-detail-views/shared/sections/Description/RichTextEditor';
import type { AdfDoc } from '@/components/catalyst-detail-views/shared/sections/Description/utils/adfToTiptap';

const SAMPLE_ADF = {
  type: 'doc',
  version: 1,
  content: [
    { type: 'paragraph', content: [{ type: 'text', text: 'The registration flow must validate passport numbers against existing records before submission.' }] },
    { type: 'bulletList', content: [
      { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Show inline error when duplicate found' }] }] },
      { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Block submit until resolved' }] }] },
    ]},
  ],
} as unknown as AdfDoc;

function EditorHarness({ initialAdf }: { initialAdf: AdfDoc | null }) {
  return (
    <div style={{ maxWidth: 720 }}>
      <RichTextEditor
        initialAdf={initialAdf}
        onSave={(adf) => console.log('saved', adf)}
      />
    </div>
  );
}

const meta: Meta<typeof EditorHarness> = {
  title: 'Enterprise Components/Rich Text Editor (Canonical ADF)',
  component: EditorHarness,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof EditorHarness>;

export const WithContent: Story = { args: { initialAdf: SAMPLE_ADF } };
export const Empty: Story = { args: { initialAdf: null } };
