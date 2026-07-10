/**
 * Ideation · Portfolio — Value × Effort field chart (D4 default axes).
 * Phase 1: empty state only. The recharts quadrant view lands in Phase 2+.
 * Phase 2 S2: hosts the ?create=idea deep link (D6) via CreateIdeaModal.
 */

import Button from '@atlaskit/button/new';
import { useNavigate } from 'react-router-dom';
import { HubPageHeader } from '@/components/layout/HubPageHeader';
import { EmptyState } from '@/components/ads/EmptyState';
import { Routes } from '@/lib/routes';
import { CreateIdeaModal } from '@/modules/ideation/components/CreateIdeaModal';
import { useCreateIdeaParam } from '@/modules/ideation/hooks/useCreateIdeaParam';

export default function PortfolioPage() {
  const navigate = useNavigate();
  const createModal = useCreateIdeaParam();
  return (
    <div data-testid="ideation-portfolio-page">
      <HubPageHeader title="Portfolio" />
      <EmptyState
        header="Nothing to plot yet"
        description="Scored ideas appear here on a Value × Effort field so you can spot quick wins at a glance. Ideas gain scores during evaluation."
        primaryAction={
          <Button appearance="primary" onClick={() => navigate(Routes.ideation.explore())}>
            Explore ideas
          </Button>
        }
        testId="ideation-portfolio-empty"
      />
      <CreateIdeaModal isOpen={createModal.isOpen} onClose={createModal.close} />
    </div>
  );
}
