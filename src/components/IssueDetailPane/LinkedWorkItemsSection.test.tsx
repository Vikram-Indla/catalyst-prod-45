/**
 * LinkedWorkItemsSection — Linked work items (Parent, relates, blocks) (F2.7)
 *
 * Contract:
 *   - Displays linked work items section
 *   - Shows parent, relates, blocks relationships
 *   - Clickable links to navigate
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { LinkedWorkItemsSection } from './LinkedWorkItemsSection';

function renderSection(links: any = {}) {
  return render(
    <BrowserRouter>
      <LinkedWorkItemsSection parentKey="BAU-100" relates={[]} blocks={[]} {...links} />
    </BrowserRouter>
  );
}

describe('LinkedWorkItemsSection (F2.7)', () => {
  it('renders linked work items section', () => {
    renderSection();
    expect(screen.getByRole('heading', { name: /linked/i })).toBeInTheDocument();
  });

  it('displays parent link', () => {
    renderSection();
    expect(screen.getByText(/BAU-100/)).toBeInTheDocument();
  });

  it('displays related items when present', () => {
    renderSection({ relates: [{ key: 'BAU-200', summary: 'Related' }] });
    expect(screen.getByText(/related/i)).toBeInTheDocument();
  });

  it('displays blocked items when present', () => {
    renderSection({ blocks: [{ key: 'BAU-300', summary: 'Blocked' }] });
    expect(screen.getByText(/blocked/i)).toBeInTheDocument();
  });

  it('shows empty state when no links', () => {
    renderSection({ parentKey: null, relates: [], blocks: [] });
    expect(screen.getByText(/no linked/i)).toBeInTheDocument();
  });

  it('makes links clickable', () => {
    renderSection();
    expect(screen.getByRole('link', { name: /BAU-100/i })).toBeInTheDocument();
  });
});
