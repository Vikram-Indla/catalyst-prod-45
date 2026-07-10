/**
 * Ideation · Explore — browse/search all ideas.
 * Phase 1: empty state only. JiraTable-based list lands in Phase 2.
 * Phase 2 S2: hosts the ?create=idea deep link (D6) via CreateIdeaModal.
 */

import Button from '@atlaskit/button/new';
import { useNavigate } from 'react-router-dom';
import { HubPageHeader } from '@/components/layout/HubPageHeader';
import { EmptyState } from '@/components/ads/EmptyState';
import { Routes } from '@/lib/routes';
import { CreateIdeaModal } from '@/modules/ideation/components/CreateIdeaModal';
import { useCreateIdeaParam } from '@/modules/ideation/hooks/useCreateIdeaParam';

export default function ExplorePage() {
  const navigate = useNavigate();
  const createModal = useCreateIdeaParam();
  return (
    <div data-testid="ideation-explore-page">
      <HubPageHeader title="Explore" />
      <EmptyState
        header="No ideas yet"
        description="Every idea submitted to the organization shows up here. Be the first — capture the problem, and reviewers take it from there."
        primaryAction={
          <Button appearance="primary" onClick={createModal.open}>
            Submit idea
          </Button>
        }
        secondaryAction={
          <Button onClick={() => navigate(Routes.ideation.inbox())}>Back to Inbox</Button>
        }
        testId="ideation-explore-empty"
      />
      <CreateIdeaModal isOpen={createModal.isOpen} onClose={createModal.close} />
    </div>
  );
}
