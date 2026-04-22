import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TopNavSearch } from '../TopNavSearch';

// Mock @atlaskit/popup to render trigger + content inline for tests
jest.mock('@atlaskit/popup', () => ({
  Popup: ({ trigger, content, isOpen }: any) => (
    <div>
      {trigger({ ref: React.createRef(), 'aria-expanded': isOpen, 'aria-controls': isOpen ? 'tnav-popup' : undefined, 'aria-haspopup': true })}
      {isOpen && content({})}
    </div>
  ),
}));

// Mock the global search hooks
jest.mock('@/hooks/useGlobalSearch', () => ({
  useRecentItems: () => ({
    data: [
      { id: '1', item_key: 'PROJ-1', summary: 'Fix login bug', project_name: 'Core Platform', project_key: 'PROJ', issue_type: 'bug', jira_updated_at: new Date().toISOString(), assignee_display_name: null, reporter_display_name: null, jira_created_at: null },
      { id: '2', item_key: 'PROJ-2', summary: 'Add dark mode', project_name: 'Core Platform', project_key: 'PROJ', issue_type: 'story', jira_updated_at: new Date().toISOString(), assignee_display_name: null, reporter_display_name: null, jira_created_at: null },
    ],
    isLoading: false,
  }),
  useSearchResults: (query: string) => ({
    data: query.length >= 2
      ? [{ id: '3', item_key: 'PROJ-3', summary: `Result for ${query}`, project_name: 'Core Platform', project_key: 'PROJ', issue_type: 'task', jira_updated_at: new Date().toISOString(), assignee_display_name: null, reporter_display_name: null, jira_created_at: null }]
      : [],
    isLoading: false,
    isFetching: false,
  }),
}));

// Mock WorkItemIcon
jest.mock('@/components/ja/icons/WorkItemIcon', () => ({
  WorkItemIcon: ({ type }: { type: string }) => <span data-testid={`work-item-icon-${type}`} />,
}));

// Mock @atlaskit/spinner
jest.mock('@atlaskit/spinner', () => ({
  __esModule: true,
  default: () => <div data-testid="spinner" />,
}));

function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('TopNavSearch', () => {
  it('renders the search field with combobox role', () => {
    renderWithQuery(<TopNavSearch />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('dropdown is not shown initially', () => {
    renderWithQuery(<TopNavSearch />);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('opens dropdown on focus', async () => {
    renderWithQuery(<TopNavSearch />);
    const input = screen.getByRole('combobox');
    fireEvent.focus(input);
    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });
  });

  it('shows recent items when query is empty', async () => {
    renderWithQuery(<TopNavSearch />);
    fireEvent.focus(screen.getByRole('combobox'));
    await waitFor(() => {
      expect(screen.getByText('Fix login bug')).toBeInTheDocument();
      expect(screen.getByText('Add dark mode')).toBeInTheDocument();
    });
  });

  it('shows no results state for single character query', async () => {
    renderWithQuery(<TopNavSearch />);
    const input = screen.getByRole('combobox');
    fireEvent.focus(input);
    await userEvent.type(input, 'a');
    await waitFor(() => {
      // With query < 2 chars, shows recent items (active state)
      expect(screen.getByText('Fix login bug')).toBeInTheDocument();
    });
  });

  it('shows search results for query >= 2 chars', async () => {
    renderWithQuery(<TopNavSearch />);
    const input = screen.getByRole('combobox');
    fireEvent.focus(input);
    await userEvent.type(input, 'fi');
    await waitFor(() => {
      expect(screen.getByText('Result for fi')).toBeInTheDocument();
    });
  });

  it('navigates options with arrow keys', async () => {
    renderWithQuery(<TopNavSearch />);
    const input = screen.getByRole('combobox');
    fireEvent.focus(input);
    await waitFor(() => screen.getByRole('listbox'));

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    await waitFor(() => {
      const firstOption = screen.getByRole('option', { name: /Fix login bug/i });
      expect(firstOption).toHaveAttribute('aria-selected', 'true');
    });

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    await waitFor(() => {
      const secondOption = screen.getByRole('option', { name: /Add dark mode/i });
      expect(secondOption).toHaveAttribute('aria-selected', 'true');
    });
  });

  it('closes dropdown on Escape', async () => {
    renderWithQuery(<TopNavSearch />);
    const input = screen.getByRole('combobox');
    fireEvent.focus(input);
    await waitFor(() => screen.getByRole('listbox'));

    fireEvent.keyDown(input, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });
});
