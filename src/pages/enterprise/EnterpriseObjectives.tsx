import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, Filter, Download, GitBranch } from 'lucide-react';
import { useObjectives } from '@/hooks/useObjectives';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ObjectiveStatusBadge } from '@/modules/objectives/components/shared/ObjectiveStatusBadge';
import { ObjectiveScoreBadge } from '@/modules/objectives/components/shared/ObjectiveScoreBadge';
import { ObjectiveTierBadge } from '@/modules/objectives/components/shared/ObjectiveTierBadge';
import { ProgressBar } from '@/modules/objectives/components/shared/ProgressBar';
import { CreateObjectiveDialog } from '@/modules/objectives/components/ObjectivePanel';
import { ObjectiveDetailsPanelNew } from '@/components/okr/ObjectiveDetailsPanelNew';
import { ObjectiveHierarchyDialog } from '@/modules/objectives/components/ObjectiveHierarchyDialog';
import { Skeleton } from '@/components/ui/skeleton';
import type { ObjectiveTier, ObjectiveStatus } from '@/modules/objectives/types/objective.types';

export default function EnterpriseObjectives() {
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<ObjectiveTier | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<ObjectiveStatus | 'all'>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string | null>(null);
  const [hierarchyObjectiveId, setHierarchyObjectiveId] = useState<string | null>(null);

  const filters: any = {};
  if (tierFilter !== 'all') filters.tier = [tierFilter];
  if (statusFilter !== 'all') filters.statuses = [statusFilter];
  if (searchQuery) filters.search = searchQuery;

  const { data: objectives = [], isLoading } = useObjectives(filters);

  const handleExport = () => {
    // TODO: Implement CSV export
    console.log('Export objectives');
  };

  return (
    <div className="h-full flex flex-col px-[var(--s6)] py-[var(--s6)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-[var(--s4)] mb-[var(--s6)]">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Enterprise Objectives</h1>
          <p className="text-sm text-muted-foreground">
            Strategic objectives and key results across Portfolio and Program tiers
          </p>
        </div>
        <div className="flex items-center gap-[var(--s3)]">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Objective
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <Card className="mb-[var(--s4)]">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-[var(--s3)] px-[var(--s4)] py-[var(--s4)]">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search objectives..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ height: 'var(--grid-row)' }}
            />
          </div>

          {/* Tier Filter - Only Portfolio and Program */}
          <Select value={tierFilter} onValueChange={(v) => setTierFilter(v as any)}>
            <SelectTrigger className="w-[140px]" style={{ height: 'var(--grid-row)' }}>
              <SelectValue placeholder="All Tiers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tiers</SelectItem>
              <SelectItem value="portfolio">Portfolio</SelectItem>
              <SelectItem value="program">Program</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger className="w-[140px]" style={{ height: 'var(--grid-row)' }}>
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="on_track">On Track</SelectItem>
              <SelectItem value="at_risk">At Risk</SelectItem>
              <SelectItem value="off_track">Off Track</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" style={{ height: 'var(--grid-row)', width: 'var(--grid-row)' }}>
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {/* Objectives Table */}
      <Card className="flex-1 overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="px-[var(--s4)] py-[var(--s4)] space-y-[var(--s3)]">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} style={{ height: 'var(--grid-row)' }} className="w-full" />
              ))}
            </div>
          ) : objectives.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground mb-4">No objectives found</p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Objective
              </Button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ height: 'var(--grid-hdr)' }}>
                  <th className="text-left px-[var(--s4)] text-sm font-medium text-muted-foreground">ID</th>
                  <th className="text-left px-[var(--s4)] text-sm font-medium text-muted-foreground">Summary</th>
                  <th className="text-left px-[var(--s4)] text-sm font-medium text-muted-foreground">Tier</th>
                  <th className="text-left px-[var(--s4)] text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-[var(--s4)] text-sm font-medium text-muted-foreground">Score</th>
                  <th className="text-left px-[var(--s4)] text-sm font-medium text-muted-foreground">KR Progress</th>
                  <th className="text-left px-[var(--s4)] text-sm font-medium text-muted-foreground">Work Progress</th>
                  <th className="text-left px-[var(--s4)] text-sm font-medium text-muted-foreground">View Tree</th>
                </tr>
              </thead>
              <tbody>
                {objectives.map((objective) => (
                  <tr
                    key={objective.id}
                    className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                    style={{ height: 'var(--grid-row)' }}
                    onClick={() => setSelectedObjectiveId(objective.id)}
                  >
                    <td className="px-[var(--s4)] text-sm text-muted-foreground font-mono">
                      {objective.id.slice(0, 8)}
                    </td>
                    <td className="px-[var(--s4)] text-sm font-medium">
                      {objective.summary || objective.name}
                    </td>
                    <td className="px-[var(--s4)]">
                      <ObjectiveTierBadge tier={objective.tier} size="sm" />
                    </td>
                    <td className="px-[var(--s4)]">
                      <ObjectiveStatusBadge status={objective.status} size="sm" />
                    </td>
                    <td className="px-[var(--s4)]">
                      <ObjectiveScoreBadge score={objective.score ?? null} size="sm" />
                    </td>
                    <td className="px-[var(--s4)]">
                      <div className="w-32">
                        <ProgressBar
                          progress={objective.key_result_progress * 100}
                          score={objective.score ?? null}
                          height="sm"
                        />
                      </div>
                    </td>
                    <td className="px-[var(--s4)]">
                      <div className="w-32">
                        <ProgressBar
                          progress={objective.work_progress * 100}
                          score={objective.score ?? null}
                          height="sm"
                        />
                      </div>
                    </td>
                    <td className="px-[var(--s4)]">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setHierarchyObjectiveId(objective.id);
                        }}
                      >
                        <GitBranch className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Create Dialog */}
      <CreateObjectiveDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        tier="portfolio"
      />

      {/* Details Panel */}
      {selectedObjectiveId && (
        <ObjectiveDetailsPanelNew
          objectiveId={selectedObjectiveId}
          open={!!selectedObjectiveId}
          onClose={() => setSelectedObjectiveId(null)}
        />
      )}

      {/* Hierarchy Dialog */}
      {hierarchyObjectiveId && (
        <ObjectiveHierarchyDialog
          objectiveId={hierarchyObjectiveId}
          open={!!hierarchyObjectiveId}
          onOpenChange={(open) => !open && setHierarchyObjectiveId(null)}
        />
      )}
    </div>
  );
}
