/**
 * ForYouTabs — the 5-tab pill strip at the top of the For You page.
 *
 * Tab order mirrors Jira exactly (April 2026):
 *   Recommended · Assigned to me (99) · Starred · Worked on · Viewed
 *
 * Counters appear only on tabs with meaningful quantities — Assigned and
 * Starred always show a count; the others stay label-only. When the count
 * exceeds 99 we print "99+" to match Jira's overflow treatment.
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
    <div
      role="tablist"
      aria-label="For You tabs"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        borderBottom: `2px solid ${token('color.border', '#DFE1E6')}`,
        paddingInline: 0,
        marginBlockEnd: 16,
        overflowX: 'auto',
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
        gap: 6,
        padding: '10px 12px',
        marginBlockEnd: -2,        // overlap the bottom border by the indicator
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        font: `500 14px/20px "Inter", system-ui, sans-serif`,
        color: isActive
          ? token('color.text.selected', '#0C66E4')
          : hover
            ? token('color.text', '#172B4D')
            : token('color.text.subtle', '#626F86'),
        borderBottom: `2px solid ${
          isActive
            ? token('color.border.selected', '#0C66E4')
            : 'transparent'
        }`,
        whiteSpace: 'nowrap',
        outline: 'none',
        transition: 'color 150ms ease, border-color 150ms ease',
      }}
    >
      {tab.label}
      {showCounter && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 20,
            height: 18,
            padding: '0 6px',
            borderRadius: 999,
            background: isActive
              ? token('color.background.selected', '#E9F2FF')
              : token('elevation.surface.sunken', '#F1F2F4'),
            color: isActive
              ? token('color.text.selected', '#0C66E4')
              : token('color.text.subtle', '#626F86'),
            font: `600 11px/14px "Inter", system-ui, sans-serif`,
          }}
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}
