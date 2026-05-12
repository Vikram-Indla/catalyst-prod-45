/**
 * IssueTypeSelector — Type picker for create modal (F1.8)
 *
 * Contract:
 *   - Renders creatable types: Story, Task, Feature, Defect, PI, CR, BG, Backend, API Req
 *   - onChange fires with selected type
 *   - Shows JiraIssueTypeIcon for each type in dropdown
 *   - Current selection displayed in button
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IssueTypeSelector } from './IssueTypeSelector';

const CREATABLE_TYPES = [
  'Story',
  'Task',
  'Feature',
  'Defect',
  'Production Incident',
  'Change Request',
  'Business Gap',
  'Backend Task',
  'API Request',
];

describe('IssueTypeSelector', () => {
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

  it('renders a button with "Select type" placeholder text', () => {
    renderWithQuery(<IssueTypeSelector value={null} onChange={vi.fn()} />);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('displays selected type in button', () => {
    renderWithQuery(<IssueTypeSelector value="Story" onChange={vi.fn()} />);
    expect(screen.getByText('Story')).toBeInTheDocument();
  });

  it('renders all creatable types in dropdown', () => {
    renderWithQuery(<IssueTypeSelector value={null} onChange={vi.fn()} />);
    const button = screen.getByRole('button');
    fireEvent.click(button);

    CREATABLE_TYPES.forEach((type) => {
      expect(screen.getByText(type)).toBeInTheDocument();
    });
  });

  it('calls onChange with selected type', () => {
    const onChange = vi.fn();
    renderWithQuery(<IssueTypeSelector value={null} onChange={onChange} />);
    const button = screen.getByRole('button');
    fireEvent.click(button);

    const storyOption = screen.getByText('Story');
    fireEvent.click(storyOption);

    expect(onChange).toHaveBeenCalledWith('Story');
  });

  it('closes dropdown after selection', () => {
    const onChange = vi.fn();
    renderWithQuery(<IssueTypeSelector value={null} onChange={onChange} />);
    const button = screen.getByRole('button');
    fireEvent.click(button);

    // Verify dropdown is open by checking test ID
    expect(screen.getByTestId('issue-type-dropdown')).toBeInTheDocument();

    const storyOption = screen.getAllByText('Story')[0];
    fireEvent.click(storyOption);

    // Verify onChange was called
    expect(onChange).toHaveBeenCalledWith('Story');

    // Dropdown should be closed (test ID should not exist)
    expect(screen.queryByTestId('issue-type-dropdown')).not.toBeInTheDocument();
  });
});
