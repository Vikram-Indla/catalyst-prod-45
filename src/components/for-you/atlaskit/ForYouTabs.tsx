/**
 * ForYouTabs — the pill cluster at the top of the For You page.
 *
 * Catalyst tab order (trimmed April 2026 — Worked on / Viewed removed per
 * user feedback; those two tabs had low real-world use and were cluttering
 * the strip. Starred now covers the "things I care about" case):
 *   AI Recap · Recommended · Assigned to me (99) · Starred · Ageing (16)
 *
 * AI Recap and Ageing are Catalyst-specific extensions that were relocated
 * from the Notifications drawer so the For You page becomes a single pane
 * of glass for personal work. Both tabs render with the same Atlaskit pill
 * chrome as the Jira-parity tabs; only their badge source differs — Ageing
 * uses the live `useAgeingCount()` hook, AI Recap shows a sparkle indicator
 * (no count).
 *
 * Parity target for the shared chrome (from /jira-compare 2026-04-24):
 *   - Container: inline-flex, bg rgba(5,21,36,0.06) (== `color.background.neutral`),
 *     radius 8, padding 4, gap 4 — hugs its content width (NOT full-width).
 *   - Each tab: height 24, padding 2px 12px, radius 6, font 13.33px/normal
 *     weight 400 "Atlassian Sans" (mapped to Inter in Catalyst's typography).
 *   - Rest: transparent bg. Hover: `color.background.neutral.hovered`.
 *     Selected: white bg + 0.12 opacity shadow — the "pill" look.
 *
 * Persistence
 * ───────────
 * The active tab is persisted to localStorage under FOR_YOU_TAB_KEY so a
 * user who lands on the page via deep-link keeps the tab they last used.
 * The page shell owns the state — this component is controlled.
 */
import React from 'react';
import { token } from '@atlaskit/tokens';
import { Sparkles } from 'lucide-react';
import type { TabType } from '@/hooks/useForYouData';
import { useAgeingCount } from '@/components/notifications/AgeingTab';

export const FOR_YOU_TAB_KEY = 'catalyst.forYou.activeTab.v1';

export interface ForYouTabDefinition {
  id: TabType;
  label: string;
  showCount: boolean;
}

export const FOR_YOU_TAB_ORDER: ForYouTabDefinition[] = [
  { id: 'ai-theme',    label: 'AI Theme',        showCount: false },
  { id: 'recommended', label: 'Recommended',     showCount: false },
  { id: 'assigned',    label: 'Assigned to me',  showCount: true  },
  { id: 'starred',     label: 'Starred',         showCount: false },
  { id: 'ageing',      label: 'Ageing',          showCount: true  },
];

interface ForYouTabsProps {
  activeTab: TabType;
  tabCounts: Record<TabType, number>;
  onChange: (tab: TabType) => void;
}

export default function ForYouTabs({ activeTab, tabCounts, onChange }: ForYouTabsProps) {
  // Ageing count is owned by the shared useAgeingItems hook — same source
  // of truth the Ageing panel itself renders from. Resolved here so the
  // pill badge stays in lockstep with panel content without plumbing the
  // count back through useForYouData.
  const ageingCount = useAgeingCount();

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
        {FOR_YOU_TAB_ORDER.map(tab => {
          const resolvedCount = tab.id === 'ageing' ? ageingCount : (tabCounts[tab.id] ?? 0);
          return (
            <TabButton
              key={tab.id}
              tab={tab}
              isActive={activeTab === tab.id}
              count={resolvedCount}
              onClick={() => onChange(tab.id)}
            />
          );
        })}
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
  const showSparkle = tab.id === 'ai-theme';
  // Ageing uses a red-tinted counter to signal SLA risk, matching the
  // AMBER/RED governance language the panel itself renders. All other
  // counters keep the neutral Atlaskit treatment.
  const isAgeingBadge = tab.id === 'ageing' && showCounter;

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
      {showSparkle && (
        <Sparkles
          size={12}
          strokeWidth={1.75}
          // Matches the Ask Catalyst ("Caty") pill chrome — same AI family,
          // same ink. Uses `color.icon.brand` (#1868DB) instead of the
          // discovery/purple accent so every Atlaskit-compliant AI surface
          // in Catalyst reads as the same entity. See /design-critique
          // 2026-04-24 callout ⓪ — purple is explicitly off-palette inside
          // the Atlassian design system and was re-homed to brand blue.
          style={{ color: token('color.icon.brand', '#1868DB'), flexShrink: 0 }}
        />
      )}
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
            background: isAgeingBadge
              ? token('color.background.danger', '#FFECEB')
              : isActive
                ? token('color.background.neutral', 'rgba(5,21,36,0.06)')
                : token('color.background.neutral.subtle', 'transparent'),
            color: isAgeingBadge
              ? token('color.text.danger', '#AE2E24')
              : token('color.text.subtle', '#505258'),
            font: `600 11px/14px "Inter", system-ui, sans-serif`,
          }}
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}
