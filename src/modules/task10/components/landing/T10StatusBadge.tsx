/**
 * T10StatusBadge — Task list status
 * GUARDRAIL: Use StatusLozenge from @/components/ui/StatusLozenge for all status rendering.
 */
import React from 'react';
import { StatusLozenge } from '@/components/ui/StatusLozenge';
import type { T10ListStatus } from '../../types';

interface T10StatusBadgeProps {
  status: T10ListStatus;
}

export function T10StatusBadge({ status }: T10StatusBadgeProps) {
  return <StatusLozenge status={status} />;
}

export default T10StatusBadge;
