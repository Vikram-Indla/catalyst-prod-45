import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Star, MoreHorizontal, Lock, ChevronUp, ChevronDown, ExternalLink, Settings, Archive, Search, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Avatar, Tooltip } from '@/components/ads';
import { IssueBreakdownPopover } from './IssueBreakdownPopover';
// Atlaskit primitives for Lead reassign + row actions (Atlaskit migration scope).
// Note: @atlaskit/popup v4.16 renders empty portals in this codebase (Apr 2026
// runtime probe via Chrome MCP), so Lead/Members popups use self-rolled
// positioned divs with useClickOutside instead. Popup kept available for
// future use when the lib is upgraded.
import Textfield from '@atlaskit/textfield';
import { token } from '@atlaskit/tokens';
import AKDropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import AKModal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import AKButton from '@atlaskit/button/new';
import { MenuGroup, ButtonItem, Section } from '@atlaskit/menu';
import { useTrackRecentItem } from '@/hooks/useRecentProjectItems';

// ── Utilities ──────────────────────────────────────────
const BADGE_COLORS = ['var(--ds-text-brand, #3B82F6)', '#6366F1', '#0891B2', 'var(--ds-text-subtle, #475569)', '#0D9488', '#78716C'];

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

// FIX 8: Three-state sync dot color
function getSyncDotColor(lastSyncAt: string | null, syncStatus: string | null): string {
  if (!lastSyncAt || syncStatus === 'error') return 'bg-red-500';
  const minutesAgo = (Date.now() - new Date(lastSyncAt).getTime()) / 60000;
  if (minutesAgo > 120) return 'bg-red-500';
  if (minutesAgo > 15) return 'bg-amber-400';
  return 'bg-green-500';
}

function getSyncTooltip(lastSyncAt: string | null, syncStatus: string | null): string {
  if (!lastSyncAt || syncStatus === 'error') return 'Sync error — check connection';
  const minutesAgo = (Date.now() - new Date(lastSyncAt).getTime()) / 60000;
  const formatted = format(new Date(lastSyncAt), 'dd MMM yyyy HH:mm');
  if (minutesAgo > 120) return `Sync error — last sync ${formatted}`;
  if (minutesAgo > 15) return `Stale — last sync over 15 min ago\n${formatted}`;
  return `Last synced: ${formatted}\nStatus: OK`;
}

