/**
 * PriorityIcon — Delegates to canonical PriorityIndicator
 */
import React from 'react';
import { Priority } from '../types';
import { PriorityIndicator } from '@/components/shared/PriorityIndicator';

interface PriorityIconProps {
  priority: Priority;
  showLabel?: boolean;
}

export const PriorityIcon: React.FC<PriorityIconProps> = ({ priority, showLabel = false }) => {
  return <PriorityIndicator priority={priority} showLabel={showLabel} />;
};
