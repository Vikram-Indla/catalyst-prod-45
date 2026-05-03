/**
 * ImproveIssueDropdown — the "Improve {issueType}" dropdown that
 * Jira renders below the title on every issue detail surface.
 *
 * Apr 28, 2026 (jira-compare cycle 3 — Phase B B2):
 *   Mirrors the Jira selector
 *   `data-testid="issue-improve-issue-dropdown.improve-issue-dropdown--trigger"`
 *   verbatim. The trigger label changes per issue type ("Improve QA Bug",
 *   "Improve Story", "Improve Epic", …) but the menu shape is invariant —
 *   four items mapped 1:1 to Jira's items minus the Confluence
 *   integration which Catalyst doesn't have:
 *
 *     - Improve description       → ImproveDescriptionDialog
 *     - Summarize comments        → SummarizeCommentsDialog
 *     - Suggest child work items  → SuggestChildIssuesDialog
 *                                   (hidden for Subtask — no grandchildren)
 *     - Link similar work items   → LinkSimilarItemsDialog
 *
 *   Visual: small button + sparkles glyph + "Improve {type}" + chevron,
 *   anchored under the title in each `CatalystView*` `leftContent`
 *   slot. Clicking the trigger opens a popover-style menu rendered
 *   inline (no portal — sidesteps the documented Atlaskit DropdownMenu
 *   portal-empty bug on this surface, CLAUDE.md L1).
 */

import React, { useEffect, useRef, useState } from 'react';
import SparklesIcon from '@atlaskit/icon/core/ai-chat';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import WandIcon from '@atlaskit/icon/core/magic-wand';
import CommentIcon from '@atlaskit/icon/core/comment';
import ListBulletedIcon from '@atlaskit/icon/core/list-bulleted';
import SearchIcon from '@atlaskit/icon/core/search';
import { token } from '@atlaskit/tokens';
import { ImproveDescriptionDialog } from './ImproveDescriptionDialog';
import { SummarizeCommentsDialog } from './SummarizeCommentsDialog';
import { SuggestChildIssuesDialog } from './SuggestChildIssuesDialog';
import { LinkSimilarItemsDialog } from './LinkSimilarItemsDialog';
import { canSuggestChildren, improveTriggerLabel } from './improve-config';

type Mode = 'closed' | 'description' | 'summarize' | 'children' | 'similar';

interface ImproveIssueDropdownProps {
  issue: {
    id?: string;
    issue_key?: string | null;
    issue_type?: string | null;
    summary?: string | null;
    description_text?: string | null;
    acceptance_criteria?: string | null;
    project_key?: string | null;
    project_id?: string | null;
    source?: 'jira' | 'catalyst' | string | null;
  } | null;
  /** Apply an AI-improved description to the issue. */
  onApplyDescription?: (newDescription: string) => void | Promise<void>;
  /** Apply AI-improved acceptance criteria to the issue. */
  onApplyAcceptanceCriteria?: (newAC: string) => void | Promise<void>;
  /** Called once child work items have been created. */
  onChildrenCreated?: (createdKeys: string[]) => void;
  /** Called once at least one similar item has been linked. */
  onLinked?: () => void;
  /** Existing linked keys (so similar-items skips them). */
  existingLinkedKeys?: string[];
}

