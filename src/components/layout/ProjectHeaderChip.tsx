/**
 * ProjectHeaderChip — Jira-parity horizontal-nav-header strip.
 *
 * jira-compare catalog item 1 (2026-05-02). Vikram authorised after
 * Lane A probe of Jira BAU project chip showed the chip is the canonical
 * project identifier on every project surface — Catalyst's solo "Project
 * work" h2 had no project avatar, no project name, and no action cluster.
 *
 * Lane A measurements (testid horizontal-nav-header.ui.project-header.header
 * on https://digital-transformation.atlassian.net/jira/software/c/projects/BAU/issues):
 *   container: display flex · gap 6px · padding 0 24px · height 32px · transparent bg
 *   font: "Atlassian Sans"
 *   icon (testid …project-icon): IMG · 20×20px · radius 3px · src is the project
 *         avatar from /rest/api/2/universal_avatar/view/type/project/avatar/<id>
 *   project name: 14/400 · plain text in a div (no testid, css-4adsoe hash class)
 *   action cluster (right of name):
 *     Add people  · testid invite-people.ui.navigation-add-people-button.trigger
 *     Meatball    · testid navigation-project-action-menu.ui.themed-button
 *     Share       · anonymous icon button
 *     Lightning   · anonymous icon button (automation entry)
 *     Feedback    · testid feedback-button.horizontal-nav-feedback-button
 *     Fullscreen  · testid platform.ui.fullscreen-button.fullscreen-button
 *
 * Cross-hub note: Project Backlog and Project Kanban will also need this
 * chip. This file is the canonical implementation; mount-site changes are
 * a separate cross-hub PR per Vikram's directive to flag changes that
 * may cascade.
 */
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import Button, { IconButton } from '@atlaskit/button/new';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Textfield from '@atlaskit/textfield';
import { toast } from 'sonner';
import { useStarredItems } from '@/hooks/useStarredItems';
import { useAuth } from '@/hooks/useAuth';
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
  const [fullscreen, setFullscreen] = useState(false);

  /* jira-compare follow-up (2026-05-02): canonical icon resolution.
     Catalyst stores project visuals across two tables —
       ph_jira_projects: { project_key, name, avatar_url, color }
       ph_projects:      { key, name, icon, color }  (Lucide iconName)
     The shared ProjectIcon component resolves them in this order:
       avatarUrl (Jira-uploaded) → iconName+color (Catalyst-native) → Folder.
     To honour mem://constraints/canonical-project-icons we read both
     tables in parallel and forward all three signals. Initial-letter
     tiles are explicitly forbidden. */
  const { data: project } = useQuery({
    queryKey: ['project-header-chip', projectKey],
    enabled: !!projectKey,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const [jiraRes, phRes] = await Promise.all([
        (supabase as any).from('ph_jira_projects')
          .select('project_key, name, avatar_url, color')
          .eq('project_key', projectKey).maybeSingle(),
        (supabase as any).from('ph_projects')
          .select('key, name, icon, color')
          .eq('key', projectKey).maybeSingle(),
      ]);
      const jira = jiraRes.data as { name?: string; avatar_url?: string | null; color?: string | null } | null;
      const ph = phRes.data as { name?: string; icon?: string | null; color?: string | null } | null;
      return {
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
  const handleAddPeople = () => toast('Add people — coming soon');
  const handleAutomation = () => toast('Automation — coming soon');
  const handleFeedback = () => toast('Feedback — coming soon');
  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
      setFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setFullscreen(false);
    }
  };

  return (
    <div
      data-testid="catalyst-project-header.chip"
      style={{
        /* jira-compare 2026-05-02 — measured Jira values:
             height 32px, padding 0 24px, gap 6px, transparent bg,
             "Atlassian Sans". Source: Lane A probe of testid
             horizontal-nav-header.ui.project-header.header on
             https://digital-transformation.atlassian.net/jira/software/
             c/projects/BAU/issues. */
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
      {/* jira-compare 2026-05-02 — measured Jira: <img> 20×20 br 3px from
          /rest/api/2/universal_avatar/view/type/project/avatar/<id>.
          Use canonical ProjectIcon — when avatar_url is seeded it renders
          a real <img>; otherwise falls back to coloured tile + initial
          (still better than the muted Folder, but the real fix is the
          SQL UPDATE on ph_jira_projects.avatar_url). */}
      <span style={{ display: 'inline-flex' }}>
        {/* RESET ICONS: pass projectKey so ProjectIcon resolves the bundled
            Catalyst avatar from PROJECT_AVATAR_REGISTRY first. avatarUrl /
            iconName / color remain as fallbacks for keys not in the registry. */}
        <ProjectIcon
          size="small"
          projectKey={projectKey}
          avatarUrl={project?.avatar_url}
          iconName={project?.icon || 'mountain'}
          color={project?.color || '#2563EB'}
          name={projectName}
        />
      </span>

      {/* jira-compare 2026-05-02 — measured Jira: project name is in a
          plain DIV at 14px / weight 400 / color rgb(41,42,46), NOT a
          heading. Earlier 16/600 H1 was a fabrication. */}
      <span
        data-testid="catalyst-project-header.name"
        style={{
          fontSize: 14, fontWeight: 400, color: 'var(--ds-text, #292A2E)',
          padding: '0 8px',
        }}
      >
        {projectName}
      </span>

      {/* jira-compare 2026-05-02 — measured Jira action buttons:
            32×32, transparent bg, color rgb(80,82,88) = --ds-text-subtle.
          Wrapping every IconButton with a colour-overriding span so the
          icon stroke inherits subtle grey, matching Jira. */}
      <span style={{ display: 'inline-flex', marginLeft: 4, color: 'var(--ds-text-subtle, #505258)' }}>
        <IconButton
          icon={PersonAddIcon}
          label="Add people"
          appearance="subtle"
          onClick={handleAddPeople}
          testId="catalyst-project-header.add-people"
        />
      </span>

      <DropdownMenu
        trigger={({ triggerRef, ...props }) => (
          <IconButton
            ref={triggerRef as React.Ref<HTMLButtonElement>}
            {...props}
            icon={EditorMoreIcon}
            label="More project actions"
            appearance="subtle"
            testId="catalyst-project-header.meatball"
          />
        )}
      >
        <DropdownItemGroup>
          <DropdownItem onClick={() => toast('Open project settings — coming soon')}>Project settings</DropdownItem>
          <DropdownItem onClick={() => toast('Manage people — coming soon')}>Manage people</DropdownItem>
          <DropdownItem onClick={() => toast('Star project — coming soon')}>Star project</DropdownItem>
        </DropdownItemGroup>
      </DropdownMenu>

      <span style={{ flex: 1 }} />

      <IconButton
        icon={ShareIcon}
        label="Share"
        appearance="subtle"
        onClick={handleShare}
        testId="catalyst-project-header.share"
      />
      <IconButton
        icon={LightbulbIcon}
        label="Automation"
        appearance="subtle"
        onClick={handleAutomation}
        testId="catalyst-project-header.automation"
      />
      <IconButton
        icon={FeedbackIcon}
        label="Give feedback"
        appearance="subtle"
        onClick={handleFeedback}
        testId="catalyst-project-header.feedback"
      />
      <IconButton
        icon={ScreenfullIcon}
        label={fullscreen ? 'Exit full screen' : 'Enter full screen'}
        appearance="subtle"
        onClick={handleFullscreen}
        testId="catalyst-project-header.fullscreen"
      />
    </div>
  );
}
