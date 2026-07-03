/**
 * TDD: TicketKeyChip status-category background via exported statusBackground
 * function (pure logic) + data-status-category attribute on the rendered chip.
 */
import { render } from '@testing-library/react';
import { TicketKeyChip, statusBackground } from '../TicketKeyChip';

vi.mock('@/lib/jira-issue-type-icons', () => ({
  JiraIssueTypeIcon: () => null,
}));
vi.mock('@/store/globalSearchStore', () => ({
  useGlobalSearchStore: { getState: () => ({ openDetail: vi.fn() }) },
}));

describe('statusBackground (pure function)', () => {
  it('done → success token', () => {
    expect(statusBackground('done')).toBe('var(--ds-background-success)');
  });
  it('inprogress → information token', () => {
    expect(statusBackground('inprogress')).toBe('var(--ds-background-information)');
  });
  it('todo → neutral token', () => {
    expect(statusBackground('todo')).toBe('var(--ds-background-neutral-subtle)');
  });
  it('undefined → neutral token', () => {
    expect(statusBackground(undefined)).toBe('var(--ds-background-neutral-subtle)');
  });
  it('empty string → neutral token', () => {
    expect(statusBackground('')).toBe('var(--ds-background-neutral-subtle)');
  });
});

describe('TicketKeyChip component', () => {
  it('carries data-status-category attribute', () => {
    const { getByTestId } = render(
      <TicketKeyChip issueKey="BAU-1" issueType="Story" statusCategory="done" />,
    );
    expect(getByTestId('chat-ticket-key-chip').dataset.statusCategory).toBe('done');
  });

  it('data-status-category empty when not provided', () => {
    const { getByTestId } = render(
      <TicketKeyChip issueKey="BAU-2" issueType="Story" />,
    );
    expect(getByTestId('chat-ticket-key-chip').dataset.statusCategory).toBe('');
  });

  it('renders issue key text', () => {
    const { getByTestId } = render(
      <TicketKeyChip issueKey="BAU-42" issueType="Story" />,
    );
    expect(getByTestId('chat-ticket-key-chip').textContent).toContain('BAU-42');
  });
});
