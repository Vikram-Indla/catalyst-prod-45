import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronDownIcon,
  DmsIcon,
  FilterIcon,
  MentionIcon,
  PlusIcon,
  SearchIcon,
  ThreadInIcon,
  ViewDenseIcon,
  ViewDetailedIcon,
  XIcon,
} from '../shared/Icon';

export type ActivityTab = 'all' | 'dms' | 'mentions' | 'threads';
export type ActivityViewMode = 'detailed' | 'dense';
export type ActivitySelectionMode = null | 'all' | 'reads' | 'unreads' | 'custom';
export type ActivityFilterKey =
  | 'dms'
  | 'mentions'
  | 'threads'
  | 'channels'
  | 'reactions'
  | 'invitations'
  | 'apps'
  | 'reminders';
export type ActivityMentionSubKey = 'self' | 'channel' | 'usergroup' | 'keyword';

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
  searchOpen: boolean;
  onSearchOpenChange: (open: boolean) => void;
  /** Container width — used to collapse tab labels to icon-only when narrow. */
  panelWidth: number;
  /** Selection. selectionMode === null means idle (no toolbar). */
  selectionMode: ActivitySelectionMode;
  onSelectionModeChange: (m: ActivitySelectionMode) => void;
  selectedCount: number;
  totalVisibleCount: number;
  onMarkSelectedAsRead: () => void;
  onClearSelected: () => void;
  /** Self-name for the `@<me>` mention sub-row. */
  selfMentionName: string;
  /** Filters. Empty set = no filters applied. */
  filterKeys: Set<ActivityFilterKey>;
  filterMentionSubs: Set<ActivityMentionSubKey>;
  onFilterKeysChange: (next: Set<ActivityFilterKey>) => void;
  onFilterMentionSubsChange: (next: Set<ActivityMentionSubKey>) => void;
  onResetFilters: () => void;
}

const TAB_LABEL_BREAKPOINT = 500;

export function ActivityHeader(props: ActivityHeaderProps) {
  const showLabels = props.panelWidth >= TAB_LABEL_BREAKPOINT;
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
          display: 'flex',
          alignItems: 'center',
          padding: '14px 16px 10px',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--cv2-font)',
            fontSize: 'var(--cv2-fs-sidebar-header)',
            fontWeight: 700,
            letterSpacing: '-0.01em',
            color: 'var(--cv2-text-strong)',
          }}
        >
          Activity
        </h1>
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
          active={props.activeTab === 'all'}
          label="All"
          count={props.unreadCounts.all}
          onClick={() => props.onTabChange('all')}
        />
        <TabBtn
          active={props.activeTab === 'dms'}
          icon={<DmsIcon size={14} />}
          label="DMs"
          showLabel={showLabels}
          count={props.unreadCounts.dms}
          onClick={() => props.onTabChange('dms')}
        />
        <TabBtn
          active={props.activeTab === 'mentions'}
          icon={<MentionIcon size={14} />}
          label="Mentions"
          showLabel={showLabels}
          count={props.unreadCounts.mentions}
          onClick={() => props.onTabChange('mentions')}
        />
        <TabBtn
          active={props.activeTab === 'threads'}
          icon={<ThreadInIcon size={14} />}
          label="Threads"
          showLabel={showLabels}
          count={props.unreadCounts.threads}
          onClick={() => props.onTabChange('threads')}
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
      <Toolbar {...props} />
    </header>
  );
}

/**
 * Toolbar — three exclusive modes:
 *   - search mode: full-width search input, hides everything else
 *   - selection mode (selectionMode !== null): checkbox (filled) + chevron +
 *     "Mark selected as read" + "Clear selected"; hides unreads/filter/search/view-toggle
 *   - idle: checkbox + Unreads chip + Filter button (+ Reset link when active) + Search icon + View toggle
 */
