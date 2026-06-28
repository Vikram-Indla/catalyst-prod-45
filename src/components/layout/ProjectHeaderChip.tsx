/**
 * ProjectHeaderChip — Jira-parity horizontal-nav-header strip.
 *
 * jira-compare catalog item 1 (2026-05-02). Vikram authorised after
 * Lane A probe of Jira BAU project chip showed the chip is the canonical
 * project identifier on every project surface — Catalyst's solo "Project
 * work" h2 had no project avatar, no project name, and no action cluster.
 *
 * 2026-05-08 — portal-bug fix:
 *   @atlaskit/dropdown-menu (meatball) and @atlaskit/modal-dialog (Add
 *   people / Automation / Feedback) both use @atlaskit/popup v4.16 which
 *   has an empty-portal bug. The dropdown anchored at (0,0) instead of
 *   below the trigger; the modals took ~60s to paint. Both replaced with
 *   direct ReactDOM.createPortal(content, document.body) — the proven
 *   pattern used by GroupByControl, BacklogPage project-menu, and
 *   BacklogPage add-people (jira-compare lesson 2026-04-28).
 */
import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { buildProjectHeaderTitle } from './projectHeaderTitle';
import Button, { IconButton } from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import { token } from '@atlaskit/tokens';
import { catalystToast } from '@/lib/catalystToast';
import { useToggleStar, useStarredItemIds } from '@/hooks/home/useStarredItems';
import { ProjectIcon } from '@/components/shared/ProjectIcon';
import { PersonAddIcon, EditorMoreIcon } from './ProjectHeaderChipIcons';

/**
 * Resolved entity shape produced by the adapter. Mirrors what the default
 * project query returns so the rendering path stays identical.
 */
export interface HeaderEntity {
  id: string | null;
  name: string | null;
  avatar_url: string | null;
  icon: string | null;
  color: string | null;
}

/**
 * Adapter — lets THIS canonical component (rather than a fork) render on
 * any entity surface (project, product, future hubs). The default behavior
 * (project, ph_jira_projects + ph_projects, /project-hub/:key/settings)
 * is preserved when adapter is omitted. See CLAUDE.md "Adopt canonical
 * components, never reimplement" (2026-06-01).
 */
/** A single row in the entity's member list, hydrated with profile data for display. */
export interface MemberRow {
  /** project_members.id or product_members.id (used for delete). */
  id: string;
  user_id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  role: string;
}

export interface HeaderAdapter {
  /** Async fetcher returning the resolved entity. Replaces the internal
   *  ph_jira_projects + ph_projects query. */
  fetchEntity: () => Promise<HeaderEntity>;
  /** Stable cache key for the entity query (React Query). */
  cacheKey: readonly unknown[];
  /** Identifier passed to ProjectIcon (was projectKey under the project default). */
  iconKey: string;
  /** Where the meatball "Settings" item navigates. */
  settingsHref: string;
  /** Star toggle target (passed to useToggleStar). */
  starItemType: 'project' | 'product';
  /** Stable cache key for the members query. */
  membersCacheKey: readonly unknown[];
  /** Load the current member list (hydrated with profile rows for display). */
  fetchMembers: () => Promise<MemberRow[]>;
  /** Insert a user into the entity's members table. */
  addMember: (userId: string) => Promise<void>;
  /** Delete a member row by its id. */
  removeMember: (memberId: string) => Promise<void>;
}

interface Props {
  /** Legacy project-only call path. Required when `adapter` is NOT provided. */
  projectKey?: string;
  /** Override the entity data source for non-project surfaces (e.g. product hub). */
  adapter?: HeaderAdapter;
}

