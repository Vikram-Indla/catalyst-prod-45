import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { createPortal } from 'react-dom';
import { X, User as UserIcon, Search, Pin } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════
   PeoplePicker — Catalyst V12
   Searchable combobox for user assignment
   ═══════════════════════════════════════════════════════════ */

// ── Types ─────────────────────────────────────────────────

export interface PickerUser {
  id: string;
  name: string;
  avatarUrl?: string;
  initials: string;
  initialsColor: string;
}

export interface PeoplePickerProps {
  value: PickerUser | null;
  onChange: (user: PickerUser | null) => void;
  users: PickerUser[];
  currentUser: PickerUser;
  allowUnassigned?: boolean;
  allowAutomatic?: boolean;
  label?: string;
  pinned?: boolean;
}

// ── Helpers ───────────────────────────────────────────────

interface DropdownItem {
  type: 'assign-to-me' | 'unassigned' | 'automatic' | 'user' | 'divider';
  user?: PickerUser;
  label?: string;
}

function isSelectable(item: DropdownItem) {
  return item.type !== 'divider';
}

// ── Avatar ────────────────────────────────────────────────

function Avatar({ user, size = 24 }: { user: PickerUser; size?: number }) {
  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.name}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          flexShrink: 0,
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: user.initialsColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.42,
        fontWeight: 700,
        color: '#fff',
        flexShrink: 0,
        fontFamily: "var(--cp-font-body, 'Inter', sans-serif)",
        textTransform: 'uppercase',
        userSelect: 'none',
      }}
    >
      {user.initials}
    </div>
  );
}

// ── Tokens ────────────────────────────────────────────────

const FONT = "var(--cp-font-body, 'Inter', sans-serif)";
const BG_ELEVATED = 'var(--cp-bg-elevated, #FFFFFF)';
const BORDER = 'var(--cp-border-default, rgba(15, 23, 42, 0.12))';
const SHADOW = 'var(--cp-shadow-overlay, 0px 8px 12px rgba(30,31,33,0.15), 0px 0px 1px rgba(30,31,33,0.31))';
const HOVER_BG = 'var(--cp-interact-hover, rgba(15, 23, 42, 0.04))';
const TEXT_PRIMARY = 'var(--cp-text-primary, #0F172A)';
const TEXT_MUTED = 'var(--cp-text-muted, #94A3B8)';
const TEXT_SECONDARY = 'var(--cp-text-secondary, #475569)';
const BORDER_SUBTLE = 'var(--cp-border-subtle, rgba(15, 23, 42, 0.06))';

// ── Component ─────────────────────────────────────────────

