/**
 * RisksViewTab - Business Request Risks tab
 * Now uses shared EntityRisksTab component for unified risk UI
 */

import { EntityRisksTab } from '@/components/risks/shared/EntityRisksTab';

interface RisksViewTabProps {
  requestId: string;
}

export function RisksViewTab({ requestId }: RisksViewTabProps) {
  return <EntityRisksTab entityType="business_request" entityId={requestId} />;
}
