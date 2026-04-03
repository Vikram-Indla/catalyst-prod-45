/**
 * JiraIssueTypeIcon — Shared component (delegates to canonical guardrail)
 * 
 * CODE WORD: "RESET ICONS"
 * Source of truth: src/lib/jira-issue-type-icons.tsx
 * 
 * This file exists for backward compatibility with components that import
 * from @/components/shared/JiraIssueTypeIcon. It delegates entirely to
 * the canonical file.
 */

import React from 'react';
import { 
  JiraIssueTypeIcon as CanonicalIcon, 
  resolveJiraTypeConfig,
  getJiraTypeColor,
  getJiraTypeLabel 
} from '@/lib/jira-issue-type-icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface JiraIssueTypeIconProps {
  issueType: string;
  size?: number;
  className?: string;
}

export function JiraIssueTypeIcon({ issueType, size = 16, className }: JiraIssueTypeIconProps) {
  const cfg = resolveJiraTypeConfig(issueType);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn('inline-flex items-center justify-center flex-shrink-0', className)} style={{ width: size, height: size }}>
            <CanonicalIcon 
              type={issueType} 
              size={size} 
            />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={4}>
          <p className="font-medium text-xs">{cfg.label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Get the background color for a given issue type (for badges, etc.)
 */
export function getIssueTypeBgColor(issueType: string): string {
  return getJiraTypeColor(issueType);
}

/**
 * Get the display label for a given issue type
 */
export { getJiraTypeLabel as getIssueTypeLabel };

export default JiraIssueTypeIcon;