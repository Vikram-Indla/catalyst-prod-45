import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, Download, Plus } from 'lucide-react';
import { useObjectives } from '@/hooks/useObjectives';
import { Skeleton } from '@/components/ui/skeleton';
import { ObjectiveDetailsPanelNew } from '@/components/okr/ObjectiveDetailsPanelNew';
import { ObjectiveDialogNew } from '@/components/forms/ObjectiveDialogNew';

export default function StrategicBacklog() {
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  
  const { data: objectives = [], isLoading } = useObjectives({
    search: searchQuery || undefined,
    tier: tierFilter !== 'all' ? [tierFilter] : undefined,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_track': return 'bg-green-500/20 text-green-700';
      case 'at_risk': return 'bg-yellow-500/20 text-yellow-700';
      case 'off_track': return 'bg-red-500/20 text-red-700';
      case 'completed': return 'bg-blue-500/20 text-blue-700';
      case 'blocked': return 'bg-gray-500/20 text-gray-700';
      default: return 'bg-muted';
    }
  };

  return (
    <div className="h-full flex flex-col" style={{ padding: 'var(--s6)' }}>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-6" style={{ height: 'var(--toolbar-h)' }}>
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
        
        <Select value={tierFilter} onValueChange={setTierFilter}>
          <SelectTrigger className="w-[200px]" style={{ height: 'var(--grid-row)' }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="strategic">Strategic Goals</SelectItem>
            <SelectItem value="portfolio">Portfolio Objectives</SelectItem>
            <SelectItem value="program">Program Objectives</SelectItem>
            <SelectItem value="team">Team Objectives</SelectItem>
          </SelectContent>
        </Select>

        <Button size="sm" onClick={() => setShowNewDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Objective
        </Button>
      </div>

      {/* Objectives Table */}
      <Card>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : objectives.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No objectives found
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50" style={{ height: 'var(--grid-hdr)' }}>
                  <th className="text-left px-4 text-sm font-medium">ID</th>
                  <th className="text-left px-4 text-sm font-medium">Summary</th>
                  <th className="text-left px-4 text-sm font-medium">Tier</th>
                  <th className="text-left px-4 text-sm font-medium">Status</th>
                  <th className="text-left px-4 text-sm font-medium">Score</th>
                  <th className="text-left px-4 text-sm font-medium">Progress</th>
                </tr>
              </thead>
              <tbody>
                {objectives.map((objective) => (
                  <tr 
                    key={objective.id} 
                    className="border-b hover:bg-accent cursor-pointer" 
                    style={{ height: 'var(--grid-row)' }}
                    onClick={() => setSelectedObjectiveId(objective.id)}
                  >
                    <td className="px-4 text-sm font-mono">{objective.id.slice(0, 8)}</td>
                    <td className="px-4 text-sm font-medium">{objective.summary}</td>
                    <td className="px-4 text-sm capitalize">{objective.tier.replace('_', ' ')}</td>
                    <td className="px-4">
                      <Badge className={`text-xs ${getStatusColor(objective.status)}`}>
                        {objective.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-4 text-sm">
                      {objective.score !== null ? objective.score.toFixed(2) : 'N/A'}
                    </td>
                    <td className="px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all"
                            style={{ width: `${Math.round(objective.key_result_progress * 100)}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {Math.round(objective.key_result_progress * 100)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Objective Details Panel */}
      {selectedObjectiveId && (
        <ObjectiveDetailsPanelNew
          objectiveId={selectedObjectiveId}
          open={!!selectedObjectiveId}
          onClose={() => setSelectedObjectiveId(null)}
        />
      )}

      {/* New Objective Dialog */}
      <ObjectiveDialogNew
        open={showNewDialog}
        onClose={() => setShowNewDialog(false)}
      />
    </div>
  );
}