function Toolbar(props: ActivityHeaderProps) {
  const inSelection = props.selectionMode !== null;
  const inSearch = props.searchOpen;
  const filtersActive = props.filterKeys.size + props.filterMentionSubs.size;

  const [selectMenuOpen, setSelectMenuOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const selectAnchorRef = useRef<HTMLButtonElement | null>(null);
  const filterAnchorRef = useRef<HTMLButtonElement | null>(null);

  // When entering search/selection mode, close any popovers that don't make
  // sense in that mode.
  useEffect(() => { if (inSearch || inSelection) setFilterOpen(false); }, [inSearch, inSelection]);
  useEffect(() => { if (inSearch) setSelectMenuOpen(false); }, [inSearch]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 14px',
      }}
    >
      {inSearch ? (
        <ToolbarSearchInput
          value={props.searchTerm}
          onChange={props.onSearchChange}
          onClose={() => {
            props.onSearchChange('');
            props.onSearchOpenChange(false);
          }}
        />
      ) : (
        <>
          <CheckboxButton
            mode={props.selectionMode}
            indeterminate={
              props.selectionMode !== null &&
              props.selectedCount > 0 &&
              props.selectedCount < props.totalVisibleCount
            }
            onPrimaryClick={() => {
              // Toggle: idle → select all, in-selection → exit
              if (props.selectionMode === null) {
                props.onSelectionModeChange('all');
              } else {
                props.onSelectionModeChange(null);
              }
            }}
            onChevronClick={() => setSelectMenuOpen(v => !v)}
            chevronRef={selectAnchorRef}
          />

          {inSelection ? (
            <>
              <ActionPillButton
                icon={<MarkAsReadIcon />}
                label="Mark selected as read"
                onClick={() => props.onMarkSelectedAsRead()}
              />
              <ActionPillButton
                icon={<EraserIcon />}
                label="Clear selected"
                onClick={() => props.onClearSelected()}
              />
            </>
          ) : (
            <>
              <ToggleChip active={props.unreadsOnly} onClick={props.onToggleUnreadsOnly}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <UnreadDotIcon />
                  Unreads
                </span>
              </ToggleChip>
              <FilterButton
                anchorRef={filterAnchorRef}
                active={filtersActive > 0 || filterOpen}
                count={filtersActive}
                onClick={() => setFilterOpen(v => !v)}
              />
              {filtersActive > 0 && (
                <button
                  type="button"
                  onClick={props.onResetFilters}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--cv2-text-link)',
                    fontFamily: 'inherit',
                    fontSize: 'var(--ds-font-size-300)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '0 4px',
                  }}
                >
                  Reset
                </button>
              )}
              <PillBtn
                ariaLabel="Search activity"
                onClick={() => props.onSearchOpenChange(true)}
              >
                <SearchIcon size={13} />
              </PillBtn>
              <div style={{ flex: 1 }} />
              <ViewToggle viewMode={props.viewMode} onChange={props.onViewModeChange} />
            </>
          )}
        </>
      )}

      {selectMenuOpen && selectAnchorRef.current && (
        <SelectModeMenu
          anchorEl={selectAnchorRef.current}
          onClose={() => setSelectMenuOpen(false)}
          onPick={mode => {
            setSelectMenuOpen(false);
            props.onSelectionModeChange(mode);
          }}
        />
      )}
      {filterOpen && filterAnchorRef.current && (
        <FilterPopover
          anchorEl={filterAnchorRef.current}
          onClose={() => setFilterOpen(false)}
          filterKeys={props.filterKeys}
          mentionSubs={props.filterMentionSubs}
          onKeysChange={props.onFilterKeysChange}
          onMentionSubsChange={props.onFilterMentionSubsChange}
          selfMentionName={props.selfMentionName}
        />
      )}
    </div>
  );
}

function CheckboxButton({
  mode,
  indeterminate,
  onPrimaryClick,
  onChevronClick,
  chevronRef,
}: {
  mode: ActivitySelectionMode;
  indeterminate: boolean;
  onPrimaryClick: () => void;
  onChevronClick: () => void;
  chevronRef: React.MutableRefObject<HTMLButtonElement | null>;
}) {
  const filled = mode !== null;
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'stretch',
        height: 30,
        border: `1px solid ${filled ? 'var(--cv2-accent)' : 'var(--cv2-border-strong)'}`,
        borderRadius: 6,
        overflow: 'hidden',
        background: filled ? 'var(--cv2-bg-row-active)' : 'transparent',
      }}
    >
      <button
        type="button"
        aria-label={filled ? 'Exit selection' : 'Select all activity'}
        onClick={onPrimaryClick}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 32,
          padding: 0,
          background: 'transparent',
          color: filled ? 'var(--cv2-accent)' : 'var(--cv2-text-subtle)',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <CheckboxGlyph filled={filled} indeterminate={indeterminate} />
      </button>
      <button
        ref={chevronRef}
        type="button"
        aria-label="Selection menu"
        aria-haspopup="menu"
        onClick={onChevronClick}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 22,
          padding: 0,
          background: 'transparent',
          color: filled ? 'var(--cv2-accent)' : 'var(--cv2-text-subtle)',
          border: 'none',
          borderLeft: '1px solid var(--cv2-border)',
          cursor: 'pointer',
        }}
      >
        <ChevronDownIcon size={10} />
      </button>
    </div>
  );
}

