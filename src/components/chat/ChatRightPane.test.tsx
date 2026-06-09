/**
 * ChatRightPane.test.tsx — A1 TDD: right pane tabs render
 *
 * Test contract:
 * - 5 tabs render (Threads, Bookmarks, Pins, Files, People)
 * - Each tab has aria-label
 * - Tab content changes on click (Threads → Bookmarks, etc.)
 * - onSelectThread callback fires when thread row clicked
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatRightPane } from './ChatRightPane';

describe('ChatRightPane', () => {
  const mockOnSelectThread = vi.fn();
  const mockOnClose = vi.fn();

  it('renders 5 tabs: Threads, Bookmarks, Pins, Files, People', () => {
    render(
      <ChatRightPane
        conversationId="c1"
        onSelectThread={mockOnSelectThread}
        onClose={mockOnClose}
      />
    );

    // Tab list should exist
    const tablist = screen.getByRole('tablist');
    expect(tablist).toBeInTheDocument();

    // All 5 tabs should be present
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(5);

    // Tab labels match spec
    expect(screen.getByRole('tab', { name: /Threads/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Bookmarks/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Pins/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Files/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /People/i })).toBeInTheDocument();
  });

  it('renders Threads tab content by default', () => {
    render(
      <ChatRightPane
        conversationId="c1"
        onSelectThread={mockOnSelectThread}
        onClose={mockOnClose}
      />
    );

    // Threads panel should render with mock data
    expect(screen.getByText(/Hello team/i)).toBeInTheDocument();
    expect(screen.getByText(/Project update/i)).toBeInTheDocument();
  });

  it('switches tab content on click', () => {
    render(
      <ChatRightPane
        conversationId="c1"
        onSelectThread={mockOnSelectThread}
        onClose={mockOnClose}
      />
    );

    // Click Bookmarks tab
    const bookmarksTab = screen.getByRole('tab', { name: /Bookmarks/i });
    fireEvent.click(bookmarksTab);

    // Bookmarks tab should be active
    expect(bookmarksTab).toHaveAttribute('aria-selected', 'true');
    // Verify content switched
    expect(screen.getByText(/Bookmarks coming soon/i)).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(
      <ChatRightPane
        conversationId="c1"
        onSelectThread={mockOnSelectThread}
        onClose={mockOnClose}
      />
    );

    // TabList should exist (managed by Atlaskit)
    const tablist = screen.getByRole('tablist');
    expect(tablist).toBeInTheDocument();

    // All 5 tabs present and accessible
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(5);
  });

  it('calls onSelectThread when thread row is clicked', () => {
    render(
      <ChatRightPane
        conversationId="c1"
        onSelectThread={mockOnSelectThread}
        onClose={mockOnClose}
      />
    );

    // Click a thread row (from mock data)
    const threadRow = screen.getByText(/Hello team/i);
    fireEvent.click(threadRow);

    expect(mockOnSelectThread).toHaveBeenCalledWith('1');
  });
});
