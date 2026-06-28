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
  it('done → green tint', () => {
    expect(statusBackground('done')).toBe('rgba(148,199,72,0.18)');
  });
  it('inprogress → blue tint', () => {
    expect(statusBackground('inprogress')).toBe('rgba(102,157,241,0.18)');
  });
  it('todo → neutral token', () => {
    expect(statusBackground('todo')).toBe('var(--ds-background-neutral-subtle, var(--ds-background-neutral-subtle, #F7F8F9))');
  });
  it('undefined → neutral token', () => {
    expect(statusBackground(undefined)).toBe('var(--ds-background-neutral-subtle, var(--ds-background-neutral-subtle, #F7F8F9))');
  });
  it('empty string → neutral token', () => {
    expect(statusBackground('')).toBe('var(--ds-background-neutral-subtle, var(--ds-background-neutral-subtle, #F7F8F9))');
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
