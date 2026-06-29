/**
 * ReleasesPageWrapper — Context-aware releases/milestones router
 *
 * Routes to:
 * - /project-hub/... → ReleasesPage (releases for project delivery)
 * - /product-hub/... → MilestoneManager (milestones for product roadmap)
 *
 * The :key URL param is the product CODE (e.g. "INV"), not a UUID.
 * MilestoneManager resolves the UUID from the code internally.
 */

import React from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { ReleasesPage } from './ReleasesPage';
import { MilestoneManager } from '@/components/product-hub/MilestoneManager';

export function ReleasesPageWrapper() {
  const { pathname } = useLocation();
  const { key } = useParams<{ key?: string }>();

  const isProductHub = pathname.startsWith('/product-hub');

  if (isProductHub && key) {
    return <MilestoneManager productCode={key} />;
  }

  return <ReleasesPage />;
}
