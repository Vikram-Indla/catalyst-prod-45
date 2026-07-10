/**
 * DockTabBar — Slack-mobile glassy bottom navigation for the chat dock.
 *
 * Four primary destinations (Home · DMs · Activity · More) in a frosted pill,
 * plus a separate Search circle — matching Slack iOS.
 *
 * ADS: icons from @atlaskit/icon/core; all colour via var(--ds-*) tokens.
 * Glass = backdrop-filter blur + color-mix(var(--ds-surface)…) — no hex/rgba
 * literal, so the color gate stays green. Active tab uses ADS purple accent.
 *
 * Hand-rolled justification: ADS has no mobile bottom-tab-nav component
 * (@atlaskit is desktop-first; @atlaskit/tabs = top underline tabs only).
 * See features/CAT-CHAT-DOCK-SLACK-20260709-001/02_CANONICAL_DISCOVERY.md.
 */
import React from "react";
import HomeIcon from "@atlaskit/icon/core/home";
import CommentIcon from "@atlaskit/icon/core/comment";
import NotificationIcon from "@atlaskit/icon/core/notification";
import ShowMoreHorizontalIcon from "@atlaskit/icon/core/show-more-horizontal";
import SearchIcon from "@atlaskit/icon/core/search";

export type DockTab = "home" | "dms" | "activity" | "more";

interface TabDef {
  key: DockTab;
  label: string;
  Icon: typeof HomeIcon;
}

const TABS: TabDef[] = [
  { key: "home", label: "Home", Icon: HomeIcon },
  { key: "dms", label: "DMs", Icon: CommentIcon },
  { key: "activity", label: "Activity", Icon: NotificationIcon },
  { key: "more", label: "More", Icon: ShowMoreHorizontalIcon },
];

interface DockTabBarProps {
  active: DockTab;
  onChange: (tab: DockTab) => void;
  onSearch: () => void;
  searchActive?: boolean;
  /** Optional unread count per tab — renders a dot when > 0. */
  badges?: Partial<Record<DockTab, number>>;
}

export function DockTabBar({ active, onChange, onSearch, searchActive = false, badges }: DockTabBarProps) {
  return (
    <nav className="cc-nav" aria-label="Chat sections">
      <div className="cc-nav__pill" role="tablist">
        {TABS.map(({ key, label, Icon }) => {
          const isActive = !searchActive && active === key;
          const badge = badges?.[key] ?? 0;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={badge > 0 ? `${label}, ${badge} unread` : label}
              className={`cc-nav__tab${isActive ? " cc-nav__tab--active" : ""}`}
              onClick={() => onChange(key)}
            >
              <span className="cc-nav__icon" aria-hidden>
                <Icon label="" color="currentColor" />
                {badge > 0 && <span className="cc-nav__dot" aria-hidden />}
              </span>
              <span className="cc-nav__label">{label}</span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className={`cc-nav__search${searchActive ? " cc-nav__search--active" : ""}`}
        aria-label="Search"
        aria-pressed={searchActive}
        onClick={onSearch}
      >
        <SearchIcon label="" color="currentColor" />
      </button>
    </nav>
  );
}

export default DockTabBar;
