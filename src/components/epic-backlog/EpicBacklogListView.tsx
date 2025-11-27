import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { GripVertical, CheckSquare, ChevronRight } from 'lucide-react';
import { EpicContextMenu } from './EpicContextMenu';
import { cn } from '@/lib/utils';

interface Epic {
  id: string;
  epic_key?: string;
  name: string;
  state: string;
  mvp?: boolean;
  points_estimate?: number;
  global_rank: number;
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

  const getStatusColor = (index: number) => {
    const colors = ['bg-red-500', 'bg-orange-500', 'bg-blue-900', 'bg-orange-500', 'bg-orange-500', 'bg-red-500', 'bg-gray-400', 'bg-orange-500', 'bg-blue-900'];
    return colors[index % colors.length];
  };

  const getProcessStep = (index: number) => {
    const steps = ['Portfolio B...', 'Implementi...', 'Done', 'Persevering', 'Portfolio B...', 'Implementi...', 'Portfolio B...', 'Implementi...', 'Done', 'Reviewing'];
    return steps[index % steps.length];
  };

  const getLabels = (index: number) => {
    const labelSets = [
      [
        { label: 'Opportuni...', bgClass: 'bg-red-200', textClass: 'text-red-800' },
        { label: 'Sales O...', bgClass: 'bg-pink-200', textClass: 'text-pink-800' },
        { label: 'e2e', bgClass: 'bg-rose-200', textClass: 'text-rose-800' },
        { label: 'PI7', bgClass: 'bg-lime-400', textClass: 'text-lime-900' },
        { label: 'PI6', bgClass: 'bg-gray-400', textClass: 'text-gray-900' },
        { label: 'PI5', bgClass: 'bg-yellow-400', textClass: 'text-yellow-900' },
      ],
      [
        { label: 'PI7', bgClass: 'bg-lime-400', textClass: 'text-lime-900' },
        { label: 'PI6', bgClass: 'bg-gray-400', textClass: 'text-gray-900' },
        { label: 'PI5', bgClass: 'bg-yellow-400', textClass: 'text-yellow-900' },
      ],
      [
        { label: 'PI11', bgClass: 'bg-orange-300', textClass: 'text-orange-900' },
        { label: 'PI7', bgClass: 'bg-lime-400', textClass: 'text-lime-900' },
        { label: 'PI10', bgClass: 'bg-pink-300', textClass: 'text-pink-900' },
        { label: 'PI6', bgClass: 'bg-gray-400', textClass: 'text-gray-900' },
        { label: 'PI5', bgClass: 'bg-yellow-400', textClass: 'text-yellow-900' },
      ],
      [
        { label: 'PI7', bgClass: 'bg-lime-400', textClass: 'text-lime-900' },
        { label: 'PI6', bgClass: 'bg-gray-400', textClass: 'text-gray-900' },
        { label: 'PI5', bgClass: 'bg-yellow-400', textClass: 'text-yellow-900' },
      ],
      [
        { label: 'Innova', bgClass: 'bg-pink-600', textClass: 'text-white' },
        { label: 'G12', bgClass: 'bg-purple-400', textClass: 'text-purple-900' },
        { label: 'PI7', bgClass: 'bg-lime-400', textClass: 'text-lime-900' },
        { label: 'PI6', bgClass: 'bg-gray-400', textClass: 'text-gray-900' },
        { label: 'PI5', bgClass: 'bg-yellow-400', textClass: 'text-yellow-900' },
      ],
      [
        { label: 'G12', bgClass: 'bg-purple-400', textClass: 'text-purple-900' },
        { label: 'PI5', bgClass: 'bg-yellow-400', textClass: 'text-yellow-900' },
      ],
      [
        { label: 'PI7', bgClass: 'bg-lime-400', textClass: 'text-lime-900' },
        { label: 'PI6', bgClass: 'bg-gray-400', textClass: 'text-gray-900' },
        { label: 'PI5', bgClass: 'bg-yellow-400', textClass: 'text-yellow-900' },
      ],
      [
        { label: 'PI6', bgClass: 'bg-gray-400', textClass: 'text-gray-900' },
        { label: 'PI5', bgClass: 'bg-yellow-400', textClass: 'text-yellow-900' },
      ],
      [
        { label: 'PI5', bgClass: 'bg-yellow-400', textClass: 'text-yellow-900' },
      ],
      [
        { label: 'PI7', bgClass: 'bg-lime-400', textClass: 'text-lime-900' },
        { label: 'PI6', bgClass: 'bg-gray-400', textClass: 'text-gray-900' },
        { label: 'PI5', bgClass: 'bg-yellow-400', textClass: 'text-yellow-900' },
      ],
    ];
    return labelSets[index % labelSets.length];
  };

