import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDownIcon,
  DmsIcon,
  FilterIcon,
  GearIcon,
  MentionIcon,
  PlusIcon,
  SearchIcon,
  SquareIcon,
  ThreadInIcon,
  ViewDenseIcon,
  ViewDetailedIcon,
  XIcon,
} from '../shared/Icon';

export type ActivityTab = 'all' | 'dms' | 'mentions' | 'threads';
export type ActivityViewMode = 'detailed' | 'dense';

interface ActivityHeaderProps {
  activeTab: ActivityTab;
  unreadCounts: { all: number; dms: number; mentions: number; threads: number };
  onTabChange: (tab: ActivityTab) => void;
  unreadsOnly: boolean;
  onToggleUnreadsOnly: () => void;
  viewMode: ActivityViewMode;
  onViewModeChange: (m: ActivityViewMode) => void;
  searchTerm: string;
  onSearchChange: (s: string) => void;
  /** Container width — used to collapse tab labels to icon-only when narrow. */
  panelWidth: number;
}

// Below this width the icon-bearing tabs (DMs / Mentions / Threads) hide
// their text label and show only the icon + unread count. "All" has no icon
// so it always keeps its label.
const TAB_LABEL_BREAKPOINT = 500;

export function ActivityHeader({
  activeTab,
  unreadCounts,
  onTabChange,
  unreadsOnly,
  onToggleUnreadsOnly,
  viewMode,
  onViewModeChange,
  searchTerm,
  onSearchChange,
  panelWidth,
}: ActivityHeaderProps) {
  const showLabels = panelWidth >= TAB_LABEL_BREAKPOINT;
  return (
    <header
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--cv2-bg-panel)',
        borderBottom: '1px solid var(--cv2-border)',
      }}
    >
      <div
        style={{
          height: 'var(--cv2-header-h, 56px)',
          padding: '0 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--cv2-font)',
            fontSize: 22,
            fontWeight: 800,
            color: 'var(--cv2-text-strong)',
          }}
        >
          Activity
        </h1>
        <IconHeaderButton ariaLabel="Activity settings" onClick={() => { /* TODO settings */ }}>
          <GearIcon size={16} />
        </IconHeaderButton>
      </div>
      <nav
        role="tablist"
        aria-label="Activity tabs"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '0 14px',
          borderBottom: '1px solid var(--cv2-border)',
        }}
      >
        <TabBtn
          active={activeTab === 'all'}
          label="All"
          count={unreadCounts.all}
          onClick={() => onTabChange('all')}
        />
        <TabBtn
          active={activeTab === 'dms'}
          icon={<DmsIcon size={14} />}
          label="DMs"
          showLabel={showLabels}
          count={unreadCounts.dms}
          onClick={() => onTabChange('dms')}
        />
        <TabBtn
          active={activeTab === 'mentions'}
          icon={<MentionIcon size={14} />}
          label="Mentions"
          showLabel={showLabels}
          count={unreadCounts.mentions}
          onClick={() => onTabChange('mentions')}
        />
        <TabBtn
          active={activeTab === 'threads'}
          icon={<ThreadInIcon size={14} />}
          label="Threads"
          showLabel={showLabels}
          count={unreadCounts.threads}
          onClick={() => onTabChange('threads')}
        />
        <button
          type="button"
          aria-label="Add tab"
          style={iconTabBtnStyle()}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <PlusIcon size={14} style={{ color: 'var(--cv2-text-subtle)' }} />
        </button>
      </nav>
      <FilterRow
        unreadsOnly={unreadsOnly}
        onToggleUnreadsOnly={onToggleUnreadsOnly}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        searchTerm={searchTerm}
        onSearchChange={onSearchChange}
      />
    </header>
  );
}

