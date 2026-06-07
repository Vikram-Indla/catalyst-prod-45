/**
 * CatalystBreadcrumbs — ADS-canonical breadcrumb wrapper.
 * Replaces hand-rolled breadcrumb patterns across 35+ surfaces.
 * Uses @atlaskit/breadcrumbs with Catalyst-specific defaults.
 */
import Breadcrumbs, { BreadcrumbsItem } from '@atlaskit/breadcrumbs';

export interface CatalystBreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface CatalystBreadcrumbsProps {
  items: CatalystBreadcrumbItem[];
  maxItems?: number;
}

export function CatalystBreadcrumbs({ items, maxItems = 8 }: CatalystBreadcrumbsProps) {
  return (
    <Breadcrumbs maxItems={maxItems}>
      {items.map((item, i) => (
        <BreadcrumbsItem
          key={i}
          text={item.label}
          href={item.href}
          onClick={item.onClick ? (e: React.MouseEvent) => { e.preventDefault(); item.onClick?.(); } : undefined}
        />
      ))}
    </Breadcrumbs>
  );
}
