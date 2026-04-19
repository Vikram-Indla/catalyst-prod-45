/**
 * CANONICAL — Editable title for all CatalystView* components.
 * Change here → updates all 7 work item types.
 *
 * Phase C (2026-04-18): migrated from a hand-rolled contentEditable h1 to
 * @atlaskit/inline-edit wrapping @atlaskit/heading (read view) and
 * @atlaskit/textfield (edit view). Benefits:
 *   - Keyboard semantics come from Atlaskit (Enter to save, Esc to cancel).
 *   - Screen readers announce "Edit Issue title" on hover + focus.
 *   - Heading renders a semantic <h1> with typography driven by
 *     @atlaskit/tokens (size="medium" → 20px). Weight / line-height
 *     inherited from the design system rather than hand-tuned.
 *   - No more contentEditable reconciliation quirks (the `key` remount
 *     hack that previously forced a fresh mount on async load is no
 *     longer needed — InlineEdit's `defaultValue` handles it).
 */
import React from 'react';
import InlineEdit from '@atlaskit/inline-edit';
import Textfield from '@atlaskit/textfield';
import Heading from '@atlaskit/heading';
import { IssueIcon } from '@/modules/project-work-hub/components/dialogs/story-detail-modules/shared-components';
import type { PhIssue } from '../types';

/* Visually hide Atlaskit InlineEdit's "Issue title" field-label above the
   H1. The label is still required (a11y), so we keep it in the DOM but
   clip it off-screen via the standard visually-hidden pattern. Injected
   once; scoped via the `cv-title-edit-hide-label` wrapper class so no
   other InlineEdit instances are affected.
   Rationale (design critique, 2026-04-19): the visible "Issue title"
   microlabel reads as a field-label and demotes the H1 to a field-value,
   flipping the page hierarchy — no peer issue tracker does this.

   Jira-measured title typography (HANDOVER spec, Drawer Phase 3,
   2026-04-19): 20px / font-weight 653 / line-height 1.4 / #292A2E /
   Atlassian Sans. Atlaskit Heading size="medium" renders at 20px
   natively; the scoped overrides below lock the weight/color/family
   to the measured values. We target the wrapper class so other
   InlineEdit instances keep their defaults.

   Prior state (kept for traceability): 24/500/#172B4D with -0.01em
   tracking. Superseded by the Jira-measured spec in HANDOVER.md. */
const CV_TITLE_STYLE_ID = 'cv-title-edit-style';
if (typeof document !== 'undefined' && !document.getElementById(CV_TITLE_STYLE_ID)) {
  const s = document.createElement('style');
  s.id = CV_TITLE_STYLE_ID;
  s.textContent = `
    .cv-title-edit-hide-label label {
      position: absolute !important;
      width: 1px !important; height: 1px !important;
      padding: 0 !important; margin: -1px !important;
      overflow: hidden !important; clip: rect(0, 0, 0, 0) !important;
      white-space: nowrap !important; border: 0 !important;
    }
    /* Jira-measured title typography — HANDOVER Drawer Phase 3 spec. */
    .cv-title-edit-hide-label h1 {
      font-size: 20px !important;
      font-weight: 653 !important;
      line-height: 1.4 !important;
      color: #292A2E !important;
      font-family: "Atlassian Sans", ui-sans-serif, -apple-system, "system-ui", sans-serif !important;
      margin: 0 !important;
    }
    /* Match edit-view textfield to the display h1 so swap-in is seamless. */
    .cv-title-edit-hide-label input[type="text"] {
      font-size: 20px !important;
      font-weight: 653 !important;
      line-height: 1.4 !important;
      color: #292A2E !important;
      font-family: "Atlassian Sans", ui-sans-serif, -apple-system, "system-ui", sans-serif !important;
    }
  `;
  document.head.appendChild(s);
}

interface CatalystTitleEditorProps {
  issue: PhIssue | null;
  onTitleChange: (newTitle: string) => void;
}

export function CatalystTitleEditor({ issue, onTitleChange }: CatalystTitleEditorProps) {
  const summary = issue?.summary ?? '';

  return (
    <div className="cv-title-edit-hide-label" style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 12 }}>
      {issue?.issue_type && (
        <div style={{ marginTop: 6, flexShrink: 0 }}>
          <IssueIcon type={issue.issue_type} size={20} />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* key={issue.id} remounts InlineEdit when the user navigates to a
            different item so defaultValue picks up the new summary. */}
        <InlineEdit<string>
          key={issue?.id ?? 'empty'}
          defaultValue={summary}
          label="Issue title"
          readView={() => (
            // size="medium" → 20px natively (matches HANDOVER Phase 3 spec).
            // Scoped CSS above locks the weight/color/family to the Jira-
            // measured values (653 / #292A2E / Atlassian Sans).
            <Heading size="medium" as="h1">
              {summary || '—'}
            </Heading>
          )}
          editView={(fieldProps) => <Textfield {...fieldProps} autoFocus />}
          onConfirm={(value) => {
            const trimmed = value.trim();
            if (trimmed && trimmed !== summary) {
              onTitleChange(trimmed);
            }
          }}
          hideActionButtons
          readViewFitContainerWidth
        />
      </div>
    </div>
  );
}
