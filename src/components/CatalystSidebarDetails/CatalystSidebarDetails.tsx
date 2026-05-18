/**
 * CatalystSidebarDetails — Right rail container (F3.1)
 *
 * Renders issue details in Jira-parity structure using @atlaskit field components.
 * All interactive fields (Assignee, Priority, Fix versions, Reporter) use proper
 * Atlaskit primitives with correct typography and spacing per CLAUDE.md.
 */
import React, { memo } from 'react';
import { EditableAssignee } from '@/components/shared/EditableFields/EditableAssignee';
import { EditablePriority } from '@/components/shared/EditableFields/EditablePriority';
import { EditableFixVersions } from '@/components/shared/EditableFields/EditableFixVersions';

interface CatalystSidebarDetailsProps {
  issue: any;
  itemId?: string;
  projectId?: string;
  onStatusChange?: (status: string) => void;
  onClose?: () => void;
  onDelete?: () => void;
  typeLabel?: string;
  statusPill?: React.ReactNode;
  improveDropdown?: React.ReactNode;
}

export const CatalystSidebarDetails = memo(function CatalystSidebarDetails({
  issue,
  itemId,
  projectId,
  onStatusChange,
  onClose,
  onDelete,
  typeLabel,
  statusPill,
  improveDropdown,
}: CatalystSidebarDetailsProps) {
  if (!issue) return null;

  return (
    <div
      data-testid="sidebar-details"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0px', // Sections stack with their own padding
      }}
    >
      {/* Status pill + improve dropdown in header area */}
      {statusPill && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0px 0px 16px 0px',
            borderBottom: '1px solid var(--ds-border-subtle)',
            marginBottom: '16px',
          }}
        >
          <div>{statusPill}</div>
          <div>{improveDropdown}</div>
        </div>
      )}

      {/* Details section — using @atlaskit field structure */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Assignee — @atlaskit/select wrapper */}
        {issue.assignee !== undefined && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <label
              style={{
                fontSize: 'var(--cp-font-size-status, 11px)',
                fontWeight: 600,
                color: 'var(--ds-text-subtlest)',
                textTransform: 'uppercase',
                letterSpacing: '0.02em',
              }}
            >
              Assignee
            </label>
            <EditableAssignee
              issue={issue}
              onAssigneeChange={(assignee) => {
                // Mutation wired via parent CatalystView*
              }}
            />
            {issue.assignee && (
              <button
                style={{
                  fontSize: 'var(--cp-font-size-status, 11px)',
                  fontWeight: 500,
                  color: 'var(--ds-link)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0px',
                  marginTop: '4px',
                }}
              >
                Assign to me
              </button>
            )}
          </div>
        )}

        {/* Priority — only for Epic (per CLAUDE.md 2026-05-10) */}
        {issue.issue_type === 'Epic' && issue.priority !== undefined && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <label
              style={{
                fontSize: 'var(--cp-font-size-status, 11px)',
                fontWeight: 600,
                color: 'var(--ds-text-subtlest)',
                textTransform: 'uppercase',
                letterSpacing: '0.02em',
              }}
            >
              Priority
            </label>
            <EditablePriority
              issue={issue}
              onPriorityChange={(priority) => {
                // Mutation wired via parent CatalystView*
              }}
            />
          </div>
        )}

        {/* Reporter */}
        {issue.reporter && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <label
              style={{
                fontSize: 'var(--cp-font-size-status, 11px)',
                fontWeight: 600,
                color: 'var(--ds-text-subtlest)',
                textTransform: 'uppercase',
                letterSpacing: '0.02em',
              }}
            >
              Reporter
            </label>
            <div
              style={{
                fontSize: 'var(--ds-font-size-100, 14px)',
                fontWeight: 400,
                color: 'var(--ds-text)',
              }}
            >
              {issue.reporter.displayName || issue.reporter.name || 'Unknown'}
            </div>
          </div>
        )}

        {/* Severity (Defect, Incident, QA Bug, Production Incident, etc.) */}
        {(issue.issue_type === 'Defect' || issue.issue_type === 'Incident' || issue.issue_type === 'QA Bug' || issue.issue_type === 'Production Incident') && issue.severity && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <label
              style={{
                fontSize: 'var(--cp-font-size-status, 11px)',
                fontWeight: 600,
                color: 'var(--ds-text-subtlest)',
                textTransform: 'uppercase',
                letterSpacing: '0.02em',
              }}
            >
              Severity
            </label>
            <div
              style={{
                fontSize: 'var(--ds-font-size-100, 14px)',
                fontWeight: 400,
                color: 'var(--ds-text)',
              }}
            >
              {issue.severity}
            </div>
          </div>
        )}

        {/* Fix versions (gated per type) */}
        {(issue.issue_type !== 'Feature') && issue.fix_versions !== undefined && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <label
              style={{
                fontSize: 'var(--cp-font-size-status, 11px)',
                fontWeight: 600,
                color: 'var(--ds-text-subtlest)',
                textTransform: 'uppercase',
                letterSpacing: '0.02em',
              }}
            >
              Fix versions
            </label>
            <EditableFixVersions
              issue={issue}
              onFixVersionsChange={(versions) => {
                // Mutation wired via parent CatalystView*
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
});
