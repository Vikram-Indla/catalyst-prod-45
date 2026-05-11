/**
 * BacklogBreadcrumb — Navigation breadcrumbs for backlog (F1.29)
 *
 * Contract:
 *   - Shows current page context (Home > Work Items)
 *   - Links back to home
 *   - Links to work items page
 *   - Responsive and accessible
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { BacklogBreadcrumb } from './BacklogBreadcrumb';

function renderBreadcrumb() {
  return render(
    <BrowserRouter>
      <BacklogBreadcrumb />
    </BrowserRouter>
  );
}

describe('BacklogBreadcrumb (F1.29)', () => {
  it('renders breadcrumb navigation', () => {
    renderBreadcrumb();
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('shows home link', () => {
    renderBreadcrumb();
    const homeLink = screen.getByRole('link', { name: /home/i });
    expect(homeLink).toBeInTheDocument();
  });

  it('shows work items link', () => {
    renderBreadcrumb();
    const workItemsLink = screen.getByRole('link', { name: /work items/i });
    expect(workItemsLink).toBeInTheDocument();
  });

  it('has proper aria-label for navigation', () => {
    renderBreadcrumb();
    const nav = screen.getByRole('navigation');
    expect(nav.getAttribute('aria-label')).toBeTruthy();
  });

  it('links to correct URLs', () => {
    renderBreadcrumb();
    const homeLink = screen.getByRole('link', { name: /home/i }) as HTMLAnchorElement;
    const workItemsLink = screen.getByRole('link', { name: /work items/i }) as HTMLAnchorElement;

    expect(homeLink.href).toContain('/');
    expect(workItemsLink.href).toContain('/workitems');
  });

  it('is semantically valid', () => {
    const { container } = renderBreadcrumb();
    const breadcrumbList = container.querySelector('ol, ul');
    expect(breadcrumbList).toBeInTheDocument();
  });
});
