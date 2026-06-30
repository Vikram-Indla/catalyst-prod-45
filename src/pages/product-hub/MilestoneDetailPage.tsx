/**
 * MilestoneDetailPage — /product-hub/:key/milestones/:milestoneId
 *
 * 2026-06-30 (CAT-MILESTONE-DETAIL-20260630-001): mounts the canonical
 * ReleaseDetailPage with MILESTONE_CONFIG. Same component drives release,
 * sprint, and milestone detail surfaces — config-aware reads/writes via
 * EntityConfig.columnMap + branch-on-kind for work items.
 *
 * Mirrors SprintDetailPage exactly — the :milestoneId param is mapped onto
 * entityIdOverride so the underlying component (which originally read
 * :releaseId from useParams) finds the right entity ID.
 */
import { useParams } from 'react-router-dom';
import { ReleaseDetailPage } from '@/pages/release-hub/ReleaseDetailPage';
import { MILESTONE_CONFIG } from '@/lib/entity-hub/config';

export function MilestoneDetailPage() {
  const { key, milestoneId } = useParams<{ key: string; milestoneId: string }>();
  const productKey = key ?? '';
  return (
    <ReleaseDetailPage
      config={MILESTONE_CONFIG}
      entityIdOverride={milestoneId}
      listHrefOverride={`/product-hub/${productKey}/milestones`}
    />
  );
}
