/**
 * GenerateTestCasesCTA — G6 (CAT-TESTHUB-V2-SPRINT-RELEASE-20260706-001).
 *
 * Self-contained "Generate test cases" entry point for host surfaces outside
 * the repository (Sprint detail, Release detail). Opens the canonical
 * AIGenerateTestCasesDialog and persists accepted output as DRAFT cases
 * (origin ai) into the active TestHub project — same contract as the
 * repository page: AI output is never executable until a human publishes.
 */
import React, { useCallback, useState } from 'react';
import { CatyIconCTA } from '@/components/ui/CatyIconCTA';
import { catalystToast } from '@/lib/catalystToast';
import { AIGenerateTestCasesDialog } from '@/components/testhub/AIGenerateTestCasesDialog';
import type { GeneratedTestCase } from '@/hooks/test-management/useAIGeneration';
import { useTestHubProject } from '@/hooks/test-management/useTestHubProject';
import { useCreateTestCase } from '@/hooks/test-management/useTestCases';

export function GenerateTestCasesCTA({ label = 'Generate test cases' }: { label?: string }) {
  const [open, setOpen] = useState(false);
  const { projectId } = useTestHubProject();
  const createCase = useCreateTestCase();

  const handleGenerated = useCallback((generated: GeneratedTestCase[]) => {
    if (!projectId) {
      catalystToast.error('No TestHub project available.');
      return;
    }
    Promise.all(
      generated.map((tc) =>
        createCase.mutateAsync({
          project_id: projectId,
          title: tc.title,
          objective: tc.summary,
          preconditions: tc.preconditions?.join('\n'),
          status: 'DRAFT',
          is_ai_generated: true,
          steps: tc.steps.map((step) => ({
            action: step.action,
            expected_result: step.expectedResult,
            test_data: step.testData,
          })),
        } as never),
      ),
    )
      .then((rows) => {
        catalystToast.success(`${rows.length} draft case${rows.length === 1 ? '' : 's'} saved to the repository`);
      })
      .catch((e: Error) => catalystToast.error('Failed to save drafts', e.message));
  }, [projectId, createCase]);

  return (
    <>
      <CatyIconCTA tooltip={label} onClick={() => setOpen(true)} />
      <AIGenerateTestCasesDialog
        open={open}
        onOpenChange={setOpen}
        projectId={projectId}
        onTestCasesGenerated={handleGenerated}
      />
    </>
  );
}
