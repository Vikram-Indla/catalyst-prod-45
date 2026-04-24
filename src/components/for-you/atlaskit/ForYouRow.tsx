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
 *  - Small inline project pill renders <ProjectKindIcon size=14> + project
 *    name, mirroring Jira's recent-work breadcrumb.
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
import { Star, StarOff } from 'lucide-react';
import WorkItemIcon, { normalizeIconType } from '@/components/shared/WorkItemIcon';
import ProjectKindIcon, { pickProjectKind } from '@/components/shared/ProjectKindIcon';
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
}

// ─── Status → Atlaskit Lozenge mapping ───────────────────────────────────────
// Mirrors CLAUDE.md §5 — 3-color guardrail. Atlaskit Lozenge's appearance
// prop already enforces the correct hex via tokens, so we route status into
// 'default' | 'inprogress' | 'success' and never set custom colors.
type LozengeAppearance = 'default' | 'inprogress' | 'success' | 'removed' | 'moved' | 'new';

function statusToAppearance(status: string): LozengeAppearance {
  const s = (status || '').toLowerCase();
  if (s.includes('done') || s.includes('approved') || s.includes('complet') || s === 'closed') return 'success';
  if (s.includes('progress') || s.includes('review') || s.includes('active') || s === 'in dev') return 'inprogress';
  return 'default';
}

// ─── Component ───────────────────────────────────────────────────────────────

function ForYouRowImpl({ item, alwaysShowStar = false, onSelect, onToggleStar, hideProject = false }: ForYouRowProps) {
  const projectKind = pickProjectKind(item.projectKey, item.issueType);
  const avatarUrl = resolveAvatarUrl(item.assignee.name) || undefined;
  const isStarred = !!item.starred;
  const [isActive, setIsActive] = useState(false);

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
      onFocus={() => setIsActive(true)}
      onBlur={() => setIsActive(false)}
      aria-label={`${item.key} ${item.summary}`}
      data-testid="for-you-row"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        height: 56,
        paddingInline: 12,
        paddingBlock: 8,
        borderRadius: 4,
        cursor: 'pointer',
        backgroundColor: isActive
          ? token('elevation.surface.hovered', 'rgba(9,30,66,0.06)')
          : 'transparent',
        color: token('color.text', '#172B4D'),
        transition: 'background-color 150ms ease',
        outline: 'none',
        minWidth: 0,
      }}
    >
      {/* Left tile — work item type icon */}
      <div
        style={{
          width: 32,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: token('elevation.surface.sunken', '#F7F8F9'),
          borderRadius: 4,
          flexShrink: 0,
        }}
      >
        <WorkItemIcon type={normalizeIconType(item.issueType)} size={20} />
      </div>

      {/* Main body */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div
          style={{
            font: `500 14px/20px "Inter", system-ui, sans-serif`,
            color: token('color.text', '#172B4D'),
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.summary || item.key}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span
            style={{
              font: `500 12px/16px "JetBrains Mono", ui-monospace, monospace`,
              color: token('color.text.subtlest', '#8590A2'),
              letterSpacing: '0.01em',
            }}
          >
            {item.key}
          </span>
          {!hideProject && (
            <Tooltip content={item.project}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  paddingInline: 6,
                  backgroundColor: token('elevation.surface.sunken', '#F7F8F9'),
                  borderRadius: 4,
                  font: `500 12px/16px "Inter", system-ui, sans-serif`,
                  color: token('color.text.subtle', '#626F86'),
                  maxWidth: 180,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                <ProjectKindIcon kind={projectKind} size={14} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.project}</span>
              </span>
            </Tooltip>
          )}
          {item.status && (
            <Lozenge appearance={statusToAppearance(item.status)}>{item.status}</Lozenge>
          )}
          <span
            style={{
              font: `400 12px/16px "Inter", system-ui, sans-serif`,
              color: token('color.text.subtle', '#626F86'),
            }}
          >
            {item.updatedAt}
          </span>
        </div>
      </div>

      {/* Trailing: assignee + star */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <Tooltip content={item.assignee.name}>
          <span>
            <Avatar size="small" src={avatarUrl} name={item.assignee.name} />
          </span>
        </Tooltip>
        <StarButton
          isStarred={isStarred}
          alwaysVisible={alwaysShowStar || isStarred || isActive}
          onClick={handleStarClick}
        />
      </div>
    </div>
  );
}

export default memo(ForYouRowImpl);

// ─── Star button ─────────────────────────────────────────────────────────────

const GOLD = '#FFAB00'; // equivalent to Atlaskit's color.icon.accent.yellow

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
  return (
    <Tooltip content={isStarred ? 'Unstar' : 'Star'}>
      <button
        type="button"
        onClick={onClick}
        aria-label={isStarred ? 'Unstar' : 'Star'}
        aria-pressed={isStarred}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
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
          opacity: alwaysVisible ? 1 : 0,
          transition: 'opacity 150ms ease, background-color 150ms ease',
          padding: 0,
          color: isStarred ? GOLD : token('color.icon.subtle', '#6B778C'),
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
