/**
 * Issue Card Component
 * Displays a single detected issue with severity badge and create defect action
 */

import React from 'react';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  DetectedIssue, 
  severityColors, 
  issueTypeLabels 
} from './types';

interface IssueCardProps {
  issue: DetectedIssue;
  onCreateDefect: () => void;
}

export const IssueCard: React.FC<IssueCardProps> = ({ issue, onCreateDefect }) => {
  return (
    <div className="border rounded-lg p-3 space-y-2 bg-card">
      {/* Header with severity and type badges */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span 
            className={cn(
              "text-xs px-2 py-0.5 rounded-full border font-medium",
              severityColors[issue.severity]
            )}
          >
            {issue.severity}
          </span>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
            {issueTypeLabels[issue.type]}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {Math.round(issue.confidence * 100)}% confidence
        </span>
      </div>
      
      {/* Description */}
      <p className="text-sm text-foreground">{issue.description}</p>
      
      {/* Suggested title preview */}
      {issue.suggestedTitle && (
        <p className="text-xs text-muted-foreground italic">
          "{issue.suggestedTitle}"
        </p>
      )}
      
      {/* Create Defect button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onCreateDefect}
        className="text-primary hover:text-primary/80 p-0 h-auto"
      >
        <PlusCircle className="w-3 h-3 mr-1" />
        Create Defect
      </Button>
    </div>
  );
};
