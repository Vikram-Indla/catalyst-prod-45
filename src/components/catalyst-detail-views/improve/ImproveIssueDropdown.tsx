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
 *     - Improve description       → Caty streaming overlay
 *     - Summarize comments        → CommentsSummaryCard (inline, above
 *                                   the comments section — 2026-05-21)
 *     - Suggest child work items  → SuggestChildIssuesDialog
 *                                   (hidden for Subtask — no grandchildren)
 *     - Link similar work items   → opens the inline link toolbar in
 *                                   LinkedWorkItems (2026-05-21)
 *
 *   Visual: small button + sparkles glyph + "Improve {type}" + chevron,
 *   anchored under the title in each `CatalystView*` `leftContent`
 *   slot. Clicking the trigger opens a popover-style menu rendered
 *   inline (no portal — sidesteps the documented Atlaskit DropdownMenu
 *   portal-empty bug on this surface, CLAUDE.md L1).
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/integrations/supabase/client';
import { CatyPulseIcon } from '@/components/ui/CatyPulseIcon';
import WandIcon from '@atlaskit/icon/core/magic-wand';
import CommentIcon from '@atlaskit/icon/core/comment';
import ListBulletedIcon from '@atlaskit/icon/core/list-bulleted';
import SearchIcon from '@atlaskit/icon/core/search';
import PageIcon from '@atlaskit/icon/core/page';
import { token } from '@atlaskit/tokens';
import { ImproveDescriptionDialog } from './ImproveDescriptionDialog';
import { SuggestChildIssuesDialog } from './SuggestChildIssuesDialog';
import { LinkSimilarItemsDialog } from './LinkSimilarItemsDialog';
import { canSuggestChildren, canGenerateStories, canPlanWorkItems, improveTriggerLabel } from './improve-config';
import { ProjectPickerModal } from '../business-request/ProjectPickerModal';
import { WorkItemPlannerModal } from '../shared/WorkItemPlannerModal';
import type { PickedProject } from '../business-request/useEpicGeneration';
import { useCatyImprove, MIN_CONTENT_LENGTH, contentHash } from './catyImproveStore';
import { useCatySummarize } from './catySummarizeStore';
import { useStoryGeneration } from '../epic/useStoryGeneration';
import { ArtefactPickerModal } from '../epic/ArtefactPickerModal';
import { StoryProposalModal } from '../epic/StoryProposalModal';
import { adfToMarkdown } from '@/components/catalyst-detail-views/shared/sections/Description/utils/adfToMarkdown';
import Spinner from '@atlaskit/spinner';
import type { AdfDoc } from '@/components/catalyst-detail-views/shared/sections/Description/utils/adfToTiptap';

type Mode = 'closed' | 'description' | 'children' | 'similar';
type PlannerState = 'idle' | 'picking_project' | 'planning';

/** Truthy if the description has enough content for AI improvement. */
function hasContent(text: string | null | undefined): boolean {
  return typeof text === 'string' && text.trim().length >= MIN_CONTENT_LENGTH;
}

