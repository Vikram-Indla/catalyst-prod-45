/**
 * ReleaseFilterPreviewPage — /release-hub/filters/create
 *
 * 2026-06-19: mounts the canonical FilterPreviewPage with mode='release'.
 * Cross-project ph_issues results scoped only by the user's JQL (typically
 * fixVersion clauses); 'RELEASES' sentinel projectKey for save scope.
 */
import { FilterPreviewPage } from '../project-hub/filters/FilterPreviewPage';

export default function ReleaseFilterPreviewPage() {
  return <FilterPreviewPage mode="release" />;
}
