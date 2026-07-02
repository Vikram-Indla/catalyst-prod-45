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
 * 2 actions: Copy link · View related links.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { acquire as acquireHoverSlot, release as releaseHoverSlot } from '@/lib/hover-card-singleton';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { token } from '@atlaskit/tokens';
import Spinner from '@atlaskit/spinner';
import Lozenge from '@atlaskit/lozenge';
import CatalystAvatar from '@/components/shared/CatalystAvatar';
import CopyIcon from '@atlaskit/icon/glyph/copy';
import RecentIcon from '@atlaskit/icon/glyph/recent';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import ShortcutIcon from '@atlaskit/icon/glyph/shortcut';
import QuestionIcon from '@atlaskit/icon/glyph/question-circle';
import ModalDialog, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import { catalystToast } from '@/lib/catalystToast';
import { supabase } from '@/integrations/supabase/client';
import { useGlobalSearchStore } from '@/store/globalSearchStore';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { useLinkedWorkItems } from '@/modules/project-work-hub/components/linked-work-items/hooks';
import type { LinkedWorkItem } from '@/modules/project-work-hub/components/linked-work-items/types';

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
  if (v.includes('highest') || v.includes('blocker')) return 'var(--ds-background-danger-bold)';
  if (v.includes('high')) return 'var(--ds-background-danger-bold)';
  if (v.includes('medium')) return 'var(--ds-text-warning)';
  if (v.includes('low')) return 'var(--ds-text-success)';
  if (v.includes('lowest')) return 'var(--ds-text-success)';
  return 'var(--ds-text-subtlest)';
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

// ─── Related Links Modal ──────────────────────────────────────────────────────

interface RelatedLinksModalProps {
  issueKey: string;
  onClose: () => void;
}

