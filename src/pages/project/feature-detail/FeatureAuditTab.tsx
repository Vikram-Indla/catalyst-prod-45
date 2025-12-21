/**
 * FeatureAuditTab — Real audit log using UnifiedAuditHistoryTab
 */

import { UnifiedAuditHistoryTab } from '@/components/shared/UnifiedAuditHistoryTab';

interface FeatureAuditTabProps {
  featureId: string;
}

export function FeatureAuditTab({ featureId }: FeatureAuditTabProps) {
  return (
    <div className="space-y-4">
      <UnifiedAuditHistoryTab entityId={featureId} entityType="feature" />
    </div>
  );
}
