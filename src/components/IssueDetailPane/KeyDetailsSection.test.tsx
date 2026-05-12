/**
 * KeyDetailsSection — Key details (Parent, Priority, Severity) (F2.5)
 *
 * Contract:
 *   - Displays key details section with icons
 *   - Shows Parent, Priority, Severity fields
 *   - Type-gated fields per screen scheme
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { KeyDetailsSection } from './KeyDetailsSection';

function renderSection(issue: any = { id: '1', issue_key: 'BAU-1', issue_type: 'Story' }) {
  return render(
    <BrowserRouter>
      <KeyDetailsSection issue={issue} />
    </BrowserRouter>
  );
}

describe('KeyDetailsSection (F2.5)', () => {
  it('renders key details section heading', () => {
    renderSection();
    expect(screen.getByRole('heading', { name: /key details/i })).toBeInTheDocument();
  });

  it('displays parent link when present', () => {
    renderSection({ id: '1', issue_key: 'BAU-1', parent_key: 'BAU-100', parent_type: 'Epic' });
    expect(screen.getByText(/BAU-100/)).toBeInTheDocument();
  });

  it('displays priority field', () => {
    renderSection({ id: '1', issue_key: 'BAU-1', priority: 'High' });
    expect(screen.getByText(/priority/i)).toBeInTheDocument();
  });

  it('displays severity for defect/incident', () => {
    renderSection({ id: '1', issue_key: 'BAU-1', issue_type: 'Defect', severity: 'Critical' });
    expect(screen.getByText(/critical/i)).toBeInTheDocument();
  });

  it('hides severity for story', () => {
    const { container } = renderSection({ id: '1', issue_key: 'BAU-1', issue_type: 'Story' });
    expect(container.textContent).not.toContain('severity');
  });

  it('renders with proper icon layout', () => {
    const { container } = renderSection();
    expect(container.querySelectorAll('[data-testid*="icon"]').length).toBeGreaterThan(0);
  });
});
