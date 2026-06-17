/**
 * IncidentFiltersListPage — /incident-hub/filters
 *
 * 2026-06-16: mounts the canonical FiltersListPage with hubType='incident'.
 * Same UI shell as /project-hub/:key/filters and /product-hub/:key/filters
 * per CLAUDE.md "ADOPT CANONICAL COMPONENTS — DO NOT REIMPLEMENT".
 */
import FiltersListPage from '../project-hub/filters/FiltersListPage';

export default function IncidentFiltersListPage() {
  return <FiltersListPage hubType="incident" />;
}
