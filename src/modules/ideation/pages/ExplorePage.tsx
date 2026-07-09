/**
 * Ideation · Explore — browse/search all ideas.
 * Phase 1: empty state only. JiraTable-based list lands in Phase 2.
 */

import Button from '@atlaskit/button/new';
import { useNavigate } from 'react-router-dom';
import { HubPageHeader } from '@/components/layout/HubPageHeader';
import { EmptyState } from '@/components/ads/EmptyState';
import { Routes } from '@/lib/routes';

export default function ExplorePage() {
  const navigate = useNavigate();
  return (
    <div data-testid="ideation-explore-page">
      <HubPageHeader title="Explore" />
      <EmptyState
        header="No ideas yet"
        description="Every idea submitted to the organization shows up here. Be the first — capture the problem, and reviewers take it from there."
        primaryAction={
          <Button appearance="primary" onClick={() => navigate(Routes.ideation.submit())}>
            Submit idea
          </Button>
        }
        testId="ideation-explore-empty"
      />
    </div>
  );
}
