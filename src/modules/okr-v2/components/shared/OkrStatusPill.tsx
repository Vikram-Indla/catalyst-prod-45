/**
 * OKR Status Pill — Now uses StatusLozenge guardrail
 * GUARDRAIL: Use StatusLozenge from @/components/ui/StatusLozenge for all status rendering.
 */
import { StatusLozenge } from '@/components/ui/StatusLozenge';

interface OkrStatusPillProps {
  status: string;
  size?: 'sm' | 'md';
}

export function OkrStatusPill({ status, size = 'md' }: OkrStatusPillProps) {
  return <StatusLozenge status={status} />;
}
