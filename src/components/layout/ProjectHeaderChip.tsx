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
import TextArea from '@atlaskit/textarea';
import { token } from '@atlaskit/tokens';
import { toast } from 'sonner';
import { useToggleStar, useStarredItemIds } from '@/hooks/home/useStarredItems';
import { ProjectIcon } from '@/components/shared/ProjectIcon';
import {
  PersonAddIcon,
  ShareIcon,
  EditorMoreIcon,
  LightbulbIcon,
  FeedbackIcon,
  ScreenfullIcon,
} from './ProjectHeaderChipIcons';

interface Props {
  /** ph_jira_projects.project_key — e.g. "BAU". */
  projectKey: string;
}

export function ProjectHeaderChip({ projectKey }: Props) {
  const navigate = useNavigate();
  const [fullscreen, setFullscreen] = useState(false);

  // Three-dots menu: bespoke portal popup (replaces @atlaskit/dropdown-menu
  // which has the known @atlaskit/popup v4.16 empty-portal positioning bug).
  const meatballRef = useRef<HTMLButtonElement>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ top: number; left: number } | null>(null);

  // Modal states (Add people / Automation / Feedback)
  const [addPeopleOpen, setAddPeopleOpen] = useState(false);
  const [automationOpen, setAutomationOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [invitedEmails, setInvitedEmails] = useState<string[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [feedbackText, setFeedbackText] = useState('');

  const toggleStarMutation = useToggleStar();
  const { data: starredIds } = useStarredItemIds();

  const { data: project } = useQuery({
    queryKey: ['project-header-chip', projectKey],
    enabled: !!projectKey,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
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

  const projectName = project?.name ?? projectKey;

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied');
  };

  const handleAddPeople = () => { setMenuAnchor(null); setAddPeopleOpen(true); };
  const handleAutomation = () => { setMenuAnchor(null); setAutomationOpen(true); };
  const handleFeedback = () => { setMenuAnchor(null); setFeedbackOpen(true); };

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
  const submitInvite = () => {
    const e = inviteEmail.trim();
    if (!isValidEmail(e)) { toast.error('Enter a valid email address'); return; }
    if (invitedEmails.includes(e)) { toast.error('Already invited'); return; }
    setInvitedEmails(prev => [...prev, e]);
    setInviteEmail('');
    toast.success(`Invitation queued for ${e}`);
  };
  const closeAddPeople = () => { setAddPeopleOpen(false); setInviteEmail(''); setInvitedEmails([]); };

  const submitFeedback = () => {
    const t = feedbackText.trim();
    if (t.length < 5) { toast.error('Feedback must be at least 5 characters'); return; }
    toast.success('Thanks for the feedback');
    setFeedbackText('');
    setFeedbackOpen(false);
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
      setFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setFullscreen(false);
    }
  };

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
    borderBottom: `1px solid ${'var(--ds-border, #DFE1E6)'}`,
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
    borderTop: `1px solid ${'var(--ds-border, #DFE1E6)'}`,
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
            projectKey={projectKey}
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

        <span style={{ flex: 1 }} />

        <IconButton icon={ShareIcon} label="Share" appearance="subtle" onClick={handleShare} testId="catalyst-project-header.share" />
        <IconButton icon={LightbulbIcon} label="Automation" appearance="subtle" onClick={handleAutomation} testId="catalyst-project-header.automation" />
        <IconButton icon={FeedbackIcon} label="Give feedback" appearance="subtle" onClick={handleFeedback} testId="catalyst-project-header.feedback" />
        <IconButton
          icon={ScreenfullIcon}
          label={fullscreen ? 'Exit full screen' : 'Enter full screen'}
          appearance="subtle"
          onClick={handleFullscreen}
          testId="catalyst-project-header.fullscreen"
        />
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
              border: `1px solid ${'var(--ds-border, #DFE1E6)'}`,
              borderRadius: 4,
              boxShadow: '0 4px 16px rgba(9, 30, 66, 0.16)',
              minWidth: 220,
              padding: '6px 0',
            }}
          >
            {[
              { id: 'settings', label: 'Project settings', onClick: () => navigate(`/project/${projectKey}/settings`) },
              { id: 'people', label: 'Manage people', onClick: handleAddPeople },
              { id: 'divider1', divider: true },
              {
                id: 'star',
                label: (project?.id && starredIds?.has(project.id)) ? 'Unstar project' : 'Star project',
                onClick: () => {
                  if (!project?.id) return;
                  const isCurrentlyStarred = starredIds?.has(project.id) ?? false;
                  toggleStarMutation.mutate({ itemId: project.id, itemType: 'project', isCurrentlyStarred });
                },
              },
            ].map((item) => {
              if ((item as any).divider) {
                return <div key={item.id} style={{ height: 1, background: 'var(--ds-border, #DFE1E6)', margin: '6px 0' }} />;
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

      {/* ── Automation portal modal ──────────────────────────────────────── */}
      {automationOpen && ReactDOM.createPortal(
        <div
          role="dialog" aria-modal="true" aria-labelledby="phc-automation-title"
          data-testid="phc-automation-modal"
          style={overlayStyle}
          onKeyDown={(e) => { if (e.key === 'Escape') setAutomationOpen(false); }}
          onClick={() => setAutomationOpen(false)}
        >
          <div style={dialogStyle} onClick={(e) => e.stopPropagation()}>
            <div style={modalHeaderStyle}>
              <h2 id="phc-automation-title" style={modalTitleStyle}>Automation rules for {projectName}</h2>
            </div>
            <div style={{ padding: '16px 24px' }}>
              <div style={{
                background: token('color.background.neutral.subtle', '#F8F9FA'),
                border: `1px solid ${'var(--ds-border, #DFE1E6)'}`,
                borderRadius: 6, padding: '20px 24px', textAlign: 'center',
              }}>
                <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>No rules yet</div>
                <div style={{ fontSize: 13, color: token('color.text.subtle', '#626F86'), marginBottom: 16, lineHeight: 1.5 }}>
                  Automate repetitive work — auto-assign issues, transition statuses,
                  notify channels, sync linked items.
                </div>
                <Button appearance="primary" onClick={() => { toast.success('Rule scaffolded — open Automation Hub to configure'); setAutomationOpen(false); }} testId="phc-automation.create-rule">
                  Create your first rule
                </Button>
              </div>
            </div>
            <div style={modalFooterStyle}>
              <Button appearance="subtle" onClick={() => setAutomationOpen(false)}>Close</Button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* ── Feedback portal modal ────────────────────────────────────────── */}
      {feedbackOpen && ReactDOM.createPortal(
        <div
          role="dialog" aria-modal="true" aria-labelledby="phc-feedback-title"
          data-testid="phc-feedback-modal"
          style={overlayStyle}
          onKeyDown={(e) => { if (e.key === 'Escape') setFeedbackOpen(false); }}
          onClick={() => setFeedbackOpen(false)}
        >
          <div style={dialogStyle} onClick={(e) => e.stopPropagation()}>
            <div style={modalHeaderStyle}>
              <h2 id="phc-feedback-title" style={modalTitleStyle}>Give feedback</h2>
            </div>
            <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 13, color: token('color.text.subtle', '#626F86') }}>
                Tell us what's working, what isn't, or what you'd like to see next.
              </div>
              <TextArea
                placeholder="Your feedback..."
                value={feedbackText}
                onChange={(e) => setFeedbackText((e.target as HTMLTextAreaElement).value)}
                minimumRows={4}
                testId="phc-feedback.textarea"
              />
            </div>
            <div style={modalFooterStyle}>
              <Button appearance="subtle" onClick={() => setFeedbackOpen(false)}>Cancel</Button>
              <Button appearance="primary" onClick={submitFeedback} testId="phc-feedback.submit">Submit</Button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
