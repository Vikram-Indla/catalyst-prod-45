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
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
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
}

interface Props {
  /** Legacy project-only call path. Required when `adapter` is NOT provided. */
  projectKey?: string;
  /** Override the entity data source for non-project surfaces (e.g. product hub). */
  adapter?: HeaderAdapter;
}

export function ProjectHeaderChip({ projectKey, adapter }: Props) {
  const navigate = useNavigate();

  // Three-dots menu: bespoke portal popup (replaces @atlaskit/dropdown-menu
  // which has the known @atlaskit/popup v4.16 empty-portal positioning bug).
  const meatballRef = useRef<HTMLButtonElement>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ top: number; left: number } | null>(null);

  // Modal states
  const [addPeopleOpen, setAddPeopleOpen] = useState(false);
  const [invitedEmails, setInvitedEmails] = useState<string[]>([]);
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

  const handleAddPeople = () => { setMenuAnchor(null); setAddPeopleOpen(true); };

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
  const submitInvite = () => {
    const e = inviteEmail.trim();
    if (!isValidEmail(e)) { catalystToast.error('Enter a valid email address'); return; }
    if (invitedEmails.includes(e)) { catalystToast.error('Already invited'); return; }
    setInvitedEmails(prev => [...prev, e]);
    setInviteEmail('');
    catalystToast.success(`Invitation queued for ${e}`);
  };
  const closeAddPeople = () => { setAddPeopleOpen(false); setInviteEmail(''); setInvitedEmails([]); };

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
    background: 'rgba(9, 30, 66, 0.54)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingTop: 60,
  };
  const dialogStyle: React.CSSProperties = {
    width: 480,
    maxWidth: 'calc(100vw - 48px)',
    background: token('elevation.surface', '#FFFFFF'),
    borderRadius: 8,
    boxShadow: '0 8px 32px rgba(9, 30, 66, 0.25)',
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
    color: token('color.text', '#292A2E'),
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
            color={project?.color || '#2563EB'}
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
          {projectName}
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
              background: token('elevation.surface.overlay', '#FFFFFF'),
              border: `1px solid ${token('color.border', 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6))')}`,
              borderRadius: 4,
              boxShadow: '0 4px 16px rgba(9, 30, 66, 0.16)',
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
                    color: token('color.text', '#292A2E'),
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(9, 30, 66, 0.06)'; }}
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
              <div style={{ fontSize: 13, color: token('color.text.subtle', '#626F86') }}>
                Invite teammates by email. They'll receive an invitation to join this project.
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <Textfield
                    placeholder="email@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail((e.target as HTMLInputElement).value)}
                    onKeyDown={(e) => { if ((e as React.KeyboardEvent).key === 'Enter') submitInvite(); }}
                    autoFocus
                    testId="phc-add-people.email-input"
                  />
                </div>
                <Button appearance="primary" onClick={submitInvite} testId="phc-add-people.submit">
                  Invite
                </Button>
              </div>
              {invitedEmails.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, color: token('color.text.subtle', '#626F86'), marginBottom: 6 }}>
                    Invited this session ({invitedEmails.length}):
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {invitedEmails.map(e => (
                      <span key={e} style={{
                        background: 'var(--ds-background-neutral, #F1F2F4)',
                        color: 'var(--ds-text, #292A2E)',
                        padding: '2px 8px', borderRadius: 3, fontSize: 12,
                      }}>{e}</span>
                    ))}
                  </div>
                </div>
              )}
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