interface ImproveIssueDropdownProps {
  issue: {
    id?: string;
    issue_key?: string | null;
    issue_type?: string | null;
    summary?: string | null;
    description_text?: string | null;
    /** Rich-text representation. When present, "Improve description"
     *  sends the AI a Markdown serialization (preserves tables, lists,
     *  headings) instead of the flat `description_text` projection. */
    description_adf?: AdfDoc | unknown | null;
    acceptance_criteria?: string | null;
    project_key?: string | null;
    project_id?: string | null;
    source?: 'jira' | 'catalyst' | string | null;
    parent_key?: string | null;
    parent_summary?: string | null;
    priority?: string | null;
    labels?: string[] | null;
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
  const [plannerState, setPlannerState] = useState<PlannerState>('idle');
  const [pickedProject, setPickedProject] = useState<PickedProject | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [emptyHintPos, setEmptyHintPos] = useState<{ top: number; left: number } | null>(null);
  const emptyHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startCatyImprove = useCatyImprove((s) => s.start);
  const stopCatyImprove = useCatyImprove((s) => s.stop);
  const markImproved = useCatyImprove((s) => s.markImproved);
  const isAlreadyImproved = useCatyImprove((s) => s.isAlreadyImproved);
  const startSummarize = useCatySummarize((s) => s.start);
  const catyIsImproving = useCatyImprove((s) => s.payload) !== null;

  /**
   * "Summarize comments" entry point — opens the inline
   * `CommentsSummaryCard` above the comments section. The card itself
   * does the empty-comments toast + dismiss when there's nothing to
   * summarize, so we just hand off the issue context here.
   */
  const handleStartSummarize = useCallback(() => {
    setOpen(false);
    if (!issue?.issue_key || !issue?.id) return;
    startSummarize({
      issueKey: issue.issue_key,
      workItemId: issue.id,
      issueType: issue.issue_type ?? null,
      issueSummary: issue.summary ?? null,
    });
  }, [issue, startSummarize]);

  /**
   * "Improve description" entry point — replaces the legacy dialog with
   * the Caty streaming overlay. Fetches image attachments first so the
   * AI can "see" them as multimodal context (best-effort: if the fetch
   * fails or returns no images, we proceed with a text-only prompt).
   */
  const showEmptyHint = useCallback(() => {
    const r = triggerRef.current?.getBoundingClientRect();
    if (!r) return;
    setEmptyHintPos({ top: r.bottom + 8, left: r.left });
    if (emptyHintTimerRef.current) clearTimeout(emptyHintTimerRef.current);
    emptyHintTimerRef.current = setTimeout(() => setEmptyHintPos(null), 4000);
  }, []);

  const [alreadyImprovedHint, setAlreadyImprovedHint] = useState(false);

  const handleStartImproveDescription = useCallback(async () => {
    setOpen(false);
    if (!issue?.issue_key) return;
    if (!hasContent(issue.description_text)) {
      showEmptyHint();
      return;
    }

    // Hash dedup — refuse to re-improve content that Caty already improved.
    const descText = issue.description_text ?? '';
    if (isAlreadyImproved(issue.issue_key, descText)) {
      const r = triggerRef.current?.getBoundingClientRect();
      if (r) setEmptyHintPos({ top: r.bottom + 8, left: r.left });
      setAlreadyImprovedHint(true);
      if (emptyHintTimerRef.current) clearTimeout(emptyHintTimerRef.current);
      emptyHintTimerRef.current = setTimeout(() => {
        setEmptyHintPos(null);
        setAlreadyImprovedHint(false);
      }, 4000);
      return;
    }

    let attachmentUrls: string[] = [];
    if (issue.id) {
      try {
        const { data } = await (supabase as any)
          .from('ph_attachments')
          .select('storage_path, mime_type')
          .eq('work_item_id', issue.id);
        const rows: Array<{ storage_path: string; mime_type: string | null }> =
          Array.isArray(data) ? data : [];
        attachmentUrls = rows
          .filter((r) => typeof r.mime_type === 'string' && r.mime_type.startsWith('image/'))
          .map((r) => {
            const { data: pub } = supabase.storage
              .from('description-images')
              .getPublicUrl(r.storage_path);
            return pub?.publicUrl ?? '';
          })
          .filter((u) => u.length > 0);
      } catch {
        // Non-fatal — proceed text-only
        attachmentUrls = [];
      }
    }

    // Prefer Markdown serialization of the ADF (preserves tables /
    // lists / headings) over the flat plain-text projection.
    const currentDescription = issue.description_adf
      ? adfToMarkdown(issue.description_adf as AdfDoc)
      : (issue.description_text ?? null);

    // G1-G4: Fetch hierarchical context in parallel (best-effort, non-blocking)
    let parentDescription: string | null = null;
    let linkedIssuesSummary: string | null = null;
    let subtasksSummary: string | null = null;
    let projectDescription: string | null = null;
    try {
      const [parentRes, linksRes, subtasksRes, projectRes] = await Promise.all([
        issue.parent_key
          ? supabase.from('ph_issues').select('description_text').eq('issue_key', issue.parent_key).maybeSingle()
          : Promise.resolve({ data: null }),
        issue.issue_key
          ? (supabase as any).from('ph_issue_links').select('target_key, link_type').eq('source_key', issue.issue_key).limit(10)
          : Promise.resolve({ data: null }),
        issue.issue_key
          ? supabase.from('ph_issues').select('summary').eq('parent_key', issue.issue_key).is('deleted_at', null).limit(20)
          : Promise.resolve({ data: null }),
        issue.project_key
          ? (supabase as any).from('ph_jira_projects').select('description').eq('key', issue.project_key).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      parentDescription = parentRes.data?.description_text ?? null;
      if (Array.isArray(linksRes.data) && linksRes.data.length > 0) {
        linkedIssuesSummary = linksRes.data.map((l: any) => `${l.link_type}: ${l.target_key}`).join(', ');
      }
      if (Array.isArray(subtasksRes.data) && subtasksRes.data.length > 0) {
        subtasksSummary = subtasksRes.data.map((s: any) => s.summary).filter(Boolean).join(', ');
      }
      projectDescription = projectRes.data?.description ?? null;
    } catch {
      // Non-fatal — proceed without context
    }

    startCatyImprove({
      issueKey: issue.issue_key,
      issueType: issue.issue_type ?? null,
      issueSummary: issue.summary ?? null,
      currentDescription,
      currentAcceptanceCriteria: issue.acceptance_criteria ?? null,
      attachmentUrls,
      improveSubType: 'improve_clarify',
      parentSummary: issue.parent_summary ?? null,
      parentDescription,
      linkedIssues: linkedIssuesSummary,
      existingSubtasks: subtasksSummary,
      labels: issue.labels?.join(', ') ?? null,
      priority: issue.priority ?? null,
      components: projectDescription ? `Project: ${projectDescription.slice(0, 500)}` : null,
    });
  }, [issue, startCatyImprove]);

  // Dismiss empty-description hint on click-outside.
  useEffect(() => {
    if (!emptyHintPos) return;
    const h = () => {
      if (emptyHintTimerRef.current) clearTimeout(emptyHintTimerRef.current);
      setEmptyHintPos(null);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [emptyHintPos]);

  // Cleanup timer on unmount.
  useEffect(() => () => {
    if (emptyHintTimerRef.current) clearTimeout(emptyHintTimerRef.current);
  }, []);

  // Click-outside to dismiss the popover.
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t)) return;
      if (portalRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  // Compute viewport coords for the portaled menu — anchored center-under
  // the trigger and clamped so it never overflows either side of the
  // viewport. Recomputes on resize/scroll while open.
  useEffect(() => {
    if (!open) { setMenuPos(null); return; }
    const MENU_WIDTH = 260;
    const place = () => {
      const r = triggerRef.current?.getBoundingClientRect();
      if (!r) return;
      let left = r.left + r.width / 2 - MENU_WIDTH * 0.65;
      const minLeft = 8;
      const maxLeft = window.innerWidth - MENU_WIDTH - 8;
      if (left < minLeft) left = minLeft;
      if (left > maxLeft) left = Math.max(minLeft, maxLeft);
      setMenuPos({ top: r.bottom + 4, left });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  const issueType = issue?.issue_type ?? null;
  const triggerLabel = improveTriggerLabel(issueType);
  const showSuggestChildren = canSuggestChildren(issueType);
  const showGenerateStories = canGenerateStories(issueType);
  const showPlanWorkItems = canPlanWorkItems(issueType);

  // Story generation flow (Epic only)
  const storyGen = useStoryGeneration();

  useEffect(() => {
    if (showGenerateStories && issue?.issue_key) {
      storyGen.checkDisabled(issue.issue_key);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showGenerateStories, issue?.issue_key]);

  const storyGenDescriptionText = React.useMemo(() => {
    if (!showGenerateStories) return '';
    if (issue?.description_adf) {
      try { return adfToMarkdown(issue.description_adf as any); } catch { return issue?.description_text ?? ''; }
    }
    return issue?.description_text ?? '';
  }, [showGenerateStories, issue?.description_adf, issue?.description_text]);

  const handleGenerateStories = useCallback(() => {
    setOpen(false);
    if (!issue?.issue_key || !issue?.summary) return;
    if (storyGen.maxGenerationsReached) {
      import('@/lib/catalystToast').then(m => m.catalystToast.warning('Generation limit reached', 'Maximum 2 story generations per epic.'));
      return;
    }
    storyGen.openPicker(issue.issue_key, issue.summary, storyGenDescriptionText);
  }, [issue?.issue_key, issue?.summary, storyGenDescriptionText, storyGen]);

  const handleStoryGenGenerate = useCallback(async (selectedSources: string[], attachmentIds: string[]) => {
    if (!issue?.issue_key || !issue?.summary) return;
    import('@/lib/catalystToast').then(m => m.catalystToast.info('Generating stories from your epic documentation…'));
    await storyGen.generate({
      epicKey: issue.issue_key,
      epicSummary: issue.summary,
      descriptionText: storyGenDescriptionText ?? '',
      attachmentIds,
      selectedSources,
    });
  }, [issue?.issue_key, issue?.summary, storyGenDescriptionText, storyGen]);

  const handleStoryGenCreateSelected = useCallback(async () => {
    if (!issue?.issue_key || !issue?.project_key) return;
    await storyGen.createSelected({
      parentIssueKey: issue.issue_key,
      parentSource: (issue.source as 'jira' | 'catalyst') ?? 'catalyst',
      projectKey: issue.project_key,
      projectId: issue.project_id ?? undefined,
    });
  }, [issue, storyGen]);

  const openMode = (m: Mode) => {
    setOpen(false);
    setMode(m);
  };

  const handlePlanWorkItems = useCallback(() => {
    setOpen(false);
    if (!issue?.issue_key) return;
    setPlannerState('picking_project');
  }, [issue?.issue_key]);

  const handleProjectConfirmed = useCallback((project: PickedProject) => {
    setPickedProject(project);
    setPlannerState('planning');
  }, []);

  const handlePlannerClose = useCallback(() => {
    setPlannerState('idle');
    setPickedProject(null);
  }, []);

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
      <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
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
          ref={triggerRef}
          type="button"
          onClick={catyIsImproving ? () => stopCatyImprove() : () => setOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={catyIsImproving ? 'Stop Caty' : triggerLabel}
          aria-busy={catyIsImproving || undefined}
          data-testid="catalyst-improve-issue-dropdown--trigger"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            height: 32, padding: '0 12px', borderRadius: 6,
            border: 'none', outline: 'none', appearance: 'none',
            background: 'transparent',
            color: 'var(--ds-text, #172B4D)',
            cursor: 'pointer',
            fontSize: 12, fontWeight: 600,
            fontFamily: 'var(--ds-font-family-body, "Atlassian Sans"), ui-sans-serif, sans-serif',
            whiteSpace: 'nowrap',
            lineHeight: 1,
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--ds-background-neutral-subtle, #F7F8F9)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
        >
          {catyIsImproving ? (
            <Spinner size="small" />
          ) : (
            <CatyPulseIcon size={20} />
          )}
          <span>{catyIsImproving ? 'Stop' : triggerLabel}</span>
        </button>

        {open && menuPos && createPortal(
          <div
            ref={portalRef}
            role="menu"
            data-testid="catalyst-improve-issue-dropdown--content"
            style={{
              position: 'fixed',
              top: menuPos.top,
              left: menuPos.left,
              width: 260,
              background: token('elevation.surface.overlay', '#FFFFFF'),
              border: `1px solid ${token('color.border', 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6))')}`,
              borderRadius: 6,
              boxShadow: '0 8px 24px rgba(9, 30, 66, 0.16)',
              zIndex: 2000,
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
              onClick={handleStartImproveDescription}
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
              onClick={handleStartSummarize}
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

            {showPlanWorkItems && (
              <button
                type="button"
                role="menuitem"
                data-testid="catalyst-improve-issue-dropdown.plan-work-items"
                onClick={handlePlanWorkItems}
                style={itemStyle}
                onMouseEnter={(e) => (e.currentTarget.style.background = token('color.background.neutral.subtle.hovered', '#F4F5F7'))}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <PageIcon size="small" primaryColor={token('color.icon.subtle', '#6B6E76')} />
                <span style={{ flex: 1 }}>Plan work items</span>
              </button>
            )}

            <button
              type="button"
              role="menuitem"
              data-testid="catalyst-improve-issue-dropdown.suggest-related-issues"
              onClick={() => {
                setOpen(false);
                if (issue?.issue_key) {
                  window.dispatchEvent(
                    new CustomEvent('catalyst:open-link-toolbar', {
                      detail: { issueKey: issue.issue_key },
                    }),
                  );
                }
              }}
              style={itemStyle}
              onMouseEnter={(e) => (e.currentTarget.style.background = token('color.background.neutral.subtle.hovered', '#F4F5F7'))}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <SearchIcon size="small" primaryColor={token('color.icon.subtle', '#6B6E76')} />
              <span style={{ flex: 1 }}>Link similar work items</span>
            </button>

            {showGenerateStories && (
              <button
                type="button"
                role="menuitem"
                data-testid="catalyst-improve-issue-dropdown.generate-stories"
                onClick={handleGenerateStories}
                disabled={storyGen.isDisabled || storyGen.maxGenerationsReached}
                style={{
                  ...itemStyle,
                  opacity: (storyGen.isDisabled || storyGen.maxGenerationsReached) ? 0.5 : 1,
                  cursor: (storyGen.isDisabled || storyGen.maxGenerationsReached) ? 'not-allowed' : 'pointer',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = token('color.background.neutral.subtle.hovered', '#F4F5F7'))}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <PageIcon size="small" primaryColor={token('color.icon.subtle', '#6B6E76')} />
                <span style={{ flex: 1 }}>Generate stories from docs</span>
                {storyGen.generationCount > 0 && (
                  <span style={{ fontSize: 11, color: token('color.text.subtlest', '#6B778C') }}>
                    {storyGen.generationCount}/2
                  </span>
                )}
              </button>
            )}
          </div>,
          document.body,
        )}
      </div>

      {emptyHintPos && createPortal(
        <div
          role="status"
          aria-live="polite"
          data-testid="catalyst-improve-empty-description-hint"
          style={{
            position: 'fixed',
            top: emptyHintPos.top,
            left: emptyHintPos.left,
            zIndex: 2001,
            background: token('elevation.surface.overlay', '#FFFFFF'),
            border: `1px solid ${token('color.border', '#DFE1E6')}`,
            borderRadius: 8,
            boxShadow: '0 4px 16px rgba(9, 30, 66, 0.14)',
            padding: '12px 16px',
            maxWidth: 260,
            fontSize: 14,
            fontWeight: 400,
            color: token('color.text', '#172B4D'),
            fontFamily: 'inherit',
            lineHeight: '20px',
            pointerEvents: 'none',
          }}
        >
          {alreadyImprovedHint
            ? 'This description has already been improved by Caty'
            : `Add at least ${MIN_CONTENT_LENGTH} characters before improving with Caty AI`}
        </div>,
        document.body,
      )}

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

      {/* 2026-05-21: Summarize comments now opens the inline
          `CommentsSummaryCard` (mounted inside CatalystActivitySection)
          instead of a modal. Handler: `handleStartSummarize` above. */}

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

      {showPlanWorkItems && issue?.issue_key && (
        <>
          <ProjectPickerModal
            isOpen={plannerState === 'picking_project'}
            onClose={handlePlannerClose}
            brTitle={issue?.summary ?? null}
            onConfirm={handleProjectConfirmed}
          />
          {plannerState === 'planning' && pickedProject && issue?.id && (
            <WorkItemPlannerModal
              brId={issue.id}
              brTitle={issue.summary ?? ''}
              brDescriptionText={issue.description_text ?? null}
              projectKey={pickedProject.projectKey}
              projectId={pickedProject.projectId}
              projectName={pickedProject.projectName}
              onClose={handlePlannerClose}
            />
          )}
        </>
      )}

      {showGenerateStories && (
        <>
          <ArtefactPickerModal
            isOpen={storyGen.state === 'selecting'}
            onClose={storyGen.reset}
            epicId={issue?.id}
            epicKey={issue?.issue_key}
            hasDescription={!!storyGenDescriptionText?.trim()}
            onGenerate={handleStoryGenGenerate}
            isGenerating={storyGen.state === 'generating'}
          />
          <StoryProposalModal
            isOpen={storyGen.state === 'reviewing'}
            onClose={storyGen.reset}
            proposals={storyGen.proposals}
            selectedIndices={storyGen.selectedIndices}
            onToggle={storyGen.toggleSelection}
            onSelectAll={storyGen.selectAll}
            onDeselectAll={storyGen.deselectAll}
            onCreateSelected={handleStoryGenCreateSelected}
            isCreating={storyGen.state === 'creating'}
            coveragePercent={storyGen.coveragePercent}
            existingCount={storyGen.existingCount}
            epicKey={issue?.issue_key ?? null}
          />
        </>
      )}
    </>
  );
}
