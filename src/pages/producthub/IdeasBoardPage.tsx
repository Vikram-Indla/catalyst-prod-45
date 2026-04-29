/**
 * Ideas Board Page — /product/ideas/board
 *
 * Migrated onto the canonical KanbanBoardShell (Phase 4 of the Catalyst
 * Kanban consolidation). This page used to render its own 5-column flex
 * grid with a custom BoardCard, a status-pill filter bar, and no drag-
 * drop. After migration:
 *
 *   - Rendering flows through <KanbanBoardShell adapter={...}/>, so the
 *     board inherits the Jira-parity toolbar, card surface, density /
 *     view-settings controls, filter popovers, group-by, and Pragmatic
 *     drag-drop for free.
 *
 *   - Drag between columns persists a status change against `ph_ideas`.
 *     Previously this board was static — this is a new capability, not
 *     a regression. The legacy status-pill filter bar is superseded by
 *     the canonical basic-filter popover (Type / Priority / Theme /
 *     Quarter / Assignee).
 *
 *   - Clicking a card still opens the IdeaDrawer (full edit surface),
 *     and the convert-to-request flow (IdeaDrawer → onConvert →
 *     CreateRequestDrawer) is preserved verbatim.
 *
 *   - The green left-border treatment on converted cards is not carried
 *     over — the canonical card surface is Atlaskit/Jira-parity so any
 *     decorative column-tinting lives in the column header, not the
 *     card edge. The "Converted to Request" column still reads
 *     clearly as a terminal state via its header styling.
 */
import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { KanbanBoardShell } from '@/components/kanban/KanbanBoardShell';
import { buildIdeasBoardAdapter } from '@/components/kanban/adapters/ideasBoardAdapter';
import { useIdeasHub, type IdeaRow } from '@/hooks/useIdeasHub';
import { useProfileAvatarsByName } from '@/hooks/useProfileAvatars';
import IdeaDrawer from './ideation/IdeaDrawer';
import {
  CreateRequestDrawer,
  type ConversionSource,
} from '@/components/producthub/shared/CreateRequestDrawer';

export default function IdeasBoardPage() {
  const avatarsByName = useProfileAvatarsByName();

  /* ═════ Page-owned filter + group-by state. ═════ */
  const [search, setSearch] = useState('');
  const [selAssignees, setSelAssignees] = useState<Set<string>>(new Set());
  const [filterSelected, setFilterSelected] = useState<Record<string, string[]>>({});
  const [groupBy, setGroupBy] = useState<string>('none');

  const onFilterChange = useCallback((categoryId: string, values: string[]) => {
    setFilterSelected(prev => ({ ...prev, [categoryId]: values }));
  }, []);
  const onClearFilters = useCallback(() => {
    setFilterSelected({});
    setSelAssignees(new Set());
    setSearch('');
  }, []);

  /* ═════ Drawers + conversion flow (unchanged from legacy implementation). ═════ */
  const [drawerKey, setDrawerKey] = useState<string | null>(null);
  const [convertDrawerOpen, setConvertDrawerOpen] = useState(false);
  const [conversionSource, setConversionSource] = useState<ConversionSource | null>(null);

  const { data: ideas = [], isLoading } = useIdeasHub({ search: search || undefined });

  const ideaByKey = useMemo(() => {
    const m = new Map<string, IdeaRow>();
    for (const i of ideas) m.set(i.idea_key, i);
    return m;
  }, [ideas]);
  const ideaById = useMemo(() => {
    const m = new Map<string, IdeaRow>();
    for (const i of ideas) m.set(i.id, i);
    return m;
  }, [ideas]);

  const handleConvertIdea = useCallback((idea: IdeaRow) => {
    setConversionSource({
      type: 'single',
      primaryIdea: {
        key: idea.idea_key,
        title: idea.title,
        description: idea.description || '',
        impact: idea.impact_total,
        votes: idea.vote_count,
        dept: idea.assigned_team || '',
        priority: idea.priority || 'P3',
      },
    });
    setConvertDrawerOpen(true);
  }, []);

  /* ═════ Status-change mutation (drag between columns + drawer change). ═════ */
  const qc = useQueryClient();
  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('ph_ideas')
        .update({ status: status as any, updated_at: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ideas-hub'] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update idea status');
    },
  });

  const onStatusChange = useCallback(
    (ideaId: string, status: string) => {
      statusMutation.mutate({ id: ideaId, status });
    },
    [statusMutation],
  );

  /* ═════ Card click → open drawer (keyed by idea_key, not id). ═════ */
  const onCardClick = useCallback((ideaId: string) => {
    const idea = ideaById.get(ideaId);
    if (idea) setDrawerKey(idea.idea_key);
  }, [ideaById]);

  /* ═════ Build the canonical adapter. ═════ */
  const adapter = useMemo(() => buildIdeasBoardAdapter({
    ideas,
    avatarsByName,
    search,
    onSearchChange: setSearch,
    selAssignees,
    onSelAssigneesChange: setSelAssignees,
    filterSelected,
    onFilterChange,
    onClearFilters,
    groupBy,
    onGroupByChange: setGroupBy,
    onStatusChange,
    onCardClick,
  }), [
    ideas, avatarsByName,
    search, selAssignees, filterSelected, groupBy,
    onFilterChange, onClearFilters,
    onStatusChange, onCardClick,
  ]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{
          width: 32, height: 32,
          border: '2px solid #2563EB', borderTopColor: 'transparent',
          borderRadius: '50%', animation: 'spin 1s linear infinite',
        }} />
      </div>
    );
  }

  return (
    <>
      <KanbanBoardShell adapter={adapter} title="Ideas Board" />

      {drawerKey && (
        <IdeaDrawer
          ideaKey={drawerKey}
          onClose={() => setDrawerKey(null)}
          onConvert={handleConvertIdea}
        />
      )}

      <CreateRequestDrawer
        open={convertDrawerOpen}
        onClose={() => { setConvertDrawerOpen(false); setConversionSource(null); }}
        conversionSource={conversionSource}
        onCreated={async (initiativeKey) => {
          if (!conversionSource) return;
          const idea = ideaByKey.get(conversionSource.primaryIdea.key);
          if (!idea) return;
          await supabase
            .from('ph_ideas')
            .update({
              status: 'Converted to Request',
              converted_at: new Date().toISOString(),
            } as any)
            .eq('id', idea.id);
          qc.invalidateQueries({ queryKey: ['ideas-hub'] });
          toast.success(`${conversionSource.primaryIdea.key} converted to ${initiativeKey}`);
        }}
      />
    </>
  );
}
