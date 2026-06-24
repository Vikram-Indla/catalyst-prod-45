/**
 * BacklogBreadcrumb — Navigation breadcrumbs for backlog (F1.29)
 *
 * Shows navigation context: Home > Work Items
 */
import React, { memo } from 'react';
import { Link } from 'react-router-dom';

export const BacklogBreadcrumb = memo(function BacklogBreadcrumb() {
  return (
    <nav aria-label="Breadcrumb" style={{ marginBottom: '16px' }}>
      <ol
        style={{
          display: 'flex',
          gap: '8px',
          listStyle: 'none',
          padding: 0,
          margin: 0,
          fontSize: '14px',
          color: 'var(--cp-text-primary, var(--cp-text-inverse, #172B4D))',
        }}
      >
        <li>
          <Link to="/" style={{ color: 'var(--ds-link, #0C66E4)', textDecoration: 'none' }}>
            Home
          </Link>
        </li>
        <li style={{ color: 'var(--ds-text-subtlest, #6B778C)' }}>/</li>
        <li>
          <Link to="/workitems" style={{ color: 'var(--ds-link, #0C66E4)', textDecoration: 'none' }}>
            Work Items
          </Link>
        </li>
      </ol>
    </nav>
  );
});
