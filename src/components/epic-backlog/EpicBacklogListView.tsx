import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { GripVertical, CheckSquare } from 'lucide-react';
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
  process_step_id?: string;
  global_rank: number;
  epic_program_increments?: any[];
}

interface EpicBacklogListViewProps {
  epics: Epic[];
  onEpicSelect: (id: string) => void;
  onRefetch: () => void;
}

export function EpicBacklogListView({ epics, onEpicSelect, onRefetch }: EpicBacklogListViewProps) {
  const [selectedEpics, setSelectedEpics] = useState<Set<string>>(new Set());

  const toggleSelect = (epicId: string) => {
    const newSelected = new Set(selectedEpics);
    if (newSelected.has(epicId)) {
      newSelected.delete(epicId);
    } else {
      newSelected.add(epicId);
    }
    setSelectedEpics(newSelected);
  };

  const getStatusColor = (state: string) => {
    switch (state) {
      case 'not_started': return 'bg-gray-400';
      case 'in_progress': return 'bg-orange-500';
      case 'accepted': return 'bg-blue-600';
      case 'done': return 'bg-blue-900';
      default: return 'bg-gray-400';
    }
  };

  const getProcessStep = (epic: Epic) => {
    if (epic.state === 'done') return 'Done';
    if (epic.state === 'accepted') return 'Reviewing';
    if (epic.state === 'in_progress') return 'Implementi...';
    return 'Portfolio B...';
  };

  // Generate sample label pills based on epic IDs
  const getLabels = (epic: Epic, index: number) => {
    const labels = [];
    if (index % 4 === 0) labels.push({ text: 'Opportuni...', color: 'bg-red-200 text-red-800' });
    if (index % 3 === 0) labels.push({ text: 'Sales O...', color: 'bg-pink-200 text-pink-800' });
    if (index % 2 === 0) labels.push({ text: 'e2e', color: 'bg-rose-200 text-rose-800' });
    labels.push({ text: 'PI7', color: 'bg-lime-400 text-lime-900' });
    if (index % 3 !== 0) labels.push({ text: 'PI6', color: 'bg-gray-400 text-gray-900' });
    labels.push({ text: 'PI5', color: 'bg-yellow-400 text-yellow-900' });
    if (index % 5 === 0) {
      labels.unshift({ text: 'G12', color: 'bg-purple-400 text-purple-900' });
      labels.unshift({ text: 'PI11', color: 'bg-orange-300 text-orange-900' });
    }
    if (index % 4 === 0) labels.unshift({ text: 'Innova', color: 'bg-pink-600 text-white' });
    if (index % 7 === 0) labels.push({ text: 'PI10', color: 'bg-pink-300 text-pink-900' });
    return labels;
  };

  return (
    <div className="overflow-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-b">
            <TableHead className="w-8"></TableHead>
            <TableHead className="w-12">#</TableHead>
            <TableHead className="w-12"></TableHead>
            <TableHead className="w-24">ID</TableHead>
            <TableHead className="w-12"></TableHead>
            <TableHead className="w-12"></TableHead>
            <TableHead className="min-w-[300px]">Epic</TableHead>
            <TableHead className="w-32 text-right">Points</TableHead>
            <TableHead className="w-24">MVP</TableHead>
            <TableHead className="w-40">Process Step</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {epics.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                <div className="text-sm">Drag & Drop Items Here</div>
              </TableCell>
            </TableRow>
          ) : (
            epics.map((epic, index) => {
              const labels = getLabels(epic, index);
              return (
                <EpicContextMenu key={epic.id} epicId={epic.id} onRefetch={onRefetch}>
                  <TableRow
                    className={cn(
                      "cursor-pointer hover:bg-accent/30 transition-colors border-b",
                      selectedEpics.has(epic.id) && "bg-accent/20"
                    )}
                  >
                    {/* Drag Handle */}
                    <TableCell className="p-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                    </TableCell>
                    
                    {/* Row Number */}
                    <TableCell className="text-sm text-muted-foreground">{index + 1}</TableCell>
                    
                    {/* Status Dot */}
                    <TableCell>
                      <div className={cn("w-3 h-3 rounded-full", getStatusColor(epic.state))} />
                    </TableCell>
                    
                    {/* ID */}
                    <TableCell className="font-mono text-sm">
                      {epic.epic_key || (1100 + index)}
                    </TableCell>
                    
                    {/* Checkbox */}
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox 
                        checked={selectedEpics.has(epic.id)}
                        onCheckedChange={() => toggleSelect(epic.id)}
                      />
                    </TableCell>
                    
                    {/* Icon */}
                    <TableCell>
                      <CheckSquare className="h-4 w-4 text-primary" />
                    </TableCell>
                    
                    {/* Epic Name with Labels */}
                    <TableCell onClick={() => onEpicSelect(epic.id)}>
                      <div className="space-y-2">
                        <span className="font-medium text-sm">{epic.name}</span>
                        <div className="flex flex-wrap gap-1">
                          {labels.map((label, i) => (
                            <Badge
                              key={i}
                              className={cn("text-xs px-2 py-0.5 font-medium", label.color)}
                              variant="secondary"
                            >
                              {label.text}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </TableCell>
                    
                    {/* Points */}
                    <TableCell className="text-right text-sm font-medium" onClick={() => onEpicSelect(epic.id)}>
                      {epic.points_estimate || (index % 3 === 0 ? 475 : index % 2 === 0 ? 24 : 480)}
                    </TableCell>
                    
                    {/* MVP */}
                    <TableCell className="text-sm" onClick={() => onEpicSelect(epic.id)}>
                      No
                    </TableCell>
                    
                    {/* Process Step */}
                    <TableCell className="text-sm" onClick={() => onEpicSelect(epic.id)}>
                      {getProcessStep(epic)}
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
