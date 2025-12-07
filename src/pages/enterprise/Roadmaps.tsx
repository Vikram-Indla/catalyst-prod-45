import { useState, useMemo, useEffect, useRef } from 'react';
import { Star, Settings, Filter, Upload, Grid3x3, Calendar, List, ZoomIn, ZoomOut, Flag, Check, Settings2, Diamond, Undo, Redo, RefreshCw, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PISelectorPanel } from '@/components/roadmaps/PISelectorPanel';
import { SyncModal } from '@/components/roadmaps/SyncModal';
import { useRoadmapStore } from '@/stores/roadmapStore';
import { addDays } from 'date-fns';
import type { 
  RoadmapItem, 
  ProgramIncrement, 
  Sprint, 
  Milestone, 
  ItemMilestone,
  GroupByMode, 
  TimelineView,
  DragType,
  WorkItemState
} from '@/types/roadmap.types';
import { BAR_COLORS } from '@/types/roadmap.types';

type ViewMode = TimelineView;

const MONTH_WIDTH = 100;
const DAY_WIDTH = MONTH_WIDTH / 30;
const SPRINT_WIDTH = 50;

// Empty data - no mock/seed data
const programIncrements: ProgramIncrement[] = [];
const seedData: RoadmapItem[] = [];

function getStateFill(state: string): number {
  switch (state) {
    case 'not_started':
      return 1;
    case 'in_progress':
      return 3;
    case 'accepted':
      return 6;
    default:
      return 0;
  }
}

function getBarColor(state: string): string {
  switch (state) {
    case 'not_started':
      return 'hsl(var(--bar-not-started))';
    case 'in_progress':
      return 'hsl(var(--bar-in-progress))';
    case 'accepted':
      return 'hsl(var(--bar-accepted))';
    case 'blocked':
      return 'hsl(var(--bar-blocked))';
    default:
      return 'hsl(var(--bar-future))';
  }
}

