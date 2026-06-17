/**
 * IncidentFilterDetailPage — /incident-hub/filters/:filterId
 *
 * 2026-06-16: mounts the canonical FilterDetailPage with mode='incident'.
 * Links go to /incident-hub/work and /incident-hub/board.
 */
import FilterDetailPage from '../project-hub/filters/FilterDetailPage';

export default function IncidentFilterDetailPage() {
  return <FilterDetailPage mode="incident" />;
}
