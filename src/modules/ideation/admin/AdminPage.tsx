/**
 * Ideation · Admin — /admin/ideation/* skeleton.
 * Phase 1: single placeholder covering the admin surface. Dedicated tabs
 * (scoring models, workflow, intake, AI, roles) land in Phase 3 per the
 * governance design (discovery 04 §H).
 */

import { HubPageHeader } from '@/components/layout/HubPageHeader';
import { EmptyState } from '@/components/ads/EmptyState';

export default function AdminPage() {
  return (
    <div data-testid="ideation-admin-page">
      <HubPageHeader title="Ideation administration" />
      <EmptyState
        header="Admin controls arrive with governance"
        description="Scoring models, workflow guards, intake forms, AI settings, and role defaults are configured here from Phase 3. The Default (Value × Effort) scoring model is already seeded and active."
        testId="ideation-admin-empty"
      />
    </div>
  );
}
