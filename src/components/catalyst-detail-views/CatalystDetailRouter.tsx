/**
 * CatalystDetailRouter — Routes to the correct CatalystView* component
 * based on the work item type.
 *
 * If itemType is provided, renders the matching view immediately.
 * If not, queries ph_issues to determine the type first.
 */
import React, { lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CatalystDetailRouterProps } from './shared/types';

const CatalystViewStory = lazy(() => import('./story/CatalystViewStory'));
const CatalystViewEpic = lazy(() => import('./epic/CatalystViewEpic'));
const CatalystViewDefect = lazy(() => import('./defect/CatalystViewDefect'));
const CatalystViewIncident = lazy(() => import('./incident/CatalystViewIncident'));
const CatalystViewTask = lazy(() => import('./task/CatalystViewTask'));
const CatalystViewBusinessRequest = lazy(() => import('./business-request/CatalystViewBusinessRequest'));
const CatalystViewSubtask = lazy(() => import('./subtask/CatalystViewSubtask'));
const CatalystViewFeature = lazy(() => import('./feature/CatalystViewFeature'));
// Phase 6 (2026-05-02) — Idea is its own entity backed by ph_ideas, not
// ph_issues. Lookup by idea_key, not issue_key. CatalystViewIdea uses the
// idea-specific data hooks (useIdeaByKey, useUpdateIdea) under the same
// CatalystView* contract — see CLAUDE.md.
const CatalystViewIdea = lazy(() => import('./idea/CatalystViewIdea'));

/** Normalize various issue_type strings to a canonical CatalystItemType */
function resolveItemType(raw: string | undefined | null): 'story' | 'epic' | 'feature' | 'defect' | 'incident' | 'task' | 'business_request' | 'subtask' | 'idea' | null {
  if (!raw) return null;
  const t = raw.toLowerCase().trim();
  if (t === 'epic') return 'epic';
  if (t === 'feature' || t === 'new feature') return 'feature';
  if (t === 'bug' || t === 'defect' || t === 'qa bug') return 'defect';
  if (t.includes('incident') || t === 'production incident' || t === 'business gap') return 'incident';
  if (t === 'task') return 'task';
  if (t === 'business request' || t === 'business_request' || t === 'demand') return 'business_request';
  if (t === 'sub-task' || t === 'subtask' || t === 'backend' || t === 'frontend' || t === 'figma' || t === 'entity figma' || t === 'integration') return 'subtask';
  if (t === 'idea' || t === 'opportunity') return 'idea';
  if (t === 'story' || t === 'improvement') return 'story';
  // Default to story for any unknown type
  return 'story';
}

export default function CatalystDetailRouter({
  isOpen, onClose, itemId, itemType,
  projectId, projectKey, onOpenItem,
  panelMode, fullPageMode, onTogglePanelMode, navigationItems, onNavigate,
  onConvert,
}: CatalystDetailRouterProps) {

  // F-iter9 PK fix: ph_issues' primary key is `issue_key` (text), not `id`.
  // The codebase had been silently no-op'ing on .eq('id', ...) since there's
  // no `id` column. itemId here is the row's issue_key (e.g. "BAU-5485")
  // — see BacklogPage.openDetail wiring and useBacklogData population.
  //
  // Phase 6 (2026-05-02): the lookup is skipped for idea entities since
  // ph_ideas uses idea_key (different table). Callers that open an idea
  // are required to pass itemType="idea" explicitly. Without that, the
  // probe below would hit ph_issues and miss.
  const { data: lookedUpType } = useQuery({
    queryKey: ['cv-item-type-lookup', itemId],
    enabled: !!itemId && isOpen && !itemType,
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_issues')
        .select('issue_type')
        .eq('issue_key', itemId)
        .is('deleted_at', null)
        .maybeSingle();
      return data?.issue_type ?? null;
    },
    staleTime: 120000,
  });

  const resolved = resolveItemType(itemType || lookedUpType);

  // Don't render anything when closed — prevents lazy component from loading
  // and avoids "Rendered more hooks" when Suspense swaps from fallback to loaded component
  if (!isOpen) return null;

  // While we're looking up the type, don't render anything
  if (!resolved && !itemType) {
    return null;
  }

  const sharedProps = {
    isOpen, onClose, itemId,
    projectId, projectKey, onOpenItem,
    panelMode, fullPageMode, onTogglePanelMode, navigationItems, onNavigate,
    onConvert,
  };

  return (
    <Suspense fallback={null}>
      {resolved === 'epic' && <CatalystViewEpic {...sharedProps} />}
      {resolved === 'feature' && <CatalystViewFeature {...sharedProps} />}
      {resolved === 'defect' && <CatalystViewDefect {...sharedProps} />}
      {resolved === 'incident' && <CatalystViewIncident {...sharedProps} />}
      {resolved === 'task' && <CatalystViewTask {...sharedProps} />}
      {resolved === 'business_request' && <CatalystViewBusinessRequest {...sharedProps} />}
      {resolved === 'subtask' && <CatalystViewSubtask {...sharedProps} />}
      {resolved === 'idea' && <CatalystViewIdea {...sharedProps} />}
      {(resolved === 'story' || !resolved) && <CatalystViewStory {...sharedProps} />}
    </Suspense>
  );
}

export { resolveItemType };
