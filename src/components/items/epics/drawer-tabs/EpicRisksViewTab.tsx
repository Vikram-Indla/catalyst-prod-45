/**
 * EpicRisksViewTab - Epic Risks tab
 * Now uses shared EntityRisksTab component for unified risk UI
 */

import { EntityRisksTab } from '@/components/risks/shared/EntityRisksTab';

interface EpicRisksViewTabProps {
  epicId: string;
}

export function EpicRisksViewTab({ epicId }: EpicRisksViewTabProps) {
  return <EntityRisksTab entityType="epic" entityId={epicId} />;
}
