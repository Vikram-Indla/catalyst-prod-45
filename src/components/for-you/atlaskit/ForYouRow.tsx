/**
 * ForYouRow — shared row primitive for every For You tab.
 *
 * Matches Jira's For You row spec (April 2026):
 *   56px tall · 32px work-item-icon tile · WorkItem title · project badge
 *   · assignee avatar · updated-at · hover-reveal star
 *
 * Used by: RecommendedPanel, AssignedPanel, StarredPanel, WorkedOnPanel,
 * ViewedPanel. The consumer passes `alwaysShowStar` (Starred tab: true, all
 * others: false — star hovers in like Jira).
 *
 * Atlaskit policy
 * ───────────────
 * CLAUDE.md §1 says Atlaskit adoption is encouraged wherever an Atlaskit
 * primitive exists for the role. That applies strongly to interactive
 * components (Avatar, Lozenge, Tooltip) and weakly to layout wrappers —
 * Atlaskit's own components use plain DOM + tokenised inline styles for
 * their row-level scaffolding (see DirectNotificationRow.tsx in this repo).
 * We follow that pattern here: plain <div> + tokens for layout, Atlaskit
 * primitives for the pieces that carry visual/semantic meaning.
 *
 * Icon policy
 * ───────────
 *  - Left 32px tile = <WorkItemIcon> (IMMUTABLE per CLAUDE.md §11) — the
 *    work-item TYPE icon (task/story/epic/etc). Never a project glyph here.
 *  - Project breadcrumb is plain subtle text next to the key — Jira's
 *    /jira/for-you DOM (April 2026) renders no icon and no pill in the
 *    row's project slot, just text in `color.text.subtle`.
 *
 * Star behavior
 * ─────────────
 *  - Default: star sits at opacity:0, shows at opacity:1 when the row is
 *    hovered or focused.
 *  - When the item is already starred, the button stays visible (gold).
 *  - `alwaysShowStar` pins the whole list to visible, used by the Starred
 *    tab so it reads "these are all starred" at a glance.
 *
 * Click behavior
 * ──────────────
 *  - Row click → onSelect(item) (caller opens detail panel + records view)
 *  - Enter/Space → same
 *  - Star click → stopPropagation + onToggleStar(item.id)
 */
