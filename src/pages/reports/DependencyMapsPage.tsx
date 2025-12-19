/**
 * DependencyMapsPage - Visual network map of dependencies
 * 
 * Minimal implementation showing Epic dependencies as a network graph.
 * Uses existing components and CSS tokens only.
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { DependencyDetailsDrawer } from '@/components/dependencies/DependencyDetailsDrawer';
import { WorkItemIcon } from '@/components/dependencies/WorkItemIcon';
import { GlobalPageHeader } from '@/components/layout/GlobalPageHeader';
import { buildWorkItemMaps, resolveDependencyWorkItems, extractProgramIdsFromDep } from '@/lib/dependencies/resolveWorkItem';
import { DEPENDENCY_STATUS_LABELS } from '@/lib/dependencies/types';
import { Network, ArrowRight, Filter, Loader2 } from 'lucide-react';

// Generate quarter options
const generateQuarterOptions = () => {
  const currentYear = new Date().getFullYear();
  const quarters: string[] = [];
  for (let year = currentYear - 1; year <= currentYear + 2; year++) {
    for (let q = 1; q <= 4; q++) {
      quarters.push(`Q${q} ${year}`);
    }
  }
  return quarters;
};

const QUARTER_OPTIONS = generateQuarterOptions();

export default function DependencyMapsPage() {
  const [searchParams] = useSearchParams();
  const [selectedDependencyId, setSelectedDependencyId] = useState<string | null>(null);
  const [quarterFilter, setQuarterFilter] = useState(searchParams.get('quarter') || 'all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch epics
  const { data: epics, isLoading: epicsLoading } = useQuery({
    queryKey: ['epics-for-maps'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epics')
        .select('id, name, epic_key, program_id')
        .is('deleted_at', null);
      if (error) throw error;
      return data;
    },
  });

  // Fetch features
  const { data: features } = useQuery({
    queryKey: ['features-for-maps'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('features')
        .select('id, name, display_id, project_id');
      if (error) throw error;
      return data;
    },
  });

  // Fetch dependencies
  const { data: dependencies, isLoading: depsLoading } = useQuery({
    queryKey: ['dependencies-maps', quarterFilter],
    queryFn: async () => {
      let query = supabase
        .from('dependencies')
        .select(`
          *,
          from_feature:features!dependencies_from_feature_id_fkey(id, name, display_id, epic_id),
          to_feature:features!dependencies_to_feature_id_fkey(id, name, display_id, epic_id)
        `);
      
      if (quarterFilter && quarterFilter !== 'all') {
        query = query.eq('quarter', quarterFilter);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Build work item maps
  const workItemMaps = useMemo(() => {
    return buildWorkItemMaps(epics, features);
  }, [epics, features]);

  // Process dependencies with resolution
  const processedDeps = useMemo(() => {
    if (!dependencies) return [];

    return dependencies.map(dep => {
      const { source, target } = resolveDependencyWorkItems(dep, workItemMaps);
      const { sourceProgramId, targetProgramId } = extractProgramIdsFromDep(dep, workItemMaps);
      
      return {
        ...dep,
        resolvedSource: source,
        resolvedTarget: target,
        sourceProgramId,
        targetProgramId,
      };
    }).filter(dep => {
      // Apply filters
      if (levelFilter !== 'all' && dep.dependency_level_v2 !== levelFilter) return false;
      if (statusFilter !== 'all' && dep.status !== statusFilter) return false;
      return true;
    });
  }, [dependencies, workItemMaps, levelFilter, statusFilter]);

  // Build network nodes and edges
  const networkData = useMemo(() => {
    const nodeSet = new Set<string>();
    const nodeMap = new Map<string, { id: string; type: string; displayId: string; name: string }>();
    
    processedDeps.forEach(dep => {
      if (dep.resolvedSource) {
        nodeSet.add(dep.resolvedSource.id);
        nodeMap.set(dep.resolvedSource.id, {
          id: dep.resolvedSource.id,
          type: dep.resolvedSource.type,
          displayId: dep.resolvedSource.displayId,
          name: dep.resolvedSource.name,
        });
      }
      if (dep.resolvedTarget) {
        nodeSet.add(dep.resolvedTarget.id);
        nodeMap.set(dep.resolvedTarget.id, {
          id: dep.resolvedTarget.id,
          type: dep.resolvedTarget.type,
          displayId: dep.resolvedTarget.displayId,
          name: dep.resolvedTarget.name,
        });
      }
    });

    return {
      nodes: Array.from(nodeMap.values()),
      edges: processedDeps,
    };
  }, [processedDeps]);

  const isLoading = epicsLoading || depsLoading;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <GlobalPageHeader 
        sectionLabel="Dependencies" 
        pageTitle="Maps View"
      />

      <div className="flex-1 p-4 sm:p-6 space-y-4 overflow-auto">
        {/* Filters */}
        <Card className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground" />
            
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Quarter</Label>
              <Select value={quarterFilter} onValueChange={setQuarterFilter}>
                <SelectTrigger className="w-32 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {QUARTER_OPTIONS.map(q => (
                    <SelectItem key={q} value={q}>{q}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Level</Label>
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger className="w-36 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="execution">Execution (Epic)</SelectItem>
                  <SelectItem value="delivery">Delivery (Feature)</SelectItem>
                  <SelectItem value="cross_level">Cross-Level</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="pending_commit">Pending Commit</SelectItem>
                  <SelectItem value="committed">Committed</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="ml-auto text-sm text-muted-foreground">
              {networkData.nodes.length} nodes • {networkData.edges.length} dependencies
            </div>
          </div>
        </Card>

        {/* Network Visualization */}
        {isLoading ? (
          <Card className="p-12 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </Card>
        ) : networkData.edges.length === 0 ? (
          <Card className="p-12 text-center">
            <Network className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No dependencies found for the selected filters.</p>
          </Card>
        ) : (
          <Card className="p-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground mb-4">
                Dependency Network (List View)
              </h3>
              
              {/* Simple list representation of the network */}
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {networkData.edges.map((dep: any) => (
                  <div 
                    key={dep.id}
                    className="flex items-center gap-3 p-3 border rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedDependencyId(dep.id)}
                  >
                    {/* Source */}
                    <div className="flex items-center gap-2 min-w-[200px]">
                      <WorkItemIcon type={dep.resolvedSource?.type || 'epic'} className="h-4 w-4" />
                      <span className="text-xs font-mono text-muted-foreground">
                        {dep.resolvedSource?.displayId}
                      </span>
                      <span className="text-sm truncate max-w-[120px]">
                        {dep.resolvedSource?.name}
                      </span>
                    </div>

                    {/* Arrow */}
                    <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />

                    {/* Target */}
                    <div className="flex items-center gap-2 min-w-[200px]">
                      <WorkItemIcon type={dep.resolvedTarget?.type || 'epic'} className="h-4 w-4" />
                      <span className="text-xs font-mono text-muted-foreground">
                        {dep.resolvedTarget?.displayId}
                      </span>
                      <span className="text-sm truncate max-w-[120px]">
                        {dep.resolvedTarget?.name}
                      </span>
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center gap-2 ml-auto">
                      <Badge variant="outline" className="text-xs">
                        {dep.dependency_level_v2 === 'execution' ? 'Epic' : 
                         dep.dependency_level_v2 === 'delivery' ? 'Feature' : 'Cross-Level'}
                      </Badge>
                      <Badge 
                        variant={dep.status === 'committed' || dep.status === 'delivered' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {DEPENDENCY_STATUS_LABELS[dep.status as keyof typeof DEPENDENCY_STATUS_LABELS]?.replace(' (Legacy)', '') || dep.status}
                      </Badge>
                      {dep.needed_by_date && (
                        <span className="text-xs text-muted-foreground">
                          {dep.needed_by_date}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Dependency Drawer */}
      <DependencyDetailsDrawer
        open={!!selectedDependencyId}
        onClose={() => setSelectedDependencyId(null)}
        dependencyId={selectedDependencyId || undefined}
      />
    </div>
  );
}
