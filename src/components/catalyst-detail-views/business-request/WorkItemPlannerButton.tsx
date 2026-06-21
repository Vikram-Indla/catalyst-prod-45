/**
 * WorkItemPlannerButton — entry point for the full BR→Epic→Story→Subtask wizard.
 *
 * Lives in the BR detail view's improveDropdown slot alongside GenerateEpicsButton.
 * Shows project picker first, then hands off to WorkItemPlannerModal.
 */
import React, { useState, useCallback } from 'react';
import { CatyButton } from '@/components/ui/CatyButton';
import { ProjectPickerModal } from './ProjectPickerModal';
import { WorkItemPlannerModal } from '../shared/WorkItemPlannerModal';
import type { PickedProject } from './useEpicGeneration';

interface IssueRef {
  id: string;
  issue_key: string | null;
  summary: string | null;
  description_text: string | null;
}

interface WorkItemPlannerButtonProps {
  issue: IssueRef | null;
}

type ButtonState = 'idle' | 'picking_project' | 'planning';

export function WorkItemPlannerButton({ issue }: WorkItemPlannerButtonProps) {
  const [state, setState] = useState<ButtonState>('idle');
  const [pickedProject, setPickedProject] = useState<PickedProject | null>(null);

  const handleClick = useCallback(() => {
    if (!issue) return;
    setState('picking_project');
  }, [issue]);

  const handleProjectConfirmed = useCallback((project: PickedProject) => {
    setPickedProject(project);
    setState('planning');
  }, []);

  const handleClose = useCallback(() => {
    setState('idle');
    setPickedProject(null);
  }, []);

  if (!issue || issue.issue_key === null) return null;

  return (
    <>
      <CatyButton
        label="Plan Work Items"
        onClick={handleClick}
        loading={false}
        disabled={false}
      />

      <ProjectPickerModal
        isOpen={state === 'picking_project'}
        onClose={handleClose}
        brTitle={issue.summary ?? null}
        onConfirm={handleProjectConfirmed}
      />

      {state === 'planning' && pickedProject && (
        <WorkItemPlannerModal
          brId={issue.id}
          brTitle={issue.summary ?? ''}
          brDescriptionText={issue.description_text ?? null}
          projectKey={pickedProject.projectKey}
          projectId={pickedProject.projectId}
          projectName={pickedProject.projectName}
          onClose={handleClose}
        />
      )}
    </>
  );
}
