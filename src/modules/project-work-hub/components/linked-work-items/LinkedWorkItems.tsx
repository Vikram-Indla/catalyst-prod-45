/**
 * LinkedWorkItems — canonical molecule for the BAU-4771 pilot.
 *
 * Orchestrates header + body + inline link toolbar + create-linked-work-item
 * modal. The molecule is intentionally drop-in compatible with the legacy
 * `LinkedIssuesSection`: same props, same Supabase tables, same React Query
 * cache key, same toast channel, same `CreateStoryModal` handoff for the
 * create-and-link flow. That means a single branch in `CatalystViewEpic.tsx`
 * can swap this in for BAU-4771 while every other issue keeps the
 * production implementation unchanged.
 *
 * Composed of:
 *   - LinkedWorkItemsHeader  — collapse + add trigger
 *   - LinkedWorkItemsBody    — grouped rows (pure presentational)
 *   - LinkToolbar            — Atlaskit Select + AsyncSelect linking flow
 *   - CreateStoryModal       — existing canonical create + auto-link modal
 *   - CatalystDetailRouter   — lazy detail modal for locally-created items
 *
 * Atlaskit theme sync is delegated to `useAtlaskitThemeSync` so the pilot
 * renders correctly whether Catalyst is in light or dark mode.
 *
 * Business rules enforced here:
 *   - no self-linking (filtered in toolbar + defensive guard in mutation)
 *   - no duplicates (filtered in toolbar; 23505 unique violation swallowed)
 *   - links persisted only after auth user is resolved
 *   - create-then-link recovers if the link step fails but the create succeeds
 *
 * Props match `LinkedIssuesSection` so rollouts downstream are trivial.
 */
import React, { Suspense, lazy, useCallback, useMemo, useRef, useState } from 'react';
import { useLinkWorkItemListener } from '@/components/catalyst-detail-views/shared/sections/quickActionsBus';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';
import Button from '@atlaskit/button/new';
import { useAtlaskitThemeSync } from '../SubtasksPanel/atlaskitTheme';
import { AiLinkSimilarPanel } from '../dialogs/story-detail-modules/AiLinkSimilarPanel';
import { CreateStoryModal } from '@/components/workhub/create-story/CreateStoryModal';
import { LinkedWorkItemsHeader } from './LinkedWorkItemsHeader';
import { LinkedWorkItemsBody } from './LinkedWorkItemsBody';
import { LinkToolbar } from './LinkToolbar';
import { useLinkedWorkItems, useLinkMutations } from './hooks';
import type { LinkedWorkItem } from './types';
import './linked-work-items.css';

const CatalystDetailRouter = lazy(
  () => import('@/components/catalyst-detail-views/CatalystDetailRouter'),
);

export interface LinkedWorkItemsProps {
  issueId: string;
  issueKey?: string;
  projectKey?: string;
  loadOptionsOverride?: (input: string) => Promise<any[]>;
}

