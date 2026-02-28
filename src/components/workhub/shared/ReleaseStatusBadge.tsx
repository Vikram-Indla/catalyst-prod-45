/**
 * ReleaseStatusBadge — Now uses StatusLozenge guardrail
 * GUARDRAIL: Use StatusLozenge from @/components/ui/StatusLozenge for all status rendering.
 */
import { StatusLozenge } from '@/components/ui/StatusLozenge';
import type { ReleaseStatus } from '@/types/workhub.types';

export function ReleaseStatusBadge({ status }: { status: ReleaseStatus }) {
  return <StatusLozenge status={status} />;
}
