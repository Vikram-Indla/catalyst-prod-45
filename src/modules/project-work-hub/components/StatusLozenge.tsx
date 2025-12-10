import React from 'react';
import Lozenge from '@atlaskit/lozenge';
import { StatusCategory } from '../types';

interface StatusLozengeProps {
  status: string;
  statusCategory?: StatusCategory;
}

const getAppearance = (status: string, category?: StatusCategory): 'default' | 'inprogress' | 'success' | 'removed' | 'new' | 'moved' => {
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
  if (statusLower.includes('new') || statusLower.includes('open')) {
    return 'new';
  }
  
  return 'default';
};

const formatStatus = (status: string): string => {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
};

export const StatusLozenge: React.FC<StatusLozengeProps> = ({ status, statusCategory }) => {
  return (
    <Lozenge appearance={getAppearance(status, statusCategory)} isBold>
      {formatStatus(status)}
    </Lozenge>
  );
};
