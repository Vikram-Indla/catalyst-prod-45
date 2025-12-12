/**
 * EpicAuditHistoryTab - Uses shared UnifiedAuditHistoryTab
 */

import { UnifiedAuditHistoryTab } from '@/components/shared/UnifiedAuditHistoryTab';

interface EpicAuditHistoryTabProps {
  epicId: string;
}

export function EpicAuditHistoryTab({ epicId }: EpicAuditHistoryTabProps) {
  return (
    <div className="h-full">
      <UnifiedAuditHistoryTab entityType="epic" entityId={epicId} />
    </div>
  );
}
