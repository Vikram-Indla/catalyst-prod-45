import { useState } from 'react';
import { useBusinessLines, useProductStatusConfigs } from '@/hooks/useProductSettings';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GripVertical, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IntakeViewsPanelProps {
  onChanges?: () => void;
}

// Default list view columns
const DEFAULT_LIST_COLUMNS = [
  { key: 'request_key', name: 'MIM ID', is_visible: true, is_default_sort: true, sort_direction: 'desc' },
  { key: 'title', name: 'Summary', is_visible: true },
  { key: 'process_step', name: 'Status', is_visible: true },
  { key: 'delivery_platform', name: 'Platform', is_visible: true },
  { key: 'department', name: 'Department', is_visible: true },
  { key: 'business_owner', name: 'Business Owner', is_visible: true },
  { key: 'planned_quarter', name: 'Quarter', is_visible: true },
  { key: 'business_score', name: 'Score', is_visible: true },
  { key: 'created_at', name: 'Created', is_visible: false },
  { key: 'updated_at', name: 'Updated', is_visible: false },
];

export function IntakeViewsPanel({ onChanges }: IntakeViewsPanelProps) {
  const { data: businessLines = [], isLoading: linesLoading } = useBusinessLines();
  const { data: statuses = [], isLoading: statusesLoading } = useProductStatusConfigs();
  const [selectedScope, setSelectedScope] = useState<string>('global');
  const [columns, setColumns] = useState(DEFAULT_LIST_COLUMNS);

  const handleColumnToggle = (columnKey: string) => {
    setColumns(columns.map(col =>
      col.key === columnKey ? { ...col, is_visible: !col.is_visible } : col
    ));
    onChanges();
  };

  const isLoading = linesLoading || statusesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Group statuses by category for Kanban
  const kanbanColumns = [
    { id: 'todo', name: 'To Do', statuses: statuses.filter(s => s.category === 'todo') },
    { id: 'inprogress', name: 'In Progress', statuses: statuses.filter(s => s.category === 'inprogress') },
    { id: 'done', name: 'Done', statuses: statuses.filter(s => s.category === 'done') },
    { id: 'other', name: 'Other', statuses: statuses.filter(s => s.category === 'other') },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b">
        <div>
          <h2 className="text-lg font-semibold">Intake Views & Kanban</h2>
          <p className="text-sm text-muted-foreground">
            Configure list view columns and Kanban board settings.
          </p>
        </div>
      </div>

      {/* Scope Selector */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium">Configuration Scope:</span>
        <Select value={selectedScope} onValueChange={setSelectedScope}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="global">Global (All Business Lines)</SelectItem>
            {businessLines.map(line => (
              <SelectItem key={line.id} value={line.id}>
                {line.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList>
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="kanban">Kanban Board</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4 space-y-4">
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted/30 px-4 py-3 border-b">
              <h3 className="font-medium">Visible Columns</h3>
              <p className="text-xs text-muted-foreground">
                Drag to reorder, toggle to show/hide columns
              </p>
            </div>
            <div className="divide-y">
              {columns.map((column) => (
                <div
                  key={column.key}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-muted/20"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-sm">{column.name}</span>
                    {column.is_default_sort && (
                      <Badge variant="secondary" className="text-xs">
                        Default Sort ({column.sort_direction?.toUpperCase()})
                      </Badge>
                    )}
                  </div>
                  <Switch
                    checked={column.is_visible}
                    onCheckedChange={() => handleColumnToggle(column.key)}
                  />
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="kanban" className="mt-4 space-y-4">
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted/30 px-4 py-3 border-b">
              <h3 className="font-medium">Kanban Columns</h3>
              <p className="text-xs text-muted-foreground">
                Kanban columns are mapped to status categories
              </p>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-4 gap-4">
                {kanbanColumns.map((column) => (
                  <div key={column.id} className="border rounded-lg p-4 bg-muted/20">
                    <h4 className="font-medium text-sm mb-3">{column.name}</h4>
                    <div className="space-y-2">
                      {column.statuses.length > 0 ? (
                        column.statuses.map((status) => (
                          <div
                            key={status.id}
                            className="text-xs bg-card border rounded px-2 py-1"
                          >
                            {status.name}
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground italic">
                          No statuses mapped
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-muted/50 border-l-4 border-brand-gold p-4 rounded-r-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> To modify which statuses appear in each Kanban column, 
              update the status categories in the Workflow & Statuses panel.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
