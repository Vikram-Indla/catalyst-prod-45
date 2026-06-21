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
import ChevronRightIcon from '@atlaskit/icon/utility/chevron-right';
import ChevronDownIcon from '@atlaskit/icon/utility/chevron-down';
import Tooltip from '@atlaskit/tooltip';
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
  /* 2026-06-17: uniform hover background on every Key details VALUE cell
     (Parent / Priority / Severity / Workstream / Due date / etc.). The
     wrapper owns the hover bg via data-cv-keydetails-value. Inner editor
     atoms (EditablePriority, EditableAssignee, etc.) already render
     their own hover bg via global `.cv-*-select__control:hover` CSS —
     that's suppressed inside this wrapper (rule injected below) so we
     get exactly ONE background, not two stacked. */
  const [hovered, setHovered] = React.useState(false);
  return (
    <div style={{ padding: '6px 0' }}>
      <Inline space="space.250" alignBlock={alignBlock}>
        <span style={{
          fontSize: 14, fontWeight: 500, lineHeight: '20px', color: 'var(--ds-text-subtle, #505258)',
          minWidth: 120, flexShrink: 0,
        }}>{label}</span>
        <div
          data-cv-keydetails-value="true"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            flex: 1,
            minWidth: 0,
            padding: '4px 6px',
            margin: '-4px -6px',
            borderRadius: 3,
            background: hovered
              ? 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))'
              : 'transparent',
            transition: 'background 80ms ease',
          }}
        >
          {children}
        </div>
      </Inline>
    </div>
  );
}

/* 2026-06-17: suppress inner hover backgrounds on editor atoms whenever
   they're mounted inside a Key details value cell. Without this, the
   atom's own `.cv-*-select__control:hover` rule (EditableFields.tsx) +
   the wrapper bg both fire → two stacked backgrounds. Higher specificity
   via the data-attr parent selector. */
const KEY_DETAILS_HOVER_BG_RESET_ID = 'cv-keydetails-hover-bg-reset';
if (typeof document !== 'undefined' && !document.getElementById(KEY_DETAILS_HOVER_BG_RESET_ID)) {
  const style = document.createElement('style');
  style.id = KEY_DETAILS_HOVER_BG_RESET_ID;
  /* Nuke EVERY inner hover bg inside Key details value cells. Wrapper
     owns the single hover bg. Covers: react-select controls (atoms),
     hand-rolled buttons (CatalystParentLinker SidebarAddTrigger),
     EditablePriority chips, CatalystSeverityField, hover-bg divs, etc. */
  style.textContent = `
    [data-cv-keydetails-value="true"] [class*="-select__control"],
    [data-cv-keydetails-value="true"] [class*="-select__control"]:hover,
    [data-cv-keydetails-value="true"] button,
    [data-cv-keydetails-value="true"] button:hover {
      background: transparent !important;
    }
  `;
  document.head.appendChild(style);
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
  /** Optional slot rendered INSIDE the collapsible body, after extraRows.
   *  Detail views pass the canonical Description here so its visibility
   *  is coupled to Key details' collapsed state (2026-06-21). The slot
   *  resets the 20px left padding inherited from the Key-details body
   *  so the Description renders flush-left like before. */
  afterBody?: React.ReactNode;
  /**
   * 2026-06-17 — adapter for non-ph_issues data sources (tasks hub).
   * When `onPriorityChange` is set, EditablePriority's internal
   * ph_issues mutation is bypassed and the override owns the write.
   * Mirrors the same pattern added to CatalystSidebarDetails.
   */
  dataSource?: {
    onPriorityChange?: (value: string | null) => Promise<void> | void;
    /**
     * Override priority option list. Tasks Hub uses a 4-level scale
     * (Critical/High/Medium/Low) instead of the canonical 5-level Jira
     * scale (Highest/High/Medium/Low/Lowest). When omitted, the default
     * PRIORITY_LIST inside EditablePriority is used.
     */
    priorityOptions?: string[];
  };
}

export function CatalystKeyDetails({
  issue, itemId, itemType, projectKey, onOpenItem,
  showParent = true,
  showPriority = true,
  defaultCollapsed = false,
  extraRows,
  afterBody,
  dataSource,
}: CatalystKeyDetailsProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const queryClient = useQueryClient();

  const invalidateIssue = () =>
    queryClient.invalidateQueries({ queryKey: ['cv-issue-detail', itemId] });

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Section header — matches canonical Subtasks + Linked + Attachments
          pattern: 24x24 chevron button (only click target) with rounded
          hover bg + Tooltip "Collapse"/"Expand". Title h2 outside button.
          Utility chevron (thin stroke, ADS v4). */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 0, padding: '6px 0',
          marginBottom: collapsed ? 0 : 4, userSelect: 'none',
        }}
      >
        <Tooltip content={collapsed ? 'Expand' : 'Collapse'} position="bottom">
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Expand' : 'Collapse'}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 24, height: 24, marginLeft: -4,
              background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
              color: 'var(--ds-text-subtle, #505258)', borderRadius: 3,
              transition: 'background-color 150ms ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ds-background-neutral-subtle-hovered, rgba(9, 30, 66, 0.06))'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            {collapsed
              ? <ChevronRightIcon label="" color="currentColor" />
              : <ChevronDownIcon label="" color="currentColor" />
            }
          </button>
        </Tooltip>
        <h2
          onClick={() => setCollapsed(!collapsed)}
          style={{ margin: 0, padding: '0 4px', fontSize: 16, fontWeight: 653, lineHeight: '20px', color: 'var(--ds-text, #292A2E)', cursor: 'pointer' }}
        >
          Key details
        </h2>
      </div>

      {/* Collapsible body. maxHeight cap removed 2026-06-21 — Description
          is now rendered via `afterBody` and its content is variable
          height (rich-text, images, code blocks), so a fixed cap would
          clip. Display toggle replaces the height animation. */}
      <div style={{ display: collapsed ? 'none' : 'block' }}>
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
                  onChange={dataSource?.onPriorityChange}
                  options={dataSource?.priorityOptions}
                />
              )}
            </FieldRow>
          )}

          {/* Type-specific rows — defect / incident / etc. slot in here
              so they pick up the canonical FieldRow typography and the
              exact 96px label column used by Parent + Priority. */}
          {extraRows}
        </div>
        {/* afterBody (Description) renders OUTSIDE the 20px paddingLeft
            wrapper so it sits flush-left like a top-level section.
            marginTop separates it from the last Key-details row above
            (2026-06-21 Vikram). */}
        {afterBody && (
          <div style={{ marginTop: 16 }}>{afterBody}</div>
        )}
      </div>
    </div>
  );
}
