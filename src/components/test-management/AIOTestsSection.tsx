/**
 * CATALYST TESTS - AIO Tests Section
 * Bidirectional integration component for work item pages
 * Matches exact layout from user's AIO Tests screenshots
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Sparkles, Plus, Link } from 'lucide-react';
import { useWorkItemTestSummary } from '@/hooks/useWorkItemLinking';
import { LinkedTestCasesList } from './LinkedTestCasesList';
import { CreateTestFromWorkItem } from './CreateTestFromWorkItem';
import { LinkTestToWorkItem } from './LinkTestToWorkItem';
import { AITestSuggestions } from './AITestSuggestions';
import type { WorkItemType } from '@/types/workItemLinking.types';

interface AIOTestsSectionProps {
  workItemId: string;
  workItemType: WorkItemType;
  workItemTitle: string;
  workItemDescription?: string;
}

export const AIOTestsSection: React.FC<AIOTestsSectionProps> = ({
  workItemId,
  workItemType,
  workItemTitle,
  workItemDescription,
}) => {
  const [showAllVersions, setShowAllVersions] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);

  const { data: summary, isLoading } = useWorkItemTestSummary(workItemId, workItemType);

  const hasLinks = summary && summary.total_tests > 0;

  return (
    <div className="space-y-4 border-t pt-6">
      <h3 className="text-lg font-semibold">AIO Tests</h3>

      <div className="rounded-lg border bg-card p-6">
        {!hasLinks && !isLoading && (
          <div className="space-y-4">
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <Checkbox id="no-links" disabled />
              <label htmlFor="no-links" className="cursor-default">
                No cases or cycles linked to this issue.
              </label>
            </div>

            <div className="flex items-start gap-2 text-sm">
              <Checkbox
                id="all-versions"
                checked={showAllVersions}
                onCheckedChange={(checked) => setShowAllVersions(checked as boolean)}
              />
              <label
                htmlFor="all-versions"
                className="cursor-pointer font-medium"
              >
                Display all Case versions
              </label>
            </div>
          </div>
        )}

        {hasLinks && (
          <div className="space-y-4">
            <LinkedTestCasesList
              workItemId={workItemId}
              workItemType={workItemType}
              showAllVersions={showAllVersions}
            />

            <div className="flex items-center gap-2 text-sm">
              <Checkbox
                id="all-versions"
                checked={showAllVersions}
                onCheckedChange={(checked) => setShowAllVersions(checked as boolean)}
              />
              <label
                htmlFor="all-versions"
                className="cursor-pointer font-medium"
              >
                Display all Case versions
              </label>
            </div>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAiModalOpen(true)}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            AI
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Case
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setLinkModalOpen(true)}
            className="gap-2"
          >
            <Link className="h-4 w-4" />
            Link Case
          </Button>
        </div>
      </div>

      {/* Modals */}
      <CreateTestFromWorkItem
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        workItemId={workItemId}
        workItemType={workItemType}
        workItemTitle={workItemTitle}
        workItemDescription={workItemDescription}
      />

      <LinkTestToWorkItem
        open={linkModalOpen}
        onOpenChange={setLinkModalOpen}
        workItemId={workItemId}
        workItemType={workItemType}
      />

      <AITestSuggestions
        open={aiModalOpen}
        onOpenChange={setAiModalOpen}
        workItemId={workItemId}
        workItemType={workItemType}
        workItemTitle={workItemTitle}
        workItemDescription={workItemDescription}
      />
    </div>
  );
};
