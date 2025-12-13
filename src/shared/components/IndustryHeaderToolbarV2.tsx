/**
 * IndustryHeaderToolbarV2 - Unified Toolbar Component
 * Ported exactly from catalyst-header-toolbar-v2.html
 * Used for both /industry/backlog and /industry/kanban routes
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './IndustryHeaderToolbarV2.module.css';

// Avatar type
export interface ToolbarAvatar {
  id: string;
  name: string;
  initials?: string;
  avatarUrl?: string;
  color?: string;
}

// Props interface
export interface IndustryHeaderToolbarV2Props {
  title: string;
  countText: string;
  activeView: 'list' | 'board';
  searchValue: string;
  onSearchChange: (value: string) => void;
  avatars?: ToolbarAvatar[];
  selectedAvatarIds?: string[];
  onToggleAvatar?: (id: string) => void;
  onSelectAllAvatars?: () => void;
  onQuickActions?: () => void;
  onInsights?: () => void;
  onViewSettings?: () => void;
  onExport?: () => void;
  onOverflow?: () => void;
  onAdd: () => void;
}

// Icons - exact SVGs from FILE-1
const Icons = {
  List: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
      <line x1="3" y1="9" x2="21" y2="9"/>
      <line x1="3" y1="15" x2="21" y2="15"/>
      <line x1="9" y1="9" x2="9" y2="21"/>
    </svg>
  ),
  Board: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="5" height="18" rx="1"/>
      <rect x="10" y="3" width="5" height="12" rx="1"/>
      <rect x="17" y="3" width="5" height="15" rx="1"/>
    </svg>
  ),
  Search: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <path d="M21 21l-4.35-4.35"/>
    </svg>
  ),
  QuickActions: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
    </svg>
  ),
  Insights: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  ViewSettings: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="21" x2="4" y2="14"/>
      <line x1="4" y1="10" x2="4" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="12"/>
      <line x1="12" y1="8" x2="12" y2="3"/>
      <line x1="20" y1="21" x2="20" y2="16"/>
      <line x1="20" y1="12" x2="20" y2="3"/>
      <line x1="1" y1="14" x2="7" y2="14"/>
      <line x1="9" y1="8" x2="15" y2="8"/>
      <line x1="17" y1="16" x2="23" y2="16"/>
    </svg>
  ),
  Export: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  ),
  Overflow: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="1"/>
      <circle cx="19" cy="12" r="1"/>
      <circle cx="5" cy="12" r="1"/>
    </svg>
  ),
  Plus: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
};

// Default avatar colors
const AVATAR_COLORS = [
  'hsl(var(--secondary-green))',
  'hsl(var(--secondary-bronze))',
  'hsl(var(--brand-gold))',
  'hsl(var(--palette-champagne))',
];

export function IndustryHeaderToolbarV2({
  title,
  countText,
  activeView,
  searchValue,
  onSearchChange,
  avatars = [],
  selectedAvatarIds = [],
  onToggleAvatar,
  onSelectAllAvatars,
  onQuickActions,
  onInsights,
  onViewSettings,
  onExport,
  onOverflow,
  onAdd,
}: IndustryHeaderToolbarV2Props) {
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: Cmd+K / Ctrl+K focuses search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Navigation handlers
  const handleSwitchToList = useCallback(() => {
    navigate('/industry/backlog');
  }, [navigate]);

  const handleSwitchToBoard = useCallback(() => {
    navigate('/industry/kanban');
  }, [navigate]);

  // Avatar "All" active when none selected
  const isAllActive = selectedAvatarIds.length === 0;

  // Get initials from name
  const getInitials = (name: string): string => {
    const parts = name.split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
  };

  // Detect Mac for shortcut display
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
  const shortcutKey = isMac ? '⌘K' : 'Ctrl+K';

  return (
    <div className={styles.toolbarRoot}>
      {/* Row 1: Title Bar */}
      <header className={styles.titleBar}>
        <div className={styles.titleBar__content}>
          <h1 className={styles.titleBar__title}>{title}</h1>
          <span className={styles.titleBar__count}>{countText}</span>
        </div>
      </header>

      {/* Row 2: Command Bar */}
      <div className={styles.commandBar}>
        {/* Segmented View Toggle */}
        <div className={styles.viewToggle}>
          <button
            className={`${styles.viewToggle__btn} ${activeView === 'list' ? styles.isActive : ''} ${activeView === 'list' ? styles.isDisabled : ''}`}
            onClick={activeView === 'list' ? undefined : handleSwitchToList}
            data-tooltip="Table view with columns"
            aria-disabled={activeView === 'list'}
            tabIndex={activeView === 'list' ? -1 : 0}
          >
            <Icons.List />
            <span className={styles.viewToggle__label}>List</span>
          </button>
          <button
            className={`${styles.viewToggle__btn} ${activeView === 'board' ? styles.isActive : ''} ${activeView === 'board' ? styles.isDisabled : ''}`}
            onClick={activeView === 'board' ? undefined : handleSwitchToBoard}
            data-tooltip="Kanban board with columns"
            aria-disabled={activeView === 'board'}
            tabIndex={activeView === 'board' ? -1 : 0}
          >
            <Icons.Board />
            <span className={styles.viewToggle__label}>Board</span>
          </button>
        </div>

        {/* Search */}
        <div className={styles.searchWrapper}>
          <div className={styles.searchInput}>
            <svg className={styles.searchInput__icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              className={styles.searchInput__field}
              placeholder="Search requests..."
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            <span className={styles.searchInput__shortcut}>{shortcutKey}</span>
          </div>
        </div>

        {/* Spacer */}
        <div className={styles.commandBar__spacer} />

        {/* Avatar Filter */}
        {avatars.length > 0 && (
          <>
            <div className={styles.avatarFilter}>
              <button
                className={`${styles.avatarFilter__allBtn} ${isAllActive ? styles.isActive : ''}`}
                onClick={onSelectAllAvatars}
              >
                All
              </button>
              <div className={styles.avatarFilter__group}>
                {avatars.map((avatar, index) => {
                  const isActive = selectedAvatarIds.includes(avatar.id);
                  const bgColor = avatar.color || AVATAR_COLORS[index % AVATAR_COLORS.length];
                  const initials = avatar.initials || getInitials(avatar.name);
                  
                  return (
                    <div
                      key={avatar.id}
                      className={`${styles.avatarFilter__item} ${isActive ? styles.isActive : ''}`}
                      style={{ backgroundColor: bgColor }}
                      data-name={avatar.name}
                      onClick={() => onToggleAvatar?.(avatar.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onToggleAvatar?.(avatar.id);
                        }
                      }}
                    >
                      {initials}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className={styles.vDivider} />
          </>
        )}

        {/* Action Rail */}
        <div className={styles.actionRail}>
          {/* Quick Actions */}
          <button
            className={`${styles.iconBtn} ${styles.actionRail__collapsible}`}
            data-tooltip="Quick actions"
            aria-label="Quick actions"
            onClick={onQuickActions}
          >
            <Icons.QuickActions />
          </button>

          {/* Insights */}
          <button
            className={`${styles.iconBtn} ${styles.actionRail__collapsible}`}
            data-tooltip="Insights"
            aria-label="Insights"
            onClick={onInsights}
          >
            <Icons.Insights />
          </button>

          {/* View Settings */}
          <button
            className={`${styles.iconBtn} ${styles.actionRail__collapsible}`}
            data-tooltip="View settings"
            aria-label="View settings"
            onClick={onViewSettings}
          >
            <Icons.ViewSettings />
          </button>

          {/* Export */}
          <button
            className={`${styles.iconBtn} ${styles.actionRail__collapsible}`}
            data-tooltip="Export"
            aria-label="Export"
            onClick={onExport}
          >
            <Icons.Export />
          </button>

          {/* Overflow (responsive) */}
          <button
            className={`${styles.iconBtn} ${styles.overflowBtn}`}
            data-tooltip="More actions"
            aria-label="More actions"
            onClick={onOverflow}
          >
            <Icons.Overflow />
          </button>
        </div>

        <div className={styles.vDivider} />

        {/* Primary Action */}
        <button
          className={styles.primaryBtn}
          data-tooltip="Add new business request"
          aria-label="Add new business request"
          onClick={onAdd}
        >
          <Icons.Plus />
          <span>Add</span>
        </button>
      </div>
    </div>
  );
}
