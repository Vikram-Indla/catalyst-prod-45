import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Plus, List, LayoutGrid } from 'lucide-react';
import { FeatureDetailsPanel } from '@/components/items/features/FeatureDetailsPanel';
import { StoryDetailPanel } from '@/components/stories/StoryDetailPanel';
import { FeatureDialog } from '@/components/forms/FeatureDialog';
import { cn } from '@/lib/utils';

interface ExpandedFeatures {
  [key: string]: boolean;
}

export default function ProgramBacklog() {
  const { programId } = useParams<{ programId: string }>();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedFeatures, setExpandedFeatures] = useState<ExpandedFeatures>({});
  const [selectedFeature, setSelectedFeature] = useState<any>(null);
  const [selectedStory, setSelectedStory] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [isCreateFeatureOpen, setIsCreateFeatureOpen] = useState(false);

  // Fetch program details
  const { data: program } = useQuery({
    queryKey: ['program', programId],
    queryFn: async () => {
      if (!programId) return null;
      const { data, error } = await supabase
        .from('programs')
        .select('id, name')
        .eq('id', programId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!programId,
  });

  // Fetch features for this program
  const { data: features, isLoading: featuresLoading } = useQuery({
    queryKey: ['program-features', programId, searchTerm, statusFilter],
    queryFn: async () => {
      if (!programId) return [];
      let query = supabase
        .from('features')
        .select(`
          id,
          name,
          status,
          health,
          estimate_points,
          progress_pct,
          epic_id,
          epics(name)
        `)
        .eq('project_id', programId)
        .is('deleted_at', null)
        .order('global_rank', { ascending: true, nullsFirst: false });

      if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`);
      }

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter as any);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!programId,
  });

  // Fetch stories for expanded features
  const { data: storiesByFeature } = useQuery({
    queryKey: ['feature-stories', Object.keys(expandedFeatures).filter(k => expandedFeatures[k])],
    queryFn: async () => {
      const expandedIds = Object.keys(expandedFeatures).filter(k => expandedFeatures[k]);
      if (expandedIds.length === 0) return {};

      const { data, error } = await supabase
        .from('stories')
        .select('*, teams(name)')
        .in('feature_id', expandedIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group stories by feature_id
      const grouped: { [key: string]: any[] } = {};
      data?.forEach(story => {
        if (!grouped[story.feature_id]) {
          grouped[story.feature_id] = [];
        }
        grouped[story.feature_id].push(story);
      });
      return grouped;
    },
    enabled: Object.values(expandedFeatures).some(v => v),
  });

  const toggleFeatureExpand = (featureId: string) => {
    setExpandedFeatures(prev => ({
      ...prev,
      [featureId]: !prev[featureId]
    }));
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'funnel': return 'bg-muted text-muted-foreground';
      case 'analyzing': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'backlog': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'implementing': return 'bg-primary/10 text-primary';
      case 'validating': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'deploying': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'done': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStoryStatusColor = (status: string | null) => {
    switch (status) {
      case 'todo': return 'bg-muted text-muted-foreground';
      case 'in_progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'done': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'accepted': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200';
      case 'blocked': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-card px-[var(--s4)] sm:px-[var(--s6)] py-[var(--s4)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[var(--s4)]">
          <div>
            <h1 className="text-2xl font-bold">Program Backlog</h1>
            <p className="text-sm text-muted-foreground">
              {program?.name || 'Loading...'} - Features with Stories
            </p>
          </div>
          <div className="flex items-center gap-[var(--s2)]">
            {/* Create Feature Button */}
            <Button size="sm" className="bg-brand-gold hover:bg-brand-gold-hover" onClick={() => setIsCreateFeatureOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Create Feature
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4 mr-1" />
              List
            </Button>
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('kanban')}
            >
              <LayoutGrid className="h-4 w-4 mr-1" />
              Kanban
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-[var(--s3)] mt-[var(--s4)]">
          <Input
            placeholder="Search features..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="funnel">Funnel</SelectItem>
              <SelectItem value="analyzing">Analyzing</SelectItem>
              <SelectItem value="backlog">Backlog</SelectItem>
              <SelectItem value="implementing">Implementing</SelectItem>
              <SelectItem value="validating">Validating</SelectItem>
              <SelectItem value="deploying">Deploying</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-[var(--s4)] sm:px-[var(--s6)] py-[var(--s4)]">
        {featuresLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading features...</div>
        ) : features && features.length > 0 ? (
          <div className="border rounded-lg bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Feature</TableHead>
                  <TableHead>Epic</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                  <TableHead className="text-right">Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {features.map((feature) => (
                  <>
                    <TableRow
                      key={feature.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedFeature(feature)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => toggleFeatureExpand(feature.id)}
                        >
                          {expandedFeatures[feature.id] ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">{feature.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {feature.epics?.name || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('capitalize', getStatusColor(feature.status))}>
                          {feature.status || 'No Status'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {feature.estimate_points || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {feature.progress_pct != null ? `${feature.progress_pct}%` : '-'}
                      </TableCell>
                    </TableRow>

                    {/* Expanded Stories */}
                    {expandedFeatures[feature.id] && (
                      <TableRow className="bg-muted/30">
                        <TableCell colSpan={6} className="p-0">
                          <div className="pl-10 pr-4 py-2">
                            <div className="text-xs font-semibold text-muted-foreground mb-2">
                              Stories ({storiesByFeature?.[feature.id]?.length || 0})
                            </div>
                            {storiesByFeature?.[feature.id]?.length > 0 ? (
                              <div className="space-y-1">
                                {storiesByFeature[feature.id].map((story: any) => (
                                  <div
                                    key={story.id}
                                    className="flex items-center justify-between py-2 px-3 bg-card rounded border cursor-pointer hover:bg-muted/50"
                                    onClick={() => setSelectedStory(story)}
                                  >
                                    <div className="flex items-center gap-3">
                                      <span className="text-sm font-medium">{story.name}</span>
                                      {story.teams?.name && (
                                        <span className="text-xs text-muted-foreground">
                                          {story.teams.name}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <Badge className={cn('text-xs', getStoryStatusColor(story.status))}>
                                        {story.status || 'todo'}
                                      </Badge>
                                      <span className="text-sm text-muted-foreground">
                                        {story.estimate_points || 0} pts
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-sm text-muted-foreground py-2">
                                No stories linked to this feature
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <p>No features found for this program</p>
            <p className="text-sm mt-2">Create features to start building your backlog</p>
          </div>
        )}
      </div>

      {/* Feature Details Panel */}
      {selectedFeature && (
        <FeatureDetailsPanel
          feature={selectedFeature}
          open={!!selectedFeature}
          onClose={() => setSelectedFeature(null)}
        />
      )}

      {/* Story Details Panel */}
      {selectedStory && (
        <StoryDetailPanel
          story={selectedStory}
          open={!!selectedStory}
          onClose={() => setSelectedStory(null)}
        />
      )}

      {/* Create Feature Dialog */}
      <FeatureDialog
        open={isCreateFeatureOpen}
        onOpenChange={setIsCreateFeatureOpen}
      />
    </div>
  );
}