export function ProjectHeaderChip({ projectKey, adapter }: Props) {
  const navigate = useNavigate();
  const location = useLocation();

  // Three-dots menu: bespoke portal popup (replaces @atlaskit/dropdown-menu
  // which has the known @atlaskit/popup v4.16 empty-portal positioning bug).
  const meatballRef = useRef<HTMLButtonElement>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ top: number; left: number } | null>(null);

  // Modal states
  const [addPeopleOpen, setAddPeopleOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

  const toggleStarMutation = useToggleStar();
  const { data: starredIds } = useStarredItemIds();

  // Resolve identity context — adapter (e.g. product hub) takes precedence; else fall back
  // to the project default (CLAUDE.md "Adopt canonical, parameterise — don't fork").
  const iconKey = adapter?.iconKey ?? projectKey ?? '';
  const settingsHref = adapter?.settingsHref ?? `/project-hub/${projectKey}/settings`;
  const starItemType: 'project' | 'product' = adapter?.starItemType ?? 'project';

  const { data: project } = useQuery({
    queryKey: adapter?.cacheKey ?? ['project-header-chip', projectKey],
    enabled: adapter ? true : !!projectKey,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      // When an adapter is supplied, defer entirely to its fetcher.
      if (adapter) return adapter.fetchEntity();
      // Default: project entity from ph_jira_projects + ph_projects.
      const [jiraRes, phRes] = await Promise.all([
        (supabase as any).from('ph_jira_projects')
          .select('id, project_key, name, avatar_url, color')
          .eq('project_key', projectKey).maybeSingle(),
        (supabase as any).from('ph_projects')
          .select('key, name, icon, color')
          .eq('key', projectKey).maybeSingle(),
      ]);
      const jira = jiraRes.data as { id?: string; name?: string; avatar_url?: string | null; color?: string | null } | null;
      const ph = phRes.data as { name?: string; icon?: string | null; color?: string | null } | null;
      return {
        id: jira?.id ?? null,
        name: jira?.name ?? ph?.name ?? null,
        avatar_url: jira?.avatar_url ?? null,
        icon: ph?.icon ?? null,
        color: ph?.color ?? jira?.color ?? null,
      };
    },
  });

  const projectName = project?.name ?? iconKey;

  // Route-aware chip title: `<KEY> <RouteWord>` (e.g. "BAU Backlog",
  // "BAU Board", "BAU Work", "BAU Filters"). Falls back to the project
  // name on unrecognised routes (Vikram 2026-06-11).
  const headerTitle = buildProjectHeaderTitle(location.pathname, iconKey) ?? projectName;

  // ── Member CRUD — resolved against the adapter (default = project_members
  //    when no adapter is supplied; product wrapper supplies its own). ────────
  const queryClient = useQueryClient();
  const entityId = project?.id ?? null;

  /** Default-project member CRUD (used when no adapter is provided). All
   *  three callbacks resolve against project_members + profiles for email lookup. */
  const defaultProjectMembers = {
    membersCacheKey: ['project-header-chip-members', projectKey] as const,
    fetchMembers: async (): Promise<MemberRow[]> => {
      if (!entityId) return [];
      const { data } = await (supabase as any)
        .from('project_members')
        .select('id, user_id, role, profiles:user_id(full_name, email, avatar_url)')
        .eq('project_id', entityId);
      return ((data ?? []) as any[]).map((r) => ({
        id: r.id, user_id: r.user_id, role: r.role,
        name: r.profiles?.full_name ?? r.profiles?.email ?? r.user_id,
        email: r.profiles?.email ?? '',
        avatar_url: r.profiles?.avatar_url ?? null,
      }));
    },
    addMember: async (userId: string) => {
      if (!entityId) throw new Error('Project not loaded');
      const { error } = await (supabase as any).from('project_members').insert({
        project_id: entityId, user_id: userId, role: 'member',
      });
      if (error && error.code !== '23505') throw error;  // 23505 = unique violation (already a member)
    },
    removeMember: async (memberId: string) => {
      const { error } = await (supabase as any).from('project_members').delete().eq('id', memberId);
      if (error) throw error;
    },
  };

  const resolvedMembers = adapter
    ? {
        membersCacheKey: adapter.membersCacheKey,
        fetchMembers: adapter.fetchMembers,
        addMember: adapter.addMember,
        removeMember: adapter.removeMember,
      }
    : defaultProjectMembers;

  const { data: members = [] } = useQuery<MemberRow[]>({
    queryKey: [...resolvedMembers.membersCacheKey],
    enabled: addPeopleOpen && (adapter ? true : !!entityId),
    queryFn: resolvedMembers.fetchMembers,
    staleTime: 30_000,
  });

  const addMemberMutation = useMutation({
    mutationFn: async (email: string) => {
      // Look up profile by email
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('id, full_name, email')
        .ilike('email', email.trim())
        .maybeSingle();
      if (!profile?.id) throw new Error('NOT_FOUND');
      // Idempotent insert via adapter
      await resolvedMembers.addMember(profile.id);
      return profile;
    },
    onSuccess: (profile) => {
      catalystToast.success(`Added ${profile.full_name ?? profile.email}`);
      setInviteEmail('');
      queryClient.invalidateQueries({ queryKey: [...resolvedMembers.membersCacheKey] });
    },
    onError: (err: Error) => {
      if (err.message === 'NOT_FOUND') {
        catalystToast.error('No registered user with that email');
      } else {
        catalystToast.error(`Add failed: ${err.message}`);
      }
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) => resolvedMembers.removeMember(memberId),
    onSuccess: () => {
      catalystToast.success('Removed from team');
      queryClient.invalidateQueries({ queryKey: [...resolvedMembers.membersCacheKey] });
    },
    onError: (err: Error) => catalystToast.error(`Remove failed: ${err.message}`),
  });

  const handleAddPeople = () => { setMenuAnchor(null); setAddPeopleOpen(true); };

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
  const submitInvite = () => {
    const e = inviteEmail.trim();
    if (!isValidEmail(e)) { catalystToast.error('Enter a valid email address'); return; }
    if (addMemberMutation.isPending) return;
    addMemberMutation.mutate(e);
  };
  const closeAddPeople = () => { setAddPeopleOpen(false); setInviteEmail(''); };

  const toggleMenu = () => {
    if (menuAnchor) {
      setMenuAnchor(null);
    } else {
      const r = meatballRef.current?.getBoundingClientRect();
      if (r) setMenuAnchor({ top: r.bottom + 4, left: r.left });
    }
  };

  // Shared portal modal wrapper style
  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'var(--ds-shadow-raised, rgba(9, 30, 66, 0.54))',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingTop: 60,
  };
  const dialogStyle: React.CSSProperties = {
    width: 480,
    maxWidth: 'calc(100vw - 48px)',
    background: token('elevation.surface', 'var(--ds-surface, #FFFFFF)'),
    borderRadius: 8,
    boxShadow: '0 8px 32px var(--ds-shadow-raised, rgba(9, 30, 66, 0.25))',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: 'calc(100vh - 120px)',
  };
  const modalHeaderStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px 12px',
    borderBottom: `1px solid ${token('color.border', 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6))')}`,
  };
  const modalTitleStyle: React.CSSProperties = {
    margin: 0,
    fontSize: 20,
    fontWeight: 653,
    letterSpacing: '-0.003em',
    color: token('color.text', 'var(--ds-text, #172B4D)'),
  };
  const modalFooterStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
    padding: '12px 24px 20px',
    borderTop: `1px solid ${token('color.border', 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6))')}`,
  };

  return (
    <>
      <div
        data-testid="catalyst-project-header.chip"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '0 24px',
          height: 32,
          background: 'transparent',
          fontFamily: "'Atlassian Sans', -apple-system, BlinkMacSystemFont, sans-serif",
          flexShrink: 0,
        }}
      >
        <span style={{ display: 'inline-flex' }}>
          <ProjectIcon
            size="small"
            projectKey={iconKey}
            avatarUrl={project?.avatar_url}
            iconName={project?.icon || 'mountain'}
            color={project?.color || 'var(--ds-link, #2563eb)'}
            name={projectName}
          />
        </span>

        <h1
          data-testid="catalyst-project-header.name"
          style={{
            margin: 0, padding: 0,
            fontSize: 20, fontWeight: 653, lineHeight: '24px',
            color: 'var(--ds-text, #292A2E)',
            fontFamily: 'inherit',
          }}
        >
          {headerTitle}
        </h1>

        {/* Add people icon button — inline, instant open */}
        <span style={{ display: 'inline-flex', marginLeft: 4, color: 'var(--ds-text-subtle, #505258)' }}>
          <IconButton
            icon={PersonAddIcon}
            label="Add people"
            appearance="subtle"
            onClick={handleAddPeople}
            testId="catalyst-project-header.add-people"
          />
        </span>

        {/* Three-dots meatball — bespoke portal (replaces @atlaskit/dropdown-menu) */}
        <span style={{ display: 'inline-flex', color: 'var(--ds-text-subtle, #505258)' }}>
          <IconButton
            ref={meatballRef}
            icon={EditorMoreIcon}
            label="More project actions"
            appearance="subtle"
            isSelected={!!menuAnchor}
            onClick={toggleMenu}
            testId="catalyst-project-header.meatball"
          />
        </span>

      </div>

      {/* ── Three-dots portal menu ───────────────────────────────────────── */}
      {menuAnchor && ReactDOM.createPortal(
        <>
          {/* Click-outside backdrop */}
          <div
            onClick={() => setMenuAnchor(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 9000 }}
          />
          <div
            role="menu"
            data-testid="catalyst-project-header.meatball-menu"
            style={{
              position: 'fixed',
              top: menuAnchor.top,
              left: menuAnchor.left,
              zIndex: 9001,
              background: token('elevation.surface.overlay', 'var(--ds-surface, #FFFFFF)'),
              border: `1px solid ${token('color.border', 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6))')}`,
              borderRadius: 4,
              boxShadow: '0 4px 16px var(--ds-shadow-raised, rgba(9, 30, 66, 0.16))',
              minWidth: 220,
              padding: '6px 0',
            }}
          >
            {[
              { id: 'settings', label: `${starItemType === 'product' ? 'Product' : 'Project'} settings`, onClick: () => navigate(settingsHref) },
              { id: 'people', label: 'Manage people', onClick: handleAddPeople },
              { id: 'divider1', divider: true },
              {
                id: 'star',
                label: (project?.id && starredIds?.has(project.id))
                  ? `Unstar ${starItemType}`
                  : `Star ${starItemType}`,
                onClick: () => {
                  if (!project?.id) return;
                  const isCurrentlyStarred = starredIds?.has(project.id) ?? false;
                  toggleStarMutation.mutate({ itemId: project.id, itemType: starItemType, isCurrentlyStarred });
                },
              },
            ].map((item) => {
              if ((item as any).divider) {
                return <div key={item.id} style={{ height: 1, background: token('color.border', 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6))'), margin: '6px 0' }} />;
              }
              return (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  onClick={() => { (item as any).onClick(); setMenuAnchor(null); }}
                  style={{
                    display: 'block', width: '100%',
                    padding: '8px 16px',
                    border: 'none', background: 'transparent',
                    textAlign: 'left', fontSize: 14, fontWeight: 400,
                    fontFamily: 'inherit',
                    color: token('color.text', 'var(--ds-text, #172B4D)'),
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ds-background-neutral-subtle-hovered, rgba(9, 30, 66, 0.06))'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  {(item as any).label}
                </button>
              );
            })}
          </div>
        </>,
        document.body,
      )}

      {/* ── Add people portal modal ──────────────────────────────────────── */}
      {addPeopleOpen && ReactDOM.createPortal(
        <div
          role="dialog" aria-modal="true" aria-labelledby="phc-add-people-title"
          data-testid="phc-add-people-modal"
          style={overlayStyle}
          onKeyDown={(e) => { if (e.key === 'Escape') closeAddPeople(); }}
        >
          <div style={dialogStyle} onClick={(e) => e.stopPropagation()}>
            <div style={modalHeaderStyle}>
              <h2 id="phc-add-people-title" style={modalTitleStyle}>Add people to {projectName}</h2>
            </div>
            <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 13, color: token('color.text.subtle', 'var(--ds-icon-subtle, #626F86)') }}>
                Add a registered user by email. Press Enter or click Add.
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div data-voice-zone="true" style={{ flex: 1 }}>
                  <Textfield
                    placeholder="email@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail((e.target as HTMLInputElement).value)}
                    onKeyDown={(e) => { if ((e as React.KeyboardEvent).key === 'Enter') submitInvite(); }}
                    autoFocus
                    isDisabled={addMemberMutation.isPending}
                    testId="phc-add-people.email-input"
                  />
                </div>
                <Button
                  appearance="primary"
                  onClick={submitInvite}
                  isDisabled={addMemberMutation.isPending || !inviteEmail.trim()}
                  testId="phc-add-people.submit"
                >
                  {addMemberMutation.isPending ? 'Adding…' : 'Add'}
                </Button>
              </div>

              {/* Current members list (live from project_members / product_members) */}
              <div style={{ marginTop: 4 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: token('color.text.subtle', 'var(--ds-icon-subtle, #626F86)'), marginBottom: 8 }}>
                  Members ({members.length})
                </div>
                {members.length === 0 ? (
                  <div style={{ fontSize: 13, color: token('color.text.subtle', 'var(--ds-icon-subtle, #626F86)'), padding: '8px 0' }}>
                    No members yet. Add someone above.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 280, overflowY: 'auto' }}>
                    {members.map((m) => (
                      <div
                        key={m.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '6px 8px', borderRadius: 4,
                          background: token('elevation.surface', 'var(--ds-surface, #FFFFFF)'),
                        }}
                      >
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%',
                          background: token('color.background.accent.blue.subtler', '#CCE0FF'),
                          color: token('color.text', 'var(--ds-text, #172B4D)'),
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 700, flexShrink: 0,
                        }}>
                          {(m.name || m.email || '?').slice(0, 2).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, color: token('color.text', 'var(--ds-text, #172B4D)'), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {m.name}
                          </div>
                          <div style={{ fontSize: 11, color: token('color.text.subtle', 'var(--ds-icon-subtle, #626F86)'), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {m.email} · {m.role}
                          </div>
                        </div>
                        <Button
                          appearance="subtle"
                          spacing="compact"
                          isDisabled={removeMemberMutation.isPending}
                          onClick={() => removeMemberMutation.mutate(m.id)}
                          testId={`phc-add-people.remove-${m.id}`}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div style={modalFooterStyle}>
              <Button appearance="subtle" onClick={closeAddPeople}>Done</Button>
            </div>
          </div>
        </div>,
        document.body,
      )}

    </>
  );
}
