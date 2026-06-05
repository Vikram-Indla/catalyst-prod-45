import type { Meta, StoryObj } from '@storybook/react';
import { token } from '@atlaskit/tokens';
import Lozenge from '@atlaskit/lozenge';
import CatalystAvatar from '@/components/shared/CatalystAvatar';
import { resolveAvatarUrl } from '@/lib/avatars';

interface Entry {
  author: string;
  kind: 'comment' | 'transition' | 'field';
  body: React.ReactNode;
  when: string;
}

const ENTRIES: Entry[] = [
  { author: 'Nada Alfassam', kind: 'comment', when: '2 hours ago',
    body: 'Validation rule is ready for review — please confirm the duplicate-passport message copy.' },
  { author: 'Ahmed Yousry', kind: 'transition', when: 'Yesterday',
    body: <>changed status from <Lozenge>To Do</Lozenge> to <Lozenge appearance="inprogress">In Progress</Lozenge></> },
  { author: 'Vikram Indla', kind: 'field', when: '2 days ago',
    body: <>set priority to <strong>High</strong></> },
];

function ActivityHarness({ entries }: { entries: Entry[] }) {
  return (
    <div style={{ maxWidth: 760 }}>
      <h2 style={{ font: `653 16px/20px var(--ds-font-family-body, "Atlassian Sans")`, color: token('color.text', '#292A2E'), margin: '0 0 16px' }}>
        Activity
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {entries.map((e, i) => (
          <div key={i} style={{ display: 'flex', gap: 12 }}>
            <CatalystAvatar size="small" src={resolveAvatarUrl(e.author) || undefined} name={e.author} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBlockEnd: e.kind === 'comment' ? 6 : 0 }}>
                <span style={{ font: `600 14px/20px var(--ds-font-family-body, "Atlassian Sans")`, color: token('color.text', '#172B4D') }}>{e.author}</span>
                {e.kind !== 'comment' && (
                  <span style={{ font: `400 14px/20px var(--ds-font-family-body, "Atlassian Sans")`, color: token('color.text.subtle', '#44546F') }}>{e.body}</span>
                )}
                <span style={{ font: `400 12px/16px var(--ds-font-family-body, "Atlassian Sans")`, color: token('color.text.subtlest', '#6B778C') }}>{e.when}</span>
              </div>
              {e.kind === 'comment' && (
                <div style={{
                  padding: '8px 12px', borderRadius: 4,
                  background: token('color.background.neutral.subtle', '#F7F8F9'),
                  font: `400 14px/20px var(--ds-font-family-body, "Atlassian Sans")`, color: token('color.text', '#172B4D'),
                }}>
                  {e.body}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const meta: Meta<typeof ActivityHarness> = {
  title: 'Enterprise Components/Activity Section',
  component: ActivityHarness,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof ActivityHarness>;

export const Default: Story = { args: { entries: ENTRIES } };
export const Empty: Story = { args: { entries: [] } };
