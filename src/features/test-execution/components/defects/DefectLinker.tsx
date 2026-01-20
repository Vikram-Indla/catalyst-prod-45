/**
 * Module 3A-4: Defect Linker - Main Container Component
 * Orchestrates linking, unlinking, and creating defects
 */

import { useState } from 'react';
import { Bug, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LinkedDefectsList } from './LinkedDefectsList';
import { DefectSearchDialog } from './DefectSearchDialog';
import { QuickCreateDialog } from './QuickCreateDialog';
import { useLinkedDefects } from '../../hooks/useLinkedDefects';
import { useDefectMutations } from '../../hooks/useDefectMutations';
import type { FailedStepContext, DefectSearchResult } from '../../types/defect-linking';

interface DefectLinkerProps {
  projectId: string;
  stepResultId: string;
  runId?: string;
  context: FailedStepContext;
  className?: string;
}

export function DefectLinker({
  projectId,
  stepResultId,
  runId,
  context,
  className,
}: DefectLinkerProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const { linkedDefects, count, isLoading } = useLinkedDefects(stepResultId);
  const { linkDefect, unlinkDefect, createDefect, isLinking, isUnlinking, isCreating } = 
    useDefectMutations(stepResultId);

  const linkedDefectIds = linkedDefects.map(d => d.id);

  const handleLink = (defect: DefectSearchResult) => {
    linkDefect.mutate(
      {
        defect_id: defect.id,
        step_result_id: stepResultId,
        run_id: runId,
        link_type: 'manual',
      },
      {
        onSuccess: () => {
          setSearchOpen(false);
        },
      }
    );
  };

  const handleUnlink = (defectId: string) => {
    unlinkDefect.mutate(defectId);
  };

  const handleCreate = (input: Parameters<typeof createDefect.mutate>[0]) => {
    createDefect.mutate(input, {
      onSuccess: () => {
        setCreateOpen(false);
      },
    });
  };

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bug className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Linked Defects</span>
          {count > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5">
              {count}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSearchOpen(true)}
            className="h-7 px-2 text-xs"
          >
            <Search className="h-3 w-3 mr-1" />
            Link Existing
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => setCreateOpen(true)}
            className="h-7 px-2 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Create Defect
          </Button>
        </div>
      </div>

      {/* Linked Defects List */}
      <LinkedDefectsList
        defects={linkedDefects}
        isLoading={isLoading}
        isUnlinking={isUnlinking}
        onUnlink={handleUnlink}
      />

      {/* Search Dialog */}
      <DefectSearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        projectId={projectId}
        linkedDefectIds={linkedDefectIds}
        isLinking={isLinking}
        onLink={handleLink}
      />

      {/* Quick Create Dialog */}
      <QuickCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        projectId={projectId}
        stepResultId={stepResultId}
        runId={runId}
        context={context}
        isCreating={isCreating}
        onCreate={handleCreate}
      />
    </div>
  );
}
