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
import type { TabType } from '@/hooks/useForYouData';
import { useAgeingCount } from '@/components/notifications/AgeingTab';


export const FOR_YOU_TAB_KEY = 'catalyst.forYou.activeTab.v1';

export interface ForYouTabDefinition {
  id: TabType;
  label: string;
  showCount: boolean;
}

export const FOR_YOU_TAB_ORDER: ForYouTabDefinition[] = [
  // 2026-05-31: 'Caty Focus' (ai-theme) tab REMOVED from visible strip.
  // The AI Themify functionality is now a contextual button on the
  // Assigned panel ("Ask Caty - Themify"). The /for-you/ai-theme route
  // and panel render path are KEPT alive so bookmarked URLs and stale
  // localStorage entries gracefully resolve to the same AiThemePanel.
  // 2026-05-31: 'Assigned to me' moved to first position per Vikram —
  // it's the highest-frequency tab (live work-in-progress) so it earns
  // pole position. Default landing tab logic is unchanged (separate
  // setting in useForYouData); only the visible order is reshuffled.
  { id: 'assigned',    label: 'Assigned to me',  showCount: true  },
  { id: 'recommended', label: 'Recommended',     showCount: false },
  { id: 'starred',     label: 'Starred',         showCount: false },
  { id: 'r360',        label: 'Resource 360°',   showCount: false },
  { id: 'ageing',      label: 'Ageing',          showCount: true  },
  { id: 'board',       label: 'Board',           showCount: false },
  { id: 'timeline',    label: 'Timeline',        showCount: false },
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
  const visibleTabs = FOR_YOU_TAB_ORDER;

  // WAI-ARIA tab pattern: ArrowLeft/Right navigate and select within the strip.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const currentIndex = visibleTabs.findIndex(t => t.id === activeTab);
    const dir = e.key === 'ArrowRight' ? 1 : -1;
    const nextIndex = (currentIndex + dir + visibleTabs.length) % visibleTabs.length;
    const nextTab = visibleTabs[nextIndex];
    onChange(nextTab.id);
    // Programmatically focus the next tab button so keyboard users see the focus ring
    const el = document.getElementById(`for-you-tab-${nextTab.id}`);
    el?.focus();
  };

  return (
    // Outer wrapper kept at page width so we can left-align the inline
    // pill cluster without it stretching. The inner role="tablist" is the
    // cluster itself — that's what Jira returns as its tablist.
    <div style={{ display: 'flex', marginBlockEnd: token('space.200', '16px') }}>
      <div
        role="tablist"
        aria-label="For You tabs"
        onKeyDown={handleKeyDown}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: token('space.050', '4px'),
          padding: token('space.050', '4px'),
          background: token('color.background.neutral', 'rgba(5,21,36,0.06)'),
          borderRadius: 8,
          height: 32,
          boxSizing: 'border-box',
        }}
      >
        {visibleTabs.map(tab => {
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
  // 2026-05-31: showSparkle (ai-theme rainbow sparkle) removed alongside
  // the Caty Focus tab. The rainbow sparkle SVG block is gone too.
  // Ageing uses a red-tinted counter to signal SLA risk, matching the
  // AMBER/RED governance language the panel itself renders.
  // Assigned uses a blue-tinted counter matching Jira's probed badge:
  //   DOM probe 2026-05-29: bg rgb(143,184,246), borderRadius 2px (square).
  const isAgeingBadge = tab.id === 'ageing' && showCounter;
  const isAssignedBadge = tab.id === 'assigned' && showCounter;

  // Selected: elevated-white pill. Hover (only when not selected): faint
  // neutral bg. Rest: transparent.
  // Phase 12 (2026-04-29): reverted to token(). Atlaskit theme handles flip.
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
      tabIndex={isActive ? 0 : -1}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        gap: token('space.050', '4px'),
        height: 24,
        padding: `${token('space.025', '2px')} ${token('space.150', '12px')}`,
        background,
        border: 'none',
        borderRadius: 6,
        cursor: 'pointer',
        // 13.33px / line-height normal — matches Jira's "Atlassian Sans 13.33px"
        // tab text, routed through Catalyst's Inter. Weight 600 on the active
        // tab adds a visual distinction on top of the shadow lift so the
        // selected tab reads clearly without relying on colour alone.
        font: `${isActive ? 600 : 400} 13.33px/normal "Inter", system-ui, sans-serif`,
        color: token('color.text', '#292A2E'),
        whiteSpace: 'nowrap',
        outline: 'none',
        // Only the selected pill gets a shadow — the visual lift that
        // distinguishes it inside the neutral container.
        boxShadow: isActive
          ? token('elevation.shadow.raised', '0 1px 1px rgba(9,30,66,0.12), 0 0 1px rgba(9,30,66,0.16)')
          : 'none',
        transition: 'background-color 150ms cubic-bezier(0.15, 1, 0.3, 1), box-shadow 150ms cubic-bezier(0.15, 1, 0.3, 1)',
      }}
    >
      {/* 2026-05-31: Caty Focus rainbow sparkle removed — tab no longer
          in strip. The same rainbow-sparkle glyph now lives on the
          "Ask Caty - Themify" button inside AssignedPanel. */}
      {tab.label}
      {showCounter && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 16,
            height: 16,
            padding: `0 ${token('space.050', '4px')}`,
            // Ageing badge keeps the danger-red treatment regardless of
            // whether its parent tab is selected — the SLA-risk signal
            // must not disappear when the user clicks the Ageing pill.
            // Previously the selected branch overrode the danger bg with
            // neutral, dropping the visual warning at the exact moment the
            // user landed on the tab.
            background: isAgeingBadge
              ? token('color.background.danger', '#FFECEB')
              : isAssignedBadge
                // Jira parity (probe 2026-05-29): blue badge bg on assigned tab.
                // token('color.background.accent.blue.subtle') → closest ADS match.
                ? token('color.background.accent.blue.subtle', 'rgb(143, 184, 246)')
                : isActive
                  ? token('color.background.neutral', 'rgba(5,21,36,0.06)')
                  : token('color.background.neutral.subtle', 'transparent'),
            color: isAgeingBadge
              ? token('color.text.danger', '#AE2E24')
              : isAssignedBadge
                ? token('color.text', '#292A2E')
                : token('color.text.subtle', '#505258'),
            // Jira parity: ageing + assigned use square badges (borderRadius 2px),
            // all others use the pill treatment (borderRadius 999).
            borderRadius: isAgeingBadge || isAssignedBadge ? 2 : 999,
            font: `600 11px/14px "Inter", system-ui, sans-serif`,
          }}
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}
