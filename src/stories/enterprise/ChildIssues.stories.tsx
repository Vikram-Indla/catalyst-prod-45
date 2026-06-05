import type { Meta, StoryObj } from '@storybook/react';
import { token } from '@atlaskit/tokens';
import Lozenge from '@atlaskit/lozenge';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import CatalystAvatar from '@/components/shared/CatalystAvatar';
import { resolveAvatarUrl } from '@/lib/avatars';

interface Sub {
  key: string; summary: string; status: string;
  appearance: 'default' | 'inprogress' | 'success'; assignee: string;
}

const SUBS: Sub[] = [
  { key: 'BAU-5958', summary: 'Add client-side price validation rule', status: 'In Progress', appearance: 'inprogress', assignee: 'Amadou Ndiaye' },
  { key: 'BAU-5959', summary: 'Add server-side duplicate-passport check', status: 'To Do', appearance: 'default', assignee: 'Ahmed Yousry' },
  { key: 'BAU-5960', summary: 'Wire inline error message component', status: 'Done', appearance: 'success', assignee: 'Aya Ibrahims' },
];

function ChildHarness({ subs }: { subs: Sub[] }) {
  const done = subs.filter(s => s.appearance === 'success').length;
  return (
    <div style={{ maxWidth: 760 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBlockEnd: 12 }}>
        <h2 style={{ font: `653 16px/20px var(--ds-font-family-body, "Atlassian Sans")`, color: token('color.text', '#292A2E'), margin: 0 }}>
          Child issues
        </h2>
        {subs.length > 0 && (
          <span style={{ font: `400 13px/18px var(--ds-font-family-body, "Atlassian Sans")`, color: token('color.text.subtlest', '#6B778C') }}>
            {done} of {subs.length} done
          </span>
        )}
      </div>
      {subs.length === 0 ? (
        <span style={{ font: `400 14px/20px var(--ds-font-family-body, "Atlassian Sans")`, color: token('color.text.subtlest', '#6B778C') }}>
          No child issues yet.
        </span>
      ) : (
        <div style={{ border: `1px solid ${token('color.border', '#DFE1E6')}`, borderRadius: 8, overflow: 'hidden' }}>
          {subs.map((s, i) => (
            <div key={s.key} style={{
              display: 'flex', alignItems: 'center', gap: 8, height: 44, padding: '0 12px',
              borderBottom: i < subs.length - 1 ? `1px solid ${token('color.border', '#DFE1E6')}` : 'none',
            }}>
              <JiraIssueTypeIcon type="Sub-task" size={14} />
              <span style={{ font: `500 12px/16px var(--ds-font-family-code, monospace)`, color: token('color.link', '#0052CC') }}>{s.key}</span>
              <span style={{ font: `400 14px/20px var(--ds-font-family-body, "Atlassian Sans")`, color: token('color.text', '#172B4D'), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                {s.summary}
              </span>
              <Lozenge appearance={s.appearance}>{s.status}</Lozenge>
              <CatalystAvatar size="xsmall" src={resolveAvatarUrl(s.assignee) || undefined} name={s.assignee} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const meta: Meta<typeof ChildHarness> = {
  title: 'Enterprise Components/Child Issues',
  component: ChildHarness,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof ChildHarness>;

export const Default: Story = { args: { subs: SUBS } };
export const Empty: Story = { args: { subs: [] } };
