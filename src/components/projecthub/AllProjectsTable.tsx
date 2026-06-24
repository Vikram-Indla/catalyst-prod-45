import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Star, MoreHorizontal, Lock, ChevronUp, ChevronDown, ExternalLink, Settings, Archive, Search, Pencil } from '@/lib/atlaskit-icons';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import '@/styles/product-backlog.css';
import { useTableColumns, type ColumnDef as TColDef } from '@/hooks/useTableColumns';
import { ResizableTableHeader, type SortDir } from '@/components/shared/ResizableTableHeader';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProjectListItem, SortColumn, SortDirection } from '@/types/projecthub';
import { MemberStack } from './MemberStack';
import { formatDistanceToNowStrict, format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';
import { cn } from '@/lib/utils';
import { Avatar, Tooltip } from '@/components/ads';
import { IssueBreakdownPopover } from './IssueBreakdownPopover';
// Atlaskit primitives for Lead reassign + row actions (Atlaskit migration scope).
// Note: @atlaskit/popup v4.16 renders empty portals in this codebase (Apr 2026
// runtime probe via Chrome MCP), so Lead/Members popups use self-rolled
// positioned divs with useClickOutside instead. Popup kept available for
// future use when the lib is upgraded.
import Textfield from '@atlaskit/textfield';
import Lozenge from '@atlaskit/lozenge';
import CheckCircleIcon from '@atlaskit/icon/glyph/check-circle';
import AddCircleIcon from '@atlaskit/icon/glyph/add-circle';
import { token } from '@atlaskit/tokens';
// AKDropdownMenu removed — passes isSelected + testId to DOM <button> breaking
// Popper's ref chain in this codebase. Self-rolled positioned menu used instead.
// See RowActionMenu, useClickOutside, useFixedPopupPosition in this file.
import AKModal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import AKButton from '@atlaskit/button/new';
import { MenuGroup, ButtonItem, Section } from '@atlaskit/menu';
import { useTrackRecentItem } from '@/hooks/useRecentProjectItems';
import { ProjectIcon } from '@/components/shared/ProjectIcon';

// ── Utilities ──────────────────────────────────────────
// ADS tokens only — no raw hex (CLAUDE.md ADS ring-fence rule 2026-05-09)
const BADGE_COLORS = [
  'var(--ds-text-brand, var(--cp-primary-60, #0052CC))',
  'var(--ds-text-accent-purple, #5243AA)',
  'var(--ds-text-accent-teal, #0C7E6A)',
  'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))',
  'var(--ds-text-accent-green, #216E4E)',
  'var(--ds-text-subtlest, #626F86)',
];

function getBadgeColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash) + id.charCodeAt(i);
  return BADGE_COLORS[Math.abs(hash) % BADGE_COLORS.length];
}

function isActiveStatus(status: string): boolean {
  return status === 'active';
}

// FIX 3: Format role labels from snake_case to Title Case
function formatRole(role: string): string {
  return role
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Three-state sync dot — ADS token colors (no Tailwind classes).
// green < 15min = fresh · amber 15–120min = stale · red > 120min = error
function getSyncDotBg(lastSyncAt: string | null, syncStatus: string | null): string {
  if (!lastSyncAt || syncStatus === 'error') return token('color.background.danger.bold');
  const minutesAgo = (Date.now() - new Date(lastSyncAt).getTime()) / 60000;
  if (minutesAgo > 120) return token('color.background.danger.bold');
  if (minutesAgo > 15) return token('color.background.warning.bold');
  return token('color.background.success.bold');
}

function getSyncTooltip(lastSyncAt: string | null, syncStatus: string | null): string {
  if (!lastSyncAt || syncStatus === 'error') return 'Sync error — check Jira connection';
  const minutesAgo = (Date.now() - new Date(lastSyncAt).getTime()) / 60000;
  const formatted = format(new Date(lastSyncAt), 'dd MMM yyyy HH:mm');
  if (minutesAgo > 120) return `Last synced: ${formatted} · Sync may be stalled — check Jira connection`;
  if (minutesAgo > 15) return `Last synced: ${formatted} · Sync is running or delayed`;
  return `Last synced: ${formatted} · Up to date`;
}

// Human-readable sync age label with units appropriate to scale
function formatSyncAge(lastSyncAt: string | null): string | null {
  if (!lastSyncAt) return null;
  const minutesAgo = (Date.now() - new Date(lastSyncAt).getTime()) / 60000;
  if (minutesAgo < 1) return 'just now';
  if (minutesAgo < 60) return `${Math.round(minutesAgo)}m ago`;
  const hoursAgo = minutesAgo / 60;
  if (hoursAgo < 24) return `${Math.round(hoursAgo)}h ago`;
  return `${Math.round(hoursAgo / 24)}d ago`;
}

// Roles eligible to be assigned as project lead (system roles from profiles.role)
const LEAD_ELIGIBLE_ROLES = new Set(['admin', 'program_manager', 'team_lead']);

// ── Shared hooks ───────────────────────────────────────
function useAllProfiles() {
  return useQuery({
    queryKey: ['profiles-all'],
    queryFn: async () => {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role')
        .order('full_name');

      const rows = (profiles || []).map(p => ({ ...p, display_name: p.full_name || '' }));

      // Avatar fallback pass — for profiles whose avatar_url is null, look up
      // resource_inventory.avatar_url (Jira-synced CDN URL). Same pattern as
      // r360Service.getMemberOverview and MemberStack.useMemberProfiles.
      // CLAUDE.md 2026-05-17 lesson: profiles.avatar_url is rarely populated;
      // resource_inventory.avatar_url IS, via Jira sync.
      const needsFallback = rows.filter(r => !r.avatar_url).map(r => r.id);
      if (needsFallback.length > 0) {
        const { data: resources } = await (supabase as any)
          .from('resource_inventory')
          .select('profile_id, avatar_url')
          .in('profile_id', needsFallback)
          .not('avatar_url', 'is', null);
        const fallbackMap = new Map<string, string>(
          (resources ?? []).map((r: { profile_id: string; avatar_url: string }) => [r.profile_id, r.avatar_url]),
        );
        rows.forEach(r => {
          if (!r.avatar_url) {
            const fb = fallbackMap.get(r.id);
            if (fb) r.avatar_url = fb;
          }
        });
      }

      return rows;
    },
    staleTime: 60_000,
  });
}

// ── Sub-components ─────────────────────────────────────
//
// useClickOutside — fires onOutside when a mousedown lands outside ANY of
// the supplied refs. Used by Lead/Members popups since @atlaskit/popup v4.16
// is rendering empty portals in this codebase (Apr 2026 RCA via Chrome MCP).
function useClickOutside(
  isOpen: boolean,
  refs: Array<React.RefObject<HTMLElement | null>>,
  onOutside: () => void,
) {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const inside = refs.some(r => r.current?.contains(target));
      if (!inside) onOutside();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, refs, onOutside]);
}

