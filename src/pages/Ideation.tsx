// ==============================================
// IDEATION PAGE
// Main page for Ideation module
// ==============================================

import { useState, useMemo, useEffect } from 'react';
import { Lightbulb, Kanban, List } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { IdeationHeader } from '@/components/ideation/IdeationHeader';
import { IdeaList } from '@/components/ideation/IdeaList';
import { ManageBacklogBoard } from '@/components/ideation/ManageBacklogBoard';
import { IdeaDetailPanel } from '@/components/ideation/IdeaDetailPanel';
import { CreateIdeaDialog } from '@/components/ideation/CreateIdeaDialog';
import { FilterDialog } from '@/components/ideation/FilterDialog';
import { KeyMetricsDialog } from '@/components/ideation/KeyMetricsDialog';
import {
  useIdeaGroups,
  useIdeas,
  useCastVote,
  useRemoveVote,
  useToggleSubscription,
  useUserVotesForGroup,
  useUserSubscriptionsForGroup,
} from '@/hooks/useIdeation';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import type { Idea, IdeaFilters, IdeaSortField, SortDirection, IdeaStatus, IdeationMetrics } from '@/types/ideation';

export default function Ideation() {
  const { user } = useAuth();
  const userId = user?.id || '';

  // State
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'list' | 'board'>('list');
  const [sortField, setSortField] = useState<IdeaSortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [statusFilter, setStatusFilter] = useState<IdeaStatus[]>([]);
  const [filters, setFilters] = useState<IdeaFilters>({});
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [metricsDialogOpen, setMetricsDialogOpen] = useState(false);

  // Data fetching
  const { data: groups = [], isLoading: groupsLoading } = useIdeaGroups();
  const { data: ideas = [], isLoading: ideasLoading } = useIdeas(selectedGroupId);
  const { data: userVotes = [] } = useUserVotesForGroup(selectedGroupId);
  const { data: userSubscriptions = [] } = useUserSubscriptionsForGroup();

  // Mutations
  const castVote = useCastVote();
  const removeVote = useRemoveVote();
  const toggleSubscription = useToggleSubscription();

  // Auto-select first group
  useEffect(() => {
    if (groups.length > 0 && !selectedGroupId) {
      setSelectedGroupId(groups[0].id);
    }
  }, [groups, selectedGroupId]);

  // Get selected group
  const selectedGroup = useMemo(() => {
    return groups.find((g) => g.id === selectedGroupId);
  }, [groups, selectedGroupId]);

  // Calculate user's remaining tokens
  const userTokensRemaining = useMemo(() => {
    if (!selectedGroup) return 0;
    const usedTokens = userVotes
      .filter((v) => v.vote_type === 'Token')
      .reduce((sum, v) => sum + v.token_count, 0);
    return selectedGroup.total_user_tokens - usedTokens;
  }, [selectedGroup, userVotes]);

  // Filter and sort ideas
  const filteredIdeas = useMemo(() => {
    let result = [...ideas];

    // Apply status filter
    if (statusFilter.length > 0) {
      result = result.filter((idea) => statusFilter.includes(idea.status as IdeaStatus));
    }

    // Apply search filter
    if (filters.search) {
      const query = filters.search.toLowerCase();
      result = result.filter(
        (idea) =>
          idea.title.toLowerCase().includes(query) ||
          idea.description.toLowerCase().includes(query)
      );
    }

    // Apply has_votes filter
    if (filters.has_votes) {
      result = result.filter((idea) => idea.vote_score !== 0);
    }

    // Apply has_comments filter
    if (filters.has_comments) {
      result = result.filter((idea) => idea.comment_count > 0);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'vote_score':
          comparison = a.vote_score - b.vote_score;
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'updated_at':
          comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
          break;
        case 'created_at':
        default:
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [ideas, statusFilter, filters, sortField, sortDirection]);

  // Calculate metrics
  const metrics: IdeationMetrics | null = useMemo(() => {
    if (ideas.length === 0) return null;

    const managedStatuses = ['Planned', 'Completed', 'Shelved'];
    const totalManaged = ideas.filter((i) => managedStatuses.includes(i.status)).length;
    const totalWithVotes = ideas.filter((i) => i.vote_score !== 0).length;
    const totalWithComments = ideas.filter((i) => i.comment_count > 0).length;
    const userContributed = ideas.filter((i) => i.created_by_id === userId).length;
    const userWithVotes = ideas.filter(
      (i) => i.created_by_id === userId && i.vote_score !== 0
    ).length;
    const userWithComments = ideas.filter(
      (i) => i.created_by_id === userId && i.comment_count > 0
    ).length;

    return {
      total_ideas: ideas.length,
      total_managed: totalManaged,
      total_with_votes: totalWithVotes,
      total_with_comments: totalWithComments,
      percent_managed: Math.round((totalManaged / ideas.length) * 100),
      percent_with_votes: Math.round((totalWithVotes / ideas.length) * 100),
      percent_with_comments: Math.round((totalWithComments / ideas.length) * 100),
      user_contributed: userContributed,
      user_with_votes: userWithVotes,
      user_with_comments: userWithComments,
      percent_user_contributed: userContributed > 0
        ? Math.round((userContributed / ideas.length) * 100)
        : 0,
      percent_user_with_votes: userContributed > 0
        ? Math.round((userWithVotes / userContributed) * 100)
        : 0,
      percent_user_with_comments: userContributed > 0
        ? Math.round((userWithComments / userContributed) * 100)
        : 0,
    };
  }, [ideas, userId]);

  // Handlers
  const handleVote = async (ideaId: string, voteType: 'For' | 'Against' | 'Token', tokens?: number) => {
    if (!userId) {
      toast.error('Please sign in to vote');
      return;
    }
    try {
      await castVote.mutateAsync({
        ideaId,
        vote_type: voteType,
        token_count: tokens || 0,
      });
    } catch {
      toast.error('Failed to cast vote');
    }
  };

  const handleRemoveVote = async (ideaId: string) => {
    const vote = userVotes.find((v) => v.idea_id === ideaId);
    if (!vote) return;
    try {
      await removeVote.mutateAsync(vote.id);
    } catch {
      toast.error('Failed to remove vote');
    }
  };

  const handleToggleSubscribe = async (ideaId: string, isSubscribed: boolean) => {
    if (!userId) {
      toast.error('Please sign in to subscribe');
      return;
    }
    try {
      await toggleSubscription.mutateAsync({
        ideaId,
        isSubscribed,
      });
    } catch {
      toast.error('Failed to update subscription');
    }
  };

  const handleIdeaClick = (idea: Idea) => {
    setSelectedIdea(idea);
    setDetailPanelOpen(true);
  };

  const isSubscribed = (ideaId: string) => {
    return userSubscriptions.some((s) => s.idea_id === ideaId);
  };

  return (
    <div className="container mx-auto p-3 sm:p-4 md:p-6">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-4 sm:mb-6">
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded bg-muted flex items-center justify-center">
          <Lightbulb className="h-4 w-4 sm:h-5 sm:w-5 text-brand-gold" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold truncate">Ideation</h1>
          <p className="text-muted-foreground">Capture and evaluate new ideas</p>
        </div>
      </div>

      {/* Loading State */}
      {groupsLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading ideation campaigns...</div>
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mb-4">
            <Lightbulb className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No Ideation Campaigns</h2>
          <p className="text-muted-foreground max-w-md">
            Create an ideation campaign to start collecting and evaluating ideas from your team.
          </p>
        </div>
      ) : (
        <>
          {/* Header with Controls */}
          <IdeationHeader
            groups={groups}
            selectedGroupId={selectedGroupId}
            onGroupChange={setSelectedGroupId}
            sortField={sortField}
            sortDirection={sortDirection}
            onSortChange={(field, direction) => {
              setSortField(field);
              setSortDirection(direction);
            }}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            totalCount={ideas.length}
            filteredCount={filteredIdeas.length}
            onOpenFilters={() => setFilterDialogOpen(true)}
            onOpenMetrics={() => setMetricsDialogOpen(true)}
            onOpenSetup={() => toast.info('Setup dialog coming soon')}
            onOpenManageBacklog={() => setActiveView('board')}
            onAddIdea={() => setCreateDialogOpen(true)}
          />

          {/* View Tabs */}
          <Tabs value={activeView} onValueChange={(v) => setActiveView(v as 'list' | 'board')} className="mt-6">
            <TabsList>
              <TabsTrigger value="list" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                List View
              </TabsTrigger>
              <TabsTrigger value="board" className="flex items-center gap-2">
                <Kanban className="h-4 w-4" />
                Manage Backlog
              </TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="mt-4">
              <IdeaList
                ideas={filteredIdeas}
                isLoading={ideasLoading}
                votingType={selectedGroup?.voting_type || 'ForAgainst'}
                userVotes={userVotes}
                userSubscriptions={userSubscriptions}
                userTokensRemaining={userTokensRemaining}
                onVote={handleVote}
                onRemoveVote={handleRemoveVote}
                onToggleSubscribe={handleToggleSubscribe}
                onIdeaClick={handleIdeaClick}
              />
            </TabsContent>

            <TabsContent value="board" className="mt-4">
              <ManageBacklogBoard
                ideas={filteredIdeas}
                onIdeaClick={handleIdeaClick}
              />
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Dialogs */}
      <CreateIdeaDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        ideaGroupId={selectedGroupId || ''}
        userId={userId}
      />

      <FilterDialog
        open={filterDialogOpen}
        onOpenChange={setFilterDialogOpen}
        filters={filters}
        onApply={setFilters}
      />

      <KeyMetricsDialog
        open={metricsDialogOpen}
        onOpenChange={setMetricsDialogOpen}
        metrics={metrics}
        isLoading={ideasLoading}
      />

      <IdeaDetailPanel
        idea={selectedIdea}
        open={detailPanelOpen}
        onOpenChange={setDetailPanelOpen}
        isSubscribed={selectedIdea ? isSubscribed(selectedIdea.id) : false}
        onToggleSubscribe={() => {
          if (selectedIdea) {
            handleToggleSubscribe(selectedIdea.id, isSubscribed(selectedIdea.id));
          }
        }}
        userId={userId}
      />
    </div>
  );
}
