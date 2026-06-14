/**
 * PriorityIcon — wraps Catalyst's canonical priority glyph (ADS colors,
 * Jira priority pack). Renders nothing for unknown priorities (no lie).
 */
import React from 'react';
import CanonicalPriorityIcon from '@/components/shared/PriorityIcon';

interface Props {
  priority: string | null | undefined;
  size?: number;
}

export const PriorityIcon: React.FC<Props> = ({ priority, size = 16 }) => {
  if (!priority) return null;
  return <CanonicalPriorityIcon level={priority} size={size} />;
};
