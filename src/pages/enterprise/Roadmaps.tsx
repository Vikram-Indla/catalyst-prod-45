import { useState, useMemo } from 'react';
import { Star, Settings, Filter, Upload, Grid3x3, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RoadmapItem {
  id: string;
  numericId: number;
  title: string;
  type: 'theme' | 'epic' | 'feature' | 'capability';
  state: 'not_started' | 'in_progress' | 'accepted' | 'blocked';
  startDate: string;
  dueDate: string;
  items: number;
  storyPoints: number;
  progress?: number;
  children?: RoadmapItem[];
}

const MONTH_WIDTH = 100;
const DAY_WIDTH = MONTH_WIDTH / 30;

const seedData: RoadmapItem[] = [
  {
    id: 'e-271',
    numericId: 271,
    title: 'Platform - New Report Framework',
    type: 'epic',
    state: 'not_started',
    startDate: '2024-08-15',
    dueDate: '2025-04-01',
    items: 0,
    storyPoints: 0,
  },
  {
    id: 'e-413',
    numericId: 413,
    title: 'FSRM_Time Off In Lieu (TOIL)',
    type: 'epic',
    state: 'not_started',
    startDate: '2024-08-20',
    dueDate: '2024-10-15',
    items: 0,
    storyPoints: 0,
  },
  {
    id: 'e-672',
    numericId: 672,
    title: 'Virtualized sizing model',
    type: 'epic',
    state: 'in_progress',
    startDate: '2024-08-01',
    dueDate: '2025-03-01',
    items: 34,
    storyPoints: 380,
    progress: 45,
  },
  {
    id: 'e-1080',
    numericId: 1080,
    title: 'Smart Support Bot Web & Mobile',
    type: 'epic',
    state: 'in_progress',
    startDate: '2024-08-10',
    dueDate: '2024-11-15',
    items: 4,
    storyPoints: 55,
    progress: 60,
  },
  {
    id: 'e-1178',
    numericId: 1178,
    title: 'Retirement planning UX update',
    type: 'epic',
    state: 'not_started',
    startDate: '2024-10-01',
    dueDate: '2025-03-30',
    items: 1,
    storyPoints: 44,
  },
  {
    id: 'e-1184',
    numericId: 1184,
    title: 'Advanced Voice Activation for Trades',
    type: 'epic',
    state: 'accepted',
    startDate: '2024-08-01',
    dueDate: '2024-10-30',
    items: 2,
    storyPoints: 16,
  },
  {
    id: 'e-3',
    numericId: 3,
    title: 'UX Refactor',
    type: 'epic',
    state: 'accepted',
    startDate: '2024-09-01',
    dueDate: '2025-04-15',
    items: 21,
    storyPoints: 366,
  },
  {
    id: 'e-1111',
    numericId: 1111,
    title: 'Interface: E2E transcription flow (with PPFW) and flow tracking / alarming',
    type: 'epic',
    state: 'not_started',
    startDate: '2024-10-15',
    dueDate: '2025-04-01',
    items: 5,
    storyPoints: 128,
  },
  {
    id: 'e-1141',
    numericId: 1141,
    title: 'Hadoop CSI AC5',
    type: 'epic',
    state: 'in_progress',
    startDate: '2024-11-01',
    dueDate: '2025-03-15',
    items: 4,
    storyPoints: 96,
  },
  {
    id: 'e-1168',
    numericId: 1168,
    title: 'AI for Improved Call Center Interactions',
    type: 'epic',
    state: 'in_progress',
    startDate: '2024-08-01',
    dueDate: '2024-12-01',
    items: 12,
    storyPoints: 67,
    progress: 82,
  },
  {
    id: 'e-499',
    numericId: 499,
    title: 'Release Management',
    type: 'epic',
    state: 'accepted',
    startDate: '2024-09-15',
    dueDate: '2024-12-20',
    items: 1,
    storyPoints: 14,
  },
];

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
  const [items] = useState<RoadmapItem[]>(seedData);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const timelineStart = new Date('2024-08-01');
  const timelineEnd = new Date('2025-04-30');

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

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold text-foreground">Live Roadmap</h1>
        </div>
        <div className="flex items-center gap-4">
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
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border">
        <select className="h-9 px-3 text-sm border rounded-md border-border">
          <option>Work</option>
        </select>
        <select className="h-9 px-3 text-sm border rounded-md border-border">
          <option>Feature by...</option>
        </select>
        <select className="h-9 px-3 text-sm border rounded-md border-border">
          <option>Program R...</option>
        </select>
        <div className="flex gap-1">
          <Button variant="outline" size="icon" className="w-9 h-9">
            <Grid3x3 className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" className="w-9 h-9">
            <Calendar className="w-4 h-4" />
          </Button>
        </div>
        <span className="ml-auto text-sm text-muted-foreground">{items.length} items loaded</span>
      </div>

      {/* Timeline Slider */}
      <div className="px-6 py-3 bg-muted/30">
        <div className="relative h-2 rounded-full bg-border">
          <div className="absolute top-0 left-0 h-full rounded-full w-1/3 bg-muted-foreground" />
          <div className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground top-1/2 left-1/3" />
        </div>
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
                  item.state === 'not_started' ? 'bg-blue-50 text-blue-700' :
                  item.state === 'in_progress' ? 'bg-blue-50 text-blue-700' :
                  'bg-green-50 text-green-700'
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
          <div style={{ minWidth: months.length * MONTH_WIDTH }}>
            {/* Quarter Headers */}
            <div className="flex h-7 bg-muted border-b border-border sticky top-0 z-10">
              {quarters.map(q => (
                <div key={q.name} className="flex items-center justify-center text-xs font-semibold border-r border-border" style={{ width: q.months.length * MONTH_WIDTH }}>
                  {q.name}
                </div>
              ))}
            </div>

            {/* Month Headers */}
            <div className="flex h-6 bg-muted border-b border-border sticky top-7 z-10">
              {months.map(month => (
                <div key={month.name + month.date.toISOString()} className="flex items-center justify-center text-[11px] text-muted-foreground border-r border-border/50" style={{ width: MONTH_WIDTH }}>
                  {month.name}
                </div>
              ))}
            </div>

            {/* Milestones Row */}
            <div className="relative h-5 bg-muted border-b border-border sticky top-[52px] z-10">
              <div className="absolute" style={{ left: getBarPosition('2024-09-15', timelineStart) + 50, top: '50%', transform: 'translate(-50%, -50%)' }}>
                <div className="w-3 h-3 rounded-full bg-cyan-500 border-2 border-background" />
              </div>
              <div className="absolute" style={{ left: getBarPosition('2024-11-01', timelineStart) + 50, top: '50%', transform: 'translate(-50%, -50%)' }}>
                <div className="w-3 h-3 rounded-full bg-cyan-500 border-2 border-background" />
              </div>
            </div>

            {/* Gantt Rows */}
            {items.map(item => (
              <div key={item.id} className="relative h-10 border-b border-border/50">
                <div
                  className="absolute top-1 h-8 rounded flex items-center px-2 text-xs font-medium text-white cursor-pointer transition-shadow hover:shadow-lg hover:z-10"
                  style={{
                    left: getBarPosition(item.startDate, timelineStart),
                    width: getBarWidth(item.startDate, item.dueDate),
                    backgroundColor: getBarColor(item.state),
                  }}
                  onMouseEnter={(e) => handleBarHover(item, e)}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <span className="font-semibold">{item.numericId}</span>
                  <span className="mx-1">-</span>
                  <span className="truncate">{item.title}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tooltip */}
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
    </div>
  );
}