// useFixedPopupPosition — captures the trigger's viewport coordinates on open
// and returns them so the popup can render via `position: fixed` regardless
// of any parent containing-block weirdness (transformed ancestors, sticky
// table headers, scroll containers, etc.). Re-positions on scroll/resize.
function useFixedPopupPosition(
  isOpen: boolean,
  triggerRef: React.RefObject<HTMLElement | null>,
  popupWidth: number,
): { top: number; left: number } | null {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const recompute = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    // Default: anchor below the trigger, left-aligned. If popup would overflow
    // the right edge, right-align it to the trigger instead.
    let left = r.left;
    if (left + popupWidth > window.innerWidth - 8) {
      left = Math.max(8, r.right - popupWidth);
    }
    setPos({ top: r.bottom + 4, left });
  }, [triggerRef, popupWidth]);

  useEffect(() => {
    if (!isOpen) { setPos(null); return; }
    recompute();
    window.addEventListener('scroll', recompute, true);
    window.addEventListener('resize', recompute);
    return () => {
      window.removeEventListener('scroll', recompute, true);
      window.removeEventListener('resize', recompute);
    };
  }, [isOpen, recompute]);

  return pos;
}


// FIX 2 + FIX 4: Lead cell with click-anywhere-on-chip → reassign popup.
// @atlaskit/popup v4.16 renders empty portals in this codebase, so we use a
// self-rolled positioned div + useClickOutside instead. Atlaskit token styling.
function LeadReassignPopover({ project }: { project: ProjectListItem }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  useClickOutside(open, [triggerRef, popupRef], () => { setOpen(false); setSearch(''); });
  const popupPos = useFixedPopupPosition(open, triggerRef, 300);
  const { data: profiles = [] } = useAllProfiles();
  const [optimisticLead, setOptimisticLead] = useState<{ id: string; name: string; avatar_url: string | null } | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const handleSearchChange = useCallback((val: string) => {
    setSearch(val);
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setDebouncedSearch(val), 150);
  }, []);

  const filtered = useMemo(() => profiles.filter(p =>
    LEAD_ELIGIBLE_ROLES.has(p.role || '') &&
    p.display_name?.toLowerCase().includes(debouncedSearch.toLowerCase())
  ), [profiles, debouncedSearch]);

  // Lead is read straight from the project record. When lead_id is null the
  // project is genuinely unassigned — render the "Assign lead" empty state
  // (zero-assumption: silence beats showing whoever happens to be logged in).
  const displayLead = optimisticLead
    ? { name: optimisticLead.name, avatar_url: optimisticLead.avatar_url, id: optimisticLead.id }
    : project.lead_id
      ? { name: project.lead_name, avatar_url: project.lead_avatar_url, id: project.lead_id }
      : { name: null, avatar_url: null, id: null };

  const handleLeadChange = useCallback((newLeadId: string) => {
    const selectedProfile = profiles.find(p => p.id === newLeadId);
    if (!selectedProfile) return;

    const previousLead = { id: project.lead_id, name: project.lead_name, avatar_url: project.lead_avatar_url };

    // Optimistic update
    setOptimisticLead({ id: newLeadId, name: selectedProfile.display_name, avatar_url: selectedProfile.avatar_url });
    setOpen(false);
    setSearch('');

    // Delayed mutation with undo
    timeoutRef.current = setTimeout(async () => {
      const { error } = await supabase
        .from('projects')
        .update({ lead_id: newLeadId, updated_at: new Date().toISOString() } as any)
        .eq('id', project.id);
      if (error) {
        catalystToast.error('Failed to update lead');
        setOptimisticLead(null);
        return;
      }
      setOptimisticLead(null);
      queryClient.invalidateQueries({ queryKey: ['projecthub', 'projects'] });
    }, 2000);

    toast(`Lead changed to ${selectedProfile.display_name}`, {
      duration: 6000,
      action: {
        label: 'Undo',
        onClick: () => {
          clearTimeout(timeoutRef.current);
          setOptimisticLead(null);
        },
      },
    });
  }, [profiles, project, queryClient]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        aria-label={`Lead: ${displayLead.name || 'unassigned'} (click to reassign)`}
        aria-expanded={open}
        style={{ display: 'flex', alignItems: 'center', gap: 8, maxWidth: '100%', overflow: 'hidden', borderRadius: 4, padding: '4px 6px', marginLeft: -6, background: 'transparent', border: 0, cursor: 'pointer', outline: 'none', pointerEvents: 'auto' }}
        onMouseEnter={e => { e.currentTarget.style.background = token('color.background.neutral.subtle.hovered'); }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      >
        {displayLead.name ? (
          <>
            {/* Block A rule 2 (2026-05-01): the parent <button>'s aria-label
                already announces "Lead: <name> (click to reassign)" — the
                Atlaskit Avatar would otherwise add its own accessible name
                ("<name>") and the adjacent <span> a third copy, producing
                "Vikram IndlaVikram Indla" in the AT name. Mark the avatar
                wrapper aria-hidden so the avatar is treated as decorative
                and the name is read exactly once. */}
            <span aria-hidden="true" style={{ flexShrink: 0, pointerEvents: 'none' }}>
              <Avatar src={displayLead.avatar_url || undefined} name={displayLead.name || '??'} size="small" />
            </span>
            <span
              title={displayLead.name || undefined}
              style={{
                pointerEvents: 'none',
                fontSize: 14,
                fontWeight: 500,
                color: token('color.text'),
                fontFamily: 'var(--cp-font-body)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {(displayLead.name || '').split(' ').slice(0, 2).join(' ')}
            </span>
          </>
        ) : (
          // Empty state — render the same Atlaskit Avatar + label pair as the
          // populated state, just with no src (Avatar shows its default
          // silhouette glyph) and "Assign lead" instead of a name. Keeps the
          // visual rhythm of the column stable whether or not a lead is set,
          // and signals the picker is interactive (design-critique 2026-05-17
          // H4 P0 — empty cell was bare em-dash text, broke ADS pattern).
          <>
            <span aria-hidden="true" style={{ flexShrink: 0, pointerEvents: 'none' }}>
              <Avatar size="small" />
            </span>
            <span
              style={{
                pointerEvents: 'none',
                fontSize: 14,
                fontWeight: 500,
                color: token('color.text.subtle'),
                fontFamily: 'var(--cp-font-body)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              Assign lead
            </span>
          </>
        )}
      </button>

      {open && popupPos && (
        <div
          ref={popupRef}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: popupPos.top,
            left: popupPos.left,
            zIndex: 9999,
            width: 300,
            background: token('elevation.surface.overlay'),
            border: `1px solid ${token('color.border')}`,
            borderRadius: 4,
            boxShadow: token('elevation.shadow.overlay'),
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '10px 12px 4px' }}>
            <Textfield
              value={search}
              onChange={(e) => handleSearchChange((e.target as HTMLInputElement).value)}
              placeholder="Search people..."
              autoFocus
              elemBeforeInput={
                <span style={{ paddingLeft: 8, display: 'inline-flex', alignItems: 'center', color: token('color.text.subtlest') }}>
                  <Search size={12} />
                </span>
              }
            />
          </div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: token('color.text.subtlest'),
              padding: '8px 12px 4px',
            }}
          >
            Reassign lead
          </div>
          <div style={{ maxHeight: 280, overflowY: 'auto', paddingBottom: 6 }}>
            {filtered.map((p) => {
              const isCurrent = p.id === displayLead.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleLeadChange(p.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    padding: '8px 12px',
                    background: isCurrent
                      ? token('color.background.selected')
                      : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: token('color.text'),
                  }}
                  onMouseEnter={(e) => {
                    if (!isCurrent) e.currentTarget.style.background = token('color.background.neutral.subtle.hovered');
                  }}
                  onMouseLeave={(e) => {
                    if (!isCurrent) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <Avatar
                    src={p.avatar_url || undefined}
                    name={p.display_name || '??'}
                    size="small"
                  />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {p.display_name}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: token('color.text.subtlest'),
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {formatRole(p.role || 'Team Member')}
                    </div>
                  </div>
                  {isCurrent && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: token('color.text.brand') }}>
                      CURRENT
                    </span>
                  )}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div
                style={{
                  fontSize: 12,
                  color: token('color.text.subtlest'),
                  textAlign: 'center',
                  padding: '12px 0',
                }}
              >
                No results
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function MemberManagePopover({ project, currentUserId }: { project: ProjectListItem; currentUserId?: string | null }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedMemberSearch, setDebouncedMemberSearch] = useState('');
  const memberSearchTimerRef = useRef<ReturnType<typeof setTimeout>>();
  // Optimistic membership map — flips a row instantly while the DB write
  // is in flight, so add/remove feels seamless (no spinner, no mode change).
  const [pending, setPending] = useState<Record<string, 'adding' | 'removing'>>({});
  const { data: profiles = [] } = useAllProfiles();
  const triggerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  useClickOutside(open, [triggerRef, popupRef], () => { setOpen(false); setSearch(''); });
  const popupPos = useFixedPopupPosition(open, triggerRef, 320);

  const handleMemberSearchChange = useCallback((val: string) => {
    setSearch(val);
    clearTimeout(memberSearchTimerRef.current);
    memberSearchTimerRef.current = setTimeout(() => setDebouncedMemberSearch(val), 150);
  }, []);

  const memberIds = project.member_ids || [];

  // Effective membership = real members + adding optimistic - removing optimistic
  const isEffectiveMember = useCallback((userId: string) => {
    if (pending[userId] === 'adding') return true;
    if (pending[userId] === 'removing') return false;
    return memberIds.includes(userId);
  }, [memberIds, pending]);

  // Sort: members first, then non-members; both groups by display name. Filter by search.
  // Excludes the current logged-in user — you don't add yourself as a member.
  const sortedFiltered = useMemo(() => {
    const q = debouncedMemberSearch.toLowerCase();
    const visible = profiles.filter(p =>
      p.id !== currentUserId &&
      (!q || p.display_name?.toLowerCase().includes(q))
    );
    return [...visible].sort((a, b) => {
      const aMember = isEffectiveMember(a.id);
      const bMember = isEffectiveMember(b.id);
      if (aMember !== bMember) return aMember ? -1 : 1;
      return (a.display_name || '').localeCompare(b.display_name || '');
    });
  }, [profiles, debouncedMemberSearch, isEffectiveMember]);

  const memberCount = useMemo(
    () => profiles.filter(p => isEffectiveMember(p.id)).length,
    [profiles, isEffectiveMember],
  );

  const handleToggle = useCallback(async (userId: string) => {
    if (userId === project.lead_id) return; // lead cannot be removed
    const wasMember = isEffectiveMember(userId);
    // Optimistic flip
    setPending(prev => ({ ...prev, [userId]: wasMember ? 'removing' : 'adding' }));
    try {
      if (wasMember) {
        const { error } = await supabase
          .from('project_members')
          .delete()
          .eq('project_id', project.id)
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('project_members')
          .insert({ project_id: project.id, user_id: userId, role: 'member' } as any);
        if (error) throw error;
      }
      // Refresh from server, then drop the optimistic entry
      await queryClient.invalidateQueries({ queryKey: ['projecthub', 'projects'] });
      setPending(prev => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    } catch (e) {
      // Roll back optimistic on failure
      setPending(prev => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      catalystToast.error(wasMember ? 'Failed to remove member' : 'Failed to add member');
    }
  }, [isEffectiveMember, project.id, project.lead_id, queryClient]);

  const popupContent = () => (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        width: 320,
        background: token('elevation.surface.overlay'),
        border: `1px solid ${token('color.border')}`,
        borderRadius: 4,
        boxShadow: token('elevation.shadow.overlay'),
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '10px 12px 6px' }}>
        <Textfield
          value={search}
          onChange={(e) => handleMemberSearchChange((e.target as HTMLInputElement).value)}
          placeholder="Search people..."
          autoFocus
          elemBeforeInput={
            <span style={{ paddingLeft: 8, display: 'inline-flex', alignItems: 'center', color: token('color.text.subtlest') }}>
              <Search size={12} />
            </span>
          }
        />
      </div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          color: token('color.text.subtlest'),
          padding: '4px 12px',
        }}
      >
        Members · {memberCount}
      </div>
      <div style={{ maxHeight: 320, overflowY: 'auto', paddingBottom: 6 }}>
        {sortedFiltered.map((p) => {
          const isMember = isEffectiveMember(p.id);
          const isLead = p.id === project.lead_id;
          return (
            <div
              key={p.id}
              role="button"
              tabIndex={isLead ? -1 : 0}
              onClick={() => { if (!isLead) handleToggle(p.id); }}
              onKeyDown={(e) => {
                if (isLead) return;
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleToggle(p.id); }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 12px',
                cursor: isLead ? 'default' : 'pointer',
                color: token('color.text'),
                opacity: pending[p.id] ? 0.6 : 1,
                outline: 'none',
              }}
              onMouseEnter={(e) => { if (!isLead) e.currentTarget.style.background = token('color.background.neutral.subtle.hovered'); }}
              onMouseLeave={(e) => { if (!isLead) e.currentTarget.style.background = 'transparent'; }}
              aria-pressed={isMember}
              aria-label={isLead ? `${p.display_name} (lead, locked)` : `${p.display_name}${isMember ? ' — click to remove' : ' — click to add'}`}
            >
              <Avatar src={p.avatar_url || undefined} name={p.display_name || '??'} size="small" />
              <span
                style={{
                  fontSize: 13,
                  flex: 1,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  fontFamily: 'var(--cp-font-body)',
                }}
              >
                {p.display_name}
              </span>
              {isLead ? (
                <Lozenge appearance="inprogress" isBold={false}>Lead</Lozenge>
              ) : isMember ? (
                // ADS canonical selection indicator: brand-blue CheckCircleIcon.
                // Replaces the previous hand-rolled green "✓" circle which was
                // an ADS violation (raw bg color, custom shape, custom font).
                // Design-critique 2026-05-17 H4 P0.
                <span aria-hidden style={{ display: 'inline-flex', color: token('color.icon.brand', 'var(--ds-link, #0C66E4)'), flexShrink: 0 }}>
                  <CheckCircleIcon label="" size="medium" primaryColor="currentColor" />
                </span>
              ) : (
                // ADS canonical "add" affordance — outlined neutral, becomes
                // visible on row hover (the row itself is the click target;
                // the icon is decorative).
                <span aria-hidden style={{ display: 'inline-flex', color: token('color.icon.subtle', 'var(--ds-icon-subtle, #626F86)'), flexShrink: 0 }}>
                  <AddCircleIcon label="" size="medium" primaryColor="currentColor" />
                </span>
              )}
            </div>
          );
        })}
        {sortedFiltered.length === 0 && (
          <div
            style={{
              fontSize: 12,
              color: token('color.text.subtlest'),
              textAlign: 'center',
              padding: '12px 0',
            }}
          >
            No results
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div
        ref={triggerRef}
        role="button"
        tabIndex={0}
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setOpen(o => !o); } }}
        aria-label={memberIds.length > 0 ? `${memberIds.length} members. Click to manage.` : 'Add members'}
        aria-expanded={open}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          cursor: 'pointer',
          pointerEvents: 'auto',
          outline: 'none',
          borderRadius: 6,
          padding: '2px 4px',
        }}
      >
        {memberIds.length > 0 ? (
          <MemberStack
            memberIds={memberIds}
            memberCount={project.member_count}
            max={4}
          />
        ) : (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              color: token('color.text.subtle'),
            }}
          >
            <span
              aria-hidden
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 24,
                height: 24,
                borderRadius: 12,
                border: `1px dashed ${token('color.border')}`,
                color: token('color.text.subtle'),
                fontSize: 14,
                fontWeight: 700,
              }}
            >+</span>
            Add members
          </span>
        )}
      </div>

      {open && popupPos && (
        <div ref={popupRef} style={{
          position: 'fixed',
          top: popupPos.top,
          left: popupPos.left,
          zIndex: 9999,
        }}>
          {popupContent()}
        </div>
      )}
    </>
  );
}