export function LinkedWorkItems({
  issueId,
  issueKey: issueKeyProp,
  projectKey,
  loadOptionsOverride,
}: LinkedWorkItemsProps) {
  useAtlaskitThemeSync();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ph_issue_links stores issue_keys; preserve legacy fallback to issueId.
  const issueKey = issueKeyProp || issueId;

  const { data: links = [], isLoading, isError } = useLinkedWorkItems(issueKey);
  const { linkMutation, unlinkMutation } = useLinkMutations(issueKey);

  const [expanded, setExpanded] = useState<boolean>(false);
  const [showToolbar, setShowToolbar] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Cross-component bridge: CatalystQuickActions' "Link work item" menu
  // item emits via quickActionsBus → here we expand the section and
  // mount the LinkToolbar. LinkToolbar auto-focuses its picker on mount,
  // which natively scrolls itself into view (matches the Create-child
  // flow in SubtasksPanel).
  useLinkWorkItemListener(
    useCallback(() => {
      setExpanded(true);
      setShowToolbar(true);
    }, []),
  );
  const [createLinkType, setCreateLinkType] = useState<string>('relates to');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [openedItem, setOpenedItem] = useState<{
    id: string;
    issueKey: string;
    issueType: string;
    projectKey: string;
    projectId?: string;
  } | null>(null);

  // Resolve projectId for the create-and-link modal (same contract as legacy).
  const derivedProjectKey = projectKey || issueKey.split('-')[0];
  const { data: projectData } = useQuery({
    queryKey: ['projectByKey', derivedProjectKey],
    enabled: !!derivedProjectKey,
    staleTime: Infinity,
    queryFn: async () => {
      const { data } = await supabase
        .from('projects')
        .select('id, key')
        .eq('key', derivedProjectKey)
        .single();
      return data;
    },
  });

  const existingLinkedKeys = useMemo(
    () => new Set(links.map((l) => l.target.issue_key).filter(Boolean)),
    [links],
  );

  // Section is collapsed by default — user clicks the chevron to open it.
  // (Legacy auto-expand-when-links-exist removed per UX request to match
  // the Subtasks panel default.)

  // Open the inline link toolbar in response to a window event dispatched
  // by the right-rail Improve dropdown ("Link similar work items"). Mirrors
  // the section header's "Add linked work item" button behaviour.
  React.useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ issueKey?: string }>).detail;
      if (!detail?.issueKey || detail.issueKey !== issueKey) return;
      setExpanded(true);
      setShowToolbar(true);
      requestAnimationFrame(() => {
        rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    };
    window.addEventListener('catalyst:open-link-toolbar', handler);
    return () => window.removeEventListener('catalyst:open-link-toolbar', handler);
  }, [issueKey]);

  const groups = useMemo(() => {
    const byType = new Map<string, LinkedWorkItem[]>();
    for (const link of links) {
      const key = link.link_type || 'relates to';
      if (!byType.has(key)) byType.set(key, []);
      byType.get(key)!.push(link);
    }
    return Array.from(byType.entries()).map(([linkType, linkList]) => ({
      linkType,
      links: linkList,
    }));
  }, [links]);

  const handleOpen = (link: LinkedWorkItem) => {
    const { target } = link;
    if (target.id) {
      const targetProjectKey =
        target.project_key || target.issue_key?.split('-')[0] || derivedProjectKey;
      setOpenedItem({
        id: target.id,
        issueKey: target.issue_key,
        issueType: target.issue_type,
        projectKey: targetProjectKey,
        projectId: target.project_id ?? undefined,
      });
    } else {
      navigate(`/issue/${target.issue_key}`);
    }
  };

  const handleCopyKey = async (link: LinkedWorkItem) => {
    try {
      await navigator.clipboard.writeText(link.target.issue_key);
      catalystToast.success(`Copied ${link.target.issue_key}`);
    } catch {
      catalystToast.error('Couldn’t copy key');
    }
  };

  const handleUnlink = (link: LinkedWorkItem) => unlinkMutation.mutate(link.id);

  const handleLink = async (linkType: string, targetKeys: string[]) => {
    await linkMutation.mutateAsync({ linkType, targetKeys });
    setShowToolbar(false);
  };

  const handleCreateNew = (linkType: string) => {
    setCreateLinkType(linkType);
    setShowToolbar(false);
    setShowCreateModal(true);
  };

  const handleCreatedItem = async (newItemKey: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('ph_issue_links').insert({
        source_id: issueKey,
        target_id: newItemKey,
        link_type: createLinkType,
        created_by: user.id,
      } as any);
      if (error) {
        if (error.code === '23505' || error.message?.includes('unique_link')) {
          catalystToast.info(`${newItemKey} already linked to ${issueKey}`);
        } else {
          throw error;
        }
      } else {
        catalystToast.success(
          `Linked ${newItemKey} to ${issueKey}`,
          `as "${createLinkType}"`,
        );
      }
      queryClient.invalidateQueries({ queryKey: ['linkedIssues', issueKey] });
    } catch (err: any) {
      catalystToast.error(`Created ${newItemKey} but failed to link`, err.message);
    }
    setShowCreateModal(false);
  };

  const pendingUnlinkIds = useMemo(
    () =>
      unlinkMutation.isPending && unlinkMutation.variables
        ? new Set([unlinkMutation.variables])
        : new Set<string>(),
    [unlinkMutation.isPending, unlinkMutation.variables],
  );

  const bodyId = `lwi-body-${issueKey}`;

  return (
    <div ref={rootRef} className="lwi-root" data-issue-key={issueKey}>
      <LinkedWorkItemsHeader
        count={links.length}
        expanded={expanded}
        onToggle={() => setExpanded((e) => !e)}
        onAdd={() => {
          setExpanded(true);
          setShowToolbar(true);
        }}
        bodyId={bodyId}
      />

      {/* Empty-state inline "Add linked work item" link — gray, aligned
          with the header title. Sits outside the collapse gate so the
          user sees it even when the section is collapsed. Mirrors the
          SubtasksPanel "Add subtask" pattern. */}
      {!isLoading && links.length === 0 && !showToolbar && (
        <button
          type="button"
          className="lwi-add-link"
          onClick={() => {
            setExpanded(true);
            setShowToolbar(true);
          }}
        >
          Add linked work item
        </button>
      )}

      {expanded && (
        <>
          {/*
            AI similar-items panel renders inline above the linked-items
            body whenever the user has hit `+`. Sits between the section
            header and the existing groups (clones, blocks, etc.) so it
            matches the Jira layout. The manual `LinkToolbar` below
            stays as the explicit-key fallback for users who want to
            link a known issue by typing its key.
          */}
          {showToolbar && (
            <AiLinkSimilarPanel
              issueKey={issueKey}
              existingLinkedKeys={Array.from(existingLinkedKeys)}
              onLinked={() => {
                queryClient.invalidateQueries({ queryKey: ['linkedIssues', issueKey] });
              }}
            />
          )}
          <LinkedWorkItemsBody
            id={bodyId}
            groups={groups}
            isLoading={isLoading}
            isError={isError}
            onOpen={handleOpen}
            onCopyKey={handleCopyKey}
            onUnlink={handleUnlink}
            pendingUnlinkIds={pendingUnlinkIds}
            footer={
              showToolbar ? (
                <LinkToolbar
                  sourceIssueKey={issueKey}
                  existingLinkedKeys={existingLinkedKeys}
                  onLink={handleLink}
                  onCreateNew={projectData ? handleCreateNew : undefined}
                  onCancel={() => setShowToolbar(false)}
                  isPending={linkMutation.isPending}
                  loadOptionsOverride={loadOptionsOverride}
                />
              ) : null
            }
          />
        </>
      )}

      {showCreateModal && projectData && (
        <CreateStoryModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          projectId={projectData.id}
          projectKey={projectData.key}
          linkedSource={{
            issueKey,
            linkType: createLinkType,
            locked: true,
          }}
          onSuccess={(newKey) => handleCreatedItem(newKey)}
        />
      )}

      {openedItem && (
        <Suspense fallback={null}>
          <CatalystDetailRouter
            isOpen={true}
            onClose={() => setOpenedItem(null)}
            itemId={openedItem.id}
            itemType={openedItem.issueType}
            projectId={openedItem.projectId}
            projectKey={openedItem.projectKey}
          />
        </Suspense>
      )}
    </div>
  );
}

export default LinkedWorkItems;
