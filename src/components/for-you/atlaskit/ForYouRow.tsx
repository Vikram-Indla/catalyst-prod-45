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
import React, { memo, useCallback, useState, useRef, useEffect, useLayoutEffect, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { token } from '@atlaskit/tokens';
import CatalystAvatar from '@/components/shared/CatalystAvatar';
import { StatusLozenge } from '@/components/shared/StatusLozenge';
import Tooltip from '@atlaskit/tooltip';
import { Star, StarOff } from '@/lib/atlaskit-icons';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { resolveAvatarUrl } from '@/lib/avatars';
import type { WorkItem } from '@/hooks/useForYouData';

export interface ForYouRowAction {
  id: string;
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  onClick: () => void;
}

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
  /**
   * 2026-05-17 jira-compare — Jira's /jira/for-you "Assigned to me" tab
   * renders rows as `[icon] {summary} / {Type · Key · Project} ... [LOZENGE →]`
   * with NO avatar, NO star, NO updatedAt visible. `variant="jira-assigned"`
   * is the strict Jira clone used by AssignedPanel. Other tabs keep the
   * default feed layout (avatar + star + relative time + inline lozenge).
   */
  variant?: 'default' | 'jira-assigned';
  /** Row-level action menu (hover-reveal ⋯ button). Same pattern as JiraTable makeRowActionsCell. */
  actions?: ForYouRowAction[];
}

// ─── Component ───────────────────────────────────────────────────────────────

