import React from 'react';
import { Badge } from '@/components/ui/badge';
import { StatusCategory } from '../types';
import { cn } from '@/lib/utils';

interface StatusLozengeProps {
  status: string;
  statusCategory?: StatusCategory;
}

const getAppearance = (status: string, category?: StatusCategory): 'default' | 'inprogress' | 'success' | 'removed' => {
  const statusLower = status.toLowerCase();
  
  // Check category first
  if (category === 'DONE') return 'success';
  if (category === 'IN_PROGRESS') return 'inprogress';
  if (category === 'TODO') return 'default';
  
  // Fallback to status string matching
  if (statusLower.includes('done') || statusLower.includes('closed') || statusLower.includes('resolved')) {
    return 'success';
  }
  if (statusLower.includes('progress') || statusLower.includes('development') || statusLower.includes('qa') || statusLower.includes('uat')) {
    return 'inprogress';
  }
  if (statusLower.includes('fail') || statusLower.includes('blocked')) {
    return 'removed';
  }
  
  return 'default';
};

const formatStatus = (status: string): string => {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
};

const appearanceStyles: Record<string, string> = {
  default: 'bg-slate-100 text-slate-700 border-slate-200',
  inprogress: 'bg-blue-100 text-blue-700 border-blue-200',
  success: 'bg-green-100 text-green-700 border-green-200',
  removed: 'bg-red-100 text-red-700 border-red-200',
};

export const StatusLozenge: React.FC<StatusLozengeProps> = ({ status, statusCategory }) => {
  const appearance = getAppearance(status, statusCategory);
  
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase border",
      appearanceStyles[appearance]
    )}>
      {formatStatus(status)}
    </span>
  );
};
