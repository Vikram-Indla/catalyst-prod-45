/**
 * Breadcrumbs — Strategy Room breadcrumb navigation.
 *
 * Apr 2026 (Decision A): Disabled. The component still exists so existing
 * imports/usages don't break, but it renders null. Rationale matches
 * BacklogPage.atlaskit.tsx:1114-1123 — top nav + sidebar already show
 * location, so the breadcrumb is redundant.
 *
 * To restore: revert this file to its git history version.
 */

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function Breadcrumbs(_props: BreadcrumbsProps) {
  return null;
}
