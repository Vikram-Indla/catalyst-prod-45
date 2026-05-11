/**
 * CreateForm — New issue form with type-specific fields (F1.9)
 *
 * Contract:
 *   - Renders summary input (required)
 *   - Renders description textarea
 *   - onChange handlers for each field
 *   - Validates summary is not empty before submit
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { CreateForm } from './CreateForm';

describe('CreateForm', () => {
  it('renders summary input field', () => {
    render(
      <CreateForm
        issueType="Story"
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText(/summary/i);
    expect(input).toBeInTheDocument();
  });

  it('renders description textarea field', () => {
    render(
      <CreateForm
        issueType="Story"
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    const textarea = screen.getByPlaceholderText(/description/i);
    expect(textarea).toBeInTheDocument();
  });

  it('calls onChange when summary is updated', () => {
    const onChange = vi.fn();
    render(
      <CreateForm
        issueType="Story"
        onChange={onChange}
        onSubmit={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText(/summary/i);
    fireEvent.change(input, { target: { value: 'New story' } });

    expect(onChange).toHaveBeenCalled();
  });

  it('calls onChange when description is updated', () => {
    const onChange = vi.fn();
    render(
      <CreateForm
        issueType="Story"
        onChange={onChange}
        onSubmit={vi.fn()}
      />
    );

    const textarea = screen.getByPlaceholderText(/description/i);
    fireEvent.change(textarea, { target: { value: 'Story description' } });

    expect(onChange).toHaveBeenCalled();
  });

  it('prevents submit when summary is empty', () => {
    const onSubmit = vi.fn();
    render(
      <CreateForm
        issueType="Story"
        onChange={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    const button = screen.getByRole('button', { name: /create/i });
    fireEvent.click(button);

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with form data when summary is provided', () => {
    const onSubmit = vi.fn();
    render(
      <CreateForm
        issueType="Story"
        onChange={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    const summaryInput = screen.getByPlaceholderText(/summary/i);
    fireEvent.change(summaryInput, { target: { value: 'New story' } });

    const button = screen.getByRole('button', { name: /create/i });
    fireEvent.click(button);

    expect(onSubmit).toHaveBeenCalledWith({
      summary: 'New story',
      description: '',
    });
  });
});
