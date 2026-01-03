/**
 * Review Tab - Pre-flight Validation Checklist
 */

import React from 'react';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  ChevronRight,
  FileText,
  ListChecks,
  Link as LinkIcon,
  Database,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { TabProps, ModalTab } from './types';

interface ReviewTabProps extends TabProps {
  onNavigateToTab: (tab: ModalTab) => void;
}

export function ReviewTab({ formData, validation, onNavigateToTab }: ReviewTabProps) {
  const hasTitle = !!formData.title.trim();
  const hasFolder = !!formData.folderId;
  const validSteps = formData.steps.filter(s => s.action.trim() && s.expectedResult.trim());
  const hasValidSteps = validSteps.length > 0;
  const stepsWithoutExpected = formData.steps.filter(s => s.action.trim() && !s.expectedResult.trim());
  const hasTraceabilityLink = formData.links.some(
    l => ['requirement', 'story', 'feature'].includes(l.linkedType)
  );

  const isReadyEligible = hasTitle && hasFolder && hasValidSteps && hasTraceabilityLink;

  const CheckItem = ({
    label,
    description,
    passed,
    required,
    tab,
    field,
  }: {
    label: string;
    description: string;
    passed: boolean;
    required: boolean;
    tab: ModalTab;
    field: string;
  }) => (
    <div className={cn(
      'flex items-start gap-3 p-3 rounded-md border',
      passed 
        ? 'bg-status-success/5 border-status-success/20'
        : required
          ? 'bg-status-error/5 border-status-error/20'
          : 'bg-status-warning/5 border-status-warning/20'
    )}>
      <div className="shrink-0 mt-0.5">
        {passed ? (
          <CheckCircle className="h-5 w-5 text-status-success" />
        ) : required ? (
          <XCircle className="h-5 w-5 text-status-error" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-status-warning" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-text-primary">{label}</span>
          {required && !passed && (
            <Badge variant="destructive" className="text-[10px] h-4">Required</Badge>
          )}
          {!required && !passed && (
            <Badge variant="outline" className="text-[10px] h-4 text-status-warning border-status-warning">For Ready</Badge>
          )}
        </div>
        <p className="text-xs text-text-tertiary mt-0.5">{description}</p>
      </div>
      {!passed && (
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 h-7 gap-1 text-xs"
          onClick={() => onNavigateToTab(tab)}
        >
          Fix <ChevronRight className="h-3 w-3" />
        </Button>
      )}
    </div>
  );

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6">
        {/* Summary Banner */}
        <div className={cn(
          'p-4 rounded-lg border',
          isReadyEligible
            ? 'bg-status-success/10 border-status-success/30'
            : 'bg-status-warning/10 border-status-warning/30'
        )}>
          <div className="flex items-center gap-3">
            {isReadyEligible ? (
              <CheckCircle className="h-8 w-8 text-status-success" />
            ) : (
              <AlertTriangle className="h-8 w-8 text-status-warning" />
            )}
            <div>
              <h3 className="font-semibold text-text-primary">
                {isReadyEligible ? 'Ready for Execution' : 'Validation Required'}
              </h3>
              <p className="text-sm text-text-secondary mt-0.5">
                {isReadyEligible
                  ? 'This test case meets all requirements and can be set to Ready status.'
                  : 'Some items need attention before this test case can be set to Ready status.'}
              </p>
            </div>
          </div>
        </div>

        {/* Required Checks */}
        <div>
          <h4 className="text-xs font-medium text-text-tertiary uppercase tracking-wide mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Required for Creation
          </h4>
          <div className="space-y-2">
            <CheckItem
              label="Title"
              description={hasTitle ? `"${formData.title}"` : "A descriptive title is required"}
              passed={hasTitle}
              required={true}
              tab="details"
              field="title"
            />
            <CheckItem
              label="Folder"
              description={hasFolder ? "Test case will be organized in a folder" : "Select a folder to organize this test case"}
              passed={hasFolder}
              required={true}
              tab="details"
              field="folderId"
            />
          </div>
        </div>

        {/* Ready Status Checks */}
        <div>
          <h4 className="text-xs font-medium text-text-tertiary uppercase tracking-wide mb-3 flex items-center gap-2">
            <ListChecks className="h-4 w-4" />
            Required for Ready Status
          </h4>
          <div className="space-y-2">
            <CheckItem
              label="Test Steps"
              description={
                hasValidSteps
                  ? `${validSteps.length} step${validSteps.length !== 1 ? 's' : ''} with expected results defined`
                  : "At least one step with an expected result is required"
              }
              passed={hasValidSteps}
              required={false}
              tab="steps"
              field="steps"
            />
            
            {stepsWithoutExpected.length > 0 && (
              <div className="ml-8 p-2 bg-status-warning/10 rounded text-xs text-status-warning">
                {stepsWithoutExpected.length} step{stepsWithoutExpected.length !== 1 ? 's' : ''} missing expected result
              </div>
            )}

            <CheckItem
              label="Traceability Link"
              description={
                hasTraceabilityLink
                  ? `Linked to ${formData.links.filter(l => ['requirement', 'story', 'feature'].includes(l.linkedType)).length} requirement/story/feature`
                  : "Link to at least one requirement, story, or feature"
              }
              passed={hasTraceabilityLink}
              required={false}
              tab="links"
              field="links"
            />
          </div>
        </div>

        {/* Summary Stats */}
        <div>
          <h4 className="text-xs font-medium text-text-tertiary uppercase tracking-wide mb-3 flex items-center gap-2">
            <Database className="h-4 w-4" />
            Test Case Summary
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-md bg-surface-2 border border-border-default">
              <div className="text-2xl font-semibold text-text-primary">{formData.steps.length}</div>
              <div className="text-xs text-text-tertiary">Total Steps</div>
            </div>
            <div className="p-3 rounded-md bg-surface-2 border border-border-default">
              <div className="text-2xl font-semibold text-text-primary">{formData.links.length}</div>
              <div className="text-xs text-text-tertiary">Links</div>
            </div>
            <div className="p-3 rounded-md bg-surface-2 border border-border-default">
              <div className="text-2xl font-semibold text-text-primary">
                {formData.datasetsEnabled ? formData.datasets.length || 1 : 1}
              </div>
              <div className="text-xs text-text-tertiary">Execution Runs</div>
            </div>
            <div className="p-3 rounded-md bg-surface-2 border border-border-default">
              <div className="text-2xl font-semibold text-text-primary capitalize">{formData.priority}</div>
              <div className="text-xs text-text-tertiary">Priority</div>
            </div>
          </div>
        </div>

        {/* Approval Gate Status */}
        {formData.requiresApproval && (
          <div className="flex items-center gap-3 p-3 rounded-md bg-accent-subtle border border-accent-primary/20">
            <AlertTriangle className="h-5 w-5 text-accent-primary" />
            <div>
              <span className="font-medium text-sm text-text-primary">Review Gate Enabled</span>
              <p className="text-xs text-text-tertiary mt-0.5">
                This test case requires approval before it can be executed
              </p>
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
