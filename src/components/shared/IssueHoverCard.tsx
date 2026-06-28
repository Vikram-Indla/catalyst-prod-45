/**
 * IssueHoverCard — Jira parity hover preview for work item keys.
 *
 * Replicates Jira's @atlaskit/smart-card HoverCard from global search.
 * 360px fixed width, 16px padding, 8px radius, ADS overlay shadow.
 *
 * Portal pattern (not @atlaskit/popup): see CLAUDE.md 2026-05-08 —
 * @atlaskit/popup v4.16 has an empty-portal bug on `overflow:hidden`
 * parents (GlobalSearchPanel container), which renders the popup at
 * top-left of the viewport. Self-rolled createPortal + position:fixed
 * + getBoundingClientRect placement avoids it.
 *
 * Data: ph_issues by issue_key (text PK). Hover-only fetch (enabled
 * gate on isOpen).
 *
 * 3 actions: Copy link · Summarize with CATY · View related links.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { acquire as acquireHoverSlot, release as releaseHoverSlot } from '@/lib/hover-card-singleton';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { token } from '@atlaskit/tokens';
import Spinner from '@atlaskit/spinner';
import Lozenge from '@atlaskit/lozenge';
import Avatar from '@atlaskit/avatar';
import CopyIcon from '@atlaskit/icon/glyph/copy';
import LinkIcon from '@atlaskit/icon/glyph/link';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import ShortcutIcon from '@atlaskit/icon/glyph/shortcut';
import AiChatIcon from '@atlaskit/icon/core/ai-chat';
import QuestionIcon from '@atlaskit/icon/glyph/question-circle';
import ModalDialog, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import { catalystToast } from '@/lib/catalystToast';
import { supabase } from '@/integrations/supabase/client';
import { useGlobalSearchStore } from '@/store/globalSearchStore';
import { JiraIssueTypeIcon } from '@/components/shared/JiraIssueTypeIcon';

const CARD_WIDTH = 360;
const ENTER_DELAY = 300;
const LEAVE_GRACE = 200;
const POPUP_OFFSET = 8;
const JIRA_BROWSE_BASE = 'https://digital-transformation.atlassian.net/browse';

interface HoverIssue {
  issue_key: string;
  summary: string | null;
  description_text: string | null;
  description_adf: any | null;
  status: string | null;
  status_category: string | null;
  priority: string | null;
  issue_type: string | null;
  project_key: string | null;
  assignee_account_id: string | null;
  assignee_display_name: string | null;
  reporter_account_id: string | null;
  reporter_display_name: string | null;
}

/** Walk ADF JSON and concatenate text nodes — fallback when description_text is null. */
function adfToText(adf: any): string {
  if (!adf) return '';
  if (typeof adf === 'string') return adf;
  let out = '';
  const walk = (n: any) => {
    if (!n) return;
    if (typeof n.text === 'string') out += n.text + ' ';
    if (Array.isArray(n.content)) n.content.forEach(walk);
  };
  walk(adf);
  return out.trim();
}

function useHoverIssue(issueKey: string, enabled: boolean) {
  return useQuery<HoverIssue | null>({
    queryKey: ['issue-hover-card', issueKey],
    enabled: enabled && !!issueKey,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_issues')
        .select(
          'issue_key, summary, description_text, description_adf, status, status_category, priority, issue_type, project_key, assignee_account_id, assignee_display_name, reporter_account_id, reporter_display_name',
        )
        .eq('issue_key', issueKey)
        .is('deleted_at', null)
        .maybeSingle();
      if (data) return data as unknown as HoverIssue;

      // Fall back to business_requests for MDT-*/MIM-* keys not in ph_issues
      const { data: biz } = await supabase
        .from('business_requests')
        .select('request_key, title, process_step, urgency, request_type')
        .eq('request_key', issueKey)
        .is('deleted_at', null)
        .maybeSingle();
      if (!biz) return null;
      return {
        issue_key: (biz as any).request_key,
        summary: (biz as any).title ?? null,
        description_text: null,
        description_adf: null,
        status: (biz as any).process_step ?? null,
        status_category: null,
        priority: (biz as any).urgency ?? null,
        issue_type: 'Business Request',
        project_key: null,
        assignee_account_id: null,
        assignee_display_name: null,
        reporter_account_id: null,
        reporter_display_name: null,
      } as HoverIssue;
    },
  });
}

