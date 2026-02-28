/**
 * ThemeStatusBadge — Now uses StatusLozenge guardrail
 * GUARDRAIL: Use StatusLozenge from @/components/ui/StatusLozenge for all status rendering.
 */
import { StatusLozenge } from '@/components/ui/StatusLozenge';
import type { ThemeStatus } from '@/types/workhub.types';

// Keep config export for backward compat
export const THEME_STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string }> = {
  Active:    { bg: '#dbeafe', text: '#1d4ed8', dot: '#2563eb' },
  Completed: { bg: '#d1fae5', text: '#047857', dot: '#16a34a' },
  'On Hold': { bg: '#fffbeb', text: '#92400e', dot: '#d97706' },
};

export function ThemeStatusBadge({ status }: { status: ThemeStatus }) {
  return <StatusLozenge status={status} />;
}
