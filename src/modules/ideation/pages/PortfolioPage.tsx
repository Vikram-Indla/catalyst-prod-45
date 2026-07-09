/**
 * Ideation · Portfolio — Value × Effort field chart (D4 default axes).
 * Phase 1: empty state only. The recharts quadrant view lands in Phase 2+.
 */

import Button from '@atlaskit/button/new';
import { useNavigate } from 'react-router-dom';
import { HubPageHeader } from '@/components/layout/HubPageHeader';
import { EmptyState } from '@/components/ads/EmptyState';
import { Routes } from '@/lib/routes';

export default function PortfolioPage() {
  const navigate = useNavigate();
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
    </div>
  );
}
