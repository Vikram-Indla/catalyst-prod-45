/**
 * Ideation · Inbox — triage queue landing (inbox-first per design 04 §C.1).
 * Phase 1: empty state only. The 2-pane triage inbox lands in Phase 2.
 */

import Button from '@atlaskit/button/new';
import { useNavigate } from 'react-router-dom';
import { HubPageHeader } from '@/components/layout/HubPageHeader';
import { EmptyState } from '@/components/ads/EmptyState';
import { Routes } from '@/lib/routes';

export default function InboxPage() {
  const navigate = useNavigate();
  return (
    <div data-testid="ideation-inbox-page">
      <HubPageHeader title="Inbox" />
      <EmptyState
        header="Inbox zero"
        description="Nothing is waiting on you. New ideas land here for triage — explore what's already in flight or submit your own."
        primaryAction={
          <Button appearance="primary" onClick={() => navigate(Routes.ideation.submit())}>
            Submit idea
          </Button>
        }
        secondaryAction={
          <Button onClick={() => navigate(Routes.ideation.explore())}>Explore ideas</Button>
        }
        testId="ideation-inbox-empty"
      />
    </div>
  );
}
