import React from 'react';
import { StatusLozenge } from '@/components/ui/StatusLozenge';

/**
 * StatusBadge — For You page status (deprecated wrapper)
 * GUARDRAIL: Use StatusLozenge from @/components/ui/StatusLozenge for all status rendering.
 */
export function StatusBadge({ status }: { status: string }) {
  return <StatusLozenge status={status} />;
}

export default StatusBadge;
