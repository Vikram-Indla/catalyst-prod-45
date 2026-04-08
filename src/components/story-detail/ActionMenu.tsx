import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { createPortal } from 'react-dom';
import {
  MoreHorizontal,
  Plus,
  Search,
  ChevronRight,
  Flag,
  Image,
  Upload,
  X,
  Copy,
  ArrowRight,
  Archive,
  Trash2,
  GitBranch,
  Link,
  Paperclip,
  Globe,
  Palette,
  ExternalLink,
  Unlink,
} from 'lucide-react';
import type {
  ActionMenuProps,
  ActionMenuGroup,
  ActionMenuItem,
} from './ActionMenu.types';

/* ═══════════════════════════════════════════════════════════
   ActionMenu — Portal-based popover menu
   V12 Hybrid Precision · Catalyst ProjectHub
   ═══════════════════════════════════════════════════════════ */

// ── Inline styles using CSS custom property tokens ────────

const PANEL_STYLE: React.CSSProperties = {
  position: 'fixed',
  zIndex: 9999,
  minWidth: 220,
  maxWidth: 320,
  maxHeight: 400,
  overflowY: 'auto',
  background: 'var(--cp-bg-elevated, #FFFFFF)',
  border: '1px solid var(--cp-border-default, rgba(15, 23, 42, 0.12))',
  boxShadow:
    'var(--cp-shadow-overlay, 0px 8px 12px rgba(30,31,33,0.15), 0px 0px 1px rgba(30,31,33,0.31))',
  borderRadius: 'var(--cp-radius-md, 6px)',
  padding: '4px 0',
  fontFamily: "var(--cp-font-body, 'Inter', sans-serif)",
};

const ITEM_BASE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  height: 36,
  padding: '0 12px',
  fontSize: 'var(--cp-type-body, 14px)',
  fontWeight: 400,
  color: 'var(--cp-text-primary, #0F172A)',
  cursor: 'pointer',
  border: 'none',
  background: 'transparent',
  width: '100%',
  textAlign: 'left',
  fontFamily: "var(--cp-font-body, 'Inter', sans-serif)",
  outline: 'none',
  userSelect: 'none',
  position: 'relative',
};

const ITEM_DANGER_COLOR = 'var(--cp-danger-60, #DC2626)';
const ITEM_HOVER_BG = 'var(--cp-interact-hover, rgba(15, 23, 42, 0.04))';
const ITEM_PRESS_BG = 'var(--cp-interact-press, rgba(15, 23, 42, 0.08))';
const DANGER_HOVER_BG = 'var(--cp-danger-5, #FEF2F2)';

const DIVIDER_STYLE: React.CSSProperties = {
  height: 1,
  background: 'var(--cp-border-subtle, rgba(15, 23, 42, 0.06))',
  margin: '4px 0',
};

const SEARCH_WRAPPER: React.CSSProperties = {
  padding: '8px 12px',
  borderBottom: '1px solid var(--cp-border-subtle, rgba(15, 23, 42, 0.06))',
  position: 'sticky',
  top: 0,
  background: 'var(--cp-bg-elevated, #FFFFFF)',
  zIndex: 1,
};

const SEARCH_INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  height: 32,
  padding: '0 8px 0 32px',
  background: 'var(--cp-bg-sunken, #F1F5F9)',
  border: '1px solid var(--cp-border-default, rgba(15, 23, 42, 0.12))',
  borderRadius: 'var(--cp-radius-sm, 4px)',
  fontSize: 13,
  fontFamily: "var(--cp-font-body, 'Inter', sans-serif)",
  color: 'var(--cp-text-primary, #0F172A)',
  outline: 'none',
};

// ── Helpers ───────────────────────────────────────────────

function flattenItems(groups: ActionMenuGroup[]): ActionMenuItem[] {
  return groups.flatMap((g) => g.items);
}

function filterGroups(
  groups: ActionMenuGroup[],
  query: string
): ActionMenuGroup[] {
  if (!query.trim()) return groups;
  const q = query.toLowerCase();
  return groups
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => i.label.toLowerCase().includes(q)),
    }))
    .filter((g) => g.items.length > 0);
}

// ── MenuItem ──────────────────────────────────────────────

interface MenuItemRowProps {
  item: ActionMenuItem;
  focused: boolean;
  onActivate: (item: ActionMenuItem) => void;
  onHover: () => void;
  onSubmenuOpen: (item: ActionMenuItem, rect: DOMRect) => void;
}