export function ImproveIssueDropdown({
  issue,
  onApplyDescription,
  onApplyAcceptanceCriteria,
  onChildrenCreated,
  onLinked,
  existingLinkedKeys,
}: ImproveIssueDropdownProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('closed');
  const ref = useRef<HTMLDivElement>(null);

  // Click-outside to dismiss the popover.
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const issueType = issue?.issue_type ?? null;
  const triggerLabel = improveTriggerLabel(issueType);
  const showSuggestChildren = canSuggestChildren(issueType);

  const openMode = (m: Mode) => {
    setOpen(false);
    setMode(m);
  };

  const triggerStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    height: 30,
    padding: '0 10px',
    borderRadius: 4,
    border: `1px solid ${token('color.border', '#DFE1E6')}`,
    background: token('color.background.accent.purple.subtlest', '#F3F0FF'),
    color: token('color.text.accent.purple', '#5E4DB2'),
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    fontFamily: 'inherit',
    transition: 'background 0.15s',
  };

  const itemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    padding: '8px 14px',
    background: 'transparent',
    border: 'none',
    fontSize: 14,
    color: token('color.text', '#292A2E'),
    cursor: 'pointer',
    fontFamily: 'inherit',
    textAlign: 'left',
  };

  return (
    <>
      <div ref={ref} style={{ position: 'relative', display: 'inline-block', marginBottom: 16 }}>
        {/* jira-compare 2026-05-02 (cycle 5): Vikram probe — appearance="discovery"
            on @atlaskit/button/new in this theme renders solid bold magenta,
            not Jira's subtle. Reverted to hand-rolled bare button styled
            with --ds-background-discovery (subtle purple bg) + --ds-text-discovery
            (purple text), matching the measured Jira values
            bg=rgb(248,238,254) color=rgb(128,63,165). */}
        {/* jira-compare 2026-05-02 (real probe): Vikram pulled DOM on the
            actual Jira button — testid issue-improve-issue-dropdown.
            improve-issue-dropdown--trigger. Measured:
              bg=rgba(0,0,0,0)  color=rgb(41,42,46)  border=0px
              h=32px  pad=0 10px  br=3px  fontSize=14  fontWeight=500
              icon: 16×16  fill=black  color=rgb(41,42,46)
            No purple anywhere — appearance="subtle" with dark text +
            dark icon. The earlier "subtle discovery" was fabricated. */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={triggerLabel}
          data-testid="catalyst-improve-issue-dropdown--trigger"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            height: 32, padding: '0 10px', borderRadius: 3,
            border: 'none',
            background: 'transparent',
            color: 'var(--ds-text, #292A2E)',
            cursor: 'pointer', fontSize: 14, fontWeight: 500,
            fontFamily: 'inherit',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--ds-background-neutral-subtle-hovered, #F4F5F7)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
        >
          <SparklesIcon size="small" primaryColor="var(--ds-text, #292A2E)" />
          {triggerLabel}
          <ChevronDownIcon size="small" primaryColor="var(--ds-text-subtle, #42526E)" />
        </button>

        {open && (
          <div
            role="menu"
            data-testid="catalyst-improve-issue-dropdown--content"
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              minWidth: 260,
              background: token('elevation.surface.overlay', '#FFFFFF'),
              border: `1px solid ${token('color.border', '#DFE1E6')}`,
              borderRadius: 6,
              boxShadow: '0 8px 24px rgba(9, 30, 66, 0.16)',
              zIndex: 50,
              padding: '6px 0',
            }}
          >
            <div
              style={{
                padding: '4px 14px 6px',
                fontSize: 11,
                fontWeight: 700,
                color: token('color.text.subtle', '#6B6E76'),
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Catalyst Intelligence
            </div>

            <button
              type="button"
              role="menuitem"
              data-testid="catalyst-improve-issue-dropdown.improve-description"
              onClick={() => openMode('description')}
              style={itemStyle}
              onMouseEnter={(e) => (e.currentTarget.style.background = token('color.background.neutral.subtle.hovered', '#F4F5F7'))}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <WandIcon size="small" primaryColor={token('color.icon.subtle', '#6B6E76')} />
              <span style={{ flex: 1 }}>Improve description</span>
            </button>

            <button
              type="button"
              role="menuitem"
              data-testid="catalyst-improve-issue-dropdown.summarize-comments"
              onClick={() => openMode('summarize')}
              style={itemStyle}
              onMouseEnter={(e) => (e.currentTarget.style.background = token('color.background.neutral.subtle.hovered', '#F4F5F7'))}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <CommentIcon size="small" primaryColor={token('color.icon.subtle', '#6B6E76')} />
              <span style={{ flex: 1 }}>Summarize comments</span>
            </button>

            {showSuggestChildren && (
              <button
                type="button"
                role="menuitem"
                data-testid="catalyst-improve-issue-dropdown.suggest-child-issues"
                onClick={() => openMode('children')}
                style={itemStyle}
                onMouseEnter={(e) => (e.currentTarget.style.background = token('color.background.neutral.subtle.hovered', '#F4F5F7'))}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <ListBulletedIcon size="small" primaryColor={token('color.icon.subtle', '#6B6E76')} />
                <span style={{ flex: 1 }}>Suggest child work items</span>
              </button>
            )}

            <button
              type="button"
              role="menuitem"
              data-testid="catalyst-improve-issue-dropdown.suggest-related-issues"
              onClick={() => openMode('similar')}
              style={itemStyle}
              onMouseEnter={(e) => (e.currentTarget.style.background = token('color.background.neutral.subtle.hovered', '#F4F5F7'))}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <SearchIcon size="small" primaryColor={token('color.icon.subtle', '#6B6E76')} />
              <span style={{ flex: 1 }}>Link similar work items</span>
            </button>
          </div>
        )}
      </div>

      <ImproveDescriptionDialog
        isOpen={mode === 'description'}
        onClose={() => setMode('closed')}
        issueType={issueType}
        issueSummary={issue?.summary}
        currentDescription={issue?.description_text}
        currentAcceptanceCriteria={issue?.acceptance_criteria}
        onApplyDescription={onApplyDescription}
        onApplyAcceptanceCriteria={onApplyAcceptanceCriteria}
      />

      {/* Apr 28 2026 (cycle 7 follow-up): pass `issue.id` (UUID)
          first — `ph_comments.work_item_id` is a `uuid` column, so
          passing `issue_key` ("BAU-5711") fails with Postgres error
          22P02 "invalid input syntax for type uuid". */}
      <SummarizeCommentsDialog
        isOpen={mode === 'summarize'}
        onClose={() => setMode('closed')}
        issueType={issueType}
        issueSummary={issue?.summary}
        workItemId={issue?.id ?? issue?.issue_key ?? null}
      />

      <SuggestChildIssuesDialog
        isOpen={mode === 'children'}
        onClose={() => setMode('closed')}
        issueType={issueType}
        issueSummary={issue?.summary}
        parentDescription={issue?.description_text}
        parentIssueKey={issue?.issue_key}
        parentSource={issue?.source}
        projectKey={issue?.project_key}
        projectId={issue?.project_id}
        onChildrenCreated={onChildrenCreated}
      />

      <LinkSimilarItemsDialog
        isOpen={mode === 'similar'}
        onClose={() => setMode('closed')}
        issueType={issueType}
        issueKey={issue?.issue_key}
        existingLinkedKeys={existingLinkedKeys}
        onLinked={onLinked}
      />
    </>
  );
}
