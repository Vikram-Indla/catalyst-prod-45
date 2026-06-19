/**
 * ReleaseFiltersListPage — /release-hub/filters
 *
 * 2026-06-19: mounts the canonical FiltersListPage with hubType='release'.
 * Same UI shell as the project/product/incident/tasks filter directories per
 * CLAUDE.md "ADOPT CANONICAL COMPONENTS — DO NOT REIMPLEMENT".
 */
import FiltersListPage from '../project-hub/filters/FiltersListPage';

export default function ReleaseFiltersListPage() {
  return <FiltersListPage hubType="release" />;
}
