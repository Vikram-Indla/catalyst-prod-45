import { useState, useMemo } from 'react';
import { useObjectivesV2, ObjectiveV2 } from '@/hooks/useObjectivesV2';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Plus, Search, Filter, Target, Users, Calendar, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { CreateObjectiveDialogV2 } from './CreateObjectiveDialogV2';
import { ObjectiveDrawerV2 } from './ObjectiveDrawerV2';
import { OKRSmartFiltersDialog, OKRSmartFilters, countActiveFilters } from './OKRSmartFiltersDialog';

function getHealthColor(health?: string): string {
  switch (health) {
    case 'good': return 'bg-green-500';
    case 'fair': return 'bg-amber-500';
    case 'poor': return 'bg-red-500';
    case 'at_risk': return 'bg-orange-500';
    default: return 'bg-muted';
  }
}

function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'completed': return 'default';
    case 'in_progress':
    case 'on_track': return 'secondary';
    case 'at_risk':
    case 'off_track': return 'destructive';
    default: return 'outline';
  }
}

export function OKRHubV2() {
  const [smartFilters, setSmartFilters] = useState<OKRSmartFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string | null>(null);
  const [showFiltersDialog, setShowFiltersDialog] = useState(false);

  // Fetch all objectives (unfiltered from backend)
  const { data: allObjectives, isLoading } = useObjectivesV2({
    search: searchQuery || undefined,
  });

  // Client-side filtering
  const filteredObjectives = useMemo(() => {
    if (!allObjectives) return [];
    
    return allObjectives.filter((obj) => {
      // Theme filter
      if (smartFilters.themeIds && smartFilters.themeIds.length > 0) {
        if (!obj.theme_id || !smartFilters.themeIds.includes(obj.theme_id)) {
          return false;
        }
      }

      // Status filter
      if (smartFilters.status && smartFilters.status.length > 0) {
        if (!smartFilters.status.includes(obj.status)) {
          return false;
        }
      }

      // Health filter
      if (smartFilters.health && smartFilters.health.length > 0) {
        if (!obj.health || !smartFilters.health.includes(obj.health)) {
          return false;
        }
      }

      // Progress range filter
      if (smartFilters.progressMin !== undefined) {
        if (obj.overall_progress < smartFilters.progressMin) {
          return false;
        }
      }
      if (smartFilters.progressMax !== undefined) {
        if (obj.overall_progress > smartFilters.progressMax) {
          return false;
        }
      }

      // Owner filter
      if (smartFilters.ownerIds && smartFilters.ownerIds.length > 0) {
        if (!obj.owner_id || !smartFilters.ownerIds.includes(obj.owner_id)) {
          return false;
        }
      }

      // Start date range filter
      if (smartFilters.startDateFrom) {
        if (!obj.start_date || new Date(obj.start_date) < smartFilters.startDateFrom) {
          return false;
        }
      }
      if (smartFilters.startDateTo) {
        if (!obj.start_date || new Date(obj.start_date) > smartFilters.startDateTo) {
          return false;
        }
      }

      // Due date range filter
      if (smartFilters.dueDateFrom) {
        if (!obj.due_date || new Date(obj.due_date) < smartFilters.dueDateFrom) {
          return false;
        }
      }
      if (smartFilters.dueDateTo) {
        if (!obj.due_date || new Date(obj.due_date) > smartFilters.dueDateTo) {
          return false;
        }
      }

      return true;
    });
  }, [allObjectives, smartFilters]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const activeFilterCount = countActiveFilters(smartFilters);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-[72px] border-b border-border bg-card flex-shrink-0 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <Target className="h-5 w-5 text-brand-gold" />
          <h1 className="text-lg font-semibold text-foreground">OKR Hub</h1>
          <Badge variant="outline" className="ml-2">v2</Badge>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Objective
        </Button>
      </div>

      {/* Toolbar */}
      <div className="border-b border-border bg-card px-6 py-3 flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search objectives..."
            value={searchQuery}
            onChange={handleSearch}
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFiltersDialog(true)}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 bg-brand-gold/20 text-brand-gold">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 bg-background">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : filteredObjectives && filteredObjectives.length > 0 ? (
          <div className="space-y-4">
            {filteredObjectives.map((objective) => (
              <ObjectiveCard
                key={objective.id}
                objective={objective}
                onClick={() => setSelectedObjectiveId(objective.id)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Target className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">No objectives found</p>
            <p className="text-sm">
              {activeFilterCount > 0 
                ? 'Try adjusting your filters' 
                : 'Create your first objective to get started'}
            </p>
            {activeFilterCount === 0 && (
              <Button
                onClick={() => setShowCreateDialog(true)}
                variant="outline"
                className="mt-4"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Objective
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Dialogs & Drawers */}
      <CreateObjectiveDialogV2
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />

      <ObjectiveDrawerV2
        objectiveId={selectedObjectiveId}
        open={!!selectedObjectiveId}
        onClose={() => setSelectedObjectiveId(null)}
        onDuplicated={(newId) => setSelectedObjectiveId(newId)}
      />

      <OKRSmartFiltersDialog
        open={showFiltersDialog}
        onOpenChange={setShowFiltersDialog}
        filters={smartFilters}
        onFiltersChange={setSmartFilters}
      />
    </div>
  );
}

interface ObjectiveCardProps {
  objective: ObjectiveV2;
  onClick: () => void;
}

function ObjectiveCard({ objective, onClick }: ObjectiveCardProps) {
  return (
    <Card
      className="cursor-pointer hover:border-brand-gold/50 transition-colors"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Health indicator */}
          <div className={`w-1.5 h-full min-h-[60px] rounded-full ${getHealthColor(objective.health)}`} />

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {objective.theme_name && (
                    <Badge variant="secondary" className="text-xs">
                      {objective.theme_name}
                    </Badge>
                  )}
                  <Badge variant={getStatusBadgeVariant(objective.status)} className="text-xs">
                    {objective.status.replace('_', ' ')}
                  </Badge>
                </div>
                <h3 className="font-medium text-foreground truncate">{objective.name}</h3>
              </div>

              {/* Progress */}
              <div className="flex-shrink-0 w-32">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{objective.overall_progress}%</span>
                </div>
                <Progress value={objective.overall_progress} className="h-2" />
              </div>
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-6 mt-3 text-sm text-muted-foreground">
              {objective.owner_name && (
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  <span>{objective.owner_name}</span>
                </div>
              )}
              {objective.due_date && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{new Date(objective.due_date).toLocaleDateString()}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>{objective.key_results_count || 0} KRs</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5" />
                <span>{objective.linked_work_count || 0} linked items</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