function IconHeaderButton({
  ariaLabel,
  onClick,
  children,
}: {
  ariaLabel: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      style={{
        width: 30,
        height: 30,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        color: 'var(--cv2-text-subtle)',
        border: 'none',
        borderRadius: 'var(--cv2-radius-sm)',
        cursor: 'pointer',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
}

function TabBtn({
  active,
  icon,
  label,
  showLabel = true,
  count,
  onClick,
}: {
  active: boolean;
  icon?: React.ReactNode;
  label: string;
  /** When false and an icon is provided, the text label is hidden (the icon
   *  carries the meaning and the aria-label keeps it accessible). */
  showLabel?: boolean;
  count: number;
  onClick: () => void;
}) {
  // Always show the label if there's no icon (e.g. "All"), otherwise honour
  // the responsive showLabel flag. aria-label keeps screen readers covered
  // in icon-only mode.
  const labelVisible = !icon || showLabel;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-label={label}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 38,
        padding: labelVisible ? '0 12px' : '0 8px',
        background: 'transparent',
        color: active ? 'var(--cv2-text-strong)' : 'var(--cv2-text-subtle)',
        border: 'none',
        borderBottom: active ? '2px solid var(--cv2-accent)' : '2px solid transparent',
        marginBottom: -1,
        fontFamily: 'inherit',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
      }}
      onMouseEnter={e => {
        if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--cv2-text)';
      }}
      onMouseLeave={e => {
        if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--cv2-text-subtle)';
      }}
    >
      {icon && <span style={{ display: 'inline-flex' }}>{icon}</span>}
      {labelVisible && <span>{label}</span>}
      {count > 0 && (
        <span
          aria-label={`${count} unread`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 18,
            height: 18,
            padding: '0 6px',
            borderRadius: 9,
            background: 'var(--cv2-unread)',
            color: 'var(--cv2-unread-text, #FFFFFF)',
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}

function iconTabBtnStyle(): React.CSSProperties {
  return {
    width: 28,
    height: 28,
    marginLeft: 4,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    color: 'var(--cv2-text-subtle)',
    border: 'none',
    borderRadius: 'var(--cv2-radius-sm)',
    cursor: 'pointer',
  };
}

function FilterRow({
  unreadsOnly,
  onToggleUnreadsOnly,
  viewMode,
  onViewModeChange,
  searchTerm,
  onSearchChange,
}: {
  unreadsOnly: boolean;
  onToggleUnreadsOnly: () => void;
  viewMode: ActivityViewMode;
  onViewModeChange: (m: ActivityViewMode) => void;
  searchTerm: string;
  onSearchChange: (s: string) => void;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 14px',
      }}
    >
      <SelectButton
        ariaLabel="Activity scope"
        icon={<SquareIcon size={12} />}
        onClick={() => { /* TODO scope selector */ }}
      />
      <ToggleChip active={unreadsOnly} onClick={onToggleUnreadsOnly}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <UnreadDotIcon />
          Unreads
        </span>
      </ToggleChip>
      <PillBtn ariaLabel="Filter" onClick={() => { /* TODO filter */ }}>
        <FilterIcon size={13} />
        <ChevronDownIcon size={10} style={{ marginLeft: 2 }} />
      </PillBtn>

      <div
        style={{
          flex: searchOpen ? 1 : '0 0 32px',
          minWidth: searchOpen ? 120 : 32,
          maxWidth: searchOpen ? 320 : 32,
          transition: 'flex var(--cv2-transition-base), min-width var(--cv2-transition-base), max-width var(--cv2-transition-base)',
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
        }}
      >
        {!searchOpen ? (
          <PillBtn ariaLabel="Search activity" onClick={() => setSearchOpen(true)}>
            <SearchIcon size={13} />
          </PillBtn>
        ) : (
          <div
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              height: 30,
              padding: '0 8px 0 10px',
              background: 'var(--cv2-bg-input)',
              border: '1px solid var(--cv2-accent)',
              borderRadius: 6,
              transition: 'border-color var(--cv2-transition-fast)',
            }}
          >
            <SearchIcon size={13} style={{ color: 'var(--cv2-text-subtle)' }} />
            <input
              ref={inputRef}
              value={searchTerm}
              placeholder="Type to filter"
              onChange={e => onSearchChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Escape') {
                  onSearchChange('');
                  setSearchOpen(false);
                }
              }}
              style={{
                flex: 1,
                minWidth: 0,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--cv2-text)',
                fontFamily: 'inherit',
                fontSize: 13,
              }}
            />
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => { onSearchChange(''); setSearchOpen(false); }}
              style={{
                width: 18,
                height: 18,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
                color: 'var(--cv2-text-subtle)',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              <XIcon size={12} />
            </button>
          </div>
        )}
      </div>

      <div style={{ flex: 1 }} />

      <ViewToggle viewMode={viewMode} onChange={onViewModeChange} />
    </div>
  );
}

function SelectButton({
  ariaLabel,
  icon,
  onClick,
}: {
  ariaLabel: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        height: 30,
        padding: '0 8px',
        background: 'transparent',
        color: 'var(--cv2-text-subtle)',
        border: '1px solid var(--cv2-border-strong)',
        borderRadius: 6,
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: 12,
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      {icon}
      <ChevronDownIcon size={10} />
    </button>
  );
}

function ToggleChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: 30,
        padding: '0 10px',
        background: active ? 'var(--cv2-bg-row-active)' : 'transparent',
        color: active ? 'var(--cv2-text-strong)' : 'var(--cv2-text-subtle)',
        border: '1px solid var(--cv2-border-strong)',
        borderRadius: 6,
        fontFamily: 'inherit',
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
      }}
      onMouseEnter={e => {
        if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)';
      }}
      onMouseLeave={e => {
        if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent';
      }}
    >
      {children}
    </button>
  );
}

function PillBtn({
  ariaLabel,
  onClick,
  children,
}: {
  ariaLabel: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 30,
        minWidth: 32,
        padding: '0 8px',
        background: 'transparent',
        color: 'var(--cv2-text-subtle)',
        border: '1px solid var(--cv2-border-strong)',
        borderRadius: 6,
        cursor: 'pointer',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
}

function ViewToggle({
  viewMode,
  onChange,
}: {
  viewMode: ActivityViewMode;
  onChange: (m: ActivityViewMode) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Activity view"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: 30,
        border: '1px solid var(--cv2-border-strong)',
        borderRadius: 6,
        overflow: 'hidden',
      }}
    >
      <ViewOpt
        active={viewMode === 'detailed'}
        label="Detailed view"
        onClick={() => onChange('detailed')}
        icon={<ViewDetailedIcon size={13} />}
      />
      <ViewOpt
        active={viewMode === 'dense'}
        label="Dense view"
        onClick={() => onChange('dense')}
        icon={<ViewDenseIcon size={13} />}
      />
    </div>
  );
}

function ViewOpt({
  active,
  label,
  onClick,
  icon,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      aria-label={label}
      onClick={onClick}
      style={{
        width: 30,
        height: 28,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: active ? 'var(--cv2-bg-row-active)' : 'transparent',
        color: active ? 'var(--cv2-text-strong)' : 'var(--cv2-text-subtle)',
        border: 'none',
        cursor: 'pointer',
      }}
      onMouseEnter={e => {
        if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)';
      }}
      onMouseLeave={e => {
        if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent';
      }}
    >
      {icon}
    </button>
  );
}

function UnreadDotIcon() {
  return (
    <svg width={10} height={10} viewBox="0 0 10 10" aria-hidden="true">
      <circle cx={5} cy={5} r={3} fill="currentColor" />
    </svg>
  );
}
