/**
 * WorkHubBreadcrumb — Navigation breadcrumb for detail pages
 */

import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface WorkHubBreadcrumbProps {
  items: BreadcrumbItem[];
}

export function WorkHubBreadcrumb({ items }: WorkHubBreadcrumbProps) {
  return (
    <div className="flex items-center gap-2 mb-4">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          {index > 0 && (
            <ChevronRight className="w-3.5 h-3.5" style={{ color: 'var(--wh-text-tertiary)' }} />
          )}
          {item.path && index < items.length - 1 ? (
            <Link
              to={item.path}
              className="text-sm hover:underline transition-colors"
              style={{ color: 'var(--wh-text-tertiary)' }}
            >
              {item.label}
            </Link>
          ) : (
            <span
              className={`text-sm font-medium transition-colors ${
                index === items.length - 1 ? 'font-semibold' : ''
              }`}
              style={{
                color:
                  index === items.length - 1
                    ? 'var(--wh-text-primary)'
                    : 'var(--wh-text-tertiary)',
              }}
            >
              {item.label}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
