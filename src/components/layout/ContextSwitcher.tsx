/**
 * ContextSwitcher — top-bar item/workstream switcher
 *
 * Appears between GlobalSearch and the left logo cluster in CatalystHeader.
 * Shows current project key, product code, or "Workstreams" depending on
 * the active hub route. Dropdown rendered via createPortal so it is never
 * clipped by overflow:hidden ancestors (CLAUDE.md 2026-06-13).
 *
 * Hubs handled:
 *   /project-hub/:key/*   → project switcher (starred + recent + search)
 *   /product-hub/:code/*  → product switcher (starred + recent + search)
 *   /tasks/*              → workstream switcher (all active workstreams)
 *
 * All other routes → component renders null.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useMatch, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import TaskIcon from '@atlaskit/icon/glyph/task';
import StarFilledIcon from '@atlaskit/icon/glyph/star-filled';
import StarIcon from '@atlaskit/icon/glyph/star';
import CheckCircleIcon from '@atlaskit/icon/glyph/check-circle';
import AddIcon from '@atlaskit/icon/glyph/add';
import { supabase } from '@/integrations/supabase/client';
import { useProjectFavorites } from '@/hooks/useProjectHub';
import { token } from '@atlaskit/tokens';
import { ProjectIcon } from '@/components/shared/ProjectIcon';
import { getProductAvatarUrl, HUB_ICON_REGISTRY } from '@/components/icons';

// ─── localStorage keys ────────────────────────────────────────────────────────
const RECENT_KEY = 'catalyst.switcher-recent';
const FAV_PRODUCTS_KEY = 'product-hub.favorites';
const MAX_RECENT = 5;

// ─── Types ────────────────────────────────────────────────────────────────────
type ItemType = 'project' | 'product' | 'workstream';
type Mode = 'project' | 'product' | 'tasks';

interface SwitcherItem {
  id: string;
  key: string;
  name: string;
  color?: string | null;
  path: string;
  type: ItemType;
}

// ─── localStorage helpers ─────────────────────────────────────────────────────
function loadProductFavs(): Set<string> {
  try {
    const raw = localStorage.getItem(FAV_PRODUCTS_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch { return new Set(); }
}

function loadRecent(): SwitcherItem[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as SwitcherItem[]) : [];
  } catch { return []; }
}

function saveRecent(items: SwitcherItem[]): void {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(items)); } catch {}
}

function pushRecent(item: SwitcherItem): void {
  const prev = loadRecent().filter(r => !(r.type === item.type && r.key === item.key));
  saveRecent([item, ...prev].slice(0, MAX_RECENT));
}

// ─── Lightweight queries (used only by switcher — not tied to heavy page hooks)
function useSwitcherProjects(enabled: boolean) {
  return useQuery({
    queryKey: ['ctx-switcher-projects'],
    queryFn: async () => {
      const { data } = await supabase
        .from('v_project_list')
        .select('id, project_key, name')
        .order('name');
      const excluded = new Set(['TH-DEFAULT', 'MDT', 'INV']);
      return ((data ?? []) as Array<{ id: string; project_key: string; name: string }>)
        .filter(p => !excluded.has(p.project_key));
    },
    staleTime: 5 * 60_000,
    enabled,
  });
}

function useSwitcherProducts(enabled: boolean) {
  return useQuery({
    queryKey: ['ctx-switcher-products'],
    queryFn: async () => {
      const { data } = await supabase
        .from('products')
        .select('id, code, name, color')
        .order('name');
      return (data ?? []) as Array<{ id: string; code: string; name: string; color: string | null }>;
    },
    staleTime: 5 * 60_000,
    enabled,
  });
}

function useSwitcherWorkstreams(enabled: boolean) {
  return useQuery({
    queryKey: ['ctx-switcher-workstreams'],
    queryFn: async () => {
      const { data } = await supabase
        .from('task_workstreams')
        .select('id, name, slug, key_prefix, color')
        .eq('is_archived', false)
        .order('name');
      return (data ?? []) as Array<{ id: string; name: string; slug: string; key_prefix: string; color: string }>;
    },
    staleTime: 5 * 60_000,
    enabled,
  });
}

// ─── Dropdown panel (portal-rendered) ────────────────────────────────────────
interface PanelProps {
  mode: Mode;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  menuRef: React.RefObject<HTMLDivElement | null>;
  search: string;
  onSearchChange: (v: string) => void;
  starredItems: SwitcherItem[];
  recentItems: SwitcherItem[];
  allItems: SwitcherItem[];
  currentKey: string;
  managementPath: string;
  newItemPath: string;
  onNavigate: (item: SwitcherItem) => void;
  onManagementNav: (path: string) => void;
  onClose: () => void;
}

function SwitcherPanel({
  mode, triggerRef, menuRef, search, onSearchChange,
  starredItems, recentItems, allItems, currentKey,
  managementPath, newItemPath, onNavigate, onManagementNav, onClose,
}: PanelProps) {
  const searchRef = useRef<HTMLInputElement>(null);
  const q = search.toLowerCase().trim();

  // Focus search on open
  useEffect(() => { searchRef.current?.focus(); }, []);

  // Derived sections
  const filtered = (items: SwitcherItem[]) =>
    q ? items.filter(i => i.name.toLowerCase().includes(q) || i.key.toLowerCase().includes(q)) : items;

  // Recency rank from recentItems (most-recent-first). Drives the order of the
  // FULL list so every project is reachable while recently-opened ones float to
  // the top — recency as sort key, not as a filter that hides the rest.
  const rank = new Map(recentItems.map((r, i) => [r.key, i]));
  const byRecency = (a: SwitcherItem, b: SwitcherItem) => {
    const ra = rank.has(a.key) ? rank.get(a.key)! : Infinity;
    const rb = rank.has(b.key) ? rank.get(b.key)! : Infinity;
    if (ra !== rb) return ra - rb;
    return a.name.localeCompare(b.name);
  };

  const starredKeys = new Set(starredItems.map(s => s.key));
  const showStarred = mode !== 'tasks' && !q && filtered(starredItems).length > 0;
  const mainItems = (mode === 'tasks' ? allItems : allItems.filter(i => !starredKeys.has(i.key)))
    .slice()
    .sort(byRecency);
  const filteredMain = filtered(mainItems);

  // Position from trigger
  const rect = triggerRef.current!.getBoundingClientRect();

  const managementLabel =
    mode === 'project' ? 'All projects' :
    mode === 'product' ? 'All products' :
    'All workstreams';

  const newLabel =
    mode === 'project' ? 'New project' :
    mode === 'product' ? 'New product' :
    'New workstream';

  return (
    <div
      ref={menuRef}
      role="dialog"
      aria-label="Switch context"
      style={{
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: 288,
        maxHeight: 440,
        overflowY: 'auto',
        background: 'var(--ds-surface-overlay)',
        border: '1px solid var(--ds-border)',
        borderRadius: 6,
        boxShadow: '0 8px 32px var(--ds-shadow-raised, rgba(9,30,66,0.20)), 0 0 1px var(--ds-background-neutral-subtle-pressed, rgba(9,30,66,0.14))',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: '"Atlassian Sans", ui-sans-serif, -apple-system, system-ui, "Segoe UI", Ubuntu, "Helvetica Neue", sans-serif',
      }}
    >
      {/* Search */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        borderBottom: '1px solid var(--ds-border)',
        flexShrink: 0,
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ds-icon-subtle)" strokeWidth="2.5">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          ref={searchRef}
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder={
            mode === 'project' ? 'Search projects…' :
            mode === 'product' ? 'Search products…' :
            'Search workstreams…'
          }
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: 'var(--ds-font-size-300)',
            color: 'var(--ds-text)',
            fontFamily: 'inherit',
          }}
        />
        {search && (
          <button
            onClick={() => onSearchChange('')}
            style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0,
              color: 'var(--ds-icon-subtle)', fontSize: 'var(--ds-font-size-400)', lineHeight: 1 }}
            aria-label="Clear search"
          >×</button>
        )}
      </div>

      {/* Body */}
      <div style={{ overflowY: 'auto', flex: 1 }}>

        {/* Starred section */}
        {showStarred && (
          <Section
            label="STARRED"
            icon={<StarFilledIcon size="small" label="" primaryColor="var(--ds-icon-warning)" />}
            items={filtered(starredItems)}
            currentKey={currentKey}
            onNavigate={onNavigate}
          />
        )}

        {/* Divider between starred and the full recency-ordered list */}
        {showStarred && filteredMain.length > 0 && (
          <div style={{ height: 1, background: 'var(--ds-border)', margin: '4px 0' }} />
        )}

        {/* Full list — every item, recency-ordered (recently-opened float to top) */}
        {filteredMain.length > 0 && (
          <Section
            label={q ? 'RESULTS' : mode === 'tasks' ? 'WORKSTREAMS' : undefined}
            items={filteredMain}
            currentKey={currentKey}
            onNavigate={onNavigate}
          />
        )}

        {/* Empty state when search returns nothing */}
        {q && filteredMain.length === 0 && filtered(starredItems).length === 0 && (
          <div style={{ padding: '20px 16px', textAlign: 'center', fontSize: 'var(--ds-font-size-300)',
            color: 'var(--ds-text-subtlest)' }}>
            No results for "{search}"
          </div>
        )}

        {/* Empty state — no items at all */}
        {!q && allItems.length === 0 && starredItems.length === 0 && (
          <div style={{ padding: '20px 16px', textAlign: 'center', fontSize: 'var(--ds-font-size-300)',
            color: 'var(--ds-text-subtlest)' }}>
            {mode === 'tasks' ? 'No active workstreams' :
             mode === 'project' ? 'No projects yet' : 'No products yet'}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        borderTop: '1px solid var(--ds-border)',
        padding: '6px 8px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
      }}>
        <button
          onClick={() => { onManagementNav(managementPath); onClose(); }}
          style={{
            border: 'none', background: 'none', cursor: 'pointer', padding: '4px 8px',
            fontSize: 'var(--ds-font-size-200)', fontWeight: 500, color: 'var(--ds-link)',
            borderRadius: 3, fontFamily: 'inherit',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--ds-background-neutral-subtle)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >
          {managementLabel}
        </button>
        <button
          onClick={() => { onManagementNav(newItemPath); onClose(); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            border: 'none', background: 'none', cursor: 'pointer', padding: '4px 8px',
            fontSize: 'var(--ds-font-size-200)', fontWeight: 500, color: 'var(--ds-text-subtle)',
            borderRadius: 3, fontFamily: 'inherit',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--ds-background-neutral-subtle)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >
          <AddIcon size="small" label="" primaryColor="var(--ds-icon-subtle)" />
          {newLabel}
        </button>
      </div>
    </div>
  );
}