function ForYouRowImpl({ item, alwaysShowStar = false, onSelect, onToggleStar, hideProject = false, suggestion, variant = 'default', actions }: ForYouRowProps) {
  const isJiraAssigned = variant === 'jira-assigned';
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
        // 2026-05-17 LIVE Jira probe: row is 62px tall, padding 12/16,
        // gap 16px, border-radius 8px, NO border-bottom. Earlier I added a
        // 1px border-bottom + radius 0 based on the static screenshot — the
        // live DOM has neither.
        height: isJiraAssigned ? 62 : 56,
        paddingInline: token('space.200', '16px'),
        paddingBlock: token('space.150', '12px'),
        borderRadius: 8,
        borderBottom: 'none',
        cursor: 'pointer',
        backgroundColor: isActive
          ? token('elevation.surface.hovered', 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))')
          : 'transparent',
        color: token('color.text', 'var(--ds-text)'),
        transition: 'background-color 150ms cubic-bezier(0.15, 1, 0.3, 1), box-shadow 120ms ease',
        outline: 'none',
        // WCAG 2.4.7 — keyboard focus indicator. ADS border.focused (var(--ds-border-focused))
        // routed via inset ring so it sits on top of the row's hover bg without
        // shifting layout. Only renders on actual keyboard focus, not hover.
        boxShadow: isFocused
          ? `inset 0 0 0 2px ${token('color.border.focused', 'var(--ds-border-focused)')}`
          : 'none',
        minWidth: 0,
      }}
    >
      {/* Left — work item type icon.
          jira-assigned variant: 32x32 rounded grey tile (border-radius 25%)
          containing the type icon. Confirmed via 2026-05-17 LIVE Jira DOM
          probe: tile bg `var(--ds-shadow-overlay, rgba(5,21,36,0.06))`, dimensions 32px square.
          Default variant: 20px naked icon (legacy compact rail layout). */}
      {isJiraAssigned ? (
        <div className="cp-feed-type-tile" style={{
          width: 32,
          height: 32,
          borderRadius: '25%',
          backgroundColor: token('color.background.neutral', 'rgba(5,21,36,0.06)'),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {/* Zero-assumption: render no icon when the type is unknown rather
              than lying with a default 'Task' (CLAUDE.md lie-vs-silence). */}
          {item.issueType ? <JiraIssueTypeIcon type={item.issueType} size={20} /> : null}
        </div>
      ) : (
        <div style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {item.issueType ? <JiraIssueTypeIcon type={item.issueType} size={20} /> : null}
        </div>
      )}

      {/* Main body */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: token('space.025', '2px') }}>
        <div
          style={{
            // 2026-05-17 LIVE Jira probe: title is 500/14/20 (NOT 400).
            // A prior comment claimed 400 was correct — live DOM disproves
            // that. The user-visible weight in Jira's For You is medium 500.
            font: `${isJiraAssigned ? 500 : 400} 14px/20px var(--ds-font-family-body, "Atlassian Sans"), ui-sans-serif, sans-serif`,
            color: token('color.text', 'var(--ds-text)'),
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            letterSpacing: 0,
          }}
        >
          {item.summary || item.key}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: token('space.100', '8px'), flexWrap: 'wrap' }}>
          {isJiraAssigned && item.issueType && (
            // Jira's /jira/for-you Assigned tab renders the issuetype NAME as
            // the leading meta token: "Epic · MWR-754 · MIM Website Revamp".
            <span
              style={{
                font: `400 12px/16px var(--ds-font-family-body, "Atlassian Sans"), ui-sans-serif, sans-serif`,
                color: token('color.text.subtlest', 'var(--ds-icon-subtle)'),
                letterSpacing: 0,
              }}
            >
              {item.issueType}
            </span>
          )}
          {isJiraAssigned && item.issueType && (
            <span
              aria-hidden="true"
              style={{
                font: `400 12px/16px var(--ds-font-family-body, "Atlassian Sans"), ui-sans-serif, sans-serif`,
                color: token('color.text.subtlest', 'var(--ds-icon-subtle)'),
              }}
            >
              ·
            </span>
          )}
          <span
            style={{
              // Key is the primary identifier — render at color.text.subtle
              // so it sits above project name in the meta-row hierarchy.
              font: `400 12px/16px var(--ds-font-family-body, "Atlassian Sans"), ui-sans-serif, sans-serif`,
              color: token('color.text.subtle', 'var(--cp-text-secondary, var(--cp-text-secondary))'),
              letterSpacing: 0,
            }}
          >
            {item.key}
          </span>
          {!hideProject && (
            <Tooltip content={item.project}>
              <span
                style={{
                  font: `500 12px/16px var(--ds-font-family-body, "Atlassian Sans"), ui-sans-serif, sans-serif`,
                  color: token('color.link', 'var(--ds-link)'),
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
          {/* Inline lozenge + updatedAt — DEFAULT VARIANT ONLY.
              Jira-assigned variant moves the lozenge to the trailing slot
              (right-edge, marginLeft:auto) per /jira/for-you DOM. */}
          {!isJiraAssigned && item.status && (
            <StatusLozenge status={item.status} statusCategory={item.statusCategory} />
          )}
          {!isJiraAssigned && (
            <span
              style={{
                font: `400 12px/16px var(--ds-font-family-body, "Atlassian Sans"), ui-sans-serif, sans-serif`,
                color: token('color.text.subtlest', 'var(--ds-icon-subtle)'),
              }}
            >
              · {item.updatedAt}
            </span>
          )}
          {suggestion && (
            // AI Recap meta fragment: 12/16/400, color.text.subtle (same as
            // meta siblings), max-width to prevent the row pushing wider
            // than Jira's 920px feed. Tooltip shows the full text on hover
            // so nothing gets permanently clipped. Inherits elevation tokens
            // from the parent row — zero bespoke color.
            <Tooltip content={suggestion}>
              <span
                style={{
                  font: `400 12px/16px var(--ds-font-family-body, "Atlassian Sans"), ui-sans-serif, sans-serif`,
                  color: token('color.text.subtle', 'var(--ds-icon-subtle)'),
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

      {/* Trailing slot
          ───────────────
          jira-assigned variant: status Lozenge right-aligned, NO avatar, NO star
          (matches /jira/for-you Assigned tab DOM 2026-05-17).
          default variant: assignee Avatar + star (star omitted when no onToggleStar). */}
      {isJiraAssigned ? (
        item.status && <StatusLozenge status={item.status} statusCategory={item.statusCategory} />
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: token('space.100', '8px'), flexShrink: 0 }}>
          <Tooltip content={item.assignee.name}>
            <span>
              <CatalystAvatar size="small" src={avatarUrl} name={item.assignee.name} />
            </span>
          </Tooltip>
          {actions && actions.length > 0 && (
            <RowActionsMenu actions={actions} isRowHovered={isActive} />
          )}
          {onToggleStar && (
            <StarButton
              isStarred={isStarred}
              alwaysVisible={alwaysShowStar || isStarred || isActive}
              onClick={handleStarClick}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Row actions menu (⋯ hover-reveal) ──────────────────────────────────────
// Mirrors EditorPopover + MenuItemBtn pattern from JiraTable/editors.tsx.
// Portal-based so it escapes any overflow:hidden container.
function RowActionsMenu({ actions, isRowHovered }: { actions: ForYouRowAction[]; isRowHovered: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ top: number; right: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);

  const isVisible = isRowHovered || isOpen || focused;

  useLayoutEffect(() => {
    if (!isOpen) return;
    const update = () => {
      const t = triggerRef.current;
      if (!t) return;
      const r = t.getBoundingClientRect();
      setAnchor({ top: r.bottom + 4, right: window.innerWidth - r.right });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e: globalThis.MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (popRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); setIsOpen(false); }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [isOpen]);

  const normal = actions.filter(a => !a.danger);
  const danger = actions.filter(a => a.danger);

  return (
    <>
      <Tooltip content="More actions">
        <button
          ref={triggerRef}
          type="button"
          aria-label="More actions"
          onClick={(e) => { e.stopPropagation(); setIsOpen(v => !v); }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: 28,
            height: 28,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 4,
            border: 'none',
            background: 'transparent',
            color: token('color.icon.subtle', 'var(--ds-text-subtlest)'),
            cursor: 'pointer',
            opacity: isVisible ? 1 : 0,
            transition: 'opacity 100ms, background 100ms',
            padding: 0,
            outline: 'none',
            boxShadow: focused
              ? `0 0 0 2px ${token('color.border.focused', 'var(--ds-border-focused)')}`
              : 'none',
          }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = token('color.background.neutral.subtle.hovered', 'var(--ds-background-neutral-subtle, var(--ds-background-neutral-subtle))'))}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="5" cy="12" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="19" cy="12" r="2" />
          </svg>
        </button>
      </Tooltip>
      {isOpen && anchor && createPortal(
        <div
          ref={popRef}
          role="menu"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: anchor.top,
            right: anchor.right,
            zIndex: 1000,
            minWidth: 180,
            background: token('elevation.surface.overlay', 'var(--ds-surface)'),
            border: `1px solid ${token('color.border', 'var(--ds-border)')}`,
            borderRadius: 4,
            boxShadow: token('elevation.shadow.overlay', '0 1px 1px var(--ds-shadow-raised, rgba(9,30,66,0.25)), 0 8px 24px -4px var(--ds-shadow-raised, rgba(9,30,66,0.18))'),
            padding: 4,
            fontFamily: '"Atlassian Sans", ui-sans-serif, -apple-system, "system-ui", sans-serif',
            color: token('color.text', 'var(--ds-text)'),
          }}
        >
          {normal.map(a => (
            <button
              key={a.id}
              type="button"
              role="menuitem"
              onClick={() => { a.onClick(); setIsOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', padding: '8px 8px', border: 'none',
                background: 'transparent', color: token('color.text', 'var(--ds-text)'),
                fontSize: 'var(--ds-font-size-400)', textAlign: 'left', cursor: 'pointer',
                fontFamily: 'inherit', borderRadius: 3, outline: 'none',
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = token('color.background.neutral.subtle.hovered', 'var(--ds-background-neutral-subtle, var(--ds-background-neutral-subtle))'))}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
            >
              {a.icon}
              <span style={{ flex: 1 }}>{a.label}</span>
            </button>
          ))}
          {danger.length > 0 && (
            <>
              <div style={{ height: 1, background: token('color.border', 'var(--ds-border)'), margin: '4px 0' }} />
              {danger.map(a => (
                <button
                  key={a.id}
                  type="button"
                  role="menuitem"
                  onClick={() => { a.onClick(); setIsOpen(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', padding: '8px 8px', border: 'none',
                    background: 'transparent', color: token('color.text.danger', 'var(--ds-text-danger)'),
                    fontSize: 'var(--ds-font-size-400)', textAlign: 'left', cursor: 'pointer',
                    fontFamily: 'inherit', borderRadius: 3, outline: 'none',
                  }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = token('color.background.danger', 'var(--ds-background-danger, var(--ds-background-danger))'))}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                >
                  {a.icon}
                  <span style={{ flex: 1 }}>{a.label}</span>
                </button>
              ))}
            </>
          )}
        </div>,
        document.body,
      )}
    </>
  );
}


export default memo(ForYouRowImpl);

// Deprecated alias — kept for back-compat with existing imports (StarredHubList,
// CatyStarredDigest, AgeingPanel). Use `StatusLozenge` from
// `@/components/shared/StatusLozenge` directly. Slated for removal once all
// callers migrate (CAT-ADS-STATUSPILL-UNIFY-20260629-001).
export { StatusLozenge as JiraForYouLozenge } from '@/components/shared/StatusLozenge';

// ─── Star button ─────────────────────────────────────────────────────────────

const GOLD = token('color.icon.accent.yellow', 'var(--ds-background-warning-bold)');

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
            ? token('color.background.neutral.subtle.hovered', 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))')
            : 'transparent',
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer',
          opacity: isVisible ? 1 : 0,
          transition: 'opacity 150ms cubic-bezier(0.15, 1, 0.3, 1), background-color 150ms cubic-bezier(0.15, 1, 0.3, 1), box-shadow 120ms ease',
          padding: 0,
          color: isStarred ? GOLD : token('color.icon.subtle', 'var(--ds-text-subtlest)'),
          outline: 'none',
          boxShadow: focused
            ? `0 0 0 2px ${token('color.border.focused', 'var(--ds-border-focused)')}`
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
