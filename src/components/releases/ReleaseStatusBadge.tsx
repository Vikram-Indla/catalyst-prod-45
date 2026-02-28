/**
 * ReleaseStatusBadge — Now uses StatusLozenge guardrail
 * GUARDRAIL: Use StatusLozenge from @/components/ui/StatusLozenge for all status rendering.
 */
import { StatusLozenge } from '@/components/ui/StatusLozenge';

interface Props {
  status: string;
}

export function ReleaseStatusBadge({ status }: Props) {
  return <StatusLozenge status={status} />;
}
