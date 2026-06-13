import React, { useState, useMemo } from 'react';
import Modal, { ModalHeader, ModalTitle, ModalFooter, ModalBody } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import Spinner from '@atlaskit/spinner';
import { useNavigate } from 'react-router-dom';
import { useDefaultProject } from '@/hooks/useProjects';
import { useTypeWorkflow } from '@/hooks/useTypeWorkflow';
import type { WorkItemType } from '@/hooks/useTypeWorkflow';
import { useWorkflow } from '@/lib/workflows/WorkflowProvider';
import { JiraStatusLozenge } from '@/components/workflow/JiraStatusLozenge';
import type { StatusCategory } from '@/lib/workflows/types';
import { CatalystWorkflowDiagram } from './CatalystWorkflowDiagram';

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

  const { data: typeWorkflow, isLoading } = useTypeWorkflow(projectKey, issueTypeName);

  // Tier-1 name only
  const tier1Workflow = useWorkflow(issueTypeName);
  const workflowName = tier1Workflow?.name ?? '';

  const [zoom, setZoom] = useState(100);

  // Build title — dedup guard: skip prefix when name equals type
  const title = useMemo(() => {
    if (!workflowName || workflowName === issueTypeName) {
      return `${issueTypeName} Workflow`;
    }
    return `${workflowName} ${issueTypeName} Workflow`;
  }, [workflowName, issueTypeName]);

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
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <Spinner size="large" />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Current status */}
            {currentStatus && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: 'var(--ds-text-subtle, #42526E)',
                  }}
                >
                  Current status
                </span>
                <JiraStatusLozenge
                  category={dbCatToLozenge(currentStatus.category)}
                  name={currentStatus.name}
                  variant="bold"
                />
              </div>
            )}

            {/* Move-to pills */}
            {moveToStatuses.length > 0 && (
              <div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: 'var(--ds-text-subtle, #42526E)',
                    marginBottom: 8,
                  }}
                >
                  This work item can be moved to
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {moveToStatuses.map((s) => (
                    <JiraStatusLozenge
                      key={s.id}
                      category={dbCatToLozenge(s.category)}
                      name={s.name}
                      variant="subtle"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Zoom control */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                borderTop: '1px solid var(--ds-border, #DFE1E6)',
                paddingTop: 12,
                justifyContent: 'flex-end',
              }}
            >
              <span style={{ fontSize: 12, color: 'var(--ds-text-subtle, #42526E)' }}>
                Zoom
              </span>
              <input
                type="range"
                min={50}
                max={150}
                step={10}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                style={{ width: 96, accentColor: 'var(--ds-link, #0052CC)' }}
              />
              <span style={{ fontSize: 12, color: 'var(--ds-text-subtle, #42526E)', minWidth: 32 }}>
                {zoom}%
              </span>
            </div>

            {/* DAG diagram */}
            <div
              style={{
                border: '1px solid var(--ds-border, #DFE1E6)',
                borderRadius: 4,
                background: 'var(--ds-surface-sunken, #F7F8F9)',
                minHeight: 240,
                overflow: 'hidden',
              }}
            >
              {typeWorkflow && (
                <CatalystWorkflowDiagram
                  statuses={typeWorkflow.statuses}
                  transitions={typeWorkflow.transitions}
                  initialStatusId={typeWorkflow.initialStatusId}
                  currentStatusId={resolvedCurrentStatusId}
                  showTransitionLabels={false}
                  zoom={zoom}
                />
              )}
            </div>
          </div>
        )}
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
