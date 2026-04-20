/**
 * Module 5C-3: Custom Dashboard Builder
 * Build and configure custom analytics dashboards
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lozenge } from '@/components/ads';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  LayoutGrid,
  Plus,
  Trash2,
  GripVertical,
  Settings2,
  Copy,
  Save,
  Eye,
  Hash,
  TrendingUp,
  PieChart,
  BarChart3,
  Table,
  Grid3x3,
  Gauge,
  GitCompare,
} from 'lucide-react';
import {
  useCustomDashboards,
  useCustomDashboard,
  useCreateDashboard,
  useUpdateDashboard,
  useDeleteDashboard,
  useAddWidget,
  useRemoveWidget,
  useDashboardTemplates,
  DEFAULT_TEMPLATES,
} from '../hooks/useCustomDashboard';
import type { CustomDashboard, DashboardWidget, WidgetType, DashboardTemplate } from '../types/analytics';
import { AVAILABLE_WIDGETS, WIDGET_SIZE_CONFIG } from '../types/analytics';

interface DashboardBuilderProps {
  releaseId?: string;
  onDashboardSelect?: (dashboardId: string) => void;
}

const WIDGET_ICONS: Record<WidgetType, React.ReactNode> = {
  metric_card: <Hash className="h-4 w-4" />,
  trend_chart: <TrendingUp className="h-4 w-4" />,
  pie_chart: <PieChart className="h-4 w-4" />,
  bar_chart: <BarChart3 className="h-4 w-4" />,
  table: <Table className="h-4 w-4" />,
  heatmap: <Grid3x3 className="h-4 w-4" />,
  gauge: <Gauge className="h-4 w-4" />,
  comparison: <GitCompare className="h-4 w-4" />,
};

export function DashboardBuilder({ releaseId, onDashboardSelect }: DashboardBuilderProps) {
  const [selectedDashboardId, setSelectedDashboardId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isAddWidgetOpen, setIsAddWidgetOpen] = useState(false);
  const [newDashboardName, setNewDashboardName] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  const { data: dashboards, isLoading } = useCustomDashboards(releaseId);
  const { data: currentDashboard } = useCustomDashboard(selectedDashboardId);
  const { data: templates } = useDashboardTemplates();
  
  const createDashboard = useCreateDashboard();
  const deleteDashboard = useDeleteDashboard();
  const addWidget = useAddWidget();
  const removeWidget = useRemoveWidget();

  const handleCreateDashboard = async () => {
    if (!newDashboardName.trim()) return;

    const result = await createDashboard.mutateAsync({
      name: newDashboardName,
      releaseId,
      templateId: selectedTemplateId || undefined,
    });

    setSelectedDashboardId(result.id);
    setIsCreateDialogOpen(false);
    setNewDashboardName('');
    setSelectedTemplateId('');
  };

  const handleDeleteDashboard = async (id: string) => {
    await deleteDashboard.mutateAsync(id);
    if (selectedDashboardId === id) {
      setSelectedDashboardId(null);
    }
  };

  const handleAddWidget = async (type: WidgetType) => {
    if (!selectedDashboardId) return;

    const widgetConfig = AVAILABLE_WIDGETS.find(w => w.type === type);
    await addWidget.mutateAsync({
      dashboardId: selectedDashboardId,
      type,
      title: widgetConfig?.label || 'New Widget',
      dataSource: { metric: 'executionRate' },
      size: widgetConfig?.defaultSize || 'md',
    });
    setIsAddWidgetOpen(false);
  };

  const handleRemoveWidget = async (widgetId: string) => {
    if (!selectedDashboardId) return;
    await removeWidget.mutateAsync({ dashboardId: selectedDashboardId, widgetId });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <LayoutGrid className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Dashboard Builder</h2>
            <p className="text-sm text-muted-foreground">
              Create custom dashboards with drag-and-drop widgets
            </p>
          </div>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Dashboard
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Dashboard</DialogTitle>
              <DialogDescription>
                Start from scratch or use a template.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Dashboard Name</Label>
                <Input
                  id="name"
                  value={newDashboardName}
                  onChange={(e) => setNewDashboardName(e.target.value)}
                  placeholder="My Custom Dashboard"
                />
              </div>
              <div className="space-y-2">
                <Label>Template (Optional)</Label>
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Start from scratch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Start from scratch</SelectItem>
                    {DEFAULT_TEMPLATES.map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedTemplateId && (
                  <p className="text-xs text-muted-foreground">
                    {DEFAULT_TEMPLATES.find(t => t.id === selectedTemplateId)?.description}
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateDashboard} disabled={!newDashboardName.trim()}>
                Create Dashboard
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Dashboard List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">My Dashboards</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              <div className="p-4 space-y-2">
                {isLoading ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : dashboards?.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No dashboards yet.</p>
                ) : (
                  dashboards?.map((dashboard) => (
                    <div
                      key={dashboard.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedDashboardId === dashboard.id
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => setSelectedDashboardId(dashboard.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-sm">{dashboard.name}</div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDashboard(dashboard.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {dashboard.widgets.length} widgets
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Dashboard Canvas */}
        <div className="lg:col-span-3 space-y-4">
          {!selectedDashboardId ? (
            <Card>
              <CardContent className="py-16 text-center">
                <LayoutGrid className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Select a dashboard or create a new one to start building.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Dashboard Toolbar */}
              <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                <div className="font-medium">{currentDashboard?.name}</div>
                <div className="flex items-center gap-2">
                  <Dialog open={isAddWidgetOpen} onOpenChange={setIsAddWidgetOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-1" />
                        Add Widget
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Add Widget</DialogTitle>
                        <DialogDescription>
                          Choose a widget type to add to your dashboard.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 py-4">
                        {AVAILABLE_WIDGETS.map((widget) => (
                          <button
                            key={widget.type}
                            onClick={() => handleAddWidget(widget.type)}
                            className="flex flex-col items-center gap-2 p-4 rounded-lg border hover:border-primary hover:bg-primary/5 transition-colors"
                          >
                            <div className="p-3 rounded-full bg-muted">
                              {WIDGET_ICONS[widget.type]}
                            </div>
                            <div className="text-sm font-medium">{widget.label}</div>
                            <div className="text-xs text-muted-foreground text-center">
                              {widget.description}
                            </div>
                          </button>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button size="sm" variant="outline">
                    <Eye className="h-4 w-4 mr-1" />
                    Preview
                  </Button>
                  <Button size="sm" variant="outline">
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                </div>
              </div>

              {/* Widget Grid */}
              {currentDashboard?.widgets.length === 0 ? (
                <Card>
                  <CardContent className="py-16 text-center">
                    <p className="text-muted-foreground">
                      No widgets yet. Click "Add Widget" to get started.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-4 gap-4">
                  {currentDashboard?.widgets.map((widget) => (
                    <WidgetPreview
                      key={widget.id}
                      widget={widget}
                      onRemove={() => handleRemoveWidget(widget.id)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Templates Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dashboard Templates</CardTitle>
          <CardDescription>
            Quick-start with pre-built dashboard configurations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {DEFAULT_TEMPLATES.map((template) => (
              <div
                key={template.id}
                className="p-4 rounded-lg border hover:border-primary transition-colors cursor-pointer"
                onClick={() => {
                  setSelectedTemplateId(template.id);
                  setNewDashboardName(`${template.name} Copy`);
                  setIsCreateDialogOpen(true);
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Lozenge appearance="default">{template.category}</Lozenge>
                </div>
                <div className="font-medium">{template.name}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {template.description}
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  {template.widgets.length} widgets
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Widget Preview Component
// ─────────────────────────────────────────────────────────────────────────────

interface WidgetPreviewProps {
  widget: DashboardWidget;
  onRemove: () => void;
}

function WidgetPreview({ widget, onRemove }: WidgetPreviewProps) {
  const sizeConfig = WIDGET_SIZE_CONFIG[widget.size];

  return (
    <Card
      className="relative group"
      style={{
        gridColumn: `span ${sizeConfig.cols}`,
        gridRow: `span ${sizeConfig.rows}`,
      }}
    >
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <Settings2 className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onRemove}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="text-muted-foreground">
            {WIDGET_ICONS[widget.type]}
          </div>
          <CardTitle className="text-sm">{widget.title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-24 flex items-center justify-center text-muted-foreground text-sm bg-muted/30 rounded-lg">
          {widget.type.replace('_', ' ')} preview
        </div>
      </CardContent>
    </Card>
  );
}
