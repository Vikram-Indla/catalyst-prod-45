/**
 * TestHub FiltersListPage — /testhub/filters
 *
 * 2026-06-21: mounts the canonical FiltersListPage with hubType='test'.
 * Same UI shell as /project-hub/:key/filters, /product-hub/:key/filters,
 * /incident-hub/filters, /tasks/filters per CLAUDE.md "ADOPT CANONICAL
 * COMPONENTS — DO NOT REIMPLEMENT". Save scope uses the 'TESTHUB' sentinel.
 */
import FiltersListPage from '@/pages/project-hub/filters/FiltersListPage';

export default function TestHubFiltersListPage() {
  return <FiltersListPage hubType="test" />;
}
