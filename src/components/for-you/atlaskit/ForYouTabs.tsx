/**
 * ForYouTabs — the 5-tab pill cluster at the top of the For You page.
 *
 * Parity target (from /jira-compare 2026-04-24, Jira DOM ground truth):
 *   - Container: inline-flex, bg rgba(5,21,36,0.06) (== `color.background.neutral`),
 *     radius 8, padding 4, gap 4 — hugs its content width (NOT full-width).
 *   - Each tab: height 24, padding 2px 12px, radius 6, font 13.33px/normal
 *     weight 400 "Atlassian Sans" (mapped to Inter in Catalyst's typography).
 *   - Rest: transparent bg. Hover: `color.background.neutral.hovered`.
 *     Selected: white bg + 0.12 opacity shadow — the "pill" look.
 *   - Counter: inline with label (e.g. "Assigned to me99" in Jira DOM —
 *     no separator, no separate badge). We keep a subtle separation here
 *     via a small inline chip for readability while honouring the inline
 *     layout with 2px gap.
 *
 * Tab order mirrors Jira exactly (April 2026):
 *   Recommended · Assigned to me (99) · Starred · Worked on · Viewed
 *
 * Persistence
 * ───────────
 * The active tab is persisted to localStorage under FOR_YOU_TAB_KEY so a
 * user who lands on the page via deep-link keeps the tab they last used.
 * The page shell owns the state — this component is controlled.
 */
import React from 'react';
import { token } from '@atlaskit/tokens';
import type { TabType } from '@/hooks/useForYouData';

export const FOR_YOU_TAB_KEY = 'catalyst.forYou.activeTab.v1';

export interface ForYouTabDefinition {
  id: TabType;
  label: string;
  showCount: boolean;
}

export const FOR_YOU_TAB_ORDER: ForYouTabDefinition[] = [
  { id: 'recommended', label: 'Recommended',     showCount: false },
  { id: 'assigned',    label: 'Assigned to me',  showCount: true  },
  { id: 'starred',     label: 'Starred',         showCount: false },
  { id: 'worked',      label: 'Worked on',       showCount: false },
  { id: 'viewed',      label: 'Viewed',          showCount: false },
];

interface ForYouTabsProps {
  activeTab: TabType;
  tabCounts: Record<TabType, number>;
  onChange: (tab: TabType) => void;
}

export default function ForYouTabs({ activeTab, tabCounts, onChange }: ForYouTabsProps) {
  return (
    // Outer wrapper kept at page width so we can left-align the inline
    // pill cluster without it stretching. The inner role="tablist" is the
    // cluster itself — that's what Jira returns as its tablist.
    <div style={{ display: 'flex', marginBlockEnd: 16 }}>
      <div
        role="tablist"
        aria-label="For You tabs"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: 4,
          background: token('color.background.neutral', 'rgba(5,21,36,0.06)'),
          borderRadius: 8,
          height: 32,
          boxSizing: 'border-box',
        }}
      >
        {FOR_YOU_TAB_ORDER.map(tab => (
          <TabButton
            key={tab.id}
            tab={tab}
            isActive={activeTab === tab.id}
            count={tabCounts[tab.id] ?? 0}
            onClick={() => onChange(tab.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Individual tab pill ────────────────────────────────────────────────────

function TabButton({
  tab,
  isActive,
  count,
  onClick,
}: {
  tab: ForYouTabDefinition;
  isActive: boolean;
  count: number;
  onClick: () => void;
}) {
  const [hover, setHover] = React.useState(false);
  const showCounter = tab.showCount && count > 0;

  // Selected: elevated-white pill. Hover (only when not selected): faint
  // neutral bg. Rest: transparent.
  const background = isActive
    ? token('elevation.surface', '#FFFFFF')
    : hover
      ? token('color.background.neutral.hovered', 'rgba(11,18,14,0.14)')
      : 'transparent';

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-controls={`for-you-panel-${tab.id}`}
      id={`for-you-tab-${tab.id}`}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        height: 24,
        padding: '2px 12px',
        background,
        border: 'none',
        borderRadius: 6,
        cursor: 'pointer',
        // 13.33px / line-height normal / weight 400 — matches Jira's
        // "Atlassian Sans 13.33px 400" on the tab text, routed through
        // Catalyst's Inter.
        font: `400 13.33px/normal "Inter", system-ui, sans-serif`,
        color: token('color.text', '#292A2E'),
        whiteSpace: 'nowrap',
        outline: 'none',
        // Only the selected pill gets a shadow — the visual lift that
        // distinguishes it inside the neutral container.
        boxShadow: isActive
          ? '0 1px 1px rgba(9,30,66,0.12), 0 0 1px rgba(9,30,66,0.16)'
          : 'none',
        transition: 'background-color 150ms ease, box-shadow 150ms ease',
      }}
    >
      {tab.label}
      {showCounter && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 16,
            height: 16,
            padding: '0 4px',
            borderRadius: 999,
            background: isActive
              ? token('color.background.neutral', 'rgba(5,21,36,0.06)')
              : token('color.background.neutral.subtle', 'transparent'),
            color: token('color.text.subtle', '#505258'),
            font: `600 11px/14px "Inter", system-ui, sans-serif`,
          }}
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}
