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
          fontSize: 'var(--ds-font-size-400)',
          color: 'var(--cp-text-primary, var(--cp-text-inverse))',
        }}
      >
        <li>
          <Link to="/" style={{ color: 'var(--ds-link)', textDecoration: 'none' }}>
            Home
          </Link>
        </li>
        <li style={{ color: 'var(--ds-text-subtlest)' }}>/</li>
        <li>
          <Link to="/workitems" style={{ color: 'var(--ds-link)', textDecoration: 'none' }}>
            Work Items
          </Link>
        </li>
      </ol>
    </nav>
  );
});
