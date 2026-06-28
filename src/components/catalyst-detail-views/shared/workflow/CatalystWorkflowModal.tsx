import React, { useMemo } from 'react';
import Modal, { ModalHeader, ModalTitle, ModalFooter, ModalBody } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import { useNavigate } from 'react-router-dom';
import { useDefaultProject } from '@/hooks/useProjects';
import { useTypeWorkflow } from '@/hooks/useTypeWorkflow';
import type { WorkItemType } from '@/hooks/useTypeWorkflow';
import { JiraStatusLozenge } from '@/components/workflow/JiraStatusLozenge';
import type { StatusCategory } from '@/lib/workflows/types';
import { CatalystWorkflowBuilder } from '@/pages/admin/workflows/CatalystWorkflowBuilder';

// Map Tier-2 DB category → Tier-1 lozenge StatusCategory
const DB_TO_LOZENGE: Record<string, StatusCategory> = {
  todo:        'default',
  in_progress: 'inprogress',
  done:        'success',
};
function dbCatToLozenge(cat: string): StatusCategory {
  return DB_TO_LOZENGE[cat] ?? 'default';
}

export interface CatalystWorkflowModalProps {
  issueTypeName: WorkItemType | string;
  /** DB UUID of current status — preferred */
  currentStatusId?: string;
  /** Name of current status — used when UUID unknown; matched case-insensitively */
  currentStatusName?: string;
  onClose: () => void;
}

export function CatalystWorkflowModal({
  issueTypeName,
  currentStatusId,
  currentStatusName,
  onClose,
}: CatalystWorkflowModalProps) {
  const navigate = useNavigate();

  const { data: defaultProject } = useDefaultProject();
  const projectKey = defaultProject?.key ?? 'BAU';

  const { data: typeWorkflow } = useTypeWorkflow(projectKey, issueTypeName);

  const title = `${issueTypeName} Workflow`;

  // Resolve current status — prefer UUID, fall back to name match
  const resolvedCurrentStatusId = useMemo(() => {
    if (currentStatusId) return currentStatusId;
    if (!currentStatusName || !typeWorkflow) return undefined;
    return typeWorkflow.statuses.find(
      (s) => s.name.toLowerCase() === currentStatusName.toLowerCase(),
    )?.id;
  }, [currentStatusId, currentStatusName, typeWorkflow]);

  const currentStatus = useMemo(() => {
    if (!resolvedCurrentStatusId || !typeWorkflow) return undefined;
    return typeWorkflow.statuses.find((s) => s.id === resolvedCurrentStatusId);
  }, [resolvedCurrentStatusId, typeWorkflow]);

  // Compute "can move to" targets from current status
  const moveToStatuses = useMemo(() => {
    if (!typeWorkflow) return [];
    const { statuses, transitions } = typeWorkflow;
    const statusMap = new Map(statuses.map((s) => [s.id, s]));

    const reachable = new Set<string>();

    for (const t of transitions) {
      if (t.from_status_id === resolvedCurrentStatusId) {
        reachable.add(t.to_status_id);
      }
      if (t.from_status_id === null) {
        reachable.add(t.to_status_id);
      }
    }

    reachable.delete(resolvedCurrentStatusId ?? '');

    return [...reachable]
      .map((id) => statusMap.get(id))
      .filter((s): s is NonNullable<typeof s> => Boolean(s));
  }, [typeWorkflow, resolvedCurrentStatusId]);

  return (
    <Modal onClose={onClose} width="large">
      <ModalHeader>
        <ModalTitle>{title}</ModalTitle>
      </ModalHeader>

      <ModalBody>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Current status + can-move-to badges */}
          {(currentStatus || moveToStatuses.length > 0) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
              {currentStatus && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 500, color: 'var(--ds-text-subtle)' }}>
                    Current
                  </span>
                  <JiraStatusLozenge
                    category={dbCatToLozenge(currentStatus.category)}
                    name={currentStatus.name}
                    variant="bold"
                  />
                </div>
              )}
              {moveToStatuses.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 500, color: 'var(--ds-text-subtle)' }}>
                    Can move to
                  </span>
                  {moveToStatuses.map((s) => (
                    <JiraStatusLozenge
                      key={s.id}
                      category={dbCatToLozenge(s.category)}
                      name={s.name}
                      variant="subtle"
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* React Flow workflow canvas — readonly, current status highlighted */}
          <div style={{ height: 400, borderRadius: 6, overflow: 'hidden', display: 'flex' }}>
            <CatalystWorkflowBuilder
              projectKey={projectKey}
              workItemType={issueTypeName as WorkItemType}
              readonly
              currentStatusId={resolvedCurrentStatusId}
            />
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <Button
            appearance="subtle"
            onClick={() => {
              onClose();
              navigate('/admin/workflows');
            }}
          >
            Edit Workflow
          </Button>
          <Button appearance="primary" onClick={onClose}>
            Close
          </Button>
        </div>
      </ModalFooter>
    </Modal>
  );
}