type LozengeAppearance = 'default' | 'inprogress' | 'success' | 'moved' | 'removed' | 'new';

function statusCategoryToAppearance(cat: string | null | undefined): LozengeAppearance {
  const c = (cat || '').toLowerCase();
  if (c === 'in_progress' || c === 'inprogress' || c === 'indeterminate') return 'inprogress';
  if (c === 'done' || c === 'complete' || c === 'success') return 'success';
  if (c === 'removed' || c === 'cancelled') return 'removed';
  return 'default';
}

function priorityColor(p: string | null | undefined): string {
  const v = (p || '').toLowerCase();
  if (v.includes('highest') || v.includes('blocker')) return 'var(--ds-background-danger-bold, var(--ds-background-danger-bold, #C9372C))';
  if (v.includes('high')) return 'var(--ds-background-danger-bold, var(--ds-background-danger-bold, #C9372C))';
  if (v.includes('medium')) return '#D04A02';
  if (v.includes('low')) return '#2C8540';
  if (v.includes('lowest')) return '#1F7344';
  return 'var(--ds-text-subtlest, #6B6E76)';
}

function PriorityGlyph({ priority }: { priority: string | null | undefined }) {
  const color = priorityColor(priority);
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden style={{ flexShrink: 0 }}>
      <rect x="2" y="3" width="12" height="2" rx="1" fill={color} />
      <rect x="2" y="7" width="12" height="2" rx="1" fill={color} />
      <rect x="2" y="11" width="12" height="2" rx="1" fill={color} />
    </svg>
  );
}

interface HoverCardContentProps {
  issueKey: string;
  rect: DOMRect;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClose: () => void;
  onOpenLinks: () => void;
}