// ── Shared hooks ───────────────────────────────────────
function useAllProfiles() {
  return useQuery({
    queryKey: ['profiles-all'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name, avatar_url, role').order('full_name');
      return (data || []).map(p => ({ ...p, display_name: p.full_name || '' }));
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
    p.display_name?.toLowerCase().includes(debouncedSearch.toLowerCase())
  ), [profiles, debouncedSearch]);

  const displayLead = optimisticLead
    ? { name: optimisticLead.name, avatar_url: optimisticLead.avatar_url, id: optimisticLead.id }
    : { name: project.lead_name, avatar_url: project.lead_avatar_url, id: project.lead_id };

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
        toast.error('Failed to update lead');
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
        style={{ pointerEvents: 'auto' }}
        className="inline-flex items-center gap-2 max-w-full overflow-hidden rounded-md px-1.5 py-1 -ml-1.5 bg-transparent border-0 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 outline-none"
      >
        {displayLead.name ? (
          <>
            <span style={{ flexShrink: 0, pointerEvents: 'none' }}>
              <Avatar src={displayLead.avatar_url || undefined} name={displayLead.name || '??'} size="small" />
            </span>
            <span
              title={displayLead.name || ''}
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
          <span style={{ pointerEvents: 'none', fontSize: 14, color: token('color.text.subtle'), fontFamily: 'var(--cp-font-body)' }}>— Assign lead</span>
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

function MemberManagePopover({ project }: { project: ProjectListItem }) {
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
  const sortedFiltered = useMemo(() => {
    const q = debouncedMemberSearch.toLowerCase();
    const visible = profiles.filter(p => !q || p.display_name?.toLowerCase().includes(q));
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
      toast.error(wasMember ? 'Failed to remove member' : 'Failed to add member');
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
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: token('color.text.brand'),
                    background: token('color.background.selected'),
                    padding: '2px 6px',
                    borderRadius: 3,
                  }}
                  aria-label="Project lead"
                >
                  LEAD
                </span>
              ) : isMember ? (
                <span
                  aria-hidden
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    background: token('color.background.success'),
                    color: token('color.text.inverse'),
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  ✓
                </span>
              ) : (
                <span
                  aria-hidden
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    border: `1px dashed ${token('color.border')}`,
                    color: token('color.text.subtle'),
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  +
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
          display: 'inline-flex',
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
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(project.name);
  const [renameSaving, setRenameSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleArchive = async () => {
    const { error } = await supabase
      .from('projects')
      .update({ status: 'archived', updated_at: new Date().toISOString() } as any)
      .eq('id', project.id);
    if (error) { toast.error('Failed to archive'); return; }
    toast.success(`${project.name} archived`);
    queryClient.invalidateQueries({ queryKey: ['projecthub', 'projects'] });
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
    if (error) { toast.error('Failed to rename project'); return; }
    toast.success(`Renamed to "${next}"`);
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
    if (error) { toast.error(`Failed to delete: ${error.message}`); return; }
    toast.success(`${project.name} deleted`);
    setDeleteOpen(false);
    queryClient.invalidateQueries({ queryKey: ['projecthub', 'projects'] });
  };

  return (
    <>
      <AKDropdownMenu
        placement="bottom-end"
        trigger={({ triggerRef, ...triggerProps }) => (
          <button
            {...triggerProps}
            ref={triggerRef as React.Ref<HTMLButtonElement>}
            onClick={(e) => { e.stopPropagation(); triggerProps.onClick?.(e as any); }}
            aria-label={`Actions for ${project.name}`}
            className="flex h-7 w-7 items-center justify-center rounded text-slate-500 dark:text-[var(--ds-text-subtlest, #A1A1A1)] hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-[var(--ds-text, #EDEDED)] bg-transparent border-none cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600 outline-none transition-colors"
          >
            <MoreHorizontal size={16} />
          </button>
        )}
      >
        <DropdownItemGroup>
          <DropdownItem onClick={() => navigate(`/project-hub/${project.project_key}/dashboard`)}>
            Open project
          </DropdownItem>
          <DropdownItem onClick={() => { setRenameValue(project.name); setRenameOpen(true); }}>
            Rename
          </DropdownItem>
          <DropdownItem
            onClick={() => navigate(`/project-hub/${project.project_key}/sync`)}
            isDisabled
          >
            Sync settings
          </DropdownItem>
        </DropdownItemGroup>
        <DropdownItemGroup hasSeparator>
          <DropdownItem onClick={handleArchive}>
            Archive project
          </DropdownItem>
          <DropdownItem onClick={() => setDeleteOpen(true)}>
            <span style={{ color: token('color.text.danger') }}>Delete project…</span>
          </DropdownItem>
        </DropdownItemGroup>
      </AKDropdownMenu>

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
                  Key (<code style={{ fontFamily: 'JetBrains Mono, monospace' }}>{project.project_key}</code>) and member assignments are unchanged.
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
                <code style={{ fontFamily: 'JetBrains Mono, monospace' }}>{project.project_key}</code>
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
  { key: 'project_name', label: 'NAME', defaultWidth: 280, minWidth: 200 },
  { key: 'project_key', label: 'KEY', defaultWidth: 90, minWidth: 70 },
  { key: 'lead', label: 'LEAD', defaultWidth: 180, minWidth: 130 },
  { key: 'members', label: 'MEMBERS', defaultWidth: 160, minWidth: 100 },
  { key: 'sync', label: 'SYNC', defaultWidth: 200, minWidth: 110 },
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
}

// ── Main component ─────────────────────────────────────
export function AllProjectsTable({
  projects, favoriteIds, onToggleFav, sortCol, sortDir, onSort,
  selectedRows, onToggleRow, pageOffset = 0,
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
    onResizeStart, onDragStart, onDragOver, onDragEnd,
  } = useTableColumns('projects', PROJECT_COLUMNS);

  // Per-project sync data
  const { data: syncData } = useQuery({
    queryKey: ['project-sync-data'],
    queryFn: async () => {
      const countMap: Record<string, number> = {};
      const { data: viewRows, error: viewError } = await typedQuery('v_issue_counts')
        .select('project_key, cnt');

      if (!viewError && viewRows) {
        viewRows.forEach((r: any) => {
          if (r.project_key) {
            countMap[r.project_key] = (countMap[r.project_key] || 0) + Number(r.cnt || 0);
          }
        });
      }

      const { data: lastSync } = await typedQuery('ph_sync_log')
        .select('completed_at, projects_synced')
        .in('status', ['success', 'warning', 'running'])
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let fallbackSyncAt: string | null = null;
      if (!lastSync?.completed_at) {
        const { data: recentIssue } = await typedQuery('ph_issues')
          .select('last_synced_at')
          .not('last_synced_at', 'is', null)
          .order('last_synced_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        fallbackSyncAt = recentIssue?.last_synced_at || null;
      }

      const syncedFromLog = new Set<string>(lastSync?.projects_synced || []);
      const syncedFromIssues = new Set<string>(Object.keys(countMap).filter(k => countMap[k] > 0));
      const syncedProjectKeys = new Set<string>([...syncedFromLog, ...syncedFromIssues]);
      const effectiveSyncAt = lastSync?.completed_at || fallbackSyncAt || null;

      return { countMap, lastSyncAt: effectiveSyncAt, syncedProjectKeys };
    },
    refetchInterval: 5 * 60_000,
    staleTime: 3 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  const renderProjectCell = (colKey: string, p: ProjectListItem, idx: number) => {
    const isFav = favoriteIds.has(p.id);
    const active = isActiveStatus(p.status);
    const badgeColor = getBadgeColor(p.id);
    const rowNum = pageOffset + idx + 1;
    const issueCount = syncData?.countMap?.[p.project_key] ?? p.total_issues ?? 0;
    const wasSynced = syncData?.syncedProjectKeys?.has(p.project_key) || !!p.last_synced_at || issueCount > 0;
    const syncTs = wasSynced ? (syncData?.lastSyncAt || p.last_synced_at) : null;
    const syncAge = syncTs ? formatDistanceToNowStrict(new Date(syncTs), { addSuffix: false }) : null;
    const syncDotColor = getSyncDotColor(syncTs, null);
    const syncTooltipText = getSyncTooltip(syncTs, null);

    switch (colKey) {
      case 'star': return <td key={colKey} style={{ overflow: 'visible', textOverflow: 'clip' }}><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><button onClick={e => { e.stopPropagation(); onToggleFav(p.id, isFav); }} className="bg-transparent border-none cursor-pointer p-0 outline-none rounded flex-shrink-0" style={{ pointerEvents: 'auto' }}><Star size={14} fill={isFav ? 'var(--ds-text-warning, #F59E0B)' : 'none'} className={isFav ? 'text-amber-500' : 'text-slate-300 dark:text-[var(--ds-text-subtlest, #878787)]'} /></button></div></td>;
      case 'project_name': return <td key={colKey}><span onClick={() => { recordProjectView(p); navigate(`/project-hub/${p.project_key}/dashboard`); }} title={p.name} style={{ pointerEvents: 'auto', fontSize: 14, fontWeight: 500, color: token('color.link'), fontFamily: 'var(--cp-font-body)', cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block', maxWidth: '100%' }} onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }} onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}>{p.name}</span></td>;
      case 'project_key': return <td key={colKey}><span style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 12, fontWeight: 500, color: token('color.text.subtle'), letterSpacing: '0.02em' }}>{p.project_key}</span></td>;
      case 'type': return <td key={colKey}><span className="text-[13px] text-slate-600 dark:text-[var(--ds-text-subtlest, #A1A1A1)]">{formatProjectType((p as any).project_type)}</span></td>;
      case 'lead': return <td key={colKey}><LeadReassignPopover project={p} /></td>;
      case 'members': return <td key={colKey}><MemberManagePopover project={p} /></td>;
      case 'sync': return (
        <td key={colKey}>
          <div className="flex items-center gap-1.5 text-[13px] text-slate-500 dark:text-[var(--ds-text-subtlest, #A1A1A1)]">
            <Tooltip content={syncTooltipText} position="top"><span className={cn("w-2 h-2 rounded-full flex-shrink-0 cursor-help", syncDotColor)} /></Tooltip>
            <span className="font-medium">{syncAge ? `${issueCount} issues, ${syncAge} ago` : 'Not synced'}</span>
          </div>
        </td>
      );
      case 'actions': return <td key={colKey} className="text-center" style={{ pointerEvents: 'auto' }}>{active ? <RowActionMenu project={p} /> : <Lock size={14} className="text-slate-300 dark:text-[var(--ds-text-subtlest, #878787)]" />}</td>;
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
              <tr key={p.id} className={cn('group', checked && 'pb-row-selected')} style={{ opacity: active ? 1 : 0.45, pointerEvents: active ? 'auto' : 'none', height: 56 }}>
                {orderedColumns.map(c => renderProjectCell(c.key, p, idx))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