function CheckboxGlyph({ filled, indeterminate }: { filled: boolean; indeterminate: boolean }) {
  if (!filled) {
    return (
      <svg width={14} height={14} viewBox="0 0 14 14" aria-hidden="true">
        <rect x="1" y="1" width="12" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    );
  }
  if (indeterminate) {
    return (
      <svg width={14} height={14} viewBox="0 0 14 14" aria-hidden="true">
        <rect x="1" y="1" width="12" height="12" rx="2" fill="currentColor" />
        <rect x="3.5" y="6.2" width="7" height="1.6" rx="0.8" fill="var(--ds-surface)" />
      </svg>
    );
  }
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" aria-hidden="true">
      <rect x="1" y="1" width="12" height="12" rx="2" fill="currentColor" />
      <path d="M3.6 7.1l2.4 2.4 4.4-4.6" fill="none" stroke="var(--ds-surface)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ActionPillButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 30,
        padding: '0 10px',
        background: 'transparent',
        color: 'var(--cv2-text)',
        border: '1px solid var(--cv2-border-strong)',
        borderRadius: 6,
        fontFamily: 'inherit',
        fontSize: 'var(--ds-font-size-300)',
        fontWeight: 500,
        cursor: 'pointer',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      <span aria-hidden="true" style={{ display: 'inline-flex', color: 'var(--cv2-text-subtle)' }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function MarkAsReadIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 11l3 3 8-8" />
      <path d="M20 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

function EraserIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 17l6 6 11-11-6-6L3 13z" />
      <path d="M14 6l4 4" />
      <path d="M3 21h18" />
    </svg>
  );
}

function FilterButton({
  anchorRef,
  active,
  count,
  onClick,
}: {
  anchorRef: React.MutableRefObject<HTMLButtonElement | null>;
  active: boolean;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      ref={anchorRef}
      type="button"
      aria-label="Filter activity"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        height: 30,
        padding: '0 8px',
        background: active ? 'var(--cv2-bg-row-active)' : 'transparent',
        color: active ? 'var(--cv2-text-strong)' : 'var(--cv2-text-subtle)',
        border: '1px solid var(--cv2-border-strong)',
        borderRadius: 6,
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: 'var(--ds-font-size-300)',
        fontWeight: 600,
      }}
      onMouseEnter={e => {
        if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)';
      }}
      onMouseLeave={e => {
        if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent';
      }}
    >
      <FilterIcon size={13} />
      {count > 0 && (
        <span style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 700 }}>({count})</span>
      )}
      <ChevronDownIcon size={10} />
    </button>
  );
}

function ToolbarSearchInput({
  value,
  onChange,
  onClose,
}: {
  value: string;
  onChange: (s: string) => void;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        height: 36,
        padding: '0 10px',
        background: 'var(--cv2-bg-input)',
        border: '1px solid var(--cv2-accent)',
        borderRadius: 8,
      }}
    >
      <SearchIcon size={14} style={{ color: 'var(--cv2-text-subtle)' }} />
      <input
        ref={inputRef}
        value={value}
        placeholder="Type to filter"
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Escape') onClose(); }}
        style={{
          flex: 1,
          minWidth: 0,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: 'var(--cv2-text)',
          fontFamily: 'inherit',
          fontSize: 'var(--ds-font-size-400)',
        }}
      />
      <button
        type="button"
        aria-label="Close search"
        onClick={onClose}
        style={{
          width: 22,
          height: 22,
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
        <XIcon size={14} />
      </button>
    </div>
  );
}

