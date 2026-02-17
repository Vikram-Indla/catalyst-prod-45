// ============================================================
// ALL IDEAS PAGE - ELEVATED (9.8/10 Target)
// Competitive with Linear, Notion, Asana
// ============================================================

import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Lightbulb, 
  Plus,
  LayoutGrid,
  List,
  Download,
  Zap,
  Layers,
  User,
  CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { useImprovementIdeas, useImprovementInitiatives } from '@/hooks/useImprovementIdeas';
import { 
  PageHeader, 
  Kbd,
  FilterBar,
  TabBar,
  IdeaCardElevated,
  IdeaListRowElevated
} from '@/components/ideas/elevated';
import { 
  ImprovementIdeaStatus, 
  ImprovementIdeaCategory,
  IDEA_STATUS_LABELS, 
  IDEA_CATEGORY_LABELS 
} from '@/types/improvement-ideas';

type ViewMode = 'grid' | 'list';
type SortOption = 'newest' | 'oldest' | 'votes' | 'score';

export default function AllIdeasPageElevated() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [sortBy, setSortBy] = useState<SortOption>(
    (searchParams.get('sort') as SortOption) || 'newest'
  );
  const [activeTab, setActiveTab] = useState(searchParams.get('type') || 'all');
  const [selectedStatuses, setSelectedStatuses] = useState<ImprovementIdeaStatus[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<ImprovementIdeaCategory[]>([]);
  const [selectedInitiative, setSelectedInitiative] = useState<string>('all');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const { data: initiatives } = useImprovementInitiatives();
  const { data: allIdeas, isLoading } = useImprovementIdeas({
    search: search || undefined,
    status: selectedStatuses.length > 0 ? selectedStatuses : undefined,
    category: selectedCategories.length > 0 ? selectedCategories : undefined,
    initiativeId: selectedInitiative !== 'all' ? selectedInitiative : undefined,
  });

  // Filter by tab
  const filteredByTab = useMemo(() => {
    if (!allIdeas) return [];
    switch (activeTab) {
      case 'quick_wins':
        return allIdeas.filter(i => i.idea_type === 'quick_win');
      case 'strategic':
        return allIdeas.filter(i => i.idea_type === 'strategic');
      case 'my_ideas':
        return allIdeas; // Would need user context
      case 'pending':
        return allIdeas.filter(i => ['submitted', 'under_review'].includes(i.status));
      case 'converted':
        return allIdeas.filter(i => i.status === 'converted');
      default:
        return allIdeas;
    }
  }, [allIdeas, activeTab]);

  // Sort ideas
  const sortedIdeas = useMemo(() => {
    const sorted = [...filteredByTab];
    switch (sortBy) {
      case 'oldest':
        return sorted.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      case 'votes':
        return sorted.sort((a, b) => b.for_votes - a.for_votes);
      case 'score':
        return sorted.sort((a, b) => 
          (b.impact_score?.calculated_score || 0) - (a.impact_score?.calculated_score || 0)
        );
      case 'newest':
      default:
        return sorted.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }
  }, [filteredByTab, sortBy]);

  // Tab counts
  const tabCounts = useMemo(() => ({
    all: allIdeas?.length || 0,
    quick_wins: allIdeas?.filter(i => i.idea_type === 'quick_win').length || 0,
    strategic: allIdeas?.filter(i => i.idea_type === 'strategic').length || 0,
    my_ideas: 0, // Would need user context
    pending: allIdeas?.filter(i => ['submitted', 'under_review'].includes(i.status)).length || 0,
    converted: allIdeas?.filter(i => i.status === 'converted').length || 0,
  }), [allIdeas]);

  // Tab data with keys (not ids)
  const tabs = [
    { key: 'all', label: 'All', count: tabCounts.all },
    { key: 'quick_wins', label: '🚀 Quick Wins', count: tabCounts.quick_wins },
    { key: 'strategic', label: '📦 Strategic', count: tabCounts.strategic },
    { key: 'my_ideas', label: 'My Ideas', count: tabCounts.my_ideas },
    { key: 'pending', label: 'Pending Review', count: tabCounts.pending },
    { key: 'converted', label: 'Converted', count: tabCounts.converted },
  ];

  const clearFilters = () => {
    setSelectedStatuses([]);
    setSelectedCategories([]);
    setSelectedInitiative('all');
    setSearch('');
    setActiveTab('all');
  };

  const hasActiveFilters = selectedStatuses.length > 0 || selectedCategories.length > 0 || selectedInitiative !== 'all' || search;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="p-6 lg:p-10 max-w-[1600px] mx-auto">
        {/* Header */}
        <PageHeader
          icon={Lightbulb}
          title="All Ideas"
          subtitle="Browse and manage all improvement suggestions"
          className="mb-6"
          actions={
            <>
              <Button 
                variant="outline" 
                className="gap-2 border-slate-200 bg-white"
              >
                <Download className="w-4 h-4" />
                Export
              </Button>
              <Button 
                onClick={() => navigate('/producthub/ideas/submit')}
                className="gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-600/25"
              >
                <Plus className="w-4 h-4" />
                Submit Idea
              </Button>
            </>
          }
        />

        {/* Filter Bar */}
        <FilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search ideas..."
          filters={[
            {
              key: 'initiative',
              label: 'All Initiatives',
              value: selectedInitiative,
              options: initiatives?.map(i => ({ value: i.id, label: i.title })) || [],
              onChange: setSelectedInitiative,
            },
            {
              key: 'sort',
              label: 'Sort',
              value: sortBy,
              options: [
                { value: 'newest', label: 'Newest First' },
                { value: 'oldest', label: 'Oldest First' },
                { value: 'votes', label: 'Most Voted' },
                { value: 'score', label: 'Highest Score' },
              ],
              onChange: (v) => setSortBy(v as SortOption),
            },
          ]}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          activeFiltersCount={
            (selectedStatuses.length > 0 ? 1 : 0) +
            (selectedCategories.length > 0 ? 1 : 0) +
            (selectedInitiative !== 'all' ? 1 : 0) +
            (search ? 1 : 0)
          }
          onClearFilters={clearFilters}
          className="mb-6"
        />

        {/* Tab Bar */}
        <TabBar
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          className="mb-4"
        />

        {/* Results Info */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            {isLoading ? (
              <Skeleton className="h-5 w-32" />
            ) : (
              <span className="text-sm text-slate-600">
                Showing <span className="font-semibold text-slate-900">{sortedIdeas.length}</span> ideas
              </span>
            )}
            {hasActiveFilters && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearFilters}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                Clear filters
              </Button>
            )}
          </div>

          {/* Bulk Actions (shown when items selected) */}
          {selectedItems.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">
                {selectedItems.length} selected
              </span>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                Mark as Quick Win
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                Mark as Strategic
              </Button>
            </div>
          )}
        </div>

        {/* Ideas Grid/List */}
        {isLoading ? (
          <div className={viewMode === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
            : "space-y-2"
          }>
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="bg-white">
                <CardContent className="p-5">
                  <Skeleton className="h-5 w-3/4 mb-3" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3 mb-4" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : sortedIdeas.length === 0 ? (
          <Card className="bg-white border-slate-200">
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
                <Lightbulb className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">No ideas found</h3>
              <p className="text-sm text-slate-500 mb-6">
                {hasActiveFilters 
                  ? "Try adjusting your filters or search terms"
                  : "Be the first to submit an improvement idea!"
                }
              </p>
              {hasActiveFilters ? (
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              ) : (
                <Button onClick={() => navigate('/producthub/ideas/submit')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Submit Idea
                </Button>
              )}
            </CardContent>
          </Card>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {sortedIdeas.map(idea => (
              <IdeaCardElevated
                key={idea.id}
                idea={idea}
                onClick={() => navigate(`/producthub/ideas/${idea.id}`)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {sortedIdeas.map(idea => (
              <IdeaListRowElevated
                key={idea.id}
                idea={idea}
                onClick={() => navigate(`/producthub/ideas/${idea.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
