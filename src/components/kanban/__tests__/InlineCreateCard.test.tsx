/**
 * InlineCreateCard — Unit tests for inline issue creation component.
 *
 * NOTE (stale-contract rewrite): this suite was originally written TDD-first
 * against an early draft of the component (Jira createmeta REST fetch via
 * useCreatemeta, a debounced useSearchAssignees hook, Atlaskit
 * Button/DropdownMenu/TextField primitives). The component was rewritten
 * several times since (see git log: "canonical ProfilePicker", "SmartPopover
 * portal", CRE chokepoint wiring) into its current form: a plain
 * textarea + native buttons + a custom portal-based SmartPopover, sourcing
 * assignees from `assigneeOptions` prop ∪ a live `profiles` Supabase query
 * (no debounce — filtering is synchronous local state), and issue types from
 * `filterCreatableTypes` (Catalyst Rules Engine), not a Jira createmeta call.
 * There is also no toast on submission failure — errors render inline. The
 * assertions below are rewritten to match this current, real contract.
 *
 * Scope:
 * - Form state management (summary, issue type, date, assignee)
 * - Assignee search/filter and selection
 * - Form validation (submit disabled until summary present)
 * - Error handling (inline error message)
 * - Escape/click-outside handlers
 * - Portal rendering for dropdowns
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import InlineCreateCard from '../InlineCreateCard';
import type { AssigneeOption } from '../AssigneePickerPopover';

// The component renders type icons via JiraIssueTypeIcon — stub to a simple
// span so assertions don't depend on the icon glyph set.
vi.mock('@/lib/jira-issue-type-icons', () => ({
  JiraIssueTypeIcon: ({ type }: any) => <span data-testid="jira-issue-type-icon" data-type={type}>{type}</span>,
}));

// Shared mutable state the mocked Supabase client reads from — lets
// individual tests configure insert success/failure without re-mocking.
const supaState = vi.hoisted(() => ({
  insertError: null as Error | null,
  insertData: { id: 'issue-1', issue_key: 'BAU-1' } as Record<string, any>,
}));

vi.mock('@/integrations/supabase/client', () => {
  function makeChain() {
    let isInsert = false;
    const chain: any = {};
    ['select', 'not', 'order', 'like', 'limit', 'eq'].forEach((m) => {
      chain[m] = () => chain;
    });
    chain.insert = () => {
      isInsert = true;
      return chain;
    };
    const resolve = () =>
      isInsert
        ? Promise.resolve({ data: supaState.insertError ? null : supaState.insertData, error: supaState.insertError })
        : Promise.resolve({ data: [], error: null });
    chain.single = () => resolve();
    chain.maybeSingle = () => resolve();
    chain.then = (onFulfilled: any, onRejected: any) => resolve().then(onFulfilled, onRejected);
    return chain;
  }
  return {
    supabase: {
      from: () => makeChain(),
    },
  };
});

describe('InlineCreateCard', () => {
  let queryClient: QueryClient;
  const mockOnCreateCard = vi.fn();
  const mockOnCancel = vi.fn();
  const mockProjectKey = 'BAU';

  const mockAssigneeOptions: AssigneeOption[] = [
    { name: 'Alice', email: 'alice@example.com', avatarUrl: null },
    { name: 'Bob', email: 'bob@example.com', avatarUrl: null },
  ];

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    mockOnCreateCard.mockReset();
    mockOnCancel.mockReset();
    supaState.insertError = null;
    supaState.insertData = { id: 'issue-1', issue_key: 'BAU-1' };
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
      </QueryClientProvider>,
    );
  };

  // ═════════════════════════════════════════════════════════════════════════
  // Mount and initialization
  // ═════════════════════════════════════════════════════════════════════════

  it('renders form fields: summary, type, due date, assignee', () => {
    renderComponent();

    expect(screen.getByPlaceholderText(/What needs to be done/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Type: Story/i })).toBeInTheDocument(); // Default type
    expect(screen.getByRole('button', { name: /Due date/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Unassigned/i })).toBeInTheDocument();
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Form state management
  // ═════════════════════════════════════════════════════════════════════════

  it('should update summary on input change', async () => {
    const user = userEvent.setup();
    renderComponent();

    const summaryInput = screen.getByPlaceholderText(/What needs to be done/i);
    await user.type(summaryInput, 'Fix login page');

    expect(summaryInput).toHaveValue('Fix login page');
  });

  it('opens the type dropdown and selects a type on click', async () => {
    const user = userEvent.setup();
    renderComponent();

    const typeButton = screen.getByRole('button', { name: /Type: Story/i });
    await user.click(typeButton);

    const taskOption = screen.getByRole('button', { name: /\btask\b/i });
    await user.click(taskOption);

    expect(screen.getByRole('button', { name: /Type: Task/i })).toBeInTheDocument();
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Assignee search (local, synchronous filter over assigneeOptions)
  // ═════════════════════════════════════════════════════════════════════════

  it('filters assignee options as the user types', async () => {
    const user = userEvent.setup();
    renderComponent({ assigneeOptions: mockAssigneeOptions });

    const assigneeTrigger = screen.getByRole('button', { name: /Unassigned/i });
    await user.click(assigneeTrigger);

    const searchInput = await screen.findByPlaceholderText(/Search a user/i);
    await user.type(searchInput, 'ali');

    expect(screen.getByRole('button', { name: /\balice\b/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /\bbob\b/i })).not.toBeInTheDocument();
  });

  it('renders assignee options in a dropdown', async () => {
    const user = userEvent.setup();
    renderComponent({ assigneeOptions: mockAssigneeOptions });

    const assigneeTrigger = screen.getByRole('button', { name: /Unassigned/i });
    await user.click(assigneeTrigger);

    expect(await screen.findByRole('button', { name: /\balice\b/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\bbob\b/i })).toBeInTheDocument();
  });

  it('selects an assignee on dropdown click', async () => {
    const user = userEvent.setup();
    renderComponent({ assigneeOptions: mockAssigneeOptions });

    const assigneeTrigger = screen.getByRole('button', { name: /Unassigned/i });
    await user.click(assigneeTrigger);

    const aliceOption = await screen.findByRole('button', { name: /\balice\b/i });
    await user.click(aliceOption);

    // Dropdown closes and the trigger now reflects the selection.
    expect(screen.getByRole('button', { name: /Assigned to Alice/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /\bbob\b/i })).not.toBeInTheDocument();
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Form submission and callbacks
  // ═════════════════════════════════════════════════════════════════════════

  it('calls onCreateCard with form data on submit', async () => {
    const user = userEvent.setup();
    renderComponent();

    const summaryInput = screen.getByPlaceholderText(/What needs to be done/i);
    await user.type(summaryInput, 'Fix login page');

    const submitButton = screen.getByRole('button', { name: /Create/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnCreateCard).toHaveBeenCalledWith(
        expect.objectContaining({
          summary: 'Fix login page',
          issueType: 'Story', // Default
        }),
      );
    });
  });

  it('disables submit until a summary is entered', async () => {
    const user = userEvent.setup();
    renderComponent();

    const submitButton = screen.getByRole('button', { name: /Create/i });
    expect(submitButton).toBeDisabled();

    const summaryInput = screen.getByPlaceholderText(/What needs to be done/i);
    await user.type(summaryInput, 'Fix login page');

    expect(submitButton).toBeEnabled();
    expect(mockOnCreateCard).not.toHaveBeenCalled();
  });

  it('clears the form on successful submission', async () => {
    const user = userEvent.setup();
    mockOnCreateCard.mockResolvedValueOnce(undefined);
    renderComponent();

    const summaryInput = screen.getByPlaceholderText(/What needs to be done/i) as HTMLTextAreaElement;
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

  it('shows an inline error message when the insert fails', async () => {
    const user = userEvent.setup();
    supaState.insertError = new Error('API error');
    renderComponent();

    const summaryInput = screen.getByPlaceholderText(/What needs to be done/i);
    await user.type(summaryInput, 'Fix login page');

    const submitButton = screen.getByRole('button', { name: /Create/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/API error/i)).toBeInTheDocument();
    });
    expect(mockOnCreateCard).not.toHaveBeenCalled();
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Keyboard/escape handling
  // ═════════════════════════════════════════════════════════════════════════

  it('cancels the form on Escape key', async () => {
    const user = userEvent.setup();
    renderComponent();

    const summaryInput = screen.getByPlaceholderText(/What needs to be done/i);
    await user.type(summaryInput, 'Fix login page');
    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  it('cancels the form on outside click', async () => {
    renderComponent();

    // The outside-click handler is attached one macrotask after mount
    // (deferred so the click that opened the form doesn't immediately
    // close it) and listens for `mousedown`, not `click`.
    await waitFor(() => {
      fireEvent.mouseDown(document.body);
      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Portal rendering (dropdowns escape overflow:hidden)
  // ═════════════════════════════════════════════════════════════════════════

  it('renders the assignee dropdown in a portal (data-inline-create-portal)', async () => {
    const user = userEvent.setup();
    renderComponent({ assigneeOptions: mockAssigneeOptions });

    const assigneeTrigger = screen.getByRole('button', { name: /Unassigned/i });
    await user.click(assigneeTrigger);

    await waitFor(() => {
      const portal = document.querySelector('[data-inline-create-portal="true"]');
      expect(portal).toBeInTheDocument();
    });
  });

  it('renders the due-date picker in a portal', async () => {
    const user = userEvent.setup();
    renderComponent();

    const dateButton = screen.getByRole('button', { name: /Due date/i });
    await user.click(dateButton);

    await waitFor(() => {
      const portal = document.querySelector('[data-inline-create-portal="true"]');
      expect(portal).toBeInTheDocument();
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Integration: full flow
  // ═════════════════════════════════════════════════════════════════════════

  it('completes a full create flow: summary → type → assignee → submit', async () => {
    const user = userEvent.setup();
    renderComponent({ assigneeOptions: mockAssigneeOptions });

    // Step 1: Enter summary
    const summaryInput = screen.getByPlaceholderText(/What needs to be done/i);
    await user.type(summaryInput, 'Fix login page');

    // Step 2: Change issue type
    const typeButton = screen.getByRole('button', { name: /Type: Story/i });
    await user.click(typeButton);
    const taskOption = screen.getByRole('button', { name: /\btask\b/i });
    await user.click(taskOption);

    // Step 3: Select assignee
    const assigneeTrigger = screen.getByRole('button', { name: /Unassigned/i });
    await user.click(assigneeTrigger);
    const aliceOption = await screen.findByRole('button', { name: /\balice\b/i });
    await user.click(aliceOption);

    // Step 4: Submit
    const submitButton = screen.getByRole('button', { name: /Create/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnCreateCard).toHaveBeenCalledWith(
        expect.objectContaining({
          summary: 'Fix login page',
          issueType: 'Task',
          assigneeId: 'Alice',
        }),
      );
    });
  });
});
