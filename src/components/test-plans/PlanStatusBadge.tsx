/**
 * PlanStatusBadge — Now uses StatusLozenge guardrail
 * GUARDRAIL: Use StatusLozenge from @/components/ui/StatusLozenge for all status rendering.
 */
import { StatusLozenge } from '@/components/ui/StatusLozenge';
import { PlanStatus } from '@/types/testPlans';

export function PlanStatusBadge({ status }: { status: PlanStatus }) {
  return <StatusLozenge status={status} />;
}