// ─── Row section ──────────────────────────────────────────────────────────────
function Section({
  label, icon, items, currentKey, onNavigate,
}: {
  label?: string;
  icon?: React.ReactNode;
  items: SwitcherItem[];
  currentKey: string;
  onNavigate: (item: SwitcherItem) => void;
}) {
  return (
    <div style={{ padding: '6px 0 2px' }}>
      {label && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '2px 12px 4px',
          fontSize: 'var(--ds-font-size-100)', fontWeight: 700,
          color: 'var(--ds-text-subtlest)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}>
          {icon}
          {label}
        </div>
      )}
      {items.map(item => (
        <ItemRow
          key={`${item.type}-${item.key}`}
          item={item}
          isCurrent={item.key === currentKey}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}

// ─── Individual row ───────────────────────────────────────────────────────────
function ItemRow({ item, isCurrent, onNavigate }: {
  item: SwitcherItem;
  isCurrent: boolean;
  onNavigate: (item: SwitcherItem) => void;
}) {
  const [hovered, setHovered] = useState(false);

  const colorSwatch = item.color ? (
    <span style={{
      width: 8, height: 8, borderRadius: '50%', background: item.color,
      display: 'inline-block', flexShrink: 0,
    }} />
  ) : null;

  return (
    <button
      role="menuitem"
      onClick={() => onNavigate(item)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, width: '100%',
        padding: '7px 12px',
        border: 'none', cursor: 'pointer', textAlign: 'left',
        background: isCurrent
          ? 'var(--ds-background-selected)'
          : hovered
            ? 'var(--ds-background-neutral-subtle-hovered)'
            : 'transparent',
        transition: 'background 80ms',
        fontFamily: '"Atlassian Sans", ui-sans-serif, -apple-system, system-ui, "Segoe UI", Ubuntu, "Helvetica Neue", sans-serif',
      }}
    >
      {/* Branded icon via canonical ProjectIcon — matches sidebar header +
          ProductHeaderChip exactly (CLAUDE.md adopt-canonical). Workstreams
          keep the colored dot (no avatar registry). */}
      {item.type === 'workstream'
        ? (colorSwatch ?? <TaskIcon size="small" label="" primaryColor="var(--ds-icon-subtle)" />)
        : (
          <ProjectIcon
            size="small"
            projectKey={item.key}
            avatarUrl={item.type === 'product' ? getProductAvatarUrl(item.key) : undefined}
            name={item.name}
          />
        )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 'var(--ds-font-size-300)', fontWeight: isCurrent ? 600 : 400,
          color: isCurrent ? 'var(--ds-text-selected)' : 'var(--ds-text)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {item.name}
        </div>
        <div style={{
          fontSize: 'var(--ds-font-size-100)', fontFamily: 'monospace',
          color: 'var(--ds-text-subtlest)',
          marginTop: 1,
        }}>
          {item.key}
        </div>
      </div>

      {isCurrent && (
        <CheckCircleIcon size="small" label="current" primaryColor="var(--ds-icon-accent-blue)" />
      )}
    </button>
  );
}

// ─── Main exported component ──────────────────────────────────────────────────
interface ContextSwitcherProps {
  /**
   * 'topnav'  — pill trigger for the global header (legacy mount).
   * 'sidebar' — trigger styled to BE the left-sidebar header (icon + name +
   *             chevron when expanded; icon-only when collapsed). 2026-06-16:
   *             switcher moved off the top nav into the sidebar header to
   *             reclaim top-nav width and remove the double-render of the
   *             active context (sidebar header already showed it).
   */
  variant?: 'topnav' | 'sidebar';
  /** sidebar variant only — drives expanded (icon+name+chevron) vs collapsed (icon-only). */
  expanded?: boolean;
}

export function ContextSwitcher({ variant = 'topnav', expanded = true }: ContextSwitcherProps = {}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Route detection
  const projectMatch = useMatch('/project-hub/:key/*');
  const productMatch = useMatch('/product-hub/:code/*');
  const tasksMatch = useMatch('/tasks/*');

  const projectKey = projectMatch?.params.key;
  const productCode = productMatch?.params.code;

  const mode: Mode | null =
    projectKey && projectKey !== 'projects' ? 'project' :
    productCode && productCode !== 'products' ? 'product' :
    tasksMatch ? 'tasks' :
    null;

  // Data
  const { data: projects = [] } = useSwitcherProjects(mode === 'project');
  const { data: _favoriteRaw } = useProjectFavorites();
  // React Query may deserialize a cached Set as a plain object — always reconstruct.
  const favoriteIds: Set<string> = _favoriteRaw instanceof Set ? _favoriteRaw : new Set(Array.isArray(_favoriteRaw) ? _favoriteRaw : []);
  const { data: products = [] } = useSwitcherProducts(mode === 'product');
  const { data: workstreams = [] } = useSwitcherWorkstreams(mode === 'tasks');

  // Current item label for trigger
  const currentProject = mode === 'project' ? projects.find(p => p.project_key === projectKey) : null;
  const currentProduct = mode === 'product' ? products.find(p => p.code === productCode) : null;

  const triggerDisplayKey = mode === 'project' ? projectKey :
                            mode === 'product' ? productCode :
                            null;

  const triggerDisplayName = mode === 'project' ? (currentProject?.name ?? null) :
                             mode === 'product' ? (currentProduct?.name ?? null) :
                             'Workstreams';

  // Track current item in recent on route change
  useEffect(() => {
    if (mode === 'project' && currentProject) {
      pushRecent({
        id: currentProject.id,
        key: currentProject.project_key,
        name: currentProject.name,
        path: `/project-hub/${currentProject.project_key}/dashboard`,
        type: 'project',
      });
    } else if (mode === 'product' && currentProduct) {
      pushRecent({
        id: currentProduct.id,
        key: currentProduct.code,
        name: currentProduct.name,
        color: currentProduct.color,
        path: `/product-hub/${currentProduct.code}/backlog`,
        type: 'product',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, currentProject?.id, currentProduct?.id]);

  // Close on outside click + Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !triggerRef.current?.contains(t)) {
        setOpen(false);
        setSearch('');
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); setSearch(''); }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  const handleNavigate = useCallback((item: SwitcherItem) => {
    pushRecent(item);
    navigate(item.path);
    setOpen(false);
    setSearch('');
  }, [navigate]);

  const handleManagementNav = useCallback((path: string) => {
    navigate(path);
  }, [navigate]);

  if (!mode) return null;

  // Build dropdown item lists
  const productFavIds = loadProductFavs();
  const recent = loadRecent();

  const allProjectItems: SwitcherItem[] = projects.map(p => ({
    id: p.id, key: p.project_key, name: p.name,
    path: `/project-hub/${p.project_key}/dashboard`, type: 'project',
  }));

  const allProductItems: SwitcherItem[] = products.map(p => ({
    id: p.id, key: p.code, name: p.name, color: p.color,
    path: `/product-hub/${p.code}/backlog`, type: 'product',
  }));

  const allWorkstreamItems: SwitcherItem[] = workstreams.map(ws => ({
    id: ws.id, key: ws.key_prefix, name: ws.name, color: ws.color,
    path: `/tasks/workstreams`, type: 'workstream',
  }));

  const starredItems: SwitcherItem[] =
    mode === 'project' ? allProjectItems.filter(p => favoriteIds?.has(p.id)) :
    mode === 'product' ? allProductItems.filter(p => productFavIds.has(p.id)) :
    [];

  const recentItems: SwitcherItem[] =
    mode === 'project' ? recent.filter(r => r.type === 'project') :
    mode === 'product' ? recent.filter(r => r.type === 'product') :
    [];

  const allItems: SwitcherItem[] =
    mode === 'project' ? allProjectItems :
    mode === 'product' ? allProductItems :
    allWorkstreamItems;

  const managementPath =
    mode === 'project' ? '/project-hub/projects' :
    mode === 'product' ? '/product-hub/products' :
    '/tasks/workstreams';

  // "+ New …" deep-links straight to the list page's create modal via ?create=1
  // (the list page consumes + clears the param). 2026-06-16.
  const newItemPath =
    mode === 'product' ? '/product-hub/products?create=1' :
    mode === 'project' ? '/project-hub/projects?create=1' :
    '/tasks/workstreams?create=1';

  const currentKey = mode === 'project' ? (projectKey ?? '') :
                     mode === 'product' ? (productCode ?? '') :
                     '';

  // Trigger hover state
  const [triggerHover, setTriggerHover] = useState(false);

  const triggerBg = open
    ? 'var(--ds-background-neutral-pressed, rgba(9,30,66,0.12))'
    : triggerHover
      ? 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))'
      : 'transparent';

  // Hub icon via canonical ProjectIcon so the trigger matches the sidebar
  // header + ProductHeaderChip exactly (CLAUDE.md adopt-canonical).
  const renderHubIcon = (size: 'small' | 'medium') => {
    if (mode === 'project' && triggerDisplayKey) {
      return <ProjectIcon size={size} projectKey={triggerDisplayKey} name={triggerDisplayName} />;
    }
    if (mode === 'product' && triggerDisplayKey) {
      return (
        <ProjectIcon
          size={size}
          projectKey={triggerDisplayKey}
          avatarUrl={getProductAvatarUrl(triggerDisplayKey)}
          name={triggerDisplayName}
        />
      );
    }
    if (mode === 'tasks') {
      const px = size === 'small' ? 20 : 24;
      return <img src={HUB_ICON_REGISTRY['task']} alt="Tasks" style={{ width: px, height: px, display: 'block', flexShrink: 0 }} />;
    }
    return null;
  };

  const ariaLabel = `Switch ${mode === 'tasks' ? 'workstream' : mode}. ${triggerDisplayKey ?? ''} ${triggerDisplayName ?? ''}`;
  const isSidebar = variant === 'sidebar';

  // ── Sidebar variant — the trigger IS the left-sidebar header row ──
  const sidebarTrigger = (
    <button
      ref={triggerRef}
      onClick={() => setOpen(v => !v)}
      onMouseEnter={() => setTriggerHover(true)}
      onMouseLeave={() => setTriggerHover(false)}
      aria-expanded={open}
      aria-haspopup="dialog"
      aria-label={ariaLabel}
      title={expanded ? undefined : (triggerDisplayName ?? '')}
      style={{
        display: 'flex', alignItems: 'center',
        gap: expanded ? 8 : 0,
        justifyContent: expanded ? 'flex-start' : 'center',
        width: '100%', height: expanded ? 32 : 40,
        padding: expanded ? '0 4px' : 0,
        // Borderless menu-button: transparent idle, subtle hover/open — no
        // heavy pressed fill (ADS nav-item convention; 2026-06-16 critique).
        background: (open || triggerHover)
          ? 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))'
          : 'transparent',
        border: 'none', borderRadius: 6, cursor: 'pointer',
        transition: 'background 80ms',
        fontFamily: '"Atlassian Sans", ui-sans-serif, -apple-system, system-ui, "Segoe UI", Ubuntu, "Helvetica Neue", sans-serif',
        overflow: 'hidden',
      }}
    >
      {renderHubIcon(expanded ? 'small' : 'medium')}
      {expanded && (
        <>
          <span
            className="truncate"
            style={{
              flex: 1, minWidth: 0, textAlign: 'left',
              fontFamily: 'var(--cp-font-heading)',
              fontSize: token('font.size.100', '14px'),
              fontWeight: 500,
              letterSpacing: '-0.3px',
              color: 'var(--ds-text)',
            }}
          >
            {triggerDisplayName}
          </span>
          <ChevronDownIcon size="small" label="" primaryColor="var(--ds-icon-subtle)" />
        </>
      )}
    </button>
  );

  // ── Top-nav variant — pill trigger (legacy header mount) ──
  const topnavTrigger = (
    <button
      ref={triggerRef}
      onClick={() => setOpen(v => !v)}
      onMouseEnter={() => setTriggerHover(true)}
      onMouseLeave={() => setTriggerHover(false)}
      aria-expanded={open}
      aria-haspopup="dialog"
      aria-label={ariaLabel}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        height: 32, padding: '0 8px 0 6px',
        background: triggerBg,
        border: open
          ? '1px solid var(--ds-border-focused)'
          : '1px solid var(--ds-border, rgba(161,189,217,0.14))',
        borderRadius: 4,
        cursor: 'pointer',
        fontSize: 'var(--ds-font-size-300)',
        fontFamily: '"Atlassian Sans", ui-sans-serif, -apple-system, system-ui, "Segoe UI", Ubuntu, "Helvetica Neue", sans-serif',
        fontWeight: 500,
        color: 'var(--ds-text)',
        maxWidth: 220,
        flexShrink: 0,
        transition: 'background 80ms, border-color 80ms',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
      }}
    >
      {renderHubIcon('small')}

      {/* Key + name */}
      <span style={{ display: 'flex', alignItems: 'baseline', gap: 4, overflow: 'hidden' }}>
        {triggerDisplayKey && (
          <span style={{
            fontSize: 'var(--ds-font-size-200)', fontWeight: 700, letterSpacing: '0.02em',
            color: 'var(--ds-text-subtle)',
            flexShrink: 0,
          }}>
            {triggerDisplayKey}
          </span>
        )}
        {triggerDisplayName && (
          <span style={{
            overflow: 'hidden', textOverflow: 'ellipsis',
            color: 'var(--ds-text)',
          }}>
            {triggerDisplayName}
          </span>
        )}
      </span>

      <ChevronDownIcon size="small" label="" primaryColor="var(--ds-icon-subtle)" />
    </button>
  );

  return (
    <>
      {isSidebar ? sidebarTrigger : topnavTrigger}

      {open && triggerRef.current && createPortal(
        <SwitcherPanel
          mode={mode}
          triggerRef={triggerRef}
          menuRef={menuRef}
          search={search}
          onSearchChange={setSearch}
          starredItems={starredItems}
          recentItems={recentItems}
          allItems={allItems}
          currentKey={currentKey}
          managementPath={managementPath}
          newItemPath={newItemPath}
          onNavigate={handleNavigate}
          onManagementNav={handleManagementNav}
          onClose={() => { setOpen(false); setSearch(''); }}
        />,
        document.body,
      )}
    </>
  );
}
