/**
 * ReleasesPageWrapper — Context-aware releases/milestones router
 *
 * Routes to:
 * - /project-hub/... → ReleasesPage (releases for project delivery)
 * - /product-hub/... → MilestoneManager (milestones for product roadmap)
 */

import React from 'react';
import { useLocation } from 'react-router-dom';
import { ReleasesPage } from './ReleasesPage';
import { MilestoneManager } from '@/components/product-hub/MilestoneManager';
import { useParams } from 'react-router-dom';

export function ReleasesPageWrapper() {
  const { pathname } = useLocation();
  const { key } = useParams<{ key?: string }>();

  // Detect context from URL path
  const isProductHub = pathname.startsWith('/product-hub');

  if (isProductHub && key) {
    // Product context: show Milestones
    return (
      <div style={{ padding: '24px' }}>
        <MilestoneManager productId={key} />
      </div>
    );
  }

  // Project context (or release-hub): show Releases
  return <ReleasesPage />;
}
