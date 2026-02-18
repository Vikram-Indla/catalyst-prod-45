/**
 * Breadcrumbs — Strategy Room breadcrumb navigation
 */

import { useNavigate } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  const navigate = useNavigate();

  return (
    <nav aria-label="Breadcrumb" style={{ marginBottom: '16px' }}>
      <ol className="flex items-center gap-1 list-none p-0 m-0">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={item.label} className="flex items-center gap-1">
              {index > 0 && (
                <span
                  style={{
                    color: 'var(--catalyst-text-tertiary)',
                    fontSize: '12px',
                  }}
                  aria-hidden="true"
                >
                  ›
                </span>
              )}
              {isLast ? (
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--catalyst-text-primary)',
                  }}
                  aria-current="page"
                >
                  {item.label}
                </span>
              ) : (
                <button
                  onClick={() => item.path && navigate(item.path)}
                  className="focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{
                    fontSize: '12px',
                    color: 'var(--catalyst-text-tertiary)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  {item.label}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
