/**
 * StatusBadge — Defect status
 * GUARDRAIL: Use StatusLozenge from @/components/ui/StatusLozenge for all status rendering.
 */
import { StatusLozenge } from '@/components/ui/StatusLozenge';

export function StatusBadge({ status }: { status: string }) {
  return <StatusLozenge status={status} />;
}