function HoverCardContent({ issueKey, rect, onMouseEnter, onMouseLeave, onClose, onOpenLinks }: HoverCardContentProps) {
  const navigate = useNavigate();
  const { data, isLoading } = useHoverIssue(issueKey, true);
  const [copied, setCopied] = useState(false);
  const [summaryState, setSummaryState] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const [summaryText, setSummaryText] = useState<string | null>(null);

  // Placement: prefer below trigger (bottom-start). Flip to top-start if no room.
  const viewportH = window.innerHeight;
  const viewportW = window.innerWidth;
  const estimatedHeight = 280;
  const placeAbove = rect.bottom + POPUP_OFFSET + estimatedHeight > viewportH;
  const top = placeAbove
    ? Math.max(8, rect.top - POPUP_OFFSET - estimatedHeight)
    : rect.bottom + POPUP_OFFSET;
  // Align left edge of card with left edge of trigger, but keep on-screen.
  const left = Math.min(Math.max(8, rect.left), viewportW - CARD_WIDTH - 8);

  // Escape closes — capture phase so parent modals don't swallow it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const issueUrl = data?.project_key
    ? `${window.location.origin}/project-hub/${data.project_key}/allwork/${encodeURIComponent(issueKey)}`
    : `${window.location.origin}/browse/${encodeURIComponent(issueKey)}`;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    let ok = false;
    try {
      await navigator.clipboard.writeText(issueUrl);
      ok = true;
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = issueUrl;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand('copy');
        document.body.removeChild(ta);
      } catch {
        ok = false;
      }
    }
    if (ok) {
      setCopied(true);
      catalystToast.success('Link copied');
      window.setTimeout(() => setCopied(false), 2000);
    } else {
      catalystToast.error('Copy failed');
    }
  };

  // Navigate via react-router (URL change). Avoids openDetail() racing with
  // parent row onClick + makes deep-link work (back button, refresh).
  const targetRoute = data?.project_key
    ? `/project-hub/${data.project_key}/allwork/${encodeURIComponent(issueKey)}`
    : `/browse/${encodeURIComponent(issueKey)}`;

  // CATY summary — inline expansion within hover card.
  // Edge fn 'summarize_for_hover' mode not yet deployed → uses description text
  // as preview. When edge fn ships, swap path here. No toast — inline only.
  const handleSummarize = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (summaryState === 'loaded' || summaryState === 'error') {
      // Collapse on second click
      setSummaryState('idle');
      setSummaryText(null);
      return;
    }
    if (summaryState === 'loading') return;
    setSummaryState('loading');
    // Brief delay so spinner is visible (UX polish).
    await new Promise((r) => window.setTimeout(r, 200));
    const desc = (data?.description_text || adfToText(data?.description_adf) || '').trim();
    if (desc) {
      setSummaryText(desc.slice(0, 500) + (desc.length > 500 ? '…' : ''));
      setSummaryState('loaded');
    } else {
      // Inline empty state — no toast.
      setSummaryText(null);
      setSummaryState('error');
    }
  };

  const handleViewLinks = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onOpenLinks();
    onClose();
  };

  const handleTitle = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    navigate(targetRoute);
    onClose();
  };

  const description = (data?.description_text || adfToText(data?.description_adf) || '').trim();
  const statusAppearance = statusCategoryToAppearance(data?.status_category);
  // Lozenge BLACK trap (CLAUDE.md 19.4): default + isBold renders solid black.
  // Mirror CatalystStatusPill rule — bold only when appearance is non-default.
  const lozengeBold = statusAppearance !== 'default';
  const assigneeName = data?.assignee_display_name || data?.reporter_display_name || '';

  return createPortal(
    <div
      data-hover-portal="true"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      role="tooltip"
      aria-label={`${issueKey} preview`}
      style={{
        position: 'fixed',
        top,
        left,
        width: CARD_WIDTH,
        maxHeight: 'min(560px, calc(100vh - 32px))',
        overflowY: 'auto',
        zIndex: 100000,
        background: token('elevation.surface.overlay', 'var(--ds-surface, #FFFFFF)'),
        borderRadius: 8,
        boxShadow: '0 8px 24px var(--ds-shadow-raised, rgba(9,30,66,0.16)), 0 2px 4px var(--ds-background-neutral-subtle-pressed, rgba(9,30,66,0.08))',
        border: `1px solid ${token('color.border', 'var(--ds-border, #DFE1E6)')}`,
        padding: 16,
        fontFamily: token('font.family.body', '-apple-system, BlinkMacSystemFont, "Atlassian Sans", "Segoe UI", Roboto, sans-serif'),
        animation: 'jcHoverFade 150ms ease-out',
      }}
    >
      {isLoading && !data ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
          <Spinner size="small" />
        </div>
      ) : !data ? (
        (() => {
          const projectPrefix = issueKey.split('-')[0] || '';
          const jiraUrl = `${JIRA_BROWSE_BASE}/${encodeURIComponent(issueKey)}`;
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  aria-hidden
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 28, height: 28, borderRadius: 4, flexShrink: 0,
                    background: token('color.background.neutral', 'var(--ds-background-neutral, #F1F2F4)'),
                    color: token('color.text.subtle', 'var(--ds-icon-subtle, #626F86)'),
                    fontSize: 14, fontWeight: 700,
                  }}
                >
                  ?
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span style={{
                    fontSize: 14, fontWeight: 600,
                    color: token('color.text', 'var(--ds-text, #172B4D)'),
                  }}>
                    {issueKey}
                  </span>
                  <span style={{
                    fontSize: 12,
                    color: token('color.text.subtle', 'var(--ds-icon-subtle, #626F86)'),
                  }}>
                    Not synced to Catalyst{projectPrefix ? ` · ${projectPrefix} project` : ''}
                  </span>
                </div>
              </div>
              <div style={{
                borderTop: `1px solid ${token('color.border', 'var(--ds-border, #DFE1E6)')}`,
                paddingTop: 8,
              }}>
                <a
                  href={jiraUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    fontSize: 14,
                    color: token('color.link', 'var(--ds-link, #0C66E4)'),
                    textDecoration: 'none',
                  }}
                >
                  <ShortcutIcon label="" size="small" />
                  <span>Open in Jira</span>
                </a>
              </div>
            </div>
          );
        })()
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Title row — type icon + linked key:summary */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, minWidth: 0 }}>
            {data.issue_type && (
              <span style={{ flexShrink: 0, marginTop: 2 }}>
                <JiraIssueTypeIcon issueType={data.issue_type} size={16} />
              </span>
            )}
            <a
              href={issueUrl}
              onClick={handleTitle}
              style={{
                flex: 1,
                minWidth: 0,
                fontSize: token('font.size.100', '14px'),
                fontWeight: parseInt(token('font.weight.semibold', '600'), 10) || 600,
                lineHeight: token('font.lineHeight.100', '20px'),
                fontFamily: token('font.family.body', 'inherit'),
                color: token('color.link', 'var(--ds-link, #0C66E4)'),
                textDecoration: 'none',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
              title={`${issueKey}: ${data.summary || ''}`}
            >
              {issueKey}: {data.summary || '(no summary)'}
            </a>
          </div>

          {/* Metadata row — avatar · status (with chevron) · priority */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {assigneeName && (
              <Avatar size="small" name={assigneeName} />
            )}
            {data.status && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                <Lozenge appearance={statusAppearance} isBold={lozengeBold}>
                  {data.status}
                </Lozenge>
                <span style={{ display: 'inline-flex', color: token('color.text.subtlest', 'var(--ds-icon-subtle, #626F86)'), pointerEvents: 'none' }}>
                  <ChevronDownIcon label="" size="small" />
                </span>
              </span>
            )}
            {data.priority && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 4 }}>
                <PriorityGlyph priority={data.priority} />
                <span style={{
                  fontSize: token('font.size.100', '14px'),
                  fontWeight: parseInt(token('font.weight.regular', '400'), 10) || 400,
                  color: token('color.text.subtlest', 'var(--ds-icon-subtle, #626F86)'),
                }}>
                  {data.priority}
                </span>
              </span>
            )}
          </div>

          {/* Body slot — Jira parity: shows description by default; CATY summary
              REPLACES it in-place when activated. Single content region, no
              stacked panels. */}
          {summaryState === 'loading' ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: token('font.size.100', '14px'),
              color: token('color.text.subtle', 'var(--ds-icon-subtle, #626F86)'),
            }}>
              <Spinner size="small" />
              <span>CATY is summarizing…</span>
            </div>
          ) : summaryState === 'loaded' && summaryText ? (
            <p
              style={{
                margin: 0,
                fontSize: token('font.size.100', '14px'),
                fontWeight: parseInt(token('font.weight.regular', '400'), 10) || 400,
                lineHeight: token('font.lineHeight.100', '20px'),
                fontFamily: token('font.family.body', 'inherit'),
                color: token('color.text', 'var(--ds-text, #172B4D)'),
                display: '-webkit-box',
                WebkitLineClamp: 6,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                wordBreak: 'break-word',
              }}
            >
              {summaryText}
            </p>
          ) : summaryState === 'error' ? (
            <p style={{
              margin: 0,
              fontSize: token('font.size.100', '14px'),
              color: token('color.text.subtle', 'var(--ds-icon-subtle, #626F86)'),
              fontStyle: 'italic',
            }}>
              No description content to summarize.
            </p>
          ) : description ? (
            <p
              style={{
                margin: 0,
                fontSize: token('font.size.100', '14px'),
                fontWeight: parseInt(token('font.weight.regular', '400'), 10) || 400,
                lineHeight: token('font.lineHeight.100', '20px'),
                fontFamily: token('font.family.body', 'inherit'),
                color: token('color.text', 'var(--ds-text, #172B4D)'),
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                wordBreak: 'break-word',
              }}
            >
              {description}
            </p>
          ) : null}

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
            <button onClick={handleCopy} style={actionBtnStyle} aria-label="Copy issue URL">
              <CopyIcon label="" size="medium" />
              <span>{copied ? 'Copied!' : 'Copy link'}</span>
            </button>
            <button onClick={handleSummarize} style={actionBtnStyle} aria-label="Summarize with CATY" disabled={summaryState === 'loading'}>
              {summaryState === 'loading' ? <Spinner size="small" /> : <AiChatIcon label="" />}
              <span>{summaryState === 'loading' ? 'Summarizing…' : summaryState === 'loaded' ? 'Hide summary' : 'Summarize with CATY'}</span>
            </button>


            <button onClick={handleViewLinks} style={actionBtnStyle} aria-label="View related links">
              <LinkIcon label="" size="medium" />
              <span>View related links</span>
            </button>
          </div>

          {/* Source footer — divider above */}
          <div style={{
            borderTop: `1px solid ${token('color.border', 'var(--ds-border, #DFE1E6)')}`,
            marginTop: 4,
            paddingTop: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 12,
            color: token('color.text.subtle', 'var(--ds-icon-subtle, #626F86)'),
          }}>
            <svg width="16" height="16" viewBox="0 0 512 512" aria-hidden style={{ flexShrink: 0 }}>
              <rect width="512" height="512" rx="129.62" fill="var(--ds-link, #1868DB)" />
              <path
                d="M421.802 200.297V93.9736H259.279L233.457 127.39L210.674 93.9736H154.474C39.037 223.992 106.375 363.833 154.474 417.501H421.802V309.659H279.025L236.495 374.972C170.878 271.686 209.155 173.97 236.495 138.022L279.025 200.297H421.802Z"
                fill="white"
              />
            </svg>
            <span>Catalyst{data.project_key ? ` · ${data.project_key}` : ''}</span>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}

const actionBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  width: '100%',
  padding: '6px 8px',
  background: 'transparent',
  border: 'none',
  borderRadius: 3,
  cursor: 'pointer',
  fontSize: 'var(--ds-font-size-100, 14px)',
  fontWeight: 500,
  lineHeight: 'var(--ds-font-line-height-100, 20px)',
  color: 'var(--ds-text, #172B4D)',
  textAlign: 'left',
  fontFamily: 'var(--ds-font-family-body, inherit)',
};

interface IssueHoverCardProps {
  issueKey: string;
  children: React.ReactNode;
  /** Optional — disables hover entirely (e.g. when row is selected/dragging). */
  disabled?: boolean;
}

/**
 * Wrap any element with this to attach a Jira-parity hover preview.
 * The trigger element gets mouse handlers; the card portals to body.
 */
export function IssueHoverCard({ issueKey, children, disabled }: IssueHoverCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [linksOpen, setLinksOpen] = useState(false);
  const closeGlobalSearch = useGlobalSearchStore((s) => s.close);

  const openLinksModal = useCallback(() => {
    // Close GlobalSearchPanel first — it stacks above modal layer otherwise.
    closeGlobalSearch();
    setLinksOpen(true);
  }, [closeGlobalSearch]);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const enterTimer = useRef<number | undefined>(undefined);
  const leaveTimer = useRef<number | undefined>(undefined);

  const open = useCallback(() => {
    if (disabled) return;
    if (!triggerRef.current) return;
    // `display:contents` span has no box. Walk to firstElementChild with a
    // measurable rect. If none found, use the trigger ref's own (probably
    // 0×0) so the card stays off-screen instead of clamping to top-left.
    let el: Element | null = triggerRef.current;
    let r = el.getBoundingClientRect();
    while (r.width === 0 && r.height === 0 && el && el.firstElementChild) {
      el = el.firstElementChild;
      r = el.getBoundingClientRect();
    }
    if (r.width === 0 && r.height === 0) return;
    setRect(r);
    setIsOpen(true);
    // Singleton — close any other open hover card before showing this one.
    acquireHoverSlot(close);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled]);

  const close = useCallback(() => {
    setIsOpen(false);
    setRect(null);
    releaseHoverSlot(close);
  }, []);

  const handleTriggerEnter = useCallback(() => {
    window.clearTimeout(leaveTimer.current);
    enterTimer.current = window.setTimeout(open, ENTER_DELAY);
  }, [open]);

  const handleTriggerLeave = useCallback(() => {
    window.clearTimeout(enterTimer.current);
    leaveTimer.current = window.setTimeout(close, LEAVE_GRACE);
  }, [close]);

  const handleCardEnter = useCallback(() => {
    window.clearTimeout(leaveTimer.current);
  }, []);

  // Cleanup pending timers + release singleton slot on unmount.
  useEffect(() => {
    return () => {
      window.clearTimeout(enterTimer.current);
      window.clearTimeout(leaveTimer.current);
      releaseHoverSlot(close);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Safety net: while the card is open, listen at the document level for the
  // cursor leaving both the trigger AND the portaled card. Required because
  // (a) the trigger can unmount under the cursor when its kanban card is
  // virtualized out, so no `mouseleave` ever fires; (b) the browser can drop
  // `mouseleave`/`mouseenter` pairs when the cursor crosses the 8px gap
  // between trigger and card too fast. Without this listener the portal can
  // be left open until page refresh.
  //
  // The watchdog arms only on the first cursor transition after open — that
  // first event records the cursor's location but cannot trigger a close on
  // its own. Only subsequent transitions can schedule the close. This avoids
  // false dismissals if the very first mouseover after open lands outside.
  useEffect(() => {
    if (!isOpen) return;
    let armed = false;
    let inside = true;
    const handler = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (!target) return;
      const inTrigger = !!triggerRef.current?.contains(target);
      const inCard = !!(target.closest && target.closest('[data-hover-portal="true"]'));
      const nowInside = inTrigger || inCard;
      if (!armed) {
        armed = true;
        inside = nowInside;
        return;
      }
      if (nowInside && !inside) {
        window.clearTimeout(leaveTimer.current);
        inside = true;
      } else if (!nowInside && inside) {
        window.clearTimeout(leaveTimer.current);
        leaveTimer.current = window.setTimeout(close, LEAVE_GRACE);
        inside = false;
      }
    };
    document.addEventListener('mouseover', handler);
    return () => document.removeEventListener('mouseover', handler);
  }, [isOpen, close]);

  // Second safety net: if the trigger element gets removed from the DOM
  // (e.g. virtualizer scrolls its parent card out, or the underlying data
  // changes and the chip unmounts) AND the cursor doesn't move, no mouseover
  // event will ever fire and the document-level watchdog above can't see it.
  // Poll every 500ms while open and force-close if the trigger is gone.
  useEffect(() => {
    if (!isOpen) return;
    const id = window.setInterval(() => {
      const el = triggerRef.current;
      if (!el || !document.body.contains(el)) close();
    }, 500);
    return () => window.clearInterval(id);
  }, [isOpen, close]);

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={handleTriggerEnter}
        onMouseLeave={handleTriggerLeave}
        onMouseOver={handleTriggerEnter}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 12,
          minWidth: 0,
          flex: '1 1 auto',
        }}
      >
        {children}
      </span>
      {isOpen && rect && (
        <HoverCardContent
          issueKey={issueKey}
          rect={rect}
          onMouseEnter={handleCardEnter}
          onMouseLeave={handleTriggerLeave}
          onClose={close}
          onOpenLinks={openLinksModal}
        />
      )}
      <ModalTransition>
        {linksOpen && (
          <ModalDialog onClose={() => setLinksOpen(false)} width="medium">
            <ModalHeader>
              <ModalTitle>Related links</ModalTitle>
            </ModalHeader>
            <ModalBody>
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '40px 16px', gap: 16, textAlign: 'center',
              }}>
                <div style={{
                  width: 80, height: 80, borderRadius: '50%',
                  background: token('color.background.neutral', 'var(--ds-background-neutral, #F1F2F4)'),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: token('color.text.subtlest', 'var(--ds-text-disabled, #8590A2)'),
                }}>
                  <QuestionIcon label="" size="xlarge" />
                </div>
                <div>
                  <div style={{
                    fontSize: 16, fontWeight: 600,
                    color: token('color.text', 'var(--ds-text, #172B4D)'),
                    marginBottom: 8,
                  }}>
                    We couldn't find any related links
                  </div>
                  <div style={{
                    fontSize: 14,
                    color: token('color.text.subtle', 'var(--ds-icon-subtle, #626F86)'),
                    maxWidth: 360,
                  }}>
                    We continuously review and add related links for updated pages or other content types
                  </div>
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button appearance="primary" onClick={() => setLinksOpen(false)}>
                Close
              </Button>
            </ModalFooter>
          </ModalDialog>
        )}
      </ModalTransition>
    </>
  );
}

// Inject fade keyframes once (module load).
if (typeof document !== 'undefined' && !document.getElementById('jc-hover-fade-css')) {
  const style = document.createElement('style');
  style.id = 'jc-hover-fade-css';
  style.textContent = `@keyframes jcHoverFade { from { opacity: 0; transform: translateY(-2px); } to { opacity: 1; transform: translateY(0); } }`;
  document.head.appendChild(style);
}

export default IssueHoverCard;
