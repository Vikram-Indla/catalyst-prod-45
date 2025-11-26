import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
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
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ArrowUpDown, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EpicSummary {
  id: string;
  externalId: string | null;
  title: string;
  progressPercent: number;
  storyPoints: number;
  estimatedPIEffortPts: number;
  isCapitalized: boolean;
}

interface PortfolioEpicGridProps {
  epics: EpicSummary[];
  onEpicClick?: (epicId: string) => void;
}

type SortField = 'id' | 'progressPercent' | 'storyPoints' | 'estimatedPIEffortPts';
type SortDirection = 'asc' | 'desc';

export function PortfolioEpicGrid({ epics, onEpicClick }: PortfolioEpicGridProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [workItemFilter, setWorkItemFilter] = useState('all');
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Filtered and sorted epics
  const processedEpics = useMemo(() => {
    let filtered = epics;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (epic) =>
          epic.id.toLowerCase().includes(query) ||
          epic.externalId?.toLowerCase().includes(query) ||
          epic.title.toLowerCase().includes(query)
      );
    }

    // Work item type filter (placeholder for now)
    if (workItemFilter !== 'all') {
      // Can filter by capitalized status or other criteria
      filtered = filtered;
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let aVal: number | string = a[sortField];
      let bVal: number | string = b[sortField];

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal as string).toLowerCase();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [epics, searchQuery, workItemFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 -ml-3 px-2 hover:bg-transparent"
      onClick={() => handleSort(field)}
    >
      {children}
      <ArrowUpDown className="ml-1 h-3 w-3" />
    </Button>
  );

  return (
    <div className="bg-card rounded-lg shadow-sm border">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 border-b">
        <Input
          type="text"
          placeholder="Search by ID"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-48 h-9"
        />
        <Select value={workItemFilter} onValueChange={setWorkItemFilter}>
          <SelectTrigger className="w-full sm:w-48 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All work items</SelectItem>
            <SelectItem value="capitalized">Capitalized</SelectItem>
            <SelectItem value="non-capitalized">Non-capitalized</SelectItem>
          </SelectContent>
        </Select>
        <a
          href="#"
          className="text-sm text-primary hover:underline sm:ml-auto inline-flex items-center gap-1"
        >
          <HelpCircle className="h-4 w-4" />
          <span className="hidden sm:inline">Don't see the epic you are looking for?</span>
          <span className="sm:hidden">Need help?</span>
        </a>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">
                <SortButton field="id">ID</SortButton>
              </TableHead>
              <TableHead className="w-24">Ext ID</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="w-40">
                <SortButton field="progressPercent">Progress</SortButton>
              </TableHead>
              <TableHead className="w-32 text-right">
                <SortButton field="storyPoints">Story Points</SortButton>
              </TableHead>
              <TableHead className="w-48 text-right">
                <SortButton field="estimatedPIEffortPts">Estimated PI Effort</SortButton>
              </TableHead>
              <TableHead className="w-32 text-center">Capitalized</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {processedEpics.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No epics found for selected filters
                </TableCell>
              </TableRow>
            ) : (
              processedEpics.map((epic) => (
                <TableRow
                  key={epic.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onEpicClick?.(epic.id)}
                >
                  <TableCell className="font-mono text-sm">{epic.id}</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {epic.externalId || '—'}
                  </TableCell>
                  <TableCell className="font-medium">{epic.title}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={epic.progressPercent} className="h-2 flex-1" />
                      <span className="text-xs text-muted-foreground font-medium w-10 text-right">
                        {epic.progressPercent}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">{epic.storyPoints}</TableCell>
                  <TableCell className="text-right font-medium">
                    {epic.estimatedPIEffortPts} Pts
                  </TableCell>
                  <TableCell className="text-center">
                    {epic.isCapitalized ? (
                      <Badge variant="default" className="text-xs">
                        Yes
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
