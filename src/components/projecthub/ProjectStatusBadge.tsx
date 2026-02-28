/**
 * ProjectStatusBadge — Now uses StatusLozenge guardrail
 * GUARDRAIL: Use StatusLozenge from @/components/ui/StatusLozenge for all status rendering.
 */
import { StatusLozenge } from '@/components/ui/StatusLozenge';
import type { ProjectStatus } from '@/types/projecthub';

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return <StatusLozenge status={status} />;
}
