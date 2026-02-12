// OKR Hub - v2 is now the single source of truth
// All previous v1 code has been removed

import { OKRHubV2 } from '@/modules/okr-v2';
import { PageChrome } from '@/components/layout/PageChrome';
import { CommandCenterHeader } from '@/components/shared/CommandCenterHeader';

interface OKRHubProps {
  scopeType?: 'enterprise' | 'portfolio' | 'program' | 'team';
  scopeId?: string;
}

export function OKRHub({ scopeType = 'enterprise', scopeId }: OKRHubProps = {}) {
  return (
    <PageChrome hideHeader>
      <CommandCenterHeader
        title="Objective Tree"
        subtitle="Strategic objectives, key results & delivery items"
      />
      <OKRHubV2 />
    </PageChrome>
  );
}

export default OKRHub;
