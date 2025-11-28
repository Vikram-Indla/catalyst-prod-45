import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, Download, Settings2, Eye, EyeOff } from 'lucide-react';
import { useObjectives, type ObjectiveFilters } from '@/hooks/useObjectives';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ObjectiveDetailsPanel } from '@/components/okr/ObjectiveDetailsPanel';

export default function OKRHub() {
  const [filters, setFilters] = useState<ObjectiveFilters>({});
  const [search, setSearch] = useState('');
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string | null>(null);
  const [quickFilters, setQuickFilters] = useState<{
    onTrack: boolean;
    atRisk: boolean;
    offTrack: boolean;
    completed: boolean;
    blockedOnly: boolean;
  }>({
    onTrack: false,
    atRisk: false,
    offTrack: false,
    completed: false,
    blockedOnly: false,
  });
  const [showMyObjectives, setShowMyObjectives] = useState(false);

  // Apply quick filters to main filters
  const activeFilters: ObjectiveFilters = {
    ...filters,
    search,
    myObjectives: showMyObjectives,
    blockedOnly: quickFilters.blockedOnly,
    statuses: [
      ...(quickFilters.onTrack ? ['on_track'] : []),
      ...(quickFilters.atRisk ? ['at_risk'] : []),
      ...(quickFilters.offTrack ? ['off_track'] : []),
      ...(quickFilters.completed ? ['completed'] : []),
    ],
  };

  const { data: objectives = [], isLoading } = useObjectives(activeFilters);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_track':
        return 'bg-green-500/20 text-green-700 dark:text-green-400';
      case 'at_risk':
        return 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400';
      case 'off_track':
        return 'bg-red-500/20 text-red-700 dark:text-red-400';
      case 'completed':
        return 'bg-blue-500/20 text-blue-700 dark:text-blue-400';
      case 'pending':
        return 'bg-gray-500/20 text-gray-700 dark:text-gray-400';
      default:
        return 'bg-gray-500/20 text-gray-700 dark:text-gray-400';
    }
  };

  const getScoreColor = (score?: number) => {
    if (score === null || score === undefined) return 'text-muted-foreground';
    if (score >= 0.7) return 'text-green-600 dark:text-green-400';
    if (score >= 0.4) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const handleExport = () => {
    // TODO(JK): Implement CSV export per Jira Align spec
    console.log('Export objectives to CSV');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">OKR Hub</h1>
          <p className="text-muted-foreground">
            View and manage objectives and key results across your organization
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search objectives or tags..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <Select
              value={filters.tier?.[0] || ''}
              onValueChange={(value) =>
                setFilters({ ...filters, tier: value ? [value] : undefined })
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Tiers</SelectItem>
                <SelectItem value="portfolio">Portfolio</SelectItem>
                <SelectItem value="solution">Solution</SelectItem>
                <SelectItem value="program">Program</SelectItem>
                <SelectItem value="team">Team</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon" onClick={() => setShowMyObjectives(!showMyObjectives)}>
              {showMyObjectives ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>

            <Button variant="outline" size="icon">
              <Settings2 className="h-4 w-4" />
            </Button>

            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2">
        <Badge
          variant={quickFilters.blockedOnly ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() =>
            setQuickFilters({ ...quickFilters, blockedOnly: !quickFilters.blockedOnly })
          }
        >
          Only blocked
        </Badge>
        <Badge
          variant={quickFilters.offTrack ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() =>
            setQuickFilters({ ...quickFilters, offTrack: !quickFilters.offTrack })
          }
        >
          Off track
        </Badge>
        <Badge
          variant={quickFilters.atRisk ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() =>
            setQuickFilters({ ...quickFilters, atRisk: !quickFilters.atRisk })
          }
        >
          At risk
        </Badge>
        <Badge
          variant={quickFilters.onTrack ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() =>
            setQuickFilters({ ...quickFilters, onTrack: !quickFilters.onTrack })
          }
        >
          On track
        </Badge>
        <Badge
          variant={quickFilters.completed ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() =>
            setQuickFilters({ ...quickFilters, completed: !quickFilters.completed })
          }
        >
          Completed
        </Badge>
        <span className="text-sm text-muted-foreground self-center">
          {objectives.length} Objectives
        </span>
      </div>

      {/* Objectives Grid */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID & Summary</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>KR Progress</TableHead>
                <TableHead>Work Progress</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Program Increment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Loading objectives...
                  </TableCell>
                </TableRow>
              ) : objectives.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No objectives found. Create your first objective to get started.
                  </TableCell>
                </TableRow>
              ) : (
                objectives.map((objective) => (
                  <TableRow
                    key={objective.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedObjectiveId(objective.id)}
                  >
                    <TableCell>
                      <div>
                        <div className="font-medium">{objective.summary}</div>
                        <div className="text-sm text-muted-foreground">
                          {objective.id.slice(0, 8)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusColor(objective.status)}>
                        {objective.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={getScoreColor(objective.score)}>
                        {objective.score !== null && objective.score !== undefined
                          ? objective.score.toFixed(2)
                          : 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${objective.key_result_progress * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {Math.round(objective.key_result_progress * 100)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${objective.work_progress * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {Math.round(objective.work_progress * 100)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{objective.tier}</Badge>
                    </TableCell>
                    <TableCell>
                      {objective.program_increment_ids.length > 0 ? (
                        <span className="text-sm">
                          {objective.program_increment_ids.length} PI(s)
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Objective Details Panel */}
      <Sheet open={!!selectedObjectiveId} onOpenChange={() => setSelectedObjectiveId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          {selectedObjectiveId && <ObjectiveDetailsPanel objectiveId={selectedObjectiveId} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}
