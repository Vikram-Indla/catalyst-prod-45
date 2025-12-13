/**
 * RisksViewTab - Industry/Demand Risks tab
 * Now uses shared EntityRisksTab component for unified risk UI
 */

import { EntityRisksTab } from '@/components/risks/shared/EntityRisksTab';
import { BusinessRequest } from '@/types/business-request';

interface RisksViewTabProps {
  data: Partial<BusinessRequest> & Record<string, any>;
  onChange: (field: string, value: any) => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

export function RisksViewTab({ data }: RisksViewTabProps) {
  if (!data.id) {
    return (
      <div className="p-6 text-center text-muted-foreground text-sm">
        Save the request first to add risks.
      </div>
    );
  }
  
  return <EntityRisksTab entityType="business_request" entityId={data.id} />;
}
