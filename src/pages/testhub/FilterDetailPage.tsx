/**
 * TestHub FilterDetailPage — /testhub/filters/:filterId
 *
 * 2026-06-21: mounts the canonical FilterDetailPage with mode='test'.
 */
import FilterDetailPage from '@/pages/project-hub/filters/FilterDetailPage';

export default function TestHubFilterDetailPage() {
  return <FilterDetailPage mode="test" />;
}
