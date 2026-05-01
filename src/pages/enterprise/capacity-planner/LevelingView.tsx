import { useState } from 'react';
import { Cloud, Play, Clock, Check, FileStack } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { ResourceMetric, AiRecommendation } from './types';
import { departmentColors } from './types';

export interface LevelingViewProps {
  resources: ResourceMetric[];
  recommendations: AiRecommendation[];
}

export function LevelingView({ resources, recommendations }: LevelingViewProps) {
  const [selectedResource, setSelectedResource] = useState<ResourceMetric | null>(resources[0] || null);
  const [releaseVersion, setReleaseVersion] = useState('');
  const [allocationFilter, setAllocationFilter] = useState('under80');
  const [selectedWorkItems, setSelectedWorkItems] = useState<{ id: string; allocation: number }[]>([]);

  // Mock work items for demonstration
  const workItems = [
    { id: '1', itemId: 'SEN-1003', title: 'Create chart component library', project: 'Senaei BAU', epic: 'Real-time Dashboard Analytics', allocation: 30 },
    { id: '2', itemId: 'SEN-1004', title: 'Implement WebSocket real-time sync', project: 'Senaei BAU', epic: 'Real-time Dashboard Analytics', allocation: 30 },
    { id: '3', itemId: 'SEN-1005', title: 'Dashboard layout responsive design', project: 'Senaei BAU', epic: 'Real-time Dashboard Analytics', allocation: 25 },
  ];

  const handleWorkItemToggle = (workItemId: string, defaultAllocation: number) => {
    setSelectedWorkItems(prev => {
      const exists = prev.find(w => w.id === workItemId);
      if (exists) {
        return prev.filter(w => w.id !== workItemId);
      }
      return [...prev, { id: workItemId, allocation: defaultAllocation }];
    });
  };

  const handleAllocationChange = (workItemId: string, allocation: number) => {
    setSelectedWorkItems(prev =>
      prev.map(w => w.id === workItemId ? { ...w, allocation } : w)
    );
  };

  const isSelected = (workItemId: string) => selectedWorkItems.some(w => w.id === workItemId);
  const getAllocation = (workItemId: string, defaultVal: number) =>
    selectedWorkItems.find(w => w.id === workItemId)?.allocation || defaultVal;

  const totalPendingAllocation = selectedWorkItems.reduce((sum, w) => sum + w.allocation, 0);
  const availableCapacity = selectedResource ? 100 - selectedResource.allocation : 0;

  const handleSkip = () => {
    const currentIdx = resources.findIndex(r => r.id === selectedResource?.id);
    if (currentIdx < resources.length - 1) {
      setSelectedResource(resources[currentIdx + 1]);
      setSelectedWorkItems([]);
    }
  };

  const handleAssign = () => {
    if (selectedWorkItems.length > 0) {
      toast.success(`Assigned ${selectedWorkItems.length} items to ${selectedResource?.name}`);
      handleSkip();
    }
  };

  return (
    <div className="space-y-5">
      {/* AI Banner - Blue Gradient */}
      <div
        className="flex items-center gap-4 p-5 rounded-xl text-primary-foreground bg-gradient-to-r from-primary via-primary/90 to-primary/70"
      >
        <div className="w-12 h-12 rounded-xl bg-primary-foreground/20 flex items-center justify-center shrink-0">
          <Cloud className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold mb-0.5">AI Resource Leveling</h3>
          <p className="text-sm opacity-90">
            <strong>{resources.length} resources</strong> have available capacity this period. Start the wizard to optimally assign them to open work items.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="gap-2 bg-primary-foreground text-primary hover:bg-primary-foreground/90 font-semibold"
        >
          <Play className="h-4 w-4" />
          Start Wizard
        </Button>
      </div>

      {/* Filters Row */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground font-medium">Release Version:</span>
          <Select value={releaseVersion} onValueChange={setReleaseVersion}>
            <SelectTrigger className="w-52 h-10 bg-card">
              <SelectValue placeholder="Select Release..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="r2025.1">Release 2025.1 - Q1</SelectItem>
              <SelectItem value="r2025.2">Release 2025.2 - Q2</SelectItem>
              <SelectItem value="r2025.3">Release 2025.3 - Q3</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Select value={allocationFilter} onValueChange={setAllocationFilter}>
          <SelectTrigger className="w-52 h-10 bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="under80">Under-allocated (&lt;80%)</SelectItem>
            <SelectItem value="available">Available (&lt;50%)</SelectItem>
            <SelectItem value="all">All Resources</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-[340px_1fr] gap-5 min-h-[520px]">
        {/* Left Panel - Resources List */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Resources to Level</h3>
            <span className="text-xs text-muted-foreground">{resources.length} remaining</span>
          </div>
          <div className="max-h-[470px] overflow-y-auto">
            {resources.map((resource) => {
              const dept = resource.department || 'Unassigned';
              const deptColor = departmentColors[dept] || departmentColors.default;
              const initials = resource.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'NA';
              const freeCapacity = 100 - resource.allocation;
              const isCurrentSelected = selectedResource?.id === resource.id;

              return (
                <button
                  key={resource.id}
                  onClick={() => { setSelectedResource(resource); setSelectedWorkItems([]); }}
                  className={cn(
                    'w-full flex items-center gap-3 px-5 py-4 text-left transition-colors relative',
                    isCurrentSelected
                      ? 'bg-[#f5f5f4]'
                      : 'hover:bg-muted/30'
                  )}
                >
                  {/* Selection indicator */}
                  {isCurrentSelected && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--ds-text-brand, #2563eb)] rounded-r" />
                  )}
                  <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold shrink-0', deptColor.bg, deptColor.text)}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{resource.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{resource.role}</p>
                  </div>
                  <span className={cn(
                    'text-xs font-semibold',
                    freeCapacity >= 40 ? 'text-[#0d9488]' :
                    freeCapacity >= 20 ? 'text-[var(--ds-text-warning, #d97706)]' : 'text-[var(--ds-text-danger, #dc2626)]'
                  )}>
                    {freeCapacity}% free
                  </span>
                </button>
              );
            })}
            {resources.length === 0 && (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No resources match the current filter
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Work Items */}
        <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
          {selectedResource ? (
            <>
              {/* Resource Header */}
              <div className="px-6 py-5 border-b border-border flex items-center gap-4">
                <div className={cn(
                  'w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold',
                  departmentColors[selectedResource.department || 'Unassigned']?.bg || departmentColors.default.bg,
                  departmentColors[selectedResource.department || 'Unassigned']?.text || departmentColors.default.text
                )}>
                  {selectedResource.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-lg font-semibold text-foreground">{selectedResource.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedResource.role} · {selectedResource.department || 'Unassigned'}</p>
                </div>
                <div className="flex gap-6 text-center">
                  <div>
                    <p className="text-2xl font-bold text-[var(--ds-text-warning, #d97706)]">{selectedResource.allocation}%</p>
                    <p className="text-xs text-muted-foreground">Current</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#0d9488]">{availableCapacity}%</p>
                    <p className="text-xs text-muted-foreground">Available</p>
                  </div>
                </div>
              </div>

              {/* Work Items Header */}
              <div className="px-6 py-4 border-b border-border">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-foreground">
                    Available Work Items <span className="font-normal text-muted-foreground">({workItems.length} items)</span>
                  </h4>
                </div>
                <div className="flex gap-2">
                  <Select defaultValue="all">
                    <SelectTrigger className="w-36 h-9 text-sm">
                      <SelectValue placeholder="All Projects" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Projects</SelectItem>
                      <SelectItem value="senaei">Senaei BAU</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-28 h-9 text-sm">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="feature">Feature</SelectItem>
                      <SelectItem value="story">Story</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Work Items List */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <div className="space-y-3">
                  {workItems.map((item) => {
                    const selected = isSelected(item.id);
                    const allocation = getAllocation(item.id, item.allocation);

                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-4 p-4 border border-border rounded-lg hover:bg-muted/20 transition-colors"
                      >
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => handleWorkItemToggle(item.id, item.allocation)}
                          className="w-5 h-5 rounded border-border text-[var(--ds-text-brand, #2563eb)] focus:ring-[var(--ds-text-brand, #2563eb)]"
                        />

                        {/* Icon */}
                        <div className="w-10 h-10 rounded-lg bg-[#d4b896]/20 flex items-center justify-center shrink-0">
                          <FileStack className="h-5 w-5 text-[#8b7355]" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-[var(--ds-text-brand, #2563eb)]">{item.itemId}</p>
                          <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{item.project} · {item.epic}</p>
                        </div>

                        {/* Allocation Input */}
                        <div className="flex flex-col items-center gap-0.5">
                          <Input
                            type="number"
                            min={5}
                            max={100}
                            step={5}
                            value={allocation}
                            onChange={(e) => handleAllocationChange(item.id, parseInt(e.target.value) || 0)}
                            disabled={!selected}
                            className={cn(
                              "w-16 h-9 text-center text-sm font-medium",
                              !selected && "bg-muted text-muted-foreground"
                            )}
                          />
                          <span className="text-[10px] text-muted-foreground">% alloc</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
                <Button variant="outline" onClick={handleSkip}>
                  Skip
                </Button>
                <Button
                  onClick={handleAssign}
                  disabled={selectedWorkItems.length === 0}
                  className="bg-[var(--ds-text-brand, #2563eb)] hover:bg-[var(--ds-background-brand-bold-hovered, #1d4ed8)] gap-2"
                >
                  {selectedWorkItems.length > 0 ? (
                    <>
                      <Check className="h-4 w-4" />
                      Assign {selectedWorkItems.length} items
                    </>
                  ) : (
                    'Select items to assign'
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-muted-foreground gap-4">
              <Clock className="h-12 w-12 opacity-50" />
              <p className="text-sm">Select a resource from the queue to begin assignment</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