const MenuItemRow = React.forwardRef<HTMLButtonElement, MenuItemRowProps>(
  ({ item, focused, onActivate, onHover, onSubmenuOpen }, ref) => {
    const [pressed, setPressed] = useState(false);
    const hasSubmenu = item.submenu && item.submenu.length > 0;
    const isDanger = item.danger;

    const style: React.CSSProperties = {
      ...ITEM_BASE,
      color: isDanger ? ITEM_DANGER_COLOR : ITEM_BASE.color,
      opacity: item.disabled ? 0.5 : 1,
      pointerEvents: item.disabled ? 'none' : 'auto',
      cursor: item.disabled ? 'default' : 'pointer',
      background: pressed
        ? isDanger
          ? DANGER_HOVER_BG
          : ITEM_PRESS_BG
        : focused
        ? isDanger
          ? DANGER_HOVER_BG
          : ITEM_HOVER_BG
        : 'transparent',
    };

    const handleClick = () => {
      if (hasSubmenu) {
        const el = (ref as React.RefObject<HTMLButtonElement>)?.current;
        if (el) onSubmenuOpen(item, el.getBoundingClientRect());
        return;
      }
      onActivate(item);
    };

    const handleMouseEnter = () => {
      onHover();
      if (hasSubmenu) {
        const el = (ref as React.RefObject<HTMLButtonElement>)?.current;
        if (el) onSubmenuOpen(item, el.getBoundingClientRect());
      }
    };

    return (
      <button
        ref={ref}
        role="menuitem"
        tabIndex={-1}
        style={style}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => setPressed(false)}
        onMouseLeave={() => setPressed(false)}
        aria-disabled={item.disabled}
      >
        {item.icon && (
          <span
            style={{
              flexShrink: 0,
              marginRight: 12,
              display: 'inline-flex',
              color: isDanger
                ? ITEM_DANGER_COLOR
                : 'var(--cp-text-secondary, #334155)',
            }}
          >
            <item.icon size={16} />
          </span>
        )}
        <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {item.label}
        </span>
        {item.shortcut && (
          <span
            style={{
              marginLeft: 16,
              fontSize: 12,
              color: 'var(--cp-text-muted, #94A3B8)',
              fontWeight: 400,
              flexShrink: 0,
            }}
          >
            {item.shortcut}
          </span>
        )}
        {hasSubmenu && (
          <ChevronRight
            size={14}
            style={{
              marginLeft: 8,
              flexShrink: 0,
              color: 'var(--cp-text-tertiary, #64748B)',
            }}
          />
        )}
      </button>
    );
  }
);
MenuItemRow.displayName = 'MenuItemRow';

// ── Submenu Panel ─────────────────────────────────────────