function SelectModeMenu({
  anchorEl,
  onClose,
  onPick,
}: {
  anchorEl: HTMLButtonElement;
  onClose: () => void;
  onPick: (mode: NonNullable<ActivitySelectionMode>) => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node) && !anchorEl.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [anchorEl, onClose]);
  const rect = anchorEl.getBoundingClientRect();
  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label="Selection mode"
      style={{
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        minWidth: 200,
        background: 'var(--cv2-bg-toolbar)',
        border: '1px solid var(--cv2-border-strong)',
        borderRadius: 6,
        boxShadow: 'var(--cv2-shadow-toolbar)',
        padding: '6px 0',
        zIndex: 9999,
      }}
    >
      {(['all', 'reads', 'unreads', 'custom'] as const).map(opt => (
        <button
          key={opt}
          type="button"
          role="menuitem"
          onClick={() => onPick(opt)}
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'left',
            padding: '8px 14px',
            background: 'transparent',
            border: 'none',
            fontFamily: 'inherit',
            fontSize: 'var(--ds-font-size-400)',
            color: 'var(--cv2-text)',
            cursor: 'pointer',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          {opt === 'all' && 'Select all'}
          {opt === 'reads' && 'Select reads'}
          {opt === 'unreads' && 'Select unreads'}
          {opt === 'custom' && 'Custom select'}
        </button>
      ))}
    </div>,
    document.body,
  );
}

function FilterPopover({
  anchorEl,
  onClose,
  filterKeys,
  mentionSubs,
  onKeysChange,
  onMentionSubsChange,
  selfMentionName,
}: {
  anchorEl: HTMLButtonElement;
  onClose: () => void;
  filterKeys: Set<ActivityFilterKey>;
  mentionSubs: Set<ActivityMentionSubKey>;
  onKeysChange: (next: Set<ActivityFilterKey>) => void;
  onMentionSubsChange: (next: Set<ActivityMentionSubKey>) => void;
  selfMentionName: string;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [mentionsExpanded, setMentionsExpanded] = useState(filterKeys.has('mentions'));
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node) && !anchorEl.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [anchorEl, onClose]);
  const rect = anchorEl.getBoundingClientRect();
  const toggleKey = (k: ActivityFilterKey) => {
    const next = new Set(filterKeys);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    onKeysChange(next);
  };
  const toggleSub = (s: ActivityMentionSubKey) => {
    const next = new Set(mentionSubs);
    if (next.has(s)) next.delete(s);
    else next.add(s);
    onMentionSubsChange(next);
  };
  return createPortal(
    <div
      ref={menuRef}
      role="dialog"
      aria-label="Filter activity"
      style={{
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: 280,
        background: 'var(--cv2-bg-toolbar)',
        border: '1px solid var(--cv2-border-strong)',
        borderRadius: 8,
        boxShadow: 'var(--cv2-shadow-toolbar)',
        padding: '12px 0 8px',
        zIndex: 9999,
        fontFamily: 'inherit',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 14px 8px',
        }}
      >
        <span style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 700, color: 'var(--cv2-text-strong)' }}>Filter by</span>
        <button
          type="button"
          aria-label="Close filter"
          onClick={onClose}
          style={{
            width: 22, height: 22, padding: 0, background: 'transparent',
            color: 'var(--cv2-text-subtle)', border: 'none', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <XIcon size={14} />
        </button>
      </div>
      <FilterRowItem
        keyId="dms"
        label="DMs"
        icon={<DmsIcon size={14} />}
        checked={filterKeys.has('dms')}
        onToggle={() => toggleKey('dms')}
      />
      <FilterRowItem
        keyId="mentions"
        label="Mentions"
        icon={<MentionIcon size={14} />}
        checked={filterKeys.has('mentions')}
        onToggle={() => toggleKey('mentions')}
        expandable
        expanded={mentionsExpanded}
        indeterminate={
          filterKeys.has('mentions') &&
          mentionSubs.size > 0 &&
          mentionSubs.size < 4
        }
        onExpand={() => setMentionsExpanded(v => !v)}
      />
      {mentionsExpanded && (
        <div style={{ paddingLeft: 24 }}>
          <FilterRowItem
            keyId="mention-self"
            label={`@${selfMentionName || 'me'}`}
            checked={mentionSubs.has('self')}
            onToggle={() => toggleSub('self')}
          />
          <FilterRowItem
            keyId="mention-channel"
            label="@channel"
            checked={mentionSubs.has('channel')}
            onToggle={() => toggleSub('channel')}
          />
          <FilterRowItem
            keyId="mention-usergroup"
            label="@user-group"
            checked={mentionSubs.has('usergroup')}
            onToggle={() => toggleSub('usergroup')}
          />
          <FilterRowItem
            keyId="mention-keyword"
            label="keyword"
            checked={mentionSubs.has('keyword')}
            onToggle={() => toggleSub('keyword')}
          />
        </div>
      )}
      <FilterRowItem
        keyId="threads"
        label="Threads"
        icon={<ThreadInIcon size={14} />}
        checked={filterKeys.has('threads')}
        onToggle={() => toggleKey('threads')}
      />
      <FilterRowItem
        keyId="channels"
        label={'Channels set to "all new posts"'}
        icon={<HashIcon />}
        checked={filterKeys.has('channels')}
        onToggle={() => toggleKey('channels')}
      />
      <FilterRowItem
        keyId="reactions"
        label="Reactions"
        icon={<SmileyIcon />}
        checked={filterKeys.has('reactions')}
        onToggle={() => toggleKey('reactions')}
      />
      <FilterRowItem
        keyId="invitations"
        label="Invitations"
        icon={<PaperPlaneIcon />}
        checked={filterKeys.has('invitations')}
        onToggle={() => toggleKey('invitations')}
      />
      <FilterRowItem
        keyId="apps"
        label="Apps"
        icon={<AppsIcon />}
        checked={filterKeys.has('apps')}
        onToggle={() => toggleKey('apps')}
      />
      <FilterRowItem
        keyId="reminders"
        label="Reminders"
        icon={<ReminderIcon />}
        checked={filterKeys.has('reminders')}
        onToggle={() => toggleKey('reminders')}
      />
    </div>,
    document.body,
  );
}

