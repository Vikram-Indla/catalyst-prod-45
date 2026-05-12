/**
 * FieldRow — Label + value/input layout (F3.2)
 *
 * Contract:
 *   - Displays field label and value
 *   - Supports read-only and edit modes
 *   - Consistent styling across all fields
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { FieldRow } from './FieldRow';

describe('FieldRow (F3.2)', () => {
  it('renders field label', () => {
    render(<FieldRow label="Assignee" value="John Doe" />);
    expect(screen.getByText(/assignee/i)).toBeInTheDocument();
  });

  it('renders field value', () => {
    render(<FieldRow label="Priority" value="High" />);
    expect(screen.getByText(/high/i)).toBeInTheDocument();
  });

  it('stacks label and value vertically', () => {
    const { container } = render(<FieldRow label="Priority" value="High" />);
    expect(container.querySelector('[data-testid="field-row"]')).toHaveStyle({
      display: 'flex',
      flexDirection: 'column'
    });
  });

  it('applies proper spacing', () => {
    const { container } = render(<FieldRow label="Priority" value="High" />);
    const row = container.querySelector('[data-testid="field-row"]');
    expect(row).toHaveStyle({ gap: expect.any(String) });
  });

  it('styles label correctly', () => {
    const { container } = render(<FieldRow label="Priority" value="High" />);
    const label = container.querySelector('[data-testid="field-label"]');
    expect(label).toHaveStyle({ fontSize: '11px', fontWeight: '600' });
  });

  it('renders children when provided', () => {
    render(
      <FieldRow label="Assignee">
        <input type="text" placeholder="Select assignee" />
      </FieldRow>
    );
    expect(screen.getByPlaceholderText(/select assignee/i)).toBeInTheDocument();
  });

  it('renders edit control when editable', () => {
    render(<FieldRow label="Priority" value="High" editable={true} />);
    expect(screen.getByTestId('field-edit-control')).toBeInTheDocument();
  });
});
