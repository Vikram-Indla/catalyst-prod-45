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
 *   not by CatalystViewBase, so types that don't need a parent concept
 *   can opt out by simply not mounting this section. As of 2026-05-05
 *   this is the canonical path for ALL types including Epic — the legacy
 *   ParentAndLabels block has been removed.
 */
import React, { useState } from 'react';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';
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
  /** If false, the Parent row is not rendered (e.g. Defect suppresses
   *  the Key-details Parent row deliberately, leaving the breadcrumb as
   *  the only Parent surface). Default true. */
  showParent?: boolean;
  /** If false, Priority is NOT rendered by core — the consumer must
   *  inject a Priority row inside `extraRows` to control its position
   *  (Jira-parity for defects: Parent → Severity → Priority instead of
   *  Parent → Priority → Severity). Default true (legacy behaviour).
   *  Added 2026-04-28 (jira-compare cycle 2 — Phase B B5). */
  showPriority?: boolean;
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
  showPriority = true,
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
            transition: collapsed
              ? 'transform 150ms cubic-bezier(0.4,0,1,1)'   /* ADS collapse: ease-in */
              : 'transform 200ms cubic-bezier(0.2,0,0,1)',  /* ADS expand: ease-out */
            transform: collapsed ? 'rotate(0deg)' : 'rotate(90deg)',
          }}
        >
          <ChevronRightIcon label="" primaryColor="#5E6C84" size="small" />
        </span>
        {/* jira-compare 2026-05-08: Atlaskit Heading size="small" = 16px/653 —
            K.11 section header spec = 14px/600/#172B4D. Use inline h2. */}
        <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, lineHeight: '20px', color: 'var(--ds-text, #172B4D)' }}>Key details</h2>
      </div>

      <div style={{ overflow: 'hidden', maxHeight: collapsed ? 0 : 800, transition: 'max-height 0.15s ease' }}>
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

          {showPriority && (
            <FieldRow label="Priority" alignBlock="center">
              {issue && (
                <EditablePriority
                  issueId={issue.id}
                  currentPriority={issue.priority}
                  onUpdate={invalidateIssue}
                />
              )}
            </FieldRow>
          )}

          {/* Type-specific rows — defect / incident / etc. slot in here
              so they pick up the canonical FieldRow typography and the
              exact 96px label column used by Parent + Priority. */}
          {extraRows}
        </div>
      </div>
    </div>
  );
}