export function PeoplePicker({
  value,
  onChange,
  users,
  currentUser,
  allowUnassigned = true,
  allowAutomatic = false,
  label,
  pinned = false,
}: PeoplePickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [hlIdx, setHlIdx] = useState(0);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Build items
  const items = useMemo<DropdownItem[]>(() => {
    const list: DropdownItem[] = [];
    list.push({ type: 'assign-to-me', user: currentUser, label: 'Assign to me' });
    if (allowUnassigned) list.push({ type: 'unassigned', label: 'Unassigned' });
    if (allowAutomatic) list.push({ type: 'automatic', label: 'Automatic' });
    list.push({ type: 'divider' });
    const q = debounced.toLowerCase();
    const filtered = q
      ? users.filter((u) => u.name.toLowerCase().includes(q))
      : users;
    filtered.forEach((u) => list.push({ type: 'user', user: u }));
    return list;
  }, [users, currentUser, debounced, allowUnassigned, allowAutomatic]);

  const selectableIndices = useMemo(
    () => items.map((it, i) => (isSelectable(it) ? i : -1)).filter((i) => i >= 0),
    [items]
  );

  // Position
  const [pos, setPos] = useState({ top: 0, left: 0, width: 250 });
  const calcPos = useCallback(() => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 250) });
  }, []);

  const openPicker = useCallback(() => {
    calcPos();
    setOpen(true);
    setSearch('');
    setDebounced('');
    setHlIdx(0);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [calcPos]);

  const closePicker = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  const selectItem = useCallback(
    (item: DropdownItem) => {
      if (item.type === 'divider') return;
      if (item.type === 'unassigned') onChange(null);
      else if (item.type === 'automatic')
        onChange({ id: 'automatic', name: 'Automatic', initials: 'A', initialsColor: TEXT_MUTED });
      else if (item.user) onChange(item.user);
      closePicker();
    },
    [onChange, closePicker]
  );

  // Click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) closePicker();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, closePicker]);

  // Keyboard
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open) {
        if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openPicker();
        }
        return;
      }
      const curSelIdx = selectableIndices.indexOf(hlIdx);
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (curSelIdx < selectableIndices.length - 1) {
            const next = selectableIndices[curSelIdx + 1];
            setHlIdx(next);
            itemRefs.current[next]?.scrollIntoView({ block: 'nearest' });
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (curSelIdx > 0) {
            const prev = selectableIndices[curSelIdx - 1];
            setHlIdx(prev);
            itemRefs.current[prev]?.scrollIntoView({ block: 'nearest' });
          }
          break;
        case 'Enter':
          e.preventDefault();
          selectItem(items[hlIdx]);
          break;
        case 'Escape':
          e.preventDefault();
          closePicker();
          break;
        case 'Tab':
          e.preventDefault();
          break;
      }
    },
    [open, hlIdx, items, selectableIndices, openPicker, closePicker, selectItem]
  );

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  // ── Render ──

  return (
    <div style={{ position: 'relative', fontFamily: FONT }}>
      {label && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 11,
            fontWeight: 600,
            color: TEXT_SECONDARY,
            marginBottom: 4,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            userSelect: 'none',
          }}
        >
          {pinned && <Pin size={12} style={{ color: TEXT_MUTED }} />}
          {label}
        </div>
      )}

      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? closePicker() : openPicker())}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label || 'Select user'}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          padding: '0 12px',
          height: 36,
          background: 'transparent',
          border: `1px solid ${BORDER}`,
          borderRadius: 'var(--cp-radius-sm, 4px)',
          fontFamily: FONT,
          fontSize: 14,
          color: TEXT_PRIMARY,
          cursor: 'pointer',
          transition: 'background 200ms ease',
          outline: 'none',
          textAlign: 'left',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = HOVER_BG)}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--cp-border-focus, #2563EB)')}
        onBlur={(e) => (e.currentTarget.style.borderColor = BORDER)}
      >
        {value ? (
          <>
            <Avatar user={value} size={24} />
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {value.name}
            </span>
          </>
        ) : (
          <>
            <UserIcon size={20} style={{ color: TEXT_MUTED, flexShrink: 0 }} />
            <span style={{ flex: 1, color: TEXT_MUTED }}>Unassigned</span>
          </>
        )}
        {value && (
          <span
            role="button"
            tabIndex={-1}
            onClick={handleClear}
            aria-label="Clear selection"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: 'transparent',
              cursor: 'pointer',
              color: TEXT_MUTED,
              flexShrink: 0,
              border: 'none',
              padding: 0,
              transition: 'color 120ms ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = TEXT_PRIMARY)}
            onMouseLeave={(e) => (e.currentTarget.style.color = TEXT_MUTED)}
          >
            <X size={14} />
          </span>
        )}
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            style={{
              position: 'fixed',
              zIndex: 1000,
              top: pos.top,
              left: pos.left,
              width: pos.width,
              background: BG_ELEVATED,
              border: `1px solid ${BORDER}`,
              borderRadius: 'var(--cp-radius-md, 6px)',
              boxShadow: SHADOW,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              fontFamily: FONT,
            }}
          >
            {/* Search */}
            <div style={{ padding: '8px 12px', borderBottom: `1px solid ${BORDER_SUBTLE}` }}>
              <div style={{ position: 'relative' }}>
                <Search
                  size={16}
                  style={{
                    position: 'absolute',
                    left: 8,
                    top: 8,
                    color: TEXT_MUTED,
                    pointerEvents: 'none',
                  }}
                />
                <input
                  ref={inputRef}
                  type="text"
                  role="searchbox"
                  aria-label="Search team members"
                  placeholder="Search team members…"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setHlIdx(0);
                  }}
                  onKeyDown={handleKeyDown}
                  style={{
                    width: '100%',
                    height: 32,
                    padding: '0 8px 0 32px',
                    border: `1px solid ${BORDER}`,
                    borderRadius: 'var(--cp-radius-sm, 4px)',
                    fontSize: 13,
                    fontFamily: FONT,
                    color: TEXT_PRIMARY,
                    background: 'var(--cp-bg-sunken, #F1F5F9)',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* List */}
            <ul
              role="listbox"
              aria-activedescendant={`pp-item-${hlIdx}`}
              style={{
                listStyle: 'none',
                margin: 0,
                padding: '4px 0',
                maxHeight: 300,
                overflowY: 'auto',
              }}
            >
              {items.map((item, i) => {
                if (item.type === 'divider') {
                  return (
                    <li
                      key={`div-${i}`}
                      role="separator"
                      style={{
                        height: 1,
                        background: BORDER_SUBTLE,
                        margin: '4px 0',
                      }}
                    />
                  );
                }

                const highlighted = hlIdx === i;
                const selected = value?.id === item.user?.id;
                const isAssignToMe = item.type === 'assign-to-me';

                return (
                  <li
                    key={item.user?.id ?? item.type}
                    id={`pp-item-${i}`}
                    ref={(el) => { itemRefs.current[i] = el; }}
                    role="option"
                    aria-selected={selected}
                    onClick={() => selectItem(item)}
                    onMouseEnter={() => setHlIdx(i)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      height: 36,
                      padding: '0 12px',
                      cursor: 'pointer',
                      fontSize: 14,
                      fontFamily: FONT,
                      fontWeight: selected ? 600 : 400,
                      color: TEXT_PRIMARY,
                      background: highlighted ? HOVER_BG : 'transparent',
                      transition: 'background 120ms ease',
                      outline: 'none',
                    }}
                  >
                    {item.user ? (
                      <Avatar user={item.user} size={24} />
                    ) : (
                      <UserIcon size={20} style={{ color: TEXT_MUTED, flexShrink: 0 }} />
                    )}
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.user?.name ?? item.label}
                    </span>
                    {isAssignToMe && (
                      <span style={{ fontSize: 12, color: TEXT_MUTED, flexShrink: 0 }}>
                        (Assign to me)
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>,
          document.body
        )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Demo
// ═══════════════════════════════════════════════════════════

const mockUsers: PickerUser[] = [
  { id: '1', name: 'Nada Alfassam', initials: 'NA', initialsColor: '#7C3AED' },
  { id: '2', name: 'Vikram India', initials: 'VI', initialsColor: '#2563EB' },
  { id: '3', name: 'Yousif Shalaby', initials: 'YS', initialsColor: '#16A34A' },
  { id: '4', name: 'Waqas Ali', initials: 'WA', initialsColor: '#D97706' },
  { id: '5', name: 'Imran Aslam', initials: 'IA', initialsColor: '#DC2626' },
  { id: '6', name: 'Yazeed Daraz', initials: 'YD', initialsColor: '#DB2777' },
  { id: '7', name: 'Dr. Ahmed Al-Rashid', initials: 'AA', initialsColor: '#0D9488' },
];

const currentUser: PickerUser = mockUsers[1];

export function PeoplePickerDemo() {
  const [assignee, setAssignee] = useState<PickerUser | null>(mockUsers[0]);
  const [reporter, setReporter] = useState<PickerUser | null>(null);

  return (
    <div
      style={{
        padding: 48,
        display: 'flex',
        flexDirection: 'column',
        gap: 32,
        maxWidth: 320,
        fontFamily: "var(--cp-font-body, 'Inter', sans-serif)",
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 600, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        PeoplePicker Demo
      </div>

      <PeoplePicker
        value={assignee}
        onChange={setAssignee}
        users={mockUsers}
        currentUser={currentUser}
        allowUnassigned
        allowAutomatic
        label="Assignee"
      />

      <PeoplePicker
        value={reporter}
        onChange={setReporter}
        users={mockUsers}
        currentUser={currentUser}
        allowUnassigned
        label="Reporter"
        pinned
      />
    </div>
  );
}

export default PeoplePicker;