function RowActionMenu({ project }: { project: ProjectListItem }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(project.name);
  const [renameSaving, setRenameSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  // Self-rolled popup — AKDropdownMenu passes isSelected + testId to DOM <button>
  // which breaks Popper's ref chain in this codebase (confirmed Apr–May 2026 Chrome MCP probe).
  // Pattern: same useClickOutside + useFixedPopupPosition used by LeadReassignPopover.
  useClickOutside(open, [triggerRef, popupRef], () => setOpen(false));
  const popupPos = useFixedPopupPosition(open, triggerRef, 200);

  const close = () => setOpen(false);

  const handleArchive = async () => {
    close();
    const { error } = await supabase
      .from('projects')
      .update({ status: 'archived', updated_at: new Date().toISOString() } as any)
      .eq('id', project.id);
    if (error) { catalystToast.error('Failed to archive'); return; }
    catalystToast.success(`${project.name} archived`);
    queryClient.invalidateQueries({ queryKey: ['projecthub', 'projects'] });
  };

  // MDT is permanently mapped to a Product, not a Project (CLAUDE.md
  // 2026-05-17 directive). Hide the "Sync with Jira" item for MDT-keyed
  // rows so the user can't accidentally re-import MDT data into the
  // projects table.
  const isMDT = project.project_key === 'MDT';

  const handleSyncWithJira = async () => {
    close();
    try {
      const { data, error } = await supabase.functions.invoke('jira-sync-projects', {
        body: {
          projectKeys: [project.project_key],
          syncMode: 'delta',
          // The 2026 filter is enforced server-side by all jira-* ingest
          // functions per CLAUDE.md guardrail (only created|updated ≥ 2026-01
          // is accepted). Passing the flag here makes the contract explicit
          // for any reader who's tracing the call site.
          since: '2026-01-01T00:00:00Z',
        },
      });
      if (error) throw error;
      catalystToast.success(`${project.project_key} sync started — refreshing…`);
      // Invalidate so the row's issue counts + last-sync timestamp refresh.
      queryClient.invalidateQueries({ queryKey: ['projecthub', 'projects'] });
      queryClient.invalidateQueries({ queryKey: ['project-sync-stats'] });
      // Surface any function-returned info for debug visibility.
      if (data && typeof data === 'object' && 'message' in data) {
        // eslint-disable-next-line no-console
        console.info('[Sync with Jira]', data);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      catalystToast.error(`Sync failed: ${msg}`);
    }
  };

  const handleRenameSubmit = async () => {
    const next = renameValue.trim();
    if (!next || next === project.name) {
      setRenameOpen(false);
      return;
    }
    setRenameSaving(true);
    const { error } = await supabase
      .from('projects')
      .update({ name: next, updated_at: new Date().toISOString() } as any)
      .eq('id', project.id);
    setRenameSaving(false);
    if (error) { catalystToast.error('Failed to rename project'); return; }
    catalystToast.success(`Renamed to "${next}"`);
    setRenameOpen(false);
    queryClient.invalidateQueries({ queryKey: ['projecthub', 'projects'] });
  };

  const handleDelete = async () => {
    setDeleting(true);
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', project.id);
    setDeleting(false);
    if (error) { catalystToast.error(`Failed to delete: ${error.message}`); return; }
    catalystToast.success(`${project.name} deleted`);
    setDeleteOpen(false);
    queryClient.invalidateQueries({ queryKey: ['projecthub', 'projects'] });
  };

  // Shared menu item button style
  const menuItemStyle: React.CSSProperties = {
    display: 'block', width: '100%', padding: '7px 14px',
    background: 'transparent', border: 'none', cursor: 'pointer',
    textAlign: 'left', fontSize: 14, color: token('color.text'),
    fontFamily: 'var(--cp-font-body)', borderRadius: 0,
  };
  const menuItemHover = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = token('color.background.neutral.subtle.hovered');
  };
  const menuItemLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = 'transparent';
  };

  return (
    <>
      {/* Trigger — self-rolled: no AKDropdownMenu to avoid isSelected DOM prop bug */}
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        aria-label={`Actions for ${project.name}`}
        aria-expanded={open}
        aria-haspopup="menu"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 28, height: 28, borderRadius: 4,
          color: token('color.text.subtle'),
          background: 'transparent', border: 'none',
          cursor: 'pointer', outline: 'none',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = token('color.background.neutral.subtle.hovered'); e.currentTarget.style.color = token('color.text'); }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = token('color.text.subtle'); }}
      >
        <MoreHorizontal size={16} />
      </button>

      {/* Self-rolled positioned popup menu */}
      {open && popupPos && (
        <div
          ref={popupRef}
          data-testid="row-action-menu-popup"
          role="menu"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: popupPos.top,
            left: popupPos.left,
            zIndex: 9999,
            width: 200,
            background: token('elevation.surface.overlay'),
            border: `1px solid ${token('color.border')}`,
            borderRadius: 4,
            boxShadow: token('elevation.shadow.overlay'),
            overflow: 'hidden',
            paddingBlock: 4,
          }}
        >
          <button role="menuitem" style={menuItemStyle} onMouseEnter={menuItemHover} onMouseLeave={menuItemLeave}
            onClick={() => { close(); navigate(`/project-hub/${project.project_key}/dashboard`); }}>
            Open project
          </button>
          <button role="menuitem" style={menuItemStyle} onMouseEnter={menuItemHover} onMouseLeave={menuItemLeave}
            onClick={() => { close(); setRenameValue(project.name); setRenameOpen(true); }}>
            Rename
          </button>
          <button role="menuitem" style={menuItemStyle} onMouseEnter={menuItemHover} onMouseLeave={menuItemLeave}
            onClick={() => { close(); navigate(`/project-hub/${project.project_key}/settings`); }}>
            Project settings
          </button>
          {/* Sync with Jira — only shown for projects mapped to a Jira board.
              MDT is permanently routed to the Products module (not Projects),
              so we suppress the option there (CLAUDE.md 2026-05-17). */}
          {!isMDT && (
            <>
              <div style={{ height: 1, background: token('color.border'), margin: '4px 0' }} role="separator" />
              <button role="menuitem" style={menuItemStyle} onMouseEnter={menuItemHover} onMouseLeave={menuItemLeave}
                onClick={handleSyncWithJira}>
                Sync with Jira
              </button>
            </>
          )}
          <div style={{ height: 1, background: token('color.border'), margin: '4px 0' }} role="separator" />
          <button role="menuitem" style={menuItemStyle} onMouseEnter={menuItemHover} onMouseLeave={menuItemLeave}
            onClick={handleArchive}>
            Archive project
          </button>
          <button role="menuitem" style={{ ...menuItemStyle, color: token('color.text.danger') }}
            onMouseEnter={e => { e.currentTarget.style.background = token('color.background.danger.hovered'); }}
            onMouseLeave={menuItemLeave}
            onClick={() => { close(); setDeleteOpen(true); }}>
            Delete project…
          </button>
        </div>
      )}

      {/* Rename modal */}
      <ModalTransition>
        {renameOpen && (
          <AKModal onClose={() => setRenameOpen(false)} width="small">
            <ModalHeader>
              <ModalTitle>Rename project</ModalTitle>
            </ModalHeader>
            <ModalBody>
              <div style={{ paddingBlock: 8 }}>
                <label
                  htmlFor={`rename-${project.id}`}
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 600,
                    color: token('color.text.subtle'),
                    marginBottom: 6,
                  }}
                >
                  Project name
                </label>
                <Textfield
                  id={`rename-${project.id}`}
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue((e.target as HTMLInputElement).value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleRenameSubmit();
                    }
                  }}
                />
                <p style={{ fontSize: 12, color: token('color.text.subtlest'), marginTop: 6, margin: 0 }}>
                  Key (<code style={{ fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace' }}>{project.project_key}</code>) and member assignments are unchanged.
                </p>
              </div>
            </ModalBody>
            <ModalFooter>
              <AKButton appearance="subtle" onClick={() => setRenameOpen(false)} isDisabled={renameSaving}>
                Cancel
              </AKButton>
              <AKButton
                appearance="primary"
                onClick={() => { void handleRenameSubmit(); }}
                isDisabled={renameSaving || !renameValue.trim() || renameValue.trim() === project.name}
              >
                {renameSaving ? 'Saving…' : 'Save'}
              </AKButton>
            </ModalFooter>
          </AKModal>
        )}
      </ModalTransition>

      {/* Delete confirmation */}
      <ModalTransition>
        {deleteOpen && (
          <AKModal onClose={() => setDeleteOpen(false)} width="small">
            <ModalHeader>
              <ModalTitle appearance="danger">Delete project</ModalTitle>
            </ModalHeader>
            <ModalBody>
              <p style={{ margin: 0 }}>
                You're about to permanently delete{' '}
                <strong>{project.name}</strong> (
                <code style={{ fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace' }}>{project.project_key}</code>
                ). This cannot be undone — all issues, comments, and member
                assignments tied to this project will be removed.
              </p>
              <p style={{ marginTop: 12, color: token('color.text.subtle'), fontSize: 13 }}>
                Consider archiving instead if you might want it back later.
              </p>
            </ModalBody>
            <ModalFooter>
              <AKButton appearance="subtle" onClick={() => setDeleteOpen(false)} isDisabled={deleting}>
                Cancel
              </AKButton>
              <AKButton
                appearance="warning"
                onClick={() => { void handleArchive(); setDeleteOpen(false); }}
                isDisabled={deleting}
              >
                Archive instead
              </AKButton>
              <AKButton
                appearance="danger"
                onClick={() => { void handleDelete(); }}
                isDisabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Delete project'}
              </AKButton>
            </ModalFooter>
          </AKModal>
        )}
      </ModalTransition>
    </>
  );
}

// ── Column key → SortColumn mapping ──
const COL_TO_SORT: Record<string, SortColumn> = {
  project_name: 'name',
};
const SORTABLE_PROJECT_KEYS = new Set(Object.keys(COL_TO_SORT));

// ── Resizable column config ──
// Apr 2026: Jira spec verified via /jira-compare — Name · Key · Lead
// (Category, Space URL, Type excluded per owner directives). Catalyst
// additions: Star (left-edge, locked), Members, Sync, Actions (right-edge).
const PROJECT_COLUMNS: TColDef[] = [
  { key: 'star', label: '', defaultWidth: 32, minWidth: 32, locked: true },
  { key: 'project_name', label: 'Name', defaultWidth: 280, minWidth: 200 },
  { key: 'project_key', label: 'Key', defaultWidth: 90, minWidth: 70 },
  { key: 'lead', label: 'Lead', defaultWidth: 180, minWidth: 130 },
  { key: 'members', label: 'Members', defaultWidth: 160, minWidth: 100 },
  { key: 'sync', label: 'Sync', defaultWidth: 200, minWidth: 110 },
  { key: 'actions', label: '', defaultWidth: 40, minWidth: 40, locked: true },
];

// Jira "Type" column mapping — projects.project_type → display label
const PROJECT_TYPE_LABEL: Record<string, string> = {
  kanban: 'Team-managed software',
  scrum: 'Team-managed software',
  business: 'Team-managed business',
  service_desk: 'Team-managed service',
  company_managed: 'Company-managed software',
};
function formatProjectType(type: string | null | undefined): string {
  if (!type) return 'Team-managed software';
  return PROJECT_TYPE_LABEL[type] ?? 'Team-managed software';
}

// ── Props ──────────────────────────────────────────────
interface Props {
  projects: ProjectListItem[];
  favoriteIds: Set<string>;
  onToggleFav: (id: string, fav: boolean) => void;
  onSelectProject: (id: string) => void;
  sortCol: SortColumn;
  sortDir: SortDirection;
  onSort: (col: SortColumn) => void;
  selectedRows: Set<string>;
  onToggleRow: (id: string) => void;
  onToggleAll: () => void;
  pageOffset?: number;
  /** Per-project sync stats: count, latest timestamp, 24h activity */
  projectSyncStats?: Record<string, import('@/hooks/projecthub-sync-utils').ProjectSyncStats>;
  currentUserId?: string | null;
}

// ── Main component ─────────────────────────────────────
export function AllProjectsTable({
  projects, favoriteIds, onToggleFav, sortCol, sortDir, onSort,
  selectedRows, onToggleRow, pageOffset = 0, projectSyncStats, currentUserId,
}: Props) {
  const navigate = useNavigate();
  const trackRecent = useTrackRecentItem();

  // Record a project view in user_recent_items so the sidebar Recents
  // rail and Home pinned section have something to surface.
  // Excludes subtasks per CLAUDE.md (Apr 2026 owner directive).
  const recordProjectView = useCallback((p: ProjectListItem) => {
    trackRecent.mutate({
      entityType: 'project',
      entityId: p.id,
      entityKey: p.project_key,
      displaySummary: p.name,
      projectId: p.id,
      projectName: p.name,
      navPath: `/project-hub/${p.project_key}/dashboard`,
    });
  }, [trackRecent]);

  const handleHeaderSort = useCallback((colKey: string) => {
    const mappedCol = COL_TO_SORT[colKey];
    if (mappedCol) onSort(mappedCol);
  }, [onSort]);

  // Reverse-map sortCol to column key for indicator display
  const activeSortColKey = useMemo(() => {
    for (const [k, v] of Object.entries(COL_TO_SORT)) {
      if (v === sortCol) return k;
    }
    return null;
  }, [sortCol]);

  const {
    orderedColumns, columnWidths, dragKey, dragOverKey,
    onResizeStart, onDragStart, onDragOver, onDragEnd, prefsReady,
  } = useTableColumns('projects', PROJECT_COLUMNS);

  // Hold render until persisted column order/widths are applied, so the key/name
  // columns never paint in default order and shift on hydration (CAT-DEF-007).
  if (!prefsReady) {
    return (
      <div
        style={{
          borderRadius: 8,
          border: `1px solid ${token('color.border', 'var(--ds-border, #DFE1E6)')}`,
          padding: token('space.500', '40px'),
          backgroundColor: token('elevation.surface', 'var(--ds-surface, #FFFFFF)'),
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: token('space.150', '12px') }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse" style={{ display: 'flex', alignItems: 'center', gap: token('space.200', '16px') }}>
              <div style={{ height: 28, width: 28, borderRadius: '50%', backgroundColor: token('color.background.neutral.subtle', 'var(--ds-background-neutral-subtle, #F4F5F7)') }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: token('space.075', '6px') }}>
                <div style={{ height: 12, width: '30%', borderRadius: 4, backgroundColor: token('color.background.neutral.subtle', 'var(--ds-background-neutral-subtle, #F4F5F7)') }} />
                <div style={{ height: 10, width: '20%', borderRadius: 4, backgroundColor: token('color.background.neutral.subtle', 'var(--ds-background-neutral-subtle, #F4F5F7)') }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Per-project sync stats are passed in via projectSyncStats prop (built in AllProjectsPage
  // from ph_issues). No separate query needed here — data flows top-down.

  const renderProjectCell = (colKey: string, p: ProjectListItem, idx: number) => {
    const isFav = favoriteIds.has(p.id);
    const active = isActiveStatus(p.status);
    const rowNum = pageOffset + idx + 1;
    const perProject = projectSyncStats?.[p.project_key];
    const issueCount = perProject?.count ?? p.jira_issue_count ?? 0;
    const latestAt = perProject?.latestAt ?? null;
    const syncAge = formatSyncAge(latestAt);
    const syncDotBg = getSyncDotBg(latestAt, null);
    const syncTooltipText = getSyncTooltip(latestAt, null);
    const updatedToday = perProject?.updatedToday ?? 0;
    const createdToday = perProject?.createdToday ?? 0;
    const hasActivityToday = updatedToday > 0 || createdToday > 0;

    switch (colKey) {
      case 'star': return <td key={colKey} style={{ overflow: 'visible', textOverflow: 'clip' }}><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><button onClick={e => { e.stopPropagation(); onToggleFav(p.id, isFav); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, outline: 'none', borderRadius: 4, flexShrink: 0, pointerEvents: 'auto', color: isFav ? token('color.text.warning') : token('color.text.subtlest') }}><Star size={14} fill={isFav ? token('color.text.warning') : 'none'} /></button></div></td>;
      // Block B (2026-05-01) — project_name is now a real anchor (RouterLink).
      // Replaces the previous <span onClick> which lost middle-click new-tab,
      // keyboard focus, and link semantics. Audit S-? (Project list rows had
      // cursor:pointer but no role/tabIndex/href).
      case 'project_name': return (
        <td key={colKey}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
            <ProjectIcon
              projectKey={p.project_key}
              avatarUrl={p.icon_avatar_url}
              color={p.icon_color}
              size="small"
            />
            <RouterLink
              to={`/project-hub/${p.project_key}/dashboard`}
              onClick={() => recordProjectView(p)}
              title={p.name}
              style={{
                pointerEvents: 'auto',
                fontSize: 14,
                fontWeight: 400,
                color: token('color.link'),
                fontFamily: 'var(--cp-font-body)',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                flex: 1,
                minWidth: 0,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
              onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
            >
              {p.name}
            </RouterLink>
          </div>
        </td>
      );
      // Block B (2026-05-01) — project_key now wraps in a RouterLink so
      // click/middle-click/Cmd-click all navigate; keyboard focus reaches the
      // key cell via Tab. Visual treatment intentionally subtle (no underline,
      // matches existing key-cell style) so it reads as part of the table cell
      // rather than a flashy link.
      // Key cell — left-aligned per design-critique 2026-05-17 ("BAU is not
      // aligned with the key and the starred functionality"). Previously
      // centered, which made the key drift away from the Name column's
      // left-aligned start, breaking the row's visual grid.
      case 'project_key': return <td key={colKey} style={{ textAlign: 'left' }}><RouterLink to={`/project-hub/${p.project_key}/dashboard`} onClick={() => recordProjectView(p)} style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 12, fontWeight: 500, color: token('color.text.subtle'), letterSpacing: '0.02em', textDecoration: 'none' }} onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; e.currentTarget.style.color = String(token('color.link')); }} onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; e.currentTarget.style.color = String(token('color.text.subtle')); }}>{p.project_key}</RouterLink></td>;
      // 'type' column is permanently banned from the Projects list view.
      case 'lead': return <td key={colKey}><LeadReassignPopover project={p} /></td>;
      case 'members': return <td key={colKey}><MemberManagePopover project={p} currentUserId={currentUserId} /></td>;
      case 'sync': return (
        <td key={colKey}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Line 1: issue count + freshness — Tooltip wraps the whole line so the
                dot's own dimensions are not collapsed by AK Tooltip's ref wrapper */}
            <Tooltip content={syncTooltipText} position="top">
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: token('color.text.subtle'), fontFamily: 'var(--cp-font-body)', cursor: 'help' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, backgroundColor: syncDotBg }} />
                <span
                  style={{ fontWeight: 500, color: syncAge ? token('color.text') : token('color.text.subtlest') }}
                  title={syncAge ? undefined : 'Jira not connected for this project — go to Project Settings to link Jira'}
                >
                  {syncAge ? `${issueCount} issues · ${syncAge}` : 'Not synced'}
                </span>
              </div>
            </Tooltip>
            {/* Line 2: 24h activity footprint — only when there's activity */}
            {hasActivityToday && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: token('color.text.subtlest'), fontFamily: 'var(--cp-font-body)', paddingLeft: 14 }}>
                {updatedToday > 0 && (
                  <span title={`${updatedToday} issue${updatedToday === 1 ? '' : 's'} updated in the last 24h`}>
                    ↑ {updatedToday} updated
                  </span>
                )}
                {updatedToday > 0 && createdToday > 0 && (
                  <span style={{ color: token('color.border') }}>·</span>
                )}
                {createdToday > 0 && (
                  <span title={`${createdToday} issue${createdToday === 1 ? '' : 's'} created in the last 24h`}>
                    + {createdToday} new
                  </span>
                )}
              </div>
            )}
          </div>
        </td>
      );
      case 'actions': return <td key={colKey} style={{ textAlign: 'center', pointerEvents: 'auto' }}>{active ? <RowActionMenu project={p} /> : <Lock size={14} style={{ color: token('color.text.subtlest') }} />}</td>;
      default: return <td key={colKey} />;
    }
  };

  return (
    <div className="overflow-x-auto" style={{ borderRadius: 0 }}>
      <table className="pb-table" style={{ minWidth: 900, tableLayout: 'fixed' }}>
        <colgroup>
          {orderedColumns.map(c => (
            <col key={c.key} style={{ width: columnWidths[c.key] || c.defaultWidth }} />
          ))}
        </colgroup>
        <thead>
          <tr className="group/thead">
            {orderedColumns.map(c => {
              if (c.key === 'num') return <th key={c.key} className="text-center" style={{ width: columnWidths.num }}>#</th>;
              return (
                <ResizableTableHeader
                  key={c.key}
                  colKey={c.key}
                  label={c.label}
                  width={columnWidths[c.key] || c.defaultWidth}
                  locked={c.locked}
                  isDragging={dragKey === c.key}
                  isDragOver={dragOverKey === c.key}
                  onResizeStart={onResizeStart}
                  onDragStart={onDragStart}
                  onDragOver={onDragOver}
                  onDragEnd={onDragEnd}
                  sortDirection={activeSortColKey === c.key ? (sortDir as SortDir) : null}
                  onSort={SORTABLE_PROJECT_KEYS.has(c.key) ? handleHeaderSort : undefined}
                  // Projects table opts OUT of drag-to-reorder — the six-dot
                  // grips on every header were design-critique 2026-05-17 H8 P0
                  // visual noise. Resize handle (right-edge) is kept.
                  hideDragHandle
                />
              );
            })}
          </tr>
        </thead>
        <tbody>
          {projects.map((p, idx) => {
            const checked = selectedRows.has(p.id);
            const active = isActiveStatus(p.status);
            return (
              <tr
                key={p.id}
                className={cn('group', checked && 'pb-row-selected')}
                /* Block B (2026-05-01) — row body cursor is the default pointer
                   (NOT cursor:pointer). The shared `.pb-table tbody tr` rule in
                   product-backlog.css sets pointer for tables where the whole
                   row is clickable; here only the project_name and project_key
                   cells are real anchors, so the row body should read as
                   non-clickable. Inline override beats the imported sheet. */
                style={{ opacity: active ? 1 : 0.45, pointerEvents: active ? 'auto' : 'none', height: 48, cursor: 'default' }}
              >
                {orderedColumns.map(c => renderProjectCell(c.key, p, idx))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