function RelatedLinksModal({ issueKey, onClose }: RelatedLinksModalProps) {
  const navigate = useNavigate();
  const { data: links, isLoading } = useLinkedWorkItems(issueKey);

  const handleItemClick = (item: LinkedWorkItem) => {
    const targetKey = item.source_id === issueKey ? item.target_id : item.source_id;
    const projectKey = item.target?.project_key;
    const route = projectKey
      ? `/project-hub/${projectKey}/allwork/${encodeURIComponent(targetKey)}`
      : `/browse/${encodeURIComponent(targetKey)}`;
    navigate(route);
    onClose();
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 16px' }}>
        <Spinner size="medium" />
      </div>
    );
  }

  if (!links?.length) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '40px 16px', gap: 16, textAlign: 'center',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: token('color.background.neutral', 'var(--ds-background-neutral)'),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: token('color.text.subtlest', 'var(--ds-text-subtlest)'),
        }}>
          <QuestionIcon label="" size="xlarge" />
        </div>
        <div>
          <div style={{
            fontSize: 'var(--ds-font-size-200)', fontWeight: 600,
            color: token('color.text', 'var(--ds-text)'),
            marginBottom: 6,
          }}>
            No related links found
          </div>
          <div style={{
            fontSize: 'var(--ds-font-size-100)',
            color: token('color.text.subtle', 'var(--ds-text-subtle)'),
            maxWidth: 320,
          }}>
            This issue has no linked issues in Catalyst.
          </div>
        </div>
      </div>
    );
  }

  const groups: Record<string, LinkedWorkItem[]> = {};
  for (const item of links) {
    const label = item.link_type || 'relates to';
    if (!groups[label]) groups[label] = [];
    groups[label].push(item);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {Object.entries(groups).map(([label, items]) => (
        <div key={label} style={{ marginBottom: 16 }}>
          <div style={{
            fontSize: 'var(--ds-font-size-075)', fontWeight: 600,
            color: token('color.text.subtle', 'var(--ds-text-subtle)'),
            textTransform: 'uppercase', letterSpacing: '0.04em',
            marginBottom: 6,
          }}>
            {label}
          </div>
          {items.map((item) => {
            const targetKey = item.source_id === issueKey ? item.target_id : item.source_id;
            const t = item.target;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '6px 8px',
                  background: 'transparent', border: 'none', borderRadius: 3,
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                {t?.issue_type && (
                  <span style={{ flexShrink: 0 }}>
                    <JiraIssueTypeIcon issueType={t.issue_type} size={16} />
                  </span>
                )}
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{
                    fontSize: 'var(--ds-font-size-100)', fontWeight: 500,
                    color: token('color.link', 'var(--ds-link)'),
                  }}>
                    {targetKey}
                  </span>
                  {t?.summary && (
                    <span style={{
                      fontSize: 'var(--ds-font-size-100)', fontWeight: 400,
                      color: token('color.text', 'var(--ds-text)'),
                      marginLeft: 4,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      display: 'inline-block', maxWidth: 280, verticalAlign: 'bottom',
                    }}>
                      {t.summary}
                    </span>
                  )}
                </span>
                {t?.status && (
                  <span style={{ flexShrink: 0 }}>
                    <Lozenge appearance={statusCategoryToAppearance(t.status_category)}>
                      {t.status}
                    </Lozenge>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── Hover Card Content ───────────────────────────────────────────────────────

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
  const queryClient = useQueryClient();
  const { data, isLoading } = useHoverIssue(issueKey, true);
  const [copied, setCopied] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [statusDropdownAnchor, setStatusDropdownAnchor] = useState<{ top: number; left: number } | null>(null);
  const statusDropdownRef = useRef<HTMLButtonElement | null>(null);
  const [priorityDropdownOpen, setPriorityDropdownOpen] = useState(false);
  const [priorityDropdownAnchor, setPriorityDropdownAnchor] = useState<{ top: number; left: number } | null>(null);
  const priorityDropdownRef = useRef<HTMLButtonElement | null>(null);

  // Placement: pick the side with more room. Anchor by bottom when above so the
  // card grows upward; anchor by top when below so it grows downward. Constrain
  // maxHeight to available space so the card never spills past the viewport.
  const viewportH = window.innerHeight;
  const viewportW = window.innerWidth;
  const spaceBelow = viewportH - rect.bottom - POPUP_OFFSET - 8;
  const spaceAbove = rect.top - POPUP_OFFSET - 8;
  const placeAbove = spaceAbove > spaceBelow;
  const cardMaxH = Math.min(560, placeAbove ? spaceAbove : spaceBelow);
  // When above: bottom edge anchors at trigger top; card grows upward.
  // When below: top edge anchors at trigger bottom; card grows downward.
  const posStyle: React.CSSProperties = placeAbove
    ? { bottom: viewportH - rect.top + POPUP_OFFSET, top: 'auto' as const }
    : { top: rect.bottom + POPUP_OFFSET };
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

  const handleStatusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!statusDropdownRef.current) return;
    const r = statusDropdownRef.current.getBoundingClientRect();
    setStatusDropdownAnchor({ top: r.bottom + 4, left: r.left });
    setStatusDropdownOpen(!statusDropdownOpen);
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await supabase
        .from('ph_issues')
        .update({ status: newStatus })
        .eq('issue_key', issueKey);
      setStatusDropdownOpen(false);
      catalystToast.success(`Status updated to ${newStatus}`);
      queryClient.invalidateQueries({ queryKey: ['issue-hover-card', issueKey] });
    } catch (error) {
      catalystToast.error('Failed to update status');
    }
  };

  const handlePriorityClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!priorityDropdownRef.current) return;
    const r = priorityDropdownRef.current.getBoundingClientRect();
    setPriorityDropdownAnchor({ top: r.bottom + 4, left: r.left });
    setPriorityDropdownOpen(!priorityDropdownOpen);
  };

  const handlePriorityChange = async (newPriority: string) => {
    try {
      await supabase
        .from('ph_issues')
        .update({ priority: newPriority })
        .eq('issue_key', issueKey);
      setPriorityDropdownOpen(false);
      catalystToast.success(`Priority updated to ${newPriority}`);
      queryClient.invalidateQueries({ queryKey: ['issue-hover-card', issueKey] });
    } catch (error) {
      catalystToast.error('Failed to update priority');
    }
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
        ...posStyle,
        left,
        width: CARD_WIDTH,
        maxHeight: cardMaxH,
        overflowY: 'auto',
        zIndex: 100000,
        background: token('elevation.surface.overlay', 'var(--ds-surface)'),
        borderRadius: 8,
        boxShadow: 'var(--ds-shadow-overlay)',
        border: `1px solid ${token('color.border', 'var(--ds-border)')}`,
        padding: 16,
        fontFamily: 'var(--ds-font-family-body, inherit)',
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  aria-hidden
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 28, height: 28, borderRadius: 4, flexShrink: 0,
                    background: token('color.background.neutral', 'var(--ds-background-neutral)'),
                    color: token('color.text.subtle', 'var(--ds-icon-subtle)'),
                    fontSize: 'var(--ds-font-size-100)', fontWeight: 700,
                  }}
                >
                  ?
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span style={{
                    fontSize: 'var(--ds-font-size-100)', fontWeight: 600,
                    color: token('color.text', 'var(--ds-text)'),
                  }}>
                    {issueKey}
                  </span>
                  <span style={{
                    fontSize: 'var(--ds-font-size-075)',
                    color: token('color.text.subtle', 'var(--ds-icon-subtle)'),
                  }}>
                    Not synced to Catalyst{projectPrefix ? ` · ${projectPrefix} project` : ''}
                  </span>
                </div>
              </div>
              <div style={{
                borderTop: `1px solid ${token('color.border', 'var(--ds-border)')}`,
                paddingTop: 8,
              }}>
                <a
                  href={jiraUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    fontSize: 'var(--ds-font-size-100)',
                    color: token('color.link', 'var(--ds-link)'),
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
              <span style={{ flexShrink: 0, marginTop: 0 }}>
                <JiraIssueTypeIcon issueType={data.issue_type} size={16} />
              </span>
            )}
            <a
              href={issueUrl}
              onClick={handleTitle}
              style={{
                flex: 1,
                minWidth: 0,
                fontSize: 'var(--ds-font-size-200)',
                fontWeight: 600,
                lineHeight: 'var(--ds-font-line-height-200)',
                fontFamily: 'inherit',
                color: token('color.link', 'var(--ds-link)'),
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
              <CatalystAvatar size="small" name={assigneeName} />
            )}
            {data.status && (
              <button
                ref={statusDropdownRef}
                onClick={handleStatusClick}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0,
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  outline: 'none',
                }}
                title="Click to change status"
              >
                <Lozenge appearance={statusAppearance} isBold={lozengeBold}>
                  {data.status}
                </Lozenge>
                <span style={{ display: 'inline-flex', color: token('color.text.subtlest', 'var(--ds-icon-subtle)') }}>
                  <ChevronDownIcon label="" size="small" />
                </span>
              </button>
            )}
            {data.priority && (
              <button
                ref={priorityDropdownRef}
                onClick={handlePriorityClick}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  marginLeft: 4,
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  outline: 'none',
                }}
                title="Click to change priority"
              >
                <PriorityGlyph priority={data.priority} />
                <span style={{
                  fontSize: 'var(--ds-font-size-100)',
                  fontWeight: 400,
                  color: token('color.text.subtlest', 'var(--ds-icon-subtle)'),
                }}>
                  {data.priority}
                </span>
              </button>
            )}
          </div>

          {/* Description */}
          {description ? (
            <p
              style={{
                margin: 0,
                fontSize: 'var(--ds-font-size-100)',
                fontWeight: 400,
                lineHeight: 'var(--ds-font-line-height-100)',
                fontFamily: 'inherit',
                color: token('color.text', 'var(--ds-text)'),
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
            <button onClick={handleViewLinks} style={actionBtnStyle} aria-label="View related links">
              <RecentIcon label="" size="medium" />
              <span>View related links</span>
            </button>
          </div>

          {/* Source footer — divider above */}
          <div style={{
            borderTop: `1px solid ${token('color.border', 'var(--ds-border)')}`,
            marginTop: 4,
            paddingTop: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 'var(--ds-font-size-075)',
            color: token('color.text.subtle', 'var(--ds-icon-subtle)'),
          }}>
            <svg width="16" height="16" viewBox="0 0 512 512" aria-hidden style={{ flexShrink: 0 }}>
              <rect width="512" height="512" rx="129.62" fill="var(--ds-link)" />
              <path
                d="M421.802 200.297V93.9736H259.279L233.457 127.39L210.674 93.9736H154.474C39.037 223.992 106.375 363.833 154.474 417.501H421.802V309.659H279.025L236.495 374.972C170.878 271.686 209.155 173.97 236.495 138.022L279.025 200.297H421.802Z"
                fill="var(--ds-icon-inverse)"
              />
            </svg>
            <span>Catalyst{data.project_key ? ` · ${data.project_key}` : ''}</span>
          </div>
        </div>
      )}
      {statusDropdownOpen && statusDropdownAnchor && (
        createPortal(
          <div
            role="menu"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: statusDropdownAnchor.top,
              left: statusDropdownAnchor.left,
              minWidth: 160,
              background: token('elevation.surface.overlay', 'var(--ds-surface)'),
              border: `1px solid ${token('color.border', 'var(--ds-border)')}`,
              borderRadius: 4,
              boxShadow: 'var(--ds-shadow-overlay)',
              zIndex: 100001,
              padding: 4,
            }}
          >
            {['To Do', 'In Progress', 'Done'].map((status) => (
              <button
                key={status}
                role="menuitem"
                onClick={() => handleStatusChange(status)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  padding: '8px 12px',
                  background: data?.status === status ? token('color.background.selected', 'var(--ds-background-selected)') : 'transparent',
                  border: 'none',
                  borderRadius: 3,
                  cursor: 'pointer',
                  fontSize: 'var(--ds-font-size-100)',
                  fontWeight: 400,
                  color: token('color.text', 'var(--ds-text)'),
                  textAlign: 'left',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => {
                  if (data?.status !== status) {
                    e.currentTarget.style.background = token('color.background.neutral.subtle', 'var(--ds-background-neutral-subtle)');
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = data?.status === status ? token('color.background.selected', 'var(--ds-background-selected)') : 'transparent';
                }}
              >
                {status}
              </button>
            ))}
          </div>,
          document.body,
        )
      )}
      {priorityDropdownOpen && priorityDropdownAnchor && (
        createPortal(
          <div
            role="menu"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: priorityDropdownAnchor.top,
              left: priorityDropdownAnchor.left,
              minWidth: 160,
              background: token('elevation.surface.overlay', 'var(--ds-surface)'),
              border: `1px solid ${token('color.border', 'var(--ds-border)')}`,
              borderRadius: 4,
              boxShadow: 'var(--ds-shadow-overlay)',
              zIndex: 100001,
              padding: 4,
            }}
          >
            {['Highest', 'High', 'Medium', 'Low', 'Lowest'].map((priority) => (
              <button
                key={priority}
                role="menuitem"
                onClick={() => handlePriorityChange(priority)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  padding: '8px 12px',
                  background: data?.priority === priority ? token('color.background.selected', 'var(--ds-background-selected)') : 'transparent',
                  border: 'none',
                  borderRadius: 3,
                  cursor: 'pointer',
                  fontSize: 'var(--ds-font-size-100)',
                  fontWeight: 400,
                  color: token('color.text', 'var(--ds-text)'),
                  textAlign: 'left',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => {
                  if (data?.priority !== priority) {
                    e.currentTarget.style.background = token('color.background.neutral.subtle', 'var(--ds-background-neutral-subtle)');
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = data?.priority === priority ? token('color.background.selected', 'var(--ds-background-selected)') : 'transparent';
                }}
              >
                {priority}
              </button>
            ))}
          </div>,
          document.body,
        )
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
  padding: '4px 8px',
  background: 'transparent',
  border: 'none',
  borderRadius: 3,
  cursor: 'pointer',
  fontSize: 'var(--ds-font-size-100)',
  fontWeight: 400,
  lineHeight: 'var(--ds-font-line-height-100)',
  color: token('color.text', 'var(--ds-text)'),
  textAlign: 'left',
  fontFamily: 'inherit',
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
    // 0x0) so the card stays off-screen instead of clamping to top-left.
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
              <RelatedLinksModal issueKey={issueKey} onClose={() => setLinksOpen(false)} />
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
