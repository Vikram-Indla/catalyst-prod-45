// ============================================================
// ALL IDEAS LIST PAGE
// ============================================================

import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Lightbulb, 
  Filter, 
  Search, 
  Plus,
  LayoutGrid,
  List,
  SlidersHorizontal,
  ChevronDown,
  ThumbsUp,
  ThumbsDown,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useImprovementIdeas, useImprovementInitiatives } from '@/hooks/useImprovementIdeas';
import { IdeaCard } from '@/components/ideas/IdeaCard';
import { IdeaListRow } from '@/components/ideas/IdeaListRow';
import { 
  ImprovementIdeaStatus, 
  ImprovementIdeaCategory,
  IDEA_STATUS_LABELS, 
  IDEA_CATEGORY_LABELS 
} from '@/types/improvement-ideas';

type ViewMode = 'grid' | 'list';
type SortOption = 'newest' | 'oldest' | 'votes' | 'score';

const STATUS_OPTIONS: ImprovementIdeaStatus[] = [
  'submitted', 'under_review', 'scoring', 'approved', 'rejected', 'deferred', 'converted'
];

const CATEGORY_OPTIONS: ImprovementIdeaCategory[] = [
  'licensing_improvement', 'compliance_automation', 'investor_experience',
  'process_optimization', 'digital_service', 'integration', 'data_quality',
  'accessibility', 'security_enhancement', 'reporting_analytics', 'mobile_capability', 'other'
];

export default function AllIdeasPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [sortBy, setSortBy] = useState<SortOption>(
    (searchParams.get('sort') as SortOption) || 'newest'
  );
  const [selectedStatuses, setSelectedStatuses] = useState<ImprovementIdeaStatus[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<ImprovementIdeaCategory[]>([]);
  const [selectedInitiative, setSelectedInitiative] = useState<string>('all');

  const { data: initiatives } = useImprovementInitiatives();
  const { data: ideas, isLoading } = useImprovementIdeas({
    search: search || undefined,
    status: selectedStatuses.length > 0 ? selectedStatuses : undefined,
    category: selectedCategories.length > 0 ? selectedCategories : undefined,
    initiativeId: selectedInitiative !== 'all' ? selectedInitiative : undefined,
  });

  // Sort ideas
  const sortedIdeas = useMemo(() => {
    if (!ideas) return [];
    const sorted = [...ideas];
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
  }, [ideas, sortBy]);

  const handleStatusToggle = (status: ImprovementIdeaStatus) => {
    setSelectedStatuses(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const handleCategoryToggle = (category: ImprovementIdeaCategory) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const clearFilters = () => {
    setSelectedStatuses([]);
    setSelectedCategories([]);
    setSelectedInitiative('all');
    setSearch('');
  };

  const hasActiveFilters = selectedStatuses.length > 0 || selectedCategories.length > 0 || selectedInitiative !== 'all' || search;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-primary" />
            All Ideas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse and explore all submitted improvement ideas
          </p>
        </div>
        <Button onClick={() => navigate('/ideas/submit')}>
          <Plus className="mr-2 h-4 w-4" />
          Submit Idea
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search ideas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Initiative Filter */}
        <Select value={selectedInitiative} onValueChange={setSelectedInitiative}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Initiatives" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Initiatives</SelectItem>
            {initiatives?.map(init => (
              <SelectItem key={init.id} value={init.id}>
                {init.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Status
              {selectedStatuses.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {selectedStatuses.length}
                </Badge>
              )}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {STATUS_OPTIONS.map(status => (
              <DropdownMenuCheckboxItem
                key={status}
                checked={selectedStatuses.includes(status)}
                onCheckedChange={() => handleStatusToggle(status)}
              >
                {IDEA_STATUS_LABELS[status]}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Category Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Category
              {selectedCategories.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {selectedCategories.length}
                </Badge>
              )}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 max-h-[300px] overflow-y-auto">
            <DropdownMenuLabel>Filter by Category</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {CATEGORY_OPTIONS.map(category => (
              <DropdownMenuCheckboxItem
                key={category}
                checked={selectedCategories.includes(category)}
                onCheckedChange={() => handleCategoryToggle(category)}
              >
                {IDEA_CATEGORY_LABELS[category]}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Sort */}
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="votes">Most Voted</SelectItem>
            <SelectItem value="score">Highest Score</SelectItem>
          </SelectContent>
        </Select>

        {/* View Toggle */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
          <TabsList className="h-9">
            <TabsTrigger value="grid" className="px-3">
              <LayoutGrid className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="list" className="px-3">
              <List className="h-4 w-4" />
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {selectedStatuses.map(status => (
            <Badge 
              key={status} 
              variant="secondary" 
              className="cursor-pointer"
              onClick={() => handleStatusToggle(status)}
            >
              {IDEA_STATUS_LABELS[status]} ×
            </Badge>
          ))}
          {selectedCategories.map(category => (
            <Badge 
              key={category} 
              variant="secondary" 
              className="cursor-pointer"
              onClick={() => handleCategoryToggle(category)}
            >
              {IDEA_CATEGORY_LABELS[category]} ×
            </Badge>
          ))}
          {selectedInitiative !== 'all' && (
            <Badge 
              variant="secondary" 
              className="cursor-pointer"
              onClick={() => setSelectedInitiative('all')}
            >
              Initiative: {initiatives?.find(i => i.id === selectedInitiative)?.title} ×
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear all
          </Button>
        </div>
      )}

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        {isLoading ? (
          <Skeleton className="h-4 w-32" />
        ) : (
          `${sortedIdeas.length} idea${sortedIdeas.length !== 1 ? 's' : ''} found`
        )}
      </div>

      {/* Ideas Grid/List */}
      {isLoading ? (
        <div className={viewMode === 'grid' 
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          : "flex flex-col gap-2"
        }>
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full mb-4" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : sortedIdeas.length === 0 ? (
        <Card className="p-12 text-center">
          <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No ideas found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {hasActiveFilters 
              ? "Try adjusting your filters or search terms"
              : "Be the first to submit an improvement idea!"
            }
          </p>
          {hasActiveFilters ? (
            <Button variant="outline" onClick={clearFilters}>Clear Filters</Button>
          ) : (
            <Button onClick={() => navigate('/ideas/submit')}>
              <Plus className="mr-2 h-4 w-4" />
              Submit Idea
            </Button>
          )}
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedIdeas.map(idea => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              onClick={() => navigate(`/ideas/${idea.id}`)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sortedIdeas.map(idea => (
            <IdeaListRow
              key={idea.id}
              idea={idea}
              onClick={() => navigate(`/ideas/${idea.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
