// OKR Hub - v2 is now the single source of truth
// All previous v1 code has been removed

import { OKRHubV2 } from '@/modules/okr-v2';

interface OKRHubProps {
  scopeType?: 'enterprise' | 'portfolio' | 'program' | 'team';
  scopeId?: string;
}

export function OKRHub({ scopeType = 'enterprise', scopeId }: OKRHubProps = {}) {
  // v2 is now the only OKR implementation
  return <OKRHubV2 />;
}

export default OKRHub;
