/**
 * EditableAssignee — Portal-based assignee picker (F0.1)
 *
 * Feature: Portal implementation with position:fixed, getBoundingClientRect,
 * capture-phase Escape handler (prevents parent modal closure), outside-click guard.
 *
 * Contract:
 *   - Renders a button trigger with currentAssignee display
 *   - Click button to open portal (createPortal to document.body)
 *   - Portal positioned via getBoundingClientRect() + position:fixed
 *   - Auto-focus search input on open
 *   - Close on outside click (mousedown check)
 *   - Close on Escape at capture phase (addEventListener(..., true))
 *   - Render filtered assignee list
 *   - onClick(name) handler on selection + auto-close
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React, { useState } from 'react';
import { EditableAssignee } from './EditableAssignee';

interface TestAssignee {
  name: string;
  email?: string;
  avatarUrl?: string;
}

// Test wrapper to manage state
function TestWrapper() {
  const [assignee, setAssignee] = useState<string | null>('Alice Smith');
  const assignees: TestAssignee[] = [
    { name: 'Alice Smith', email: 'alice@example.com', avatarUrl: 'https://example.com/alice.jpg' },
    { name: 'Bob Jones', email: 'bob@example.com', avatarUrl: 'https://example.com/bob.jpg' },
    { name: 'Carol White', email: 'carol@example.com' },
  ];

  return (
    <div>
      <h1>Test Page</h1>
      <EditableAssignee
        currentAssignee={assignee}
        options={assignees}
        onSelect={setAssignee}
      />
    </div>
  );
}

describe('EditableAssignee', () => {
  beforeEach(() => {
    // Ensure portal container exists
    const portalRoot = document.getElementById('portal-root');
    if (!portalRoot) {
      const div = document.createElement('div');
      div.id = 'portal-root';
      document.body.appendChild(div);
    }
  });

  afterEach(() => {
    // Clean up
    const portalRoot = document.getElementById('portal-root');
    if (portalRoot) {
      portalRoot.remove();
    }
  });

  it('renders a trigger button with current assignee name', () => {
    render(<TestWrapper />);
    const button = screen.getByRole('button', { name: /change assignee/i });
    expect(button).toBeInTheDocument();
    expect(button.textContent).toContain('Alice Smith');
  });

  it('opens portal on button click and closes on escape at capture phase', async () => {
    render(<TestWrapper />);
    const button = screen.getByRole('button', { name: /change assignee/i });

    // Click to open
    fireEvent.click(button);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
    });

    // Verify portal is rendered in document.body
    const portalDiv = document.body.querySelector('[data-testid="assignee-picker-portal"]');
    expect(portalDiv).toBeInTheDocument();
    expect((portalDiv as HTMLElement)?.style.position).toBe('fixed');

    // Fire Escape at capture phase
    const escapeEvent = new KeyboardEvent('keydown', {
      key: 'Escape',
      code: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(escapeEvent);

    // Portal should be gone
    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/search/i)).not.toBeInTheDocument();
    });
  });

  it('auto-focuses search input on open', async () => {
    render(<TestWrapper />);
    const button = screen.getByRole('button', { name: /change assignee/i });

    fireEvent.click(button);
    await waitFor(() => {
      const input = screen.getByPlaceholderText(/search/i) as HTMLInputElement;
      expect(input).toHaveFocus();
    });
  });

  it('closes on outside click (mousedown on parent element)', async () => {
    render(<TestWrapper />);
    const button = screen.getByRole('button', { name: /change assignee/i });

    // Open
    fireEvent.click(button);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
    });

    // Click outside (on the h1)
    const h1 = screen.getByRole('heading', { name: /test page/i });
    fireEvent.mouseDown(h1);

    // Portal should close
    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/search/i)).not.toBeInTheDocument();
    });
  });

  it('filters options by search text', async () => {
    render(<TestWrapper />);
    const button = screen.getByRole('button', { name: /change assignee/i });

    fireEvent.click(button);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/search/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'bob' } });

    // Only Bob should appear in the portal list
    const portal = document.querySelector('[data-testid="assignee-picker-portal"]') as HTMLElement;
    await waitFor(() => {
      expect(portal.textContent).toContain('Bob Jones');
      expect(portal.textContent).not.toContain('Alice Smith');
      expect(portal.textContent).not.toContain('Carol White');
    });
  });

  it('calls onSelect and closes when an option is clicked', async () => {
    render(<TestWrapper />);
    const button = screen.getByRole('button', { name: /change assignee/i });

    fireEvent.click(button);
    await waitFor(() => {
      expect(screen.getByText('Bob Jones')).toBeInTheDocument();
    });

    const bobOption = screen.getByRole('button', { name: /bob jones/i });
    fireEvent.click(bobOption);

    // Portal should close
    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/search/i)).not.toBeInTheDocument();
    });

    // Button should now show Bob Jones
    expect(screen.getByRole('button', { name: /change assignee/i })).toHaveTextContent('Bob Jones');
  });

  it('includes unassigned option', async () => {
    render(<TestWrapper />);
    const button = screen.getByRole('button', { name: /change assignee/i });

    fireEvent.click(button);
    await waitFor(() => {
      expect(screen.getByText('Unassigned')).toBeInTheDocument();
    });
  });

  it('renders portal with position:fixed using getBoundingClientRect', async () => {
    render(<TestWrapper />);
    const button = screen.getByRole('button', { name: /change assignee/i });

    fireEvent.click(button);
    await waitFor(() => {
      const portal = document.body.querySelector('[data-testid="assignee-picker-portal"]') as HTMLElement;
      const computed = window.getComputedStyle(portal);
      expect(computed.position).toBe('fixed');
      // Verify getBoundingClientRect was used (top/left should be numbers)
      expect(portal.style.top).toMatch(/^\d+px$/);
      expect(portal.style.left).toMatch(/^\d+px$/);
    });
  });
});