function FilterRowItem({
  keyId,
  label,
  icon,
  checked,
  indeterminate = false,
  expandable = false,
  expanded = false,
  onToggle,
  onExpand,
}: {
  keyId: string;
  label: string;
  icon?: React.ReactNode;
  checked: boolean;
  indeterminate?: boolean;
  expandable?: boolean;
  expanded?: boolean;
  onToggle: () => void;
  onExpand?: () => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 14px',
        cursor: 'pointer',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      <button
        type="button"
        aria-label={`Toggle ${label}`}
        aria-checked={indeterminate ? 'mixed' : checked}
        role="checkbox"
        onClick={onToggle}
        style={{
          width: 16, height: 16, padding: 0,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: checked ? 'var(--cv2-accent)' : 'var(--cv2-text-subtle)',
          flex: '0 0 auto',
        }}
      >
        <CheckboxGlyph filled={checked} indeterminate={indeterminate} />
      </button>
      <div
        onClick={onToggle}
        style={{
          flex: 1,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          color: 'var(--cv2-text)',
          fontSize: 'var(--ds-font-size-400)',
          minWidth: 0,
        }}
      >
        {icon && (
          <span style={{ color: 'var(--cv2-text-subtle)', display: 'inline-flex', flex: '0 0 auto' }}>
            {icon}
          </span>
        )}
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {label}
        </span>
      </div>
      {expandable && (
        <button
          type="button"
          aria-label="Expand"
          aria-expanded={expanded}
          onClick={onExpand}
          style={{
            width: 22, height: 22, padding: 0,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', color: 'var(--cv2-text-subtle)', border: 'none',
            cursor: 'pointer', flex: '0 0 auto',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 120ms ease',
          }}
        >
          <ChevronDownIcon size={12} />
        </button>
      )}
    </div>
  );
}

function HashIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="4" y1="9" x2="20" y2="9" />
      <line x1="4" y1="15" x2="20" y2="15" />
      <line x1="10" y1="3" x2="8" y2="21" />
      <line x1="16" y1="3" x2="14" y2="21" />
    </svg>
  );
}

function SmileyIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  );
}

function PaperPlaneIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function AppsIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="5" r="1.6" />
      <circle cx="12" cy="5" r="1.6" />
      <circle cx="19" cy="5" r="1.6" />
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
      <circle cx="5" cy="19" r="1.6" />
      <circle cx="12" cy="19" r="1.6" />
      <circle cx="19" cy="19" r="1.6" />
    </svg>
  );
}

function ReminderIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l3 2" />
      <path d="M5 3L2 6" />
      <path d="M19 3l3 3" />
    </svg>
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
  showLabel?: boolean;
  count: number;
  onClick: () => void;
}) {
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
        fontSize: 'var(--ds-font-size-300)',
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
            color: 'var(--cv2-unread-text)',
            fontSize: 'var(--ds-font-size-100)',
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
        fontSize: 'var(--ds-font-size-200)',
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