function SubmenuPanel({
  items,
  anchorRect,
  onActivate,
  onClose,
}: {
  items: ActionMenuItem[];
  anchorRect: DOMRect;
  onActivate: (item: ActionMenuItem) => void;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [focusIdx, setFocusIdx] = useState(0);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const left = anchorRect.right + 2;
  const top = anchorRect.top;

  useEffect(() => {
    itemRefs.current[0]?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = (focusIdx + 1) % items.length;
      setFocusIdx(next);
      itemRefs.current[next]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = (focusIdx - 1 + items.length) % items.length;
      setFocusIdx(prev);
      itemRefs.current[prev]?.focus();
    } else if (e.key === 'ArrowLeft' || e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onActivate(items[focusIdx]);
    }
  };

  return createPortal(
    <div
      ref={panelRef}
      role="menu"
      style={{ ...PANEL_STYLE, left, top }}
      onKeyDown={handleKeyDown}
    >
      {items.map((item, i) => (
        <MenuItemRow
          key={item.id}
          ref={(el) => { itemRefs.current[i] = el; }}
          item={item}
          focused={focusIdx === i}
          onActivate={onActivate}
          onHover={() => setFocusIdx(i)}
          onSubmenuOpen={() => {}}
        />
      ))}
    </div>,
    document.body
  );
}

// ── ActionMenu ────────────────────────────────────────────

export function ActionMenu({
  trigger,
  children,
  groups,
  searchable = false,
  searchPlaceholder = 'Find menu item…',
  align = 'start',
  triggerClassName,
  triggerSize = 20,
}: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [focusIdx, setFocusIdx] = useState(0);
  const [submenu, setSubmenu] = useState<{
    items: ActionMenuItem[];
    rect: DOMRect;
  } | null>(null);
  const [animating, setAnimating] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const filteredGroups = useMemo(
    () => (searchable ? filterGroups(groups, search) : groups),
    [groups, search, searchable]
  );
  const flatItems = useMemo(
    () => flattenItems(filteredGroups),
    [filteredGroups]
  );

  // ── Position calc ──
  const [pos, setPos] = useState({ top: 0, left: 0, flipped: false });

  const calcPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const panelH = 400;
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const flipped = spaceBelow < panelH && rect.top > spaceBelow;
    setPos({
      top: flipped ? rect.top - 8 : rect.bottom + 4,
      left: align === 'end' ? rect.right : rect.left,
      flipped,
    });
  }, [align]);

  // ── Open / Close ──
  const openMenu = useCallback(() => {
    calcPosition();
    setOpen(true);
    setSearch('');
    setFocusIdx(0);
    setSubmenu(null);
    setAnimating(true);
    requestAnimationFrame(() => setAnimating(false));
  }, [calcPosition]);

  const closeMenu = useCallback(() => {
    setOpen(false);
    setSubmenu(null);
    triggerRef.current?.focus();
  }, []);

  const handleActivate = useCallback(
    (item: ActionMenuItem) => {
      if (item.disabled) return;
      item.onClick?.();
      closeMenu();
    },
    [closeMenu]
  );

  // ── Click outside / scroll close ──
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        closeMenu();
      }
    };
    const handleScroll = () => closeMenu();
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [open, closeMenu]);

  // ── Focus first item on open ──
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      if (searchable && searchRef.current) {
        searchRef.current.focus();
      } else {
        itemRefs.current[0]?.focus();
      }
    }, 20);
    return () => clearTimeout(timer);
  }, [open, searchable]);

  // ── Keyboard nav ──
  const handlePanelKeyDown = (e: React.KeyboardEvent) => {
    const count = flatItems.length;
    if (!count) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        {
          const next = (focusIdx + 1) % count;
          setFocusIdx(next);
          itemRefs.current[next]?.focus();
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        {
          const prev = (focusIdx - 1 + count) % count;
          setFocusIdx(prev);
          itemRefs.current[prev]?.focus();
        }
        break;
      case 'Home':
        e.preventDefault();
        setFocusIdx(0);
        itemRefs.current[0]?.focus();
        break;
      case 'End':
        e.preventDefault();
        setFocusIdx(count - 1);
        itemRefs.current[count - 1]?.focus();
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (flatItems[focusIdx]) handleActivate(flatItems[focusIdx]);
        break;
      case 'ArrowRight':
        if (flatItems[focusIdx]?.submenu) {
          e.preventDefault();
          const el = itemRefs.current[focusIdx];
          if (el) {
            setSubmenu({
              items: flatItems[focusIdx].submenu!,
              rect: el.getBoundingClientRect(),
            });
          }
        }
        break;
      case 'Escape':
        e.preventDefault();
        closeMenu();
        break;
      case 'Tab':
        e.preventDefault();
        break;
    }
  };

  // ── Render trigger ──
  const triggerStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    border: 'none',
    borderRadius: 'var(--cp-radius-md, 6px)',
    background: 'transparent',
    cursor: 'pointer',
    padding: 0,
    color: 'var(--cp-text-secondary, #334155)',
    transition: 'background 120ms ease',
  };

  const plusTriggerStyle: React.CSSProperties = {
    ...triggerStyle,
    border: '1px solid var(--cp-border-default, rgba(15, 23, 42, 0.12))',
    color: 'var(--cp-primary-60, #2563EB)',
  };

  let triggerEl: React.ReactNode;
  if (trigger === 'dots') {
    triggerEl = <MoreHorizontal size={triggerSize} />;
  } else if (trigger === 'plus') {
    triggerEl = <Plus size={triggerSize} />;
  } else {
    triggerEl = children;
  }

  // ── Panel positioning ──
  const panelStyle: React.CSSProperties = {
    ...PANEL_STYLE,
    top: pos.flipped ? undefined : pos.top,
    bottom: pos.flipped
      ? window.innerHeight - pos.top
      : undefined,
    left: align === 'end' ? undefined : pos.left,
    right: align === 'end' ? window.innerWidth - pos.left : undefined,
    opacity: animating ? 0 : 1,
    transform: animating ? 'translateY(-4px)' : 'translateY(0)',
    transition: 'opacity 150ms ease-out, transform 150ms ease-out',
  };

  // ── Build indexed items ──
  let itemIndex = 0;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => (open ? closeMenu() : openMenu())}
        style={trigger === 'plus' ? plusTriggerStyle : triggerStyle}
        className={triggerClassName}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = ITEM_HOVER_BG)
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.background = 'transparent')
        }
      >
        {triggerEl}
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            role="menu"
            style={panelStyle}
            onKeyDown={handlePanelKeyDown}
          >
            {/* Search */}
            {searchable && (
              <div style={SEARCH_WRAPPER}>
                <div style={{ position: 'relative' }}>
                  <Search
                    size={16}
                    style={{
                      position: 'absolute',
                      left: 8,
                      top: 8,
                      color: 'var(--cp-text-tertiary, #64748B)',
                      pointerEvents: 'none',
                    }}
                  />
                  <input
                    ref={searchRef}
                    role="searchbox"
                    aria-label="Filter actions"
                    placeholder={searchPlaceholder}
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setFocusIdx(0);
                    }}
                    style={SEARCH_INPUT_STYLE}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        itemRefs.current[0]?.focus();
                        setFocusIdx(0);
                      }
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        closeMenu();
                      }
                    }}
                  />
                </div>
              </div>
            )}

            {/* Items */}
            {filteredGroups.map((group, gIdx) => {
              const groupEl = (
                <React.Fragment key={group.id}>
                  {gIdx > 0 && (
                    <div role="separator" style={DIVIDER_STYLE} />
                  )}
                  {group.items.map((item) => {
                    const idx = itemIndex++;
                    return (
                      <MenuItemRow
                        key={item.id}
                        ref={(el) => { itemRefs.current[idx] = el; }}
                        item={item}
                        focused={focusIdx === idx}
                        onActivate={handleActivate}
                        onHover={() => {
                          setFocusIdx(idx);
                          if (!item.submenu) setSubmenu(null);
                        }}
                        onSubmenuOpen={(itm, rect) =>
                          setSubmenu({ items: itm.submenu!, rect })
                        }
                      />
                    );
                  })}
                </React.Fragment>
              );
              return groupEl;
            })}

            {/* Empty search state */}
            {searchable && flatItems.length === 0 && search.trim() && (
              <div
                style={{
                  padding: '16px 12px',
                  textAlign: 'center',
                  fontSize: 13,
                  color: 'var(--cp-text-muted, #94A3B8)',
                  fontFamily: "var(--cp-font-body, 'Inter', sans-serif)",
                }}
              >
                No matching actions
              </div>
            )}

            {/* Submenu */}
            {submenu && (
              <SubmenuPanel
                items={submenu.items}
                anchorRect={submenu.rect}
                onActivate={handleActivate}
                onClose={() => setSubmenu(null)}
              />
            )}
          </div>,
          document.body
        )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// Demo Section — Visual verification
