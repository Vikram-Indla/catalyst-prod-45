/**
 * ReleaseFilterDetailPage — /release-hub/filters/:filterId
 *
 * 2026-06-19: mounts the canonical FilterDetailPage with mode='release'.
 * Read-only detail; explicit Edit opens the release builder.
 */
import FilterDetailPage from '../project-hub/filters/FilterDetailPage';

export default function ReleaseFilterDetailPage() {
  return <FilterDetailPage mode="release" />;
}
