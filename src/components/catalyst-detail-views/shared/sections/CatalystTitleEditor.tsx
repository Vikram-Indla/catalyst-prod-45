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
// IssueIcon import removed Apr 27, 2026 (L55) — see comment above the
// return block for why the duplicate icon prefix was dropped.
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
    /* Jira-measured title typography — re-measured from BAU-5538 on
       2026-04-20 directly off Atlaskit's h1
       (data-testid="issue.views.issue-base.foundation.summary.heading").
       Live Jira emits 24px / 653 weight / 28px line-height / #292A2E /
       Atlassian Sans. Previous spec (20/1.4) came from a smaller
       surface in the earlier screenshot batch — superseded. */
    .cv-title-edit-hide-label h1 {
      font-size: 24px !important;
      font-weight: 653 !important;
      line-height: 28px !important;
      color: #292A2E !important;
      font-family: "Atlassian Sans", ui-sans-serif, -apple-system, "system-ui", sans-serif !important;
      margin: 0 !important;
      letter-spacing: normal !important;
    }
    /* Match edit-view textfield to the display h1 so swap-in is seamless. */
    .cv-title-edit-hide-label input[type="text"] {
      font-size: 24px !important;
      font-weight: 653 !important;
      line-height: 28px !important;
      color: #292A2E !important;
      font-family: "Atlassian Sans", ui-sans-serif, -apple-system, "system-ui", sans-serif !important;
      letter-spacing: normal !important;
    }
  `;
  document.head.appendChild(s);
}

interface CatalystTitleEditorProps {
  issue: PhIssue | null;
  onTitleChange: (newTitle: string) => void;
}

export function CatalystTitleEditor({ issue, onTitleChange }: CatalystTitleEditorProps) {
  const summary = (issue?.summary ?? '').trim(); // jira-compare E-7 (2026-04-28): trim trailing whitespace

  return (
    // Apr 27, 2026 (L55): dropped the duplicate <IssueIcon> prefix that
    // rendered before the H1. Jira's rail shows ONE icon — next to the
    // issue key in the breadcrumb row (`[icon] BAU-5658`). The H1 below
    // is plain text. Catalyst was rendering the icon TWICE (once in the
    // breadcrumb, once before the H1). Probed live on BAU-5658:
    // `<img alt="QA Bug">` at x=794 sat right of the H1 at x=824 — same
    // baseline, looked like an icon prefix. Removing it matches Jira
    // and reduces visual noise. The icon stays in the breadcrumb row
    // (rendered by the parent component), so issue type is still clear.
    // Apr 28, 2026 (jira-compare cycle 5 — Phase B B9): title sticks
    //   to the top of the panel's scrolling left column. The status
    //   pill rendered immediately below by CatalystStatusPill carries
    //   `top: 32px` so the two stack as a unified sticky header that
    //   stays visible as the user scrolls description / activity. The
    //   left column (cv-drawer-left) is the scroll container per
    //   CatalystViewBase.tsx — `position: sticky` works because that
    //   ancestor has `overflow-y: auto`.
    <div
      className="cv-title-edit-hide-label"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        marginBottom: 12,
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: '#FFFFFF',
        paddingTop: 4,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* key={issue.id} remounts InlineEdit when the user navigates to a
            different item so defaultValue picks up the new summary. */}
        <InlineEdit<string>
          key={issue?.id ?? 'empty'}
          defaultValue={summary}
          label="Issue title"
          readView={() => (
            // size="large" → 24px/28px natively — matches BAU-5538 Jira
            // measurement (2026-04-20). Scoped CSS above locks weight/
            // color/family to the Jira-measured values (653/#292A2E/
            // Atlassian Sans).
            <Heading size="large" as="h1">
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