// ═══════════════════════════════════════════════════════════

const headerMenuGroups: ActionMenuGroup[] = [
  {
    id: 'actions',
    items: [
      { id: 'flag', label: 'Add flag', icon: Flag },
      {
        id: 'cover',
        label: 'Select cover',
        icon: Image,
        submenu: [
          { id: 'upload', label: 'Upload image', icon: Upload },
          { id: 'remove', label: 'Remove cover', icon: X, danger: true },
        ],
      },
      { id: 'clone', label: 'Clone', icon: Copy },
      { id: 'move', label: 'Move', icon: ArrowRight },
      { id: 'archive', label: 'Archive', icon: Archive },
      { id: 'delete', label: 'Delete', icon: Trash2, danger: true },
    ],
  },
];

const quickAddGroups: ActionMenuGroup[] = [
  {
    id: 'create',
    items: [
      { id: 'subtask', label: 'Create subtask', icon: GitBranch, shortcut: '⇧C' },
      { id: 'link', label: 'Link work item', icon: Link, shortcut: '⇧K' },
    ],
  },
  {
    id: 'add',
    items: [
      { id: 'attachment', label: 'Add attachment', icon: Paperclip },
      { id: 'weblink', label: 'Add web link', icon: Globe },
      { id: 'design', label: 'Add design', icon: Palette },
    ],
  },
];

const rowMenuGroups: ActionMenuGroup[] = [
  {
    id: 'actions',
    items: [
      { id: 'open', label: 'Open in new tab', icon: ExternalLink },
      { id: 'unlink', label: 'Remove link', icon: Unlink, danger: true },
    ],
  },
];

export function ActionMenuDemo() {
  return (
    <div
      style={{
        padding: 48,
        display: 'flex',
        gap: 64,
        alignItems: 'flex-start',
        fontFamily: "var(--cp-font-body, 'Inter', sans-serif)",
      }}
    >
      {/* Demo 1 — Three-Dot */}
      <div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--cp-text-muted, #94A3B8)',
            marginBottom: 8,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Three-Dot Menu
        </div>
        <ActionMenu trigger="dots" groups={headerMenuGroups} align="start" />
      </div>

      {/* Demo 2 — Plus (searchable) */}
      <div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--cp-text-muted, #94A3B8)',
            marginBottom: 8,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Quick Add (Searchable)
        </div>
        <ActionMenu
          trigger="plus"
          groups={quickAddGroups}
          searchable
          searchPlaceholder="Find menu item…"
          align="start"
        />
      </div>

      {/* Demo 3 — Row Context (custom trigger) */}
      <div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--cp-text-muted, #94A3B8)',
            marginBottom: 8,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Row Context Menu
        </div>
        <ActionMenu trigger="custom" groups={rowMenuGroups} align="start">
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--cp-text-secondary, #334155)',
            }}
          >
            Actions ▾
          </span>
        </ActionMenu>
      </div>
    </div>
  );
}

export default ActionMenu;