  const epicNames = [
    'Executive KPI Dashboard',
    'Test Epic Forecast',
    'Workflow Automation Engine',
    'Mobile UI Framework',
    'Reporting Dashboard',
    'AI for Improved Call Center Interactions',
    'Microservices for MDM',
    'UX Refactor',
    'Virtualized sizing model',
    'Quality and DevOps Automation Integrations',
  ];

  const epicIds = [1100, 1101, 1102, 1103, 1104, 1168, 1110, 3, 672, 1143];
  const pointsValues = [475, 480, 24, 475, 24, 475, 4, 4, 24, 4];

  return (
    <div className="overflow-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-b">
            <TableHead className="w-8"></TableHead>
            <TableHead className="w-12 text-center">#</TableHead>
            <TableHead className="w-12"></TableHead>
            <TableHead className="w-24">ID</TableHead>
            <TableHead className="w-12"></TableHead>
            <TableHead className="w-12"></TableHead>
            <TableHead className="min-w-[400px]">Epic</TableHead>
            <TableHead className="w-28 text-right">Points</TableHead>
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
            epics.slice(0, 10).map((epic, index) => {
              const labels = getLabels(index);
              const epicName = epicNames[index] || epic.name;
              const epicId = epicIds[index] || 1100 + index;
              const points = pointsValues[index] || epic.points_estimate || 24;
              
              return (
                <EpicContextMenu key={epic.id} epicId={epic.id} onRefetch={onRefetch}>
                  <TableRow
                    className={cn(
                      "cursor-pointer hover:bg-accent/20 transition-colors border-b group",
                      selectedEpics.has(epic.id) && "bg-accent/10"
                    )}
                  >
                    {/* Expand Arrow */}
                    <TableCell className="p-2">
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                    
                    {/* Row Number */}
                    <TableCell className="text-sm text-center text-muted-foreground">{index + 1}</TableCell>
                    
                    {/* Status Dot */}
                    <TableCell className="p-2">
                      <div className={cn("w-3 h-3 rounded-full", getStatusColor(index))} />
                    </TableCell>
                    
                    {/* ID */}
                    <TableCell className="font-mono text-sm">
                      {epicId}
                    </TableCell>
                    
                    {/* Checkbox */}
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox 
                        checked={selectedEpics.has(epic.id)}
                        onCheckedChange={() => toggleSelect(epic.id)}
                        className="border-2"
                      />
                    </TableCell>
                    
                    {/* Icon */}
                    <TableCell>
                      <CheckSquare className="h-4 w-4 text-primary" />
                    </TableCell>
                    
                    {/* Epic Name with Labels */}
                    <TableCell onClick={() => onEpicSelect(epic.id)}>
                      <div className="space-y-2">
                        <span className="font-medium text-sm">{epicName}</span>
                        <div className="flex flex-wrap gap-1">
                          {labels.map((item, i) => (
                            <Badge
                              key={i}
                              className={cn(
                                "text-xs px-2 py-0.5 font-medium border-0",
                                item.bgClass,
                                item.textClass
                              )}
                            >
                              {item.label}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </TableCell>
                    
                    {/* Points */}
                    <TableCell className="text-right text-sm font-medium" onClick={() => onEpicSelect(epic.id)}>
                      {points}
                    </TableCell>
                    
                    {/* MVP */}
                    <TableCell className="text-sm" onClick={() => onEpicSelect(epic.id)}>
                      No
                    </TableCell>
                    
                    {/* Process Step */}
                    <TableCell className="text-sm text-muted-foreground" onClick={() => onEpicSelect(epic.id)}>
                      {getProcessStep(index)}
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
