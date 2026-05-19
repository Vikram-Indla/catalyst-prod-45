/**
 * InlineCreateCard — Unit tests for inline issue creation component.
 * TDD first: tests written before implementation verification.
 *
 * Scope:
 * - Form state management (summary, issue type, date, assignee)
 * - Createmeta fetch on mount
 * - Debounced assignee search (300ms)
 * - Form validation and submission
 * - Error handling and retry
 * - Escape/click-outside handlers
 * - Portal rendering for dropdowns
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import InlineCreateCard from '../InlineCreateCard';
import { useCreatemeta } from '@/hooks/useCreatemeta';
import { useSearchAssignees } from '@/hooks/useSearchAssignees';

// Global fetch mock
global.fetch = vi.fn() as any;

// Mock dependencies
vi.mock('@/hooks/useCreatemeta');
vi.mock('@/hooks/useSearchAssignees');
vi.mock('@atlaskit/button', () => ({
  default: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} data-testid="atlaskit-button" {...props}>{children}</button>
  ),
}));
vi.mock('@atlaskit/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div data-testid="dropdown-menu">{children}</div>,
  DropdownMenuTrigger: ({ children, asChild }: any) => asChild ? children : <div data-testid="dropdown-trigger">{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div data-testid="dropdown-content" role="menu">{children}</div>,
  DropdownMenuItem: ({ children, onClick }: any) => <button data-testid="dropdown-item" onClick={onClick} role="menuitem">{children}</button>,
}));
vi.mock('@atlaskit/textfield', () => ({
  default: ({ value, onChange, placeholder, disabled, ...props }: any) => (
    <input value={value} onChange={(e) => onChange?.({ currentTarget: e.currentTarget })} placeholder={placeholder} disabled={disabled} data-testid="atlaskit-textfield" {...props} />
  ),
}));
vi.mock('@/lib/jira-issue-type-icons', () => ({
  JiraIssueTypeIcon: ({ type, size }: any) => <span data-testid="jira-issue-type-icon" data-type={type}>{type}</span>,
}));
vi.mock('sonner', async () => {
  const actual = await vi.importActual('sonner');
  return {
    ...actual,
    toast: {
      error: vi.fn(),
      success: vi.fn(),
    },
  };
});

describe('InlineCreateCard', () => {
  let queryClient: QueryClient;
  const mockOnCreateCard = vi.fn();
  const mockOnCancel = vi.fn();
  const mockProjectKey = 'BAU';

  const mockCreatemetaResponse = {
    projects: [
      {
        key: mockProjectKey,
        issuetypes: [
          { id: '10001', name: 'Story' },
          { id: '10002', name: 'Task' },
          { id: '10003', name: 'Bug' },
        ],
      },
    ],
  };

  const mockAssigneeSearchResponse = [
    { accountId: 'user-1', displayName: 'Alice', avatarUrls: { '24x24': 'http://...' } },
    { accountId: 'user-2', displayName: 'Bob', avatarUrls: { '24x24': 'http://...' } },
  ];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();

    // Mock global fetch for createmeta API
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockCreatemetaResponse,
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  const renderComponent = (props = {}) => {
    const defaultProps = {
      projectKey: mockProjectKey,
      onCreateCard: mockOnCreateCard,
      onCancel: mockOnCancel,
      columnId: 'status-todo',
      ...props,
    };

    return render(
      <QueryClientProvider client={queryClient}>
        <InlineCreateCard {...defaultProps} />
        <Toaster />
      </QueryClientProvider>
    );
  };

  // ═════════════════════════════════════════════════════════════════════════
  // Mount and initialization
  // ═════════════════════════════════════════════════════════════════════════

  it('should fetch createmeta on mount', async () => {
    const mockFetch = vi.fn().mockResolvedValue(mockCreatemetaResponse);
    vi.mocked(useCreatemeta).mockReturnValue({ fetch: mockFetch } as any);
    vi.mocked(useSearchAssignees).mockReturnValue({ search: vi.fn() } as any);

    renderComponent();

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(mockProjectKey);
    });
  });

  it('should render form fields: summary, type, date, assignee', async () => {
    vi.mocked(useCreatemeta).mockReturnValue({ fetch: vi.fn().mockResolvedValue(mockCreatemetaResponse) } as any);
    vi.mocked(useSearchAssignees).mockReturnValue({ search: vi.fn() } as any);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/What needs to be done/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Story/i })).toBeInTheDocument(); // Default type
      expect(screen.getByRole('button', { name: /Select assignee/i })).toBeInTheDocument();
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Form state management
  // ═════════════════════════════════════════════════════════════════════════

  it('should update summary on input change', async () => {
    const user = userEvent.setup();
    vi.mocked(useCreatemeta).mockReturnValue({ fetch: vi.fn().mockResolvedValue(mockCreatemetaResponse) } as any);
    vi.mocked(useSearchAssignees).mockReturnValue({ search: vi.fn() } as any);

    renderComponent();

    const summaryInput = screen.getByPlaceholderText(/What needs to be done/i);
    await user.type(summaryInput, 'Fix login page');

    expect(summaryInput).toHaveValue('Fix login page');
  });

  it('should cycle issue type on button click', async () => {
    const user = userEvent.setup();
    vi.mocked(useCreatemeta).mockReturnValue({ fetch: vi.fn().mockResolvedValue(mockCreatemetaResponse) } as any);
    vi.mocked(useSearchAssignees).mockReturnValue({ search: vi.fn() } as any);

    renderComponent();

    const typeButton = await screen.findByRole('button', { name: /Story/i });
    await user.click(typeButton);

    expect(screen.getByRole('button', { name: /Task/i })).toBeInTheDocument();
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Assignee search (debounced 300ms)
  // ═════════════════════════════════════════════════════════════════════════

  it('should debounce assignee search with 300ms delay', async () => {
    const user = userEvent.setup({ delay: null }); // Disable default 5ms delay
    const mockSearch = vi.fn().mockResolvedValue(mockAssigneeSearchResponse);
    vi.mocked(useCreatemeta).mockReturnValue({ fetch: vi.fn().mockResolvedValue(mockCreatemetaResponse) } as any);
    vi.mocked(useSearchAssignees).mockReturnValue({ search: mockSearch } as any);

    renderComponent();

    const assigneeInput = await screen.findByRole('textbox', { name: /search assignee/i });
    await user.type(assigneeInput, 'ali');

    // Search should NOT be called immediately
    expect(mockSearch).not.toHaveBeenCalled();

    // After 300ms, search should be called once (debounced)
    await waitFor(() => {
      expect(mockSearch).toHaveBeenCalledTimes(1);
      expect(mockSearch).toHaveBeenCalledWith('ali');
    }, { timeout: 350 });
  });

  it('should cancel previous search on rapid input changes', async () => {
    const user = userEvent.setup({ delay: null });
    const mockSearch = vi.fn().mockResolvedValue(mockAssigneeSearchResponse);
    vi.mocked(useCreatemeta).mockReturnValue({ fetch: vi.fn().mockResolvedValue(mockCreatemetaResponse) } as any);
    vi.mocked(useSearchAssignees).mockReturnValue({ search: mockSearch } as any);

    renderComponent();

    const assigneeInput = await screen.findByRole('textbox', { name: /search assignee/i });
    await user.type(assigneeInput, 'a');
    await user.type(assigneeInput, 'l');
    await user.type(assigneeInput, 'i');

    // Only the final debounced search should execute
    await waitFor(() => {
      expect(mockSearch).toHaveBeenCalledWith('ali');
    }, { timeout: 350 });

    expect(mockSearch).toHaveBeenCalledTimes(1);
  });

  it('should render assignee search results in dropdown', async () => {
    const user = userEvent.setup({ delay: null });
    const mockSearch = vi.fn().mockResolvedValue(mockAssigneeSearchResponse);
    vi.mocked(useCreatemeta).mockReturnValue({ fetch: vi.fn().mockResolvedValue(mockCreatemetaResponse) } as any);
    vi.mocked(useSearchAssignees).mockReturnValue({ search: mockSearch } as any);

    renderComponent();

    const assigneeInput = await screen.findByRole('textbox', { name: /search assignee/i });
    await user.type(assigneeInput, 'ali');

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    }, { timeout: 350 });
  });

  it('should select assignee on dropdown click', async () => {
    const user = userEvent.setup({ delay: null });
    const mockSearch = vi.fn().mockResolvedValue(mockAssigneeSearchResponse);
    vi.mocked(useCreatemeta).mockReturnValue({ fetch: vi.fn().mockResolvedValue(mockCreatemetaResponse) } as any);
    vi.mocked(useSearchAssignees).mockReturnValue({ search: mockSearch } as any);

    renderComponent();

    const assigneeInput = await screen.findByRole('textbox', { name: /search assignee/i });
    await user.type(assigneeInput, 'ali');

    const aliceOption = await screen.findByText('Alice');
    await user.click(aliceOption);

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.queryByText('Bob')).not.toBeInTheDocument();
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Form submission and callbacks
  // ═════════════════════════════════════════════════════════════════════════

  it('should call onCreateCard with form data on submit', async () => {
    const user = userEvent.setup();
    vi.mocked(useCreatemeta).mockReturnValue({ fetch: vi.fn().mockResolvedValue(mockCreatemetaResponse) } as any);
    vi.mocked(useSearchAssignees).mockReturnValue({ search: vi.fn() } as any);

    renderComponent();

    const summaryInput = screen.getByPlaceholderText(/What needs to be done/i);
    await user.type(summaryInput, 'Fix login page');

    const submitButton = screen.getByRole('button', { name: /Create/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnCreateCard).toHaveBeenCalledWith({
        summary: 'Fix login page',
        issueType: 'Story', // Default
        assigneeId: null,
        dueDate: null,
      });
    });
  });

  it('should validate that summary is required', async () => {
    const user = userEvent.setup();
    vi.mocked(useCreatemeta).mockReturnValue({ fetch: vi.fn().mockResolvedValue(mockCreatemetaResponse) } as any);
    vi.mocked(useSearchAssignees).mockReturnValue({ search: vi.fn() } as any);

    renderComponent();

    const submitButton = screen.getByRole('button', { name: /Create/i });
    await user.click(submitButton);

    // Should not call callback, should show error
    expect(mockOnCreateCard).not.toHaveBeenCalled();
    expect(screen.getByText(/summary is required/i)).toBeInTheDocument();
  });

  it('should clear form on successful submission', async () => {
    const user = userEvent.setup();
    vi.mocked(useCreatemeta).mockReturnValue({ fetch: vi.fn().mockResolvedValue(mockCreatemetaResponse) } as any);
    vi.mocked(useSearchAssignees).mockReturnValue({ search: vi.fn() } as any);
    mockOnCreateCard.mockResolvedValueOnce({ issueKey: 'BAU-1234', issueId: 'id-123' });

    renderComponent();

    const summaryInput = screen.getByPlaceholderText(/What needs to be done/i) as HTMLInputElement;
    await user.type(summaryInput, 'Fix login page');

    const submitButton = screen.getByRole('button', { name: /Create/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(summaryInput.value).toBe('');
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Error handling
  // ═════════════════════════════════════════════════════════════════════════

  it('should display error toast on submission failure', async () => {
    const user = userEvent.setup();
    const { toast } = await import('sonner');
    vi.mocked(useCreatemeta).mockReturnValue({ fetch: vi.fn().mockResolvedValue(mockCreatemetaResponse) } as any);
    vi.mocked(useSearchAssignees).mockReturnValue({ search: vi.fn() } as any);
    mockOnCreateCard.mockRejectedValueOnce(new Error('API error'));

    renderComponent();

    const summaryInput = screen.getByPlaceholderText(/What needs to be done/i);
    await user.type(summaryInput, 'Fix login page');

    const submitButton = screen.getByRole('button', { name: /Create/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('API error'));
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Keyboard/escape handling
  // ═════════════════════════════════════════════════════════════════════════

  it('should cancel form on Escape key', async () => {
    const user = userEvent.setup();
    vi.mocked(useCreatemeta).mockReturnValue({ fetch: vi.fn().mockResolvedValue(mockCreatemetaResponse) } as any);
    vi.mocked(useSearchAssignees).mockReturnValue({ search: vi.fn() } as any);

    renderComponent();

    const summaryInput = screen.getByPlaceholderText(/What needs to be done/i);
    await user.type(summaryInput, 'Fix login page');
    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  it('should cancel form on outside click', async () => {
    const user = userEvent.setup();
    vi.mocked(useCreatemeta).mockReturnValue({ fetch: vi.fn().mockResolvedValue(mockCreatemetaResponse) } as any);
    vi.mocked(useSearchAssignees).mockReturnValue({ search: vi.fn() } as any);

    renderComponent();

    const summaryInput = screen.getByPlaceholderText(/What needs to be done/i);
    await user.type(summaryInput, 'Fix login page');

    const outsideElement = document.body;
    fireEvent.click(outsideElement);

    await waitFor(() => {
      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Portal rendering (dropdowns escape overflow:hidden)
  // ═════════════════════════════════════════════════════════════════════════

  it('should render assignee dropdown in portal (data-inline-create-portal)', async () => {
    const user = userEvent.setup({ delay: null });
    const mockSearch = vi.fn().mockResolvedValue(mockAssigneeSearchResponse);
    vi.mocked(useCreatemeta).mockReturnValue({ fetch: vi.fn().mockResolvedValue(mockCreatemetaResponse) } as any);
    vi.mocked(useSearchAssignees).mockReturnValue({ search: mockSearch } as any);

    renderComponent();

    const assigneeInput = await screen.findByRole('textbox', { name: /search assignee/i });
    await user.type(assigneeInput, 'ali');

    await waitFor(() => {
      const portal = document.querySelector('[data-inline-create-portal="true"]');
      expect(portal).toBeInTheDocument();
    }, { timeout: 350 });
  });

  it('should render date picker in portal', async () => {
    const user = userEvent.setup();
    vi.mocked(useCreatemeta).mockReturnValue({ fetch: vi.fn().mockResolvedValue(mockCreatemetaResponse) } as any);
    vi.mocked(useSearchAssignees).mockReturnValue({ search: vi.fn() } as any);

    renderComponent();

    const dateButton = await screen.findByRole('button', { name: /Select due date/i });
    await user.click(dateButton);

    await waitFor(() => {
      const portal = document.querySelector('[data-inline-create-portal="true"]');
      expect(portal).toBeInTheDocument();
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Integration: full flow
  // ═════════════════════════════════════════════════════════════════════════

  it('should complete full create flow: summary → type → assignee → submit', async () => {
    const user = userEvent.setup({ delay: null });
    const mockSearch = vi.fn().mockResolvedValue(mockAssigneeSearchResponse);
    vi.mocked(useCreatemeta).mockReturnValue({ fetch: vi.fn().mockResolvedValue(mockCreatemetaResponse) } as any);
    vi.mocked(useSearchAssignees).mockReturnValue({ search: mockSearch } as any);
    mockOnCreateCard.mockResolvedValueOnce({ issueKey: 'BAU-1234', issueId: 'id-123' });

    renderComponent();

    // Step 1: Enter summary
    const summaryInput = screen.getByPlaceholderText(/What needs to be done/i);
    await user.type(summaryInput, 'Fix login page');

    // Step 2: Change issue type
    const typeButton = await screen.findByRole('button', { name: /Story/i });
    await user.click(typeButton);
    const taskOption = screen.getByRole('button', { name: /Task/i });
    await user.click(taskOption);

    // Step 3: Select assignee
    const assigneeInput = await screen.findByRole('textbox', { name: /search assignee/i });
    await user.type(assigneeInput, 'ali');

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    }, { timeout: 350 });

    const aliceOption = screen.getByText('Alice');
    await user.click(aliceOption);

    // Step 4: Submit
    const submitButton = screen.getByRole('button', { name: /Create/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnCreateCard).toHaveBeenCalledWith({
        summary: 'Fix login page',
        issueType: 'Task',
        assigneeId: 'user-1',
        dueDate: null,
      });
    });
  });
});