import React, { memo, useCallback, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { token } from '@atlaskit/tokens';
import Avatar from '@atlaskit/avatar';
import Lozenge from '@atlaskit/lozenge';
import Tooltip from '@atlaskit/tooltip';
import { Star, StarOff } from '@/lib/atlaskit-icons';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { resolveAvatarUrl } from '@/lib/avatars';
import type { WorkItem } from '@/hooks/useForYouData';

interface ForYouRowProps {
  item: WorkItem;
  /** Starred tab pins the star to always-visible gold. */
  alwaysShowStar?: boolean;
  onSelect?: (item: WorkItem) => void;
  onToggleStar?: (id: string) => void;
  /** Suppress the project breadcrumb if the surrounding card already names it. */
  hideProject?: boolean;
  /**
   * Optional AI-Recap-style action fragment appended to the meta row as an
   * additional subtle span (truncated + tooltipped). Keeps AI Recap rows
   * visually identical to Assigned rows while preserving the digest's
   * actionable intent. Omit for all other tabs — they stay unchanged.
   */
  suggestion?: string;
}

// ─── Status → Atlaskit Lozenge mapping ───────────────────────────────────────
// Mirrors CLAUDE.md §5 — 3-color guardrail. Atlaskit Lozenge's appearance
// prop already enforces the correct hex via tokens, so we route status into
// 'default' | 'inprogress' | 'success' and never set custom colors.
type LozengeAppearance = 'default' | 'inprogress' | 'success' | 'removed' | 'moved' | 'new';

function statusToAppearance(status: string, category?: string): LozengeAppearance {
  // CLAUDE.md 2026-05-08 lesson: status colors must come from the status
  // CATEGORY (To Do / In Progress / Done), not text inference. BAU's
  // "In Design" sits in the To Do category and renders grey in Jira — a
  // string match on "design" → 'inprogress' (blue) was the legacy bug.
  // Honor `status_category` when present; only fall back to string inference
  // for rows that arrive without a category (planner_task, native items).
  const cat = (category || '').toLowerCase();
  if (cat === 'done') return 'success';
  if (cat === 'in progress' || cat === 'in_progress' || cat === 'indeterminate') return 'inprogress';
  if (cat === 'to do' || cat === 'to_do' || cat === 'new') return 'default';

  const s = (status || '').toLowerCase();
  if (s.includes('done') || s.includes('approved') || s.includes('complet') || s === 'closed') return 'success';
  if (
    s.includes('progress') || s.includes('review') || s.includes('active') ||
    s === 'in dev' || s.includes('integration') || s.includes('development') ||
    s.includes('testing') || s.includes('staging') || s.includes('in qa') ||
    s.includes('deployed')
  ) return 'inprogress';
  // "In Design" intentionally NOT in the inprogress list — BAU project keeps
  // it in the To Do category. Per-project status taxonomy means we should
  // never blanket-color a status by its label alone.
  if (s.includes('re-open') || s.includes('reopen') || s.includes('blocked') || s.includes('on hold')) return 'moved';
  return 'default';
}

// ─── Component ───────────────────────────────────────────────────────────────

function ForYouRowImpl({ item, alwaysShowStar = false, onSelect, onToggleStar, hideProject = false, suggestion }: ForYouRowProps) {
  const avatarUrl = resolveAvatarUrl(item.assignee.name) || undefined;
  const isStarred = !!item.starred;
  const [isActive, setIsActive] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const handleClick = useCallback(() => {
    onSelect?.(item);
  }, [item, onSelect]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect?.(item);
    }
  }, [item, onSelect]);

  const handleStarClick = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onToggleStar?.(item.id);
  }, [item.id, onToggleStar]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsActive(true)}
      onMouseLeave={() => setIsActive(false)}
      onFocus={() => { setIsActive(true); setIsFocused(true); }}
      onBlur={() => { setIsActive(false); setIsFocused(false); }}
      aria-label={`${item.key} ${item.summary}`}
      data-testid="for-you-row"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: token('space.200', '16px'),
        height: 56,
        paddingInline: token('space.200', '16px'),
        paddingBlock: token('space.150', '12px'),
        borderRadius: 8,
        cursor: 'pointer',
        backgroundColor: isActive
          ? token('elevation.surface.hovered', 'rgba(9,30,66,0.06)')
          : 'transparent',
        color: token('color.text', '#292A2E'),
        transition: 'background-color 150ms cubic-bezier(0.15, 1, 0.3, 1), box-shadow 120ms ease',
        outline: 'none',
        // WCAG 2.4.7 — keyboard focus indicator. ADS border.focused (#388BFF)
        // routed via inset ring so it sits on top of the row's hover bg without
        // shifting layout. Only renders on actual keyboard focus, not hover.
        boxShadow: isFocused
          ? `inset 0 0 0 2px ${token('color.border.focused', '#388BFF')}`
          : 'none',
        minWidth: 0,
      }}
    >
      {/* Left — work item type icon, no background tile (Jira parity) */}
      <div style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <JiraIssueTypeIcon type={item.issueType ?? 'Task'} size={20} />
      </div>

      {/* Main body */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: token('space.025', '2px') }}>
        <div
          style={{
            // Jira renders the For You row summary at 14/400, NOT 500.
            // The earlier 500 made Catalyst rows read one weight heavier
            // than the Jira reference.
            font: `400 14px/20px "Inter", system-ui, sans-serif`,
            color: token('color.text', '#292A2E'),
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            letterSpacing: 0,
          }}
        >
          {item.summary || item.key}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: token('space.100', '8px'), flexWrap: 'wrap' }}>
          <span
            style={{
              // Key is the primary identifier — render at color.text.subtle
              // so it sits above project name in the meta-row hierarchy.
              font: `400 12px/16px "Inter", system-ui, sans-serif`,
              color: token('color.text.subtle', '#44546F'),
              letterSpacing: 0,
            }}
          >
            {item.key}
          </span>
          {!hideProject && (
            // Project name uses `color.text.subtlest` — one tier below the key.
            // Earlier both spans were `color.text.subtle`, flattening hierarchy.
            <Tooltip content={item.project}>
              <span
                style={{
                  font: `400 12px/16px "Inter", system-ui, sans-serif`,
                  color: token('color.text.subtlest', '#626F86'),
                  maxWidth: 180,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.project}
              </span>
            </Tooltip>
          )}
          {item.status && (
            // data-cp-lozenge-jira-parity: activates the index.css override that
            // strips text-transform:uppercase + letter-spacing from Atlaskit's
            // inner label span (jira-compare 2026-04-28 lesson).
            <span data-cp-lozenge-jira-parity>
              <Lozenge appearance={statusToAppearance(item.status, item.statusCategory)}>{item.status}</Lozenge>
            </span>
          )}
          <span
            style={{
              font: `400 12px/16px "Inter", system-ui, sans-serif`,
              color: token('color.text.subtlest', '#626F86'),
            }}
          >
            · {item.updatedAt}
          </span>
          {suggestion && (
            // AI Recap meta fragment: 12/16/400, color.text.subtle (same as
            // meta siblings), max-width to prevent the row pushing wider
            // than Jira's 920px feed. Tooltip shows the full text on hover
            // so nothing gets permanently clipped. Inherits elevation tokens
            // from the parent row — zero bespoke color.
            <Tooltip content={suggestion}>
              <span
                style={{
                  font: `400 12px/16px "Inter", system-ui, sans-serif`,
                  color: token('color.text.subtle', '#626F86'),
                  maxWidth: 260,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                · {suggestion}
              </span>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Trailing: assignee + star (star omitted when caller passes no onToggleStar) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: token('space.100', '8px'), flexShrink: 0 }}>
        <Tooltip content={item.assignee.name}>
          <span>
            <Avatar size="small" src={avatarUrl} name={item.assignee.name} />
          </span>
        </Tooltip>
        {onToggleStar && (
          <StarButton
            isStarred={isStarred}
            alwaysVisible={alwaysShowStar || isStarred || isActive}
            onClick={handleStarClick}
          />
        )}
      </div>
    </div>
  );
}

export default memo(ForYouRowImpl);

// ─── Star button ─────────────────────────────────────────────────────────────

const GOLD = token('color.icon.accent.yellow', '#FFAB00');

function StarButton({
  isStarred,
  alwaysVisible,
  onClick,
}: {
  isStarred: boolean;
  alwaysVisible: boolean;
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
}) {
  const [hover, setHover] = useState(false);
  const [focused, setFocused] = useState(false);
  // WCAG 2.4.7 — keyboard users must see the star they're focused on, even if
  // the row isn't hovered. Previously opacity:0 made the button invisible to
  // keyboard navigation despite remaining in the tab order.
  const isVisible = alwaysVisible || focused;
  return (
    <Tooltip content={isStarred ? 'Unstar' : 'Star'}>
      <button
        type="button"
        onClick={onClick}
        aria-label={isStarred ? 'Unstar' : 'Star'}
        aria-pressed={isStarred}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: 28,
          height: 28,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: hover
            ? token('color.background.neutral.subtle.hovered', 'rgba(9,30,66,0.06)')
            : 'transparent',
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer',
          opacity: isVisible ? 1 : 0,
          transition: 'opacity 150ms cubic-bezier(0.15, 1, 0.3, 1), background-color 150ms cubic-bezier(0.15, 1, 0.3, 1), box-shadow 120ms ease',
          padding: 0,
          color: isStarred ? GOLD : token('color.icon.subtle', '#6B778C'),
          outline: 'none',
          boxShadow: focused
            ? `0 0 0 2px ${token('color.border.focused', '#388BFF')}`
            : 'none',
        }}
      >
        {isStarred ? (
          <Star size={16} fill={GOLD} stroke={GOLD} strokeWidth={1.5} />
        ) : (
          <StarOff size={16} strokeWidth={1.5} />
        )}
      </button>
    </Tooltip>
  );
}
