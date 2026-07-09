/**
 * Ideation · Idea detail — /ideation/ideas/:slug.
 * Phase 1: placeholder only (no idn_ideas reads yet). The full detail view
 * (activity, votes, scores, AI rail tab) lands in Phase 2.
 */

import Button from '@atlaskit/button/new';
import { useNavigate, useParams } from 'react-router-dom';
import { HubPageHeader } from '@/components/layout/HubPageHeader';
import { EmptyState } from '@/components/ads/EmptyState';
import { Routes } from '@/lib/routes';

export default function DetailPage() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  return (
    <div data-testid="ideation-detail-page">
      <HubPageHeader title="Idea" />
      <EmptyState
        header="Idea not available"
        description={
          slug
            ? `There's no idea to show for "${slug}" yet. Idea pages open here once submissions begin.`
            : 'Idea pages open here once submissions begin.'
        }
        primaryAction={
          <Button appearance="primary" onClick={() => navigate(Routes.ideation.explore())}>
            Back to Explore
          </Button>
        }
        testId="ideation-detail-empty"
      />
    </div>
  );
}
