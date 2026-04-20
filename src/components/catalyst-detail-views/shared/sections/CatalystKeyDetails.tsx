/**
 * CANONICAL — "Key details" section for all CatalystView* components.
 * Change here → updates all work item types.
 *
 * 2026-04-20 (Jira parity audit, Drawer Phase 5):
 *   Measured against digital-transformation.atlassian.net work items
 *   (BAU-5538, BAU-5364). Jira renders a collapsible "Key details"
 *   block between the quick-actions row and the Description. It hosts
 *   the two fields that used to live on the right sidebar:
 *     - Parent (with type icon + issue key + summary, clickable)
 *     - Priority (with icon + label, editable)
 *   Typography and spacing match the right-sidebar Details section
 *   (14/500/#505258 labels with space.250 / 20px gap).
 *
 *   The section is rendered by each CatalystView* left-content slot,
 *   not by CatalystViewBase, so types that don't yet have a parent
 *   concept (e.g. epic's Business-Request parent is rendered via the
 *   legacy ParentAndLabels block) can opt out by simply not mounting
 *   this section. Future step: unify ParentAndLabels into this.
 */
import React, { useState } from 'react';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';
import Heading from '@atlaskit/heading';
import { Inline } from '@atlaskit/primitives';
import { EditablePriority } from '@/modules/project-work-hub/components/dialogs/story-detail-modules/EditableFields';
import { useQueryClient } from '@tanstack/react-query';
import type { PhIssue } from '../types';
import { CatalystParentLinker } from './CatalystParentLinker';
import type { CatalystItemType } from '../types';

/* FieldRow — identical to the sidebar's FieldRow atom so rows line up
   visually in both columns. 14/500/#505258 label, 96px min label width,
   20px gap, 11px vertical padding.
   Exported so every CatalystView* can build type-specific FieldRows and
   pass them through `extraRows` — this keeps bug / incident / task
   detail views rendering with identical typography and spacing without
   each one re-implementing the label + value layout. */
export function KeyDetailsFieldRow({
  label,
  alignBlock = 'center',
  children,
}: {
  label: string;
  alignBlock?: 'start' | 'center';
  children: React.ReactNode;
}) {
  return (
    <div style={{ padding: '6px 0' }}>
      <Inline space="space.250" alignBlock={alignBlock}>
        <span style={{
          fontSize: 14, fontWeight: 500, lineHeight: '18.67px', color: '#505258',
          minWidth: 96, flexShrink: 0,
        }}>{label}</span>
        <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      </Inline>
    </div>
  );
}
// Keep the internal alias so existing code inside this file doesn't need
// a rename sweep; new call sites should import `KeyDetailsFieldRow`.
const FieldRow = KeyDetailsFieldRow;

interface CatalystKeyDetailsProps {
  issue: PhIssue | null;
  itemId: string;
  itemType: CatalystItemType;
  projectKey?: string;
  onOpenItem?: (key: string) => void;
  /** If false, the Parent row is not rendered (for types that use
   *  ParentAndLabels at a higher level, like Epic). Default true. */
  showParent?: boolean;
  /** Start collapsed (default: false). */
  defaultCollapsed?: boolean;
  /** Type-specific extra rows. Rendered after Parent + Priority inside
   *  the collapsible body. Use `KeyDetailsFieldRow` from this module to
   *  guarantee typography + spacing parity.
   *  Defects add: Severity, Found in build, Fix in build, Root Cause,
   *  Resolution. Incidents add: Severity, Impacted services, MTTR. */
  extraRows?: React.ReactNode;
}

export function CatalystKeyDetails({
  issue, itemId, itemType, projectKey, onOpenItem,
  showParent = true,
  defaultCollapsed = false,
  extraRows,
}: CatalystKeyDetailsProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const queryClient = useQueryClient();

  const invalidateIssue = () =>
    queryClient.invalidateQueries({ queryKey: ['cv-issue-detail', itemId] });

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Section header — mirrors CatalystDescriptionSection's header
          typography/chevron for visual consistency. */}
      <div
        onClick={() => setCollapsed(!collapsed)}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          marginBottom: collapsed ? 0 : 4, cursor: 'pointer', userSelect: 'none',
        }}
      >
        {/* @atlaskit/icon canonical chevron (Jira-parity stroke weight).
            The icon is rotated via CSS transform to toggle between
            collapsed (→) and expanded (↓) states; single asset avoids a
            mount flash when toggling. */}
        <span
          style={{
            display: 'inline-flex',
            transition: 'transform 0.15s ease',
            transform: collapsed ? 'rotate(0deg)' : 'rotate(90deg)',
          }}
        >
          <ChevronRightIcon label="" primaryColor="#5E6C84" size="small" />
        </span>
        <Heading size="small">Key details</Heading>
      </div>

      {!collapsed && (
        <div style={{ paddingLeft: 20 }}>
          {showParent && (
            <FieldRow label="Parent" alignBlock="center">
              {issue && (
                <CatalystParentLinker
                  issue={issue}
                  itemId={itemId}
                  itemType={itemType}
                  projectKey={projectKey}
                  onOpenItem={onOpenItem}
                />
              )}
            </FieldRow>
          )}

          <FieldRow label="Priority" alignBlock="center">
            {issue && (
              <EditablePriority
                issueId={issue.id}
                currentPriority={issue.priority}
                onUpdate={invalidateIssue}
              />
            )}
          </FieldRow>

          {/* Type-specific rows — defect / incident / etc. slot in here
              so they pick up the canonical FieldRow typography and the
              exact 96px label column used by Parent + Priority. */}
          {extraRows}
        </div>
      )}
    </div>
  );
}