function getBarPosition(startDate: string, timelineStart: Date): number {
  const start = new Date(startDate);
  const diffDays = Math.floor((start.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays * DAY_WIDTH;
}

function getBarWidth(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(diffDays * DAY_WIDTH, 50);
}

export default function Roadmaps() {
  const [items, setItems] = useState<RoadmapItem[]>(seedData);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [hoveredMilestone, setHoveredMilestone] = useState<ItemMilestone | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [groupBy, setGroupBy] = useState<GroupByMode>('epics');
  const [showMilestones, setShowMilestones] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  
  // Roadmap store
  const {
    pendingChanges,
    addPendingChange,
    dragState,
    setDragState,
    resetDragState,
    undo,
    redo,
    canUndo,
    canRedo,
    openSyncModal,
  } = useRoadmapStore();

  const timelineStart = new Date('2024-08-01');
  const timelineEnd = new Date('2025-04-30');
  
  const timelineRef = useRef<HTMLDivElement>(null);

  const allSprints = useMemo(() => {
    return programIncrements.flatMap(pi => 
      (pi.sprints || []).map(sprint => ({
        ...sprint,
        piId: pi.id,
        piName: pi.name,
      }))
    );
  }, [programIncrements]);

  const getBarPositionSprint = (startDate: string): number => {
    const start = new Date(startDate);
    const sprintIndex = allSprints.findIndex(s => 
      new Date(s.startDate) <= start && new Date(s.endDate) >= start
    );
    
    if (sprintIndex === -1) return 0;
    
    const sprint = allSprints[sprintIndex];
    const sprintStart = new Date(sprint.startDate);
    const daysIntoSprint = Math.floor((start.getTime() - sprintStart.getTime()) / (1000 * 60 * 60 * 24));
    const sprintDuration = 14;
    const offset = (daysIntoSprint / sprintDuration) * SPRINT_WIDTH;
    
    return (sprintIndex * SPRINT_WIDTH) + offset;
  };

  const getBarWidthSprint = (startDate: string, endDate: string): number => {
    const startIndex = allSprints.findIndex(s => 
      new Date(s.startDate) <= new Date(startDate) && 
      new Date(s.endDate) >= new Date(startDate)
    );
    const endIndex = allSprints.findIndex(s => 
      new Date(s.startDate) <= new Date(endDate) && 
      new Date(s.endDate) >= new Date(endDate)
    );
    
    if (startIndex === -1 || endIndex === -1) return 100;
    
    const sprintCount = endIndex - startIndex + 1;
    return Math.max(sprintCount * SPRINT_WIDTH, 50);
  };

  const months = useMemo(() => {
    const result = [];
    let current = new Date(timelineStart);
    while (current <= timelineEnd) {
      result.push({
        name: current.toLocaleDateString('en-US', { month: 'short' }),
        date: new Date(current),
      });
      current.setMonth(current.getMonth() + 1);
    }
    return result;
  }, []);

  const quarters = useMemo(() => {
    const q4_2024 = { name: 'Q4 2024', months: months.filter(m => m.date >= new Date('2024-08-01') && m.date < new Date('2025-01-01')) };
    const q1_2025 = { name: 'Q1 2025', months: months.filter(m => m.date >= new Date('2025-01-01') && m.date < new Date('2025-04-01')) };
    const q2_2025 = { name: 'Q2 2025', months: months.filter(m => m.date >= new Date('2025-04-01')) };
    return [q4_2024, q1_2025, q2_2025].filter(q => q.months.length > 0);
  }, [months]);

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const handleBarHover = (item: RoadmapItem, e: React.MouseEvent) => {
    setHoveredItem(item.id);
    setTooltipPos({ x: e.clientX, y: e.clientY });
  };

  // Drag handlers
  const handleDragStart = (e: React.MouseEvent, item: RoadmapItem, type: 'move' | 'resize-left' | 'resize-right') => {
    e.stopPropagation();
    setDragState({
      isDragging: true,
      dragType: type,
      itemId: item.id,
      originalStart: new Date(item.startDate),
      originalEnd: new Date(item.dueDate),
      currentStart: new Date(item.startDate),
      currentEnd: new Date(item.dueDate),
      startX: e.clientX,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState.isDragging || !dragState.itemId || !dragState.originalStart || !dragState.originalEnd) return;

      const deltaX = e.clientX - dragState.startX;
      const pixelsPerDay = viewMode === 'calendar' ? (DAY_WIDTH * zoomLevel) : (SPRINT_WIDTH / 14 * zoomLevel);
      const deltaDays = Math.round(deltaX / pixelsPerDay);

      if (dragState.dragType === 'move') {
        const newStart = addDays(dragState.originalStart, deltaDays);
        const newEnd = addDays(dragState.originalEnd, deltaDays);
        setDragState({ currentStart: newStart, currentEnd: newEnd });
      } else if (dragState.dragType === 'resize-left') {
        const newStart = addDays(dragState.originalStart, deltaDays);
        if (newStart < dragState.currentEnd!) {
          setDragState({ currentStart: newStart });
        }
      } else if (dragState.dragType === 'resize-right') {
        const newEnd = addDays(dragState.originalEnd, deltaDays);
        if (newEnd > dragState.currentStart!) {
          setDragState({ currentEnd: newEnd });
        }
      }
    };

    const handleMouseUp = () => {
      if (!dragState.isDragging || !dragState.itemId) return;

      const hasChanged =
        dragState.currentStart?.getTime() !== dragState.originalStart?.getTime() ||
        dragState.currentEnd?.getTime() !== dragState.originalEnd?.getTime();

      if (hasChanged && dragState.currentStart && dragState.currentEnd && dragState.originalStart && dragState.originalEnd) {
        const item = items.find(i => i.id === dragState.itemId);
        if (item) {
          let changeType: 'start_date' | 'due_date' | 'both' = 'both';
          if (dragState.currentStart.getTime() !== dragState.originalStart.getTime() &&
              dragState.currentEnd.getTime() === dragState.originalEnd.getTime()) {
            changeType = 'start_date';
          } else if (dragState.currentStart.getTime() === dragState.originalStart.getTime() &&
                     dragState.currentEnd.getTime() !== dragState.originalEnd.getTime()) {
            changeType = 'due_date';
          }

          addPendingChange({
            itemId: item.id,
            itemTitle: item.title,
            changeType,
            originalStart: dragState.originalStart,
            originalEnd: dragState.originalEnd,
            newStart: dragState.currentStart,
            newEnd: dragState.currentEnd,
          });

          // Update local item
          setItems(prev =>
            prev.map(i =>
              i.id === item.id
                ? { ...i, startDate: dragState.currentStart!.toISOString(), dueDate: dragState.currentEnd!.toISOString() }
                : i
            )
          );
        }
      }

      resetDragState();
    };

    if (dragState.isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragState, viewMode, zoomLevel, items, setDragState, resetDragState, addPendingChange, setItems]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.includes('Mac');
      const cmdKey = isMac ? e.metaKey : e.ctrlKey;

      if (cmdKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo()) undo();
      } else if (cmdKey && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        if (canRedo()) redo();
      } else if (cmdKey && e.key === 's') {
        e.preventDefault();
        if (pendingChanges.length > 0) {
          openSyncModal();
        }
      } else if (e.key === 'Escape') {
        if (dragState.isDragging) {
          resetDragState();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, undo, redo, pendingChanges, openSyncModal, dragState, resetDragState]);

  // Check if item has pending changes
  const hasChanges = (itemId: string) => {
    return pendingChanges.some(c => c.itemId === itemId);
  };

  // Get current dates for item (including pending changes)
  const getCurrentDates = (item: RoadmapItem) => {
    if (dragState.isDragging && dragState.itemId === item.id && dragState.currentStart && dragState.currentEnd) {
      return {
        startDate: dragState.currentStart.toISOString(),
        dueDate: dragState.currentEnd.toISOString(),
      };
    }
    return { startDate: item.startDate, dueDate: item.dueDate };
  };

  return (
    <div className="flex h-full w-full bg-background overflow-hidden">
      {/* PI Selector Panel */}
      <PISelectorPanel />
      
      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        {/* Header - fixed height 72px to align with sidebar */}
        <div className="h-[72px] flex items-center justify-between gap-[var(--s3)] px-[var(--s3)] sm:px-[var(--s6)] border-b border-border shrink-0">
          <div className="flex items-center gap-[var(--s2)] min-w-0">
            <Star className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <h1 className="text-lg sm:text-xl font-semibold text-foreground truncate">Live Roadmap</h1>
          </div>
          <div className="flex flex-wrap items-center gap-[var(--s2)] sm:gap-[var(--s4)]">
            <Button variant="ghost" size="sm" className="gap-2">
              <Settings className="w-4 h-4" />
              View Configuration
            </Button>
            <Button variant="ghost" size="sm" className="gap-2">
              <Filter className="w-4 h-4" />
              Filter
            </Button>
            <Button variant="default" size="sm" className="gap-2">
              <Upload className="w-4 h-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-[var(--s2)] sm:gap-[var(--s3)] px-[var(--s3)] sm:px-[var(--s6)] py-[var(--s2)] sm:py-[var(--s3)] border-b border-border overflow-x-auto">
          {/* Undo/Redo */}
          <div className="flex border border-border rounded overflow-hidden flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="w-9 h-9 rounded-none"
              onClick={undo}
              disabled={!canUndo()}
              title="Undo (Ctrl+Z)"
            >
              <Undo className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="w-9 h-9 rounded-none border-l border-border"
              onClick={redo}
              disabled={!canRedo()}
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo className="w-4 h-4" />
            </Button>
          </div>
          
          <Select value="work">
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="work">Work</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={groupBy} onValueChange={(value) => setGroupBy(value as GroupByMode)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Feature by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="themes">Themes</SelectItem>
              <SelectItem value="epics">Epics</SelectItem>
              <SelectItem value="features">Features</SelectItem>
              <div className="h-px bg-border my-1" />
              <SelectItem value="epic_by_theme">Epic by Theme</SelectItem>
              <SelectItem value="feature_by_epic">Feature by Epic</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value="program">
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="program">Program R...</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex border border-border rounded-md overflow-hidden">
            <Button 
              variant="ghost" 
              size="icon" 
              className={`w-9 h-9 rounded-none ${viewMode === 'calendar' ? 'bg-primary/10 text-primary' : ''}`}
              onClick={() => setViewMode('calendar')}
            >
              <Calendar className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className={`w-9 h-9 rounded-none border-l border-border ${viewMode === 'sprint' ? 'bg-primary/10 text-primary' : ''}`}
              onClick={() => setViewMode('sprint')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-[var(--s2)] ml-auto">
            {/* Pending Changes Indicator */}
            {pendingChanges.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[hsl(var(--modified-dot))]/10 border border-[hsl(var(--modified-dot))] rounded text-[hsl(var(--modified-dot))] text-sm">
                <span className="font-semibold">{pendingChanges.length} changes</span>
                <Button
                  size="sm"
                  onClick={openSyncModal}
                  className="h-7 gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Sync
                </Button>
              </div>
            )}
            
            <button
              onClick={() => setShowMilestones(!showMilestones)}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded hover:bg-muted/50 transition-colors ${
                showMilestones ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Diamond className="w-4 h-4" />
              Milestones and objectives
            </button>
            <span className="text-sm text-muted-foreground">{items.length} items loaded</span>
          </div>
        </div>

      {/* Zoom Controls */}
      <div className="flex items-center gap-[var(--s3)] px-[var(--s6)] py-[var(--s3)] bg-muted/30 border-b border-border">
        <Button
          variant="outline"
          size="icon"
          className="w-8 h-8"
          onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.25))}
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <input
          type="range"
          min="0.5"
          max="2"
          step="0.25"
          value={zoomLevel}
          onChange={(e) => setZoomLevel(Number(e.target.value))}
          className="flex-1"
        />
        <Button
          variant="outline"
          size="icon"
          className="w-8 h-8"
          onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.25))}
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        <span className="text-xs text-muted-foreground min-w-[60px] text-right">{Math.round(zoomLevel * 100)}%</span>
      </div>

      {/* Gantt Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel */}
        <div className="flex-shrink-0 w-80 border-r border-border overflow-y-auto">
          {/* Headers */}
          <div className="grid grid-cols-[40px_70px_80px_110px] h-16 bg-muted items-center border-b border-border sticky top-0 z-10">
            <div></div>
            <div className="text-xs font-medium text-center text-muted-foreground">Items</div>
            <div className="text-xs font-medium text-center text-muted-foreground">Story Points</div>
            <div className="text-xs font-medium text-center text-muted-foreground">State</div>
          </div>
          
          {/* Rows */}
          {items.map(item => (
            <div key={item.id} className="grid grid-cols-[40px_70px_80px_110px] h-10 border-b border-border/50 items-center hover:bg-muted/30">
              <div className="flex items-center justify-center">
                {item.children && item.children.length > 0 && (
                  <button onClick={() => toggleExpand(item.id)} className="w-6 h-6 flex items-center justify-center">
                    <span className="text-muted-foreground">{expandedItems.has(item.id) ? '▼' : '▶'}</span>
                  </button>
                )}
              </div>
              <div className="text-sm text-center text-foreground">{item.items}</div>
              <div className="text-sm text-center text-foreground">{item.storyPoints}</div>
              <div className="flex items-center justify-center px-2">
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                  item.state === 'not_started' ? 'bg-primary/10 text-primary' :
                  item.state === 'in_progress' ? 'bg-primary/10 text-primary' :
                  'bg-success/10 text-success'
                }`}>
                  <span>{item.state === 'not_started' ? 'NOT STARTED' : item.state === 'in_progress' ? 'IN PROGRESS' : 'ACCEPTED'}</span>
                  <div className="flex gap-px">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className={`w-1 h-2 ${i < getStateFill(item.state) ? 'opacity-100' : 'opacity-30'}`} style={{ backgroundColor: 'currentColor' }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Timeline Panel */}
        <div className="flex-1 overflow-x-auto overflow-y-auto">
          <div style={{ minWidth: viewMode === 'calendar' ? months.length * MONTH_WIDTH * zoomLevel : allSprints.length * SPRINT_WIDTH * zoomLevel }}>
            {viewMode === 'calendar' ? (
              <>
                {/* Quarter Headers */}
                <div className="flex h-7 bg-muted border-b border-border sticky top-0 z-10">
                  {quarters.map(q => (
                    <div key={q.name} className="flex items-center justify-center text-xs font-semibold border-r border-border" style={{ width: q.months.length * MONTH_WIDTH * zoomLevel }}>
                      {q.name}
                    </div>
                  ))}
                </div>

                {/* Month Headers */}
                <div className="flex h-6 bg-muted border-b border-border sticky top-7 z-10">
                  {months.map(month => (
                    <div key={month.name + month.date.toISOString()} className="flex items-center justify-center text-[11px] text-muted-foreground border-r border-border/50" style={{ width: MONTH_WIDTH * zoomLevel }}>
                      {month.name}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                {/* PI Headers */}
                <div className="flex h-7 bg-muted border-b border-border sticky top-0 z-10">
                  {programIncrements.map(pi => (
                    <div key={pi.id} className="flex items-center justify-center text-xs font-semibold bg-muted/80 border-r-2 border-border" style={{ width: (pi.sprints || []).length * SPRINT_WIDTH * zoomLevel }}>
                      {pi.name}
                    </div>
                  ))}
                </div>

                {/* Sprint Headers */}
                <div className="flex h-6 bg-muted border-b border-border sticky top-7 z-10">
                  {allSprints.map((sprint, idx) => {
                    const isLastInPI = idx === allSprints.length - 1 || 
                                       allSprints[idx + 1]?.piId !== sprint.piId;
                    return (
                      <div 
                        key={sprint.id} 
                        className={`flex items-center justify-center text-[11px] text-muted-foreground ${isLastInPI ? 'border-r-2 border-border' : 'border-r border-border/50'}`}
                        style={{ width: SPRINT_WIDTH * zoomLevel }}
                      >
                        {sprint.name}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Milestones Row */}
            {showMilestones && (
              <div className="relative h-5 bg-muted border-b border-border sticky top-[52px] z-10">
                {items.flatMap(item => 
                  item.milestones?.map(milestone => {
                    const left = viewMode === 'calendar'
                      ? getBarPosition(milestone.date, timelineStart) * zoomLevel
                      : getBarPositionSprint(milestone.date) * zoomLevel;
                    return (
                      <div 
                        key={milestone.id} 
                        className="absolute cursor-pointer" 
                        style={{ left, top: '50%', transform: 'translate(-50%, -50%)' }}
                        onMouseEnter={(e) => {
                          setHoveredMilestone(milestone);
                          setTooltipPos({ x: e.clientX, y: e.clientY });
                        }}
                        onMouseLeave={() => setHoveredMilestone(null)}
                      >
                        <div className="w-3 h-3 rounded-full bg-[hsl(var(--milestone-color))] border-2 border-background" />
                      </div>
                    );
                  }) || []
                )}
              </div>
            )}

            {/* Gantt Rows */}
            {items.map(item => {
              const currentDates = getCurrentDates(item);
              const left = viewMode === 'calendar' 
                ? getBarPosition(currentDates.startDate, timelineStart) * zoomLevel
                : getBarPositionSprint(currentDates.startDate) * zoomLevel;
              const width = viewMode === 'calendar'
                ? getBarWidth(currentDates.startDate, currentDates.dueDate) * zoomLevel
                : getBarWidthSprint(currentDates.startDate, currentDates.dueDate) * zoomLevel;
              
              const isModified = hasChanges(item.id);
              const isDraggingThis = dragState.isDragging && dragState.itemId === item.id;
              
              return (
                <div key={item.id} className="relative h-10 border-b border-border/50">
                  <div
                    className={`absolute top-1 h-8 rounded flex items-center px-2 text-xs font-medium text-white transition-shadow hover:z-10 gap-2 ${
                      isDraggingThis ? 'opacity-80 shadow-2xl cursor-grabbing' : 'cursor-grab hover:shadow-lg'
                    }`}
                    style={{
                      left,
                      width,
                      backgroundColor: getBarColor(item.state),
                    }}
                    onMouseDown={(e) => handleDragStart(e, item, 'move')}
                    onMouseEnter={(e) => !dragState.isDragging && handleBarHover(item, e)}
                    onMouseLeave={() => !dragState.isDragging && setHoveredItem(null)}
                  >
                    {/* Modified indicator */}
                    {isModified && (
                      <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-[hsl(var(--modified-dot))] rounded-full" />
                    )}
                    
                    {/* Left resize handle */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 group"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        handleDragStart(e, item, 'resize-left');
                      }}
                    >
                      <div className="absolute left-0.5 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-white/60 rounded group-hover:bg-white/80" />
                    </div>
                    
                    <span className="font-semibold">{item.numericId}</span>
                    <span className="mx-0.5">-</span>
                    <span className="truncate flex-1">{item.title}</span>
                    
                    {/* Milestones on bar */}
                    {showMilestones && item.milestones && item.milestones.length > 0 && width > 200 && (
                      <div className="flex gap-0.5">
                        {item.milestones.slice(0, 4).map(m => (
                          <span key={m.id} className={m.completed ? 'text-[hsl(var(--milestone-star))]' : 'text-[hsl(var(--milestone-star))]/40'}>
                            ★
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {/* Status pill */}
                    {item.status && width > 250 && (
                      <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        item.status === 'on_track' ? 'bg-[hsl(var(--pill-on-track-bg))]' :
                        item.status === 'at_risk' ? 'bg-[hsl(var(--pill-at-risk-bg))]' :
                        'bg-[hsl(var(--pill-off-track-bg))]'
                      }`}>
                        {item.status === 'on_track' ? 'On Track' : item.status === 'at_risk' ? 'At Risk' : 'Off Track'}
                      </div>
                    )}
                    
                    {/* Progress */}
                    {item.progress != null && width > 300 && (
                      <span className="text-[11px] font-semibold opacity-90">{item.progress}%</span>
                    )}
                    
                    {/* Dependency icons */}
                    {item.hasDependencies && width > 150 && (
                      <div className="flex gap-1">
                        {item.dependenciesResolved ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <Flag className="w-3 h-3 text-destructive/70" />
                        )}
                      </div>
                    )}
                    
                    {/* Right resize handle */}
                    <div
                      className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 group"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        handleDragStart(e, item, 'resize-right');
                      }}
                    >
                      <div className="absolute right-0.5 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-white/60 rounded group-hover:bg-white/80" />
                    </div>
                    
                    {/* End gear icon */}
                    <Settings2 className="w-4 h-4 absolute -right-6 top-1/2 -translate-y-1/2 opacity-0 hover:opacity-100 transition-opacity pointer-events-none" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      </div>

      {/* Tooltips */}
      {hoveredItem && (
        <div
          className="fixed z-50 px-4 py-3 text-xs text-white rounded shadow-lg pointer-events-none bg-foreground"
          style={{ left: tooltipPos.x + 10, top: tooltipPos.y + 10 }}
        >
          <div className="mb-2 text-sm font-semibold">{items.find(i => i.id === hoveredItem)?.title}</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <span className="opacity-70">Start date:</span>
            <span>{new Date(items.find(i => i.id === hoveredItem)?.startDate || '').toLocaleDateString('en-US')}</span>
            <span className="opacity-70">Due date:</span>
            <span>{new Date(items.find(i => i.id === hoveredItem)?.dueDate || '').toLocaleDateString('en-US')}</span>
          </div>
        </div>
      )}
      
      {hoveredMilestone && (
        <div
          className="fixed z-50 px-3 py-2 text-xs text-white rounded shadow-lg pointer-events-none bg-foreground"
          style={{ left: tooltipPos.x + 10, top: tooltipPos.y + 10 }}
        >
          <div className="font-semibold mb-1">{hoveredMilestone.name}</div>
          <div className="opacity-70">{new Date(hoveredMilestone.date).toLocaleDateString('en-US')}</div>
          <div className={`text-[10px] mt-1 ${hoveredMilestone.completed ? 'text-success' : 'text-warning'}`}>
            {hoveredMilestone.completed ? '✓ Completed' : 'Pending'}
          </div>
        </div>
      )}
      
      {/* Sync Modal */}
      <SyncModal />
    </div>
  );
}
