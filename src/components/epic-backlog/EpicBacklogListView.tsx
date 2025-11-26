import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';
import { EpicContextMenu } from './EpicContextMenu';
import { cn } from '@/lib/utils';

interface Epic {
  id: string;
  epic_key?: string;
  name: string;
  state: string;
  owner_id?: string;
  mvp?: boolean;
  points_estimate?: number;
  estimate?: number;
  global_rank: number;
  parked_at?: string;
  strategic_themes?: { name: string };
  programs?: { name: string };
}

interface EpicBacklogListViewProps {
  epics: Epic[];
  onEpicSelect: (id: string) => void;
  onRefetch: () => void;
  selectedProgram?: string;
  selectedPI?: string;
  labelsDisplay?: 'program' | 'parent';
}

type SortField = 'id' | 'name' | 'progress' | 'points' | 'effort';
type SortDirection = 'asc' | 'desc' | null;

export function EpicBacklogListView({ 
  epics, 
  onEpicSelect, 
  onRefetch, 
  selectedProgram, 
  selectedPI, 
  labelsDisplay = 'program' 
}: EpicBacklogListViewProps) {
  const [selectedEpics, setSelectedEpics] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Calculate progress for each epic (mock - in real implementation would come from backend)
  const getEpicProgress = (epic: Epic) => {
    // Mock progress calculation based on epic state
    switch (epic.state) {
      case 'not_started': return 0;
      case 'in_progress': return 45;
      case 'accepted': return 100;
      default: return 0;
    }
  };

  // Handle column sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortField(null);
        setSortDirection(null);
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sort epics based on current sort state
  const sortedEpics = [...epics].sort((a, b) => {
    if (!sortField || !sortDirection) return 0;
    
    const direction = sortDirection === 'asc' ? 1 : -1;
    
    switch (sortField) {
      case 'id':
        return direction * ((a.epic_key || '').localeCompare(b.epic_key || ''));
      case 'name':
        return direction * a.name.localeCompare(b.name);
      case 'progress':
        return direction * (getEpicProgress(a) - getEpicProgress(b));
      case 'points':
        return direction * ((a.points_estimate || 0) - (b.points_estimate || 0));
      case 'effort':
        return direction * ((a.estimate || 0) - (b.estimate || 0));
      default:
        return 0;
    }
  });

  // Handle select all
  const toggleSelectAll = () => {
    if (selectedEpics.size === epics.length) {
      setSelectedEpics(new Set());
    } else {
      setSelectedEpics(new Set(epics.map(e => e.id)));
    }
  };

  // Handle individual selection
  const toggleSelect = (epicId: string) => {
    const newSelected = new Set(selectedEpics);
    if (newSelected.has(epicId)) {
      newSelected.delete(epicId);
    } else {
      newSelected.add(epicId);
    }
    setSelectedEpics(newSelected);
  };

  // Get state badge
  const getStateBadge = (state: string) => {
    const stateMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' }> = {
      not_started: { label: 'Not Started', variant: 'secondary' },
      in_progress: { label: 'In Progress', variant: 'default' },
      accepted: { label: 'Accepted', variant: 'success' },
    };
    const config = stateMap[state] || { label: state, variant: 'secondary' };
    return <Badge variant={config.variant as any} className="text-xs">{config.label}</Badge>;
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-30" />;
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-3 w-3 ml-1" />
    ) : (
      <ChevronDown className="h-3 w-3 ml-1" />
    );
  };

  return (
    <div className="flex-1 overflow-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-12">
              <Checkbox 
                checked={selectedEpics.size === epics.length && epics.length > 0}
                onCheckedChange={toggleSelectAll}
              />
            </TableHead>
            <TableHead 
              className="cursor-pointer select-none w-24"
              onClick={() => handleSort('id')}
            >
              <div className="flex items-center">
                Id
                <SortIcon field="id" />
              </div>
            </TableHead>
            <TableHead className="w-32">External Id</TableHead>
            <TableHead 
              className="cursor-pointer select-none"
              onClick={() => handleSort('name')}
            >
              <div className="flex items-center">
                Title
                <SortIcon field="name" />
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer select-none w-48"
              onClick={() => handleSort('progress')}
            >
              <div className="flex items-center">
                Progress
                <SortIcon field="progress" />
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer select-none w-32"
              onClick={() => handleSort('points')}
            >
              <div className="flex items-center">
                Story Points
                <SortIcon field="points" />
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer select-none w-32"
              onClick={() => handleSort('effort')}
            >
              <div className="flex items-center">
                Estimated Effort
                <SortIcon field="effort" />
              </div>
            </TableHead>
            <TableHead className="w-32">Capitalized</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedEpics.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                No epics found. Add an epic to get started.
              </TableCell>
            </TableRow>
          ) : (
            sortedEpics.map((epic) => {
              const progress = getEpicProgress(epic);
              return (
                <EpicContextMenu key={epic.id} epicId={epic.id} onRefetch={onRefetch}>
                  <TableRow
                    className={cn(
                      "cursor-pointer transition-colors",
                      "hover:bg-accent/50",
                      selectedEpics.has(epic.id) && "bg-muted/30"
                    )}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox 
                        checked={selectedEpics.has(epic.id)}
                        onCheckedChange={() => toggleSelect(epic.id)}
                      />
                    </TableCell>
                    <TableCell 
                      className="font-mono text-sm"
                      onClick={() => onEpicSelect(epic.id)}
                    >
                      {epic.epic_key || epic.id.slice(0, 8)}
                    </TableCell>
                    <TableCell 
                      className="text-sm text-muted-foreground"
                      onClick={() => onEpicSelect(epic.id)}
                    >
                      {epic.epic_key ? `EXT-${epic.id.slice(0, 6)}` : '-'}
                    </TableCell>
                    <TableCell onClick={() => onEpicSelect(epic.id)}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{epic.name}</span>
                        {epic.mvp && <Badge variant="secondary" className="text-xs">MVP</Badge>}
                      </div>
                    </TableCell>
                    <TableCell onClick={() => onEpicSelect(epic.id)}>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{progress}%</span>
                          {getStateBadge(epic.state)}
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    </TableCell>
                    <TableCell 
                      className="text-sm"
                      onClick={() => onEpicSelect(epic.id)}
                    >
                      {epic.points_estimate || 0}
                    </TableCell>
                    <TableCell 
                      className="text-sm"
                      onClick={() => onEpicSelect(epic.id)}
                    >
                      {epic.estimate || 0}
                    </TableCell>
                    <TableCell 
                      className="text-sm"
                      onClick={() => onEpicSelect(epic.id)}
                    >
                      <Badge variant="outline" className="text-xs">
                        {epic.estimate && epic.estimate > 50 ? 'Yes' : 'No'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                </EpicContextMenu>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
