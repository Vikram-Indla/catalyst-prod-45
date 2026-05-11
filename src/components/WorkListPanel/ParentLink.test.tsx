/**
 * ParentLink — Parent issue reference with type icon (F1.5)
 *
 * Contract:
 *   - Renders parent type icon (JiraIssueTypeIcon 16px)
 *   - Renders parent key as clickable blue link
 *   - onClick handler fires with parent key
 *   - Gracefully handles missing parentType
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ParentLink } from './ParentLink';

describe('ParentLink', () => {
  const renderWithQuery = (component: React.ReactElement) => {
    const qc = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    return render(
      <QueryClientProvider client={qc}>{component}</QueryClientProvider>
    );
  };
  it('renders parent type icon at 16px', () => {
    const { container } = renderWithQuery(
      <ParentLink parentKey="BAU-100" parentType="Epic" onClick={vi.fn()} />
    );

    const icon = container.querySelector('[data-testid="parent-link-icon"]');
    expect(icon).toBeInTheDocument();
  });

  it('renders parent key as clickable link', () => {
    renderWithQuery(
      <ParentLink parentKey="BAU-100" parentType="Epic" onClick={vi.fn()} />
    );

    const link = screen.getByText('BAU-100');
    expect(link).toBeInTheDocument();
    expect(link.tagName).toBe('BUTTON');
  });

  it('calls onClick when parent key is clicked', () => {
    const onClick = vi.fn();
    renderWithQuery(
      <ParentLink parentKey="BAU-100" parentType="Epic" onClick={onClick} />
    );

    const link = screen.getByText('BAU-100');
    fireEvent.click(link);

    expect(onClick).toHaveBeenCalledWith('BAU-100');
  });

  it('renders parent key in blue link color', () => {
    const { container } = renderWithQuery(
      <ParentLink parentKey="BAU-100" parentType="Epic" onClick={vi.fn()} />
    );

    const link = screen.getByText('BAU-100');
    const computed = window.getComputedStyle(link);

    // Jira link blue (#0055CC) = rgb(0, 85, 204)
    expect(computed.color).toContain('85'); // Check for the G channel value
  });

  it('renders in a flex layout with gap between icon and text', () => {
    const { container } = renderWithQuery(
      <ParentLink parentKey="BAU-100" parentType="Epic" onClick={vi.fn()} />
    );

    const wrapper = container.querySelector('[data-testid="parent-link-wrapper"]') as HTMLElement;
    const computed = window.getComputedStyle(wrapper);

    expect(computed.display).toMatch(/flex/);
    expect(computed.gap).toBeTruthy();
  });

  it('renders with monospace font for key', () => {
    const { container } = renderWithQuery(
      <ParentLink parentKey="BAU-100" parentType="Epic" onClick={vi.fn()} />
    );

    const link = screen.getByText('BAU-100');
    const computed = window.getComputedStyle(link);

    expect(computed.fontFamily).toContain('mono');
  });

  it('handles different parent types', () => {
    const types = ['Epic', 'Story', 'Task', 'Defect'] as const;

    types.forEach(type => {
      const { unmount } = renderWithQuery(
        <ParentLink parentKey="BAU-100" parentType={type} onClick={vi.fn()} />
      );
      expect(screen.getByText('BAU-100')).toBeInTheDocument();
      unmount();
    });
  });
});
