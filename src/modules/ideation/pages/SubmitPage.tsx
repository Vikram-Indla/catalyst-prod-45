/**
 * Ideation · Submit — /ideation/submit (also reachable via ?create=idea per D6).
 * Phase 1: placeholder only. The guided submit form (problem-first capture,
 * duplicate check, evidence attach) lands in Phase 2.
 */

import Button from '@atlaskit/button/new';
import { useNavigate } from 'react-router-dom';
import { HubPageHeader } from '@/components/layout/HubPageHeader';
import { EmptyState } from '@/components/ads/EmptyState';
import { Routes } from '@/lib/routes';

export default function SubmitPage() {
  const navigate = useNavigate();
  return (
    <div data-testid="ideation-submit-page">
      <HubPageHeader title="Submit idea" />
      <EmptyState
        header="Submissions open soon"
        description="The guided idea form is on its way. It will capture the problem, supporting evidence, and strategy links in one pass."
        primaryAction={
          <Button appearance="primary" onClick={() => navigate(Routes.ideation.inbox())}>
            Back to Inbox
          </Button>
        }
        testId="ideation-submit-empty"
      />
    </div>
  );
}
