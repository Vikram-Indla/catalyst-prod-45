import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

// Brand Colors (from design system)
const COLORS = {
  gold: '#c69c6d',
  goldLight: '#f5efe8',
  goldDark: '#a67c4d',
  bronze: '#8b7355',
  olive: '#5c7c5c',
  oliveLight: '#e8f0e8',
  champagne: '#d4b896',
  grey: '#c8ccd0',
  dark: '#1a1a2e',
  red: '#dc2626',
  amber: '#f59e0b',
};

const FUNNEL_COLORS: Record<string, string> = {
  'New Request': COLORS.dark,
  'Analyse': COLORS.bronze,
  'Ready to Implement': COLORS.champagne,
  'Approved': COLORS.gold,
  'Implement': COLORS.goldDark,
  'Closed': COLORS.olive,
};

// All resources with roles: Product Owner, Technical Product Owner, Business Analyst
const ALL_RESOURCES = [
  { name: 'Sulaiman Alessa', role: 'Product Owner', initials: 'SA' },
  { name: 'Maali Alanazi', role: 'Business Analyst', initials: 'MA' },
  { name: 'Alaa Ali', role: 'Product Owner', initials: 'AA' },
  { name: 'Khaled Alghithy', role: 'Business Analyst', initials: 'KA' },
  { name: 'Nora Alshahrani', role: 'Business Analyst', initials: 'NA' },
  { name: 'Fahad Almutairi', role: 'Product Owner', initials: 'FA' },
  { name: 'Sara Almohammad', role: 'Business Analyst', initials: 'SM' },
  { name: 'Omar Alkhalid', role: 'Product Owner', initials: 'OK' },
  { name: 'Ahmed Alharthi', role: 'Technical Product Owner', initials: 'AH' },
  { name: 'Fatima Alzahrani', role: 'Technical Product Owner', initials: 'FZ' },
  { name: 'Hassan Almutairi', role: 'Business Analyst', initials: 'HM' },
  { name: 'Mona Alqahtani', role: 'Technical Product Owner', initials: 'MQ' },
];

const MONTHS_BY_QUARTER: Record<string, string[]> = {
  Q1: ['Jan', 'Feb', 'Mar'],
  Q2: ['Apr', 'May', 'Jun'],
  Q3: ['Jul', 'Aug', 'Sep'],
  Q4: ['Oct', 'Nov', 'Dec'],
};

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

const getCurrentQuarterInfo = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentQuarterIndex = Math.floor(currentMonth / 3);
  const currentQuarter = QUARTERS[currentQuarterIndex];
  const years = [currentYear - 1, currentYear, currentYear + 1];
  return { currentYear, currentQuarter, currentQuarterIndex, years };
};

// Generate heat map data for a resource
const generateResourceWeeks = () => {
  const statuses = ['New Request', 'Analyse', 'Ready to Implement', 'Approved', 'Implement', 'Closed'];
  return Array.from({ length: 12 }, () => {
    const rand = Math.random();
    if (rand < 0.15) return { status: null, count: 0 };
    if (rand < 0.25) return { status: 'leave', count: 0 };
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    return { status, count: Math.floor(Math.random() * 4) + 1 };
  });
};

const getRoleBadgeStyle = (role: string) => {
  if (role === 'Product Owner') {
    return { bg: COLORS.goldLight, color: COLORS.bronze, label: 'PO' };
  }
  if (role === 'Technical Product Owner') {
    return { bg: COLORS.goldLight, color: COLORS.goldDark, label: 'TPO' };
  }
  // Business Analyst
  return { bg: COLORS.oliveLight, color: COLORS.olive, label: 'BA' };
};

const getInitialsBg = (role: string) => {
  if (role === 'Product Owner') return COLORS.bronze;
  if (role === 'Technical Product Owner') return COLORS.goldDark;
  return COLORS.olive;
};

export default function CapacityPage() {
  const { currentYear, currentQuarterIndex, years } = getCurrentQuarterInfo();
  
  // Generate all quarters for 3 years
  const allQuarters = useMemo(() => {
    const result: { q: string; year: number }[] = [];
    years.forEach(year => {
      QUARTERS.forEach(q => result.push({ q, year }));
    });
    return result;
  }, [years]);

  // Find current quarter index in allQuarters
  const currentQuarterFullIndex = useMemo(() => {
    return allQuarters.findIndex(
      q => q.year === currentYear && q.q === QUARTERS[currentQuarterIndex]
    );
  }, [allQuarters, currentYear, currentQuarterIndex]);

  const [windowStart, setWindowStart] = useState(Math.max(0, currentQuarterFullIndex - 1));
  const [selectedIndex, setSelectedIndex] = useState(
    Math.min(1, currentQuarterFullIndex - windowStart)
  );
  const [cellMarks, setCellMarks] = useState<Record<string, 'L' | 'U' | null>>({});

  const visibleQuarters = allQuarters.slice(windowStart, windowStart + 4);
  const selectedQuarter = visibleQuarters[selectedIndex];

  const canShiftLeft = windowStart > 0;
  const canShiftRight = windowStart + 4 < allQuarters.length;

  const handleShift = (dir: -1 | 1) => {
    setWindowStart(prev => Math.max(0, Math.min(prev + dir, allQuarters.length - 4)));
  };

  const handleToggleCellMark = (key: string) => {
    setCellMarks(prev => {
      const current = prev[key];
      if (current === null || current === undefined) return { ...prev, [key]: 'L' };
      if (current === 'L') return { ...prev, [key]: 'U' };
      return { ...prev, [key]: null };
    });
  };

  // Generate heat map data for all resources
  const heatMapData = useMemo(() => {
    return ALL_RESOURCES.map(resource => ({
      ...resource,
      weeks: generateResourceWeeks(),
    }));
  }, []);

  const months = MONTHS_BY_QUARTER[selectedQuarter?.q] || ['Jan', 'Feb', 'Mar'];
  const weeks = ['W1', 'W2', 'W3', 'W4'];
  
  const leaveCount = Object.values(cellMarks).filter(v => v === 'L').length;
  const unallocatedCount = Object.values(cellMarks).filter(v => v === 'U').length;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Header - align with sidebar */}
      <div className="h-[72px] border-b border-border bg-card flex-shrink-0 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-gold/20 flex items-center justify-center">
            <Users className="h-5 w-5 text-brand-gold" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Resource Allocation Heat Map</h1>
            <p className="text-xs text-muted-foreground">Who is working on what, when</p>
          </div>
        </div>

        {/* Quarter Selector */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleShift(-1)}
            disabled={!canShiftLeft}
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center border transition-colors",
              canShiftLeft
                ? "border-border hover:bg-accent text-foreground"
                : "border-border/50 text-muted-foreground cursor-not-allowed"
            )}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <div className="flex bg-muted rounded-xl p-1">
            {visibleQuarters.map((q, i) => (
              <button
                key={`${q.q}-${q.year}`}
                onClick={() => setSelectedIndex(i)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  selectedIndex === i
                    ? "bg-brand-gold text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {q.q} {q.year}
              </button>
            ))}
          </div>

          <button
            onClick={() => handleShift(1)}
            disabled={!canShiftRight}
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center border transition-colors",
              canShiftRight
                ? "border-border hover:bg-accent text-foreground"
                : "border-border/50 text-muted-foreground cursor-not-allowed"
            )}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="bg-card rounded-2xl border shadow-sm p-6">
          {/* Legend Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <span 
                className="px-3 py-1 rounded-full text-sm font-semibold"
                style={{ backgroundColor: COLORS.goldLight, color: COLORS.bronze }}
              >
                {selectedQuarter?.q} {selectedQuarter?.year}
              </span>
              <span className="text-sm text-muted-foreground">
                {ALL_RESOURCES.length} resources
              </span>
            </div>
            
            {/* Legend */}
            <div className="flex flex-wrap gap-3 text-xs">
              {Object.entries(FUNNEL_COLORS).map(([status, color]) => (
                <div key={status} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
                  <span className="text-muted-foreground">{status}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-muted" />
                <span className="text-muted-foreground">Available</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.grey }} />
                <span className="text-muted-foreground">L (Leave)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-amber-200" />
                <span className="text-muted-foreground">U (Unallocated)</span>
              </div>
            </div>
          </div>

          {/* Month Headers */}
          <div className="grid grid-cols-[220px_repeat(12,1fr)] gap-1 mb-2">
            <div />
            {months.map(month => (
              <div key={month} className="col-span-4 text-center text-xs font-medium text-muted-foreground">
                {month}
              </div>
            ))}
          </div>
          
          {/* Week Headers */}
          <div className="grid grid-cols-[220px_repeat(12,1fr)] gap-1 mb-3">
            <div />
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="text-center text-[10px] text-muted-foreground">
                {weeks[i % 4]}
              </div>
            ))}
          </div>

          {/* Resource Rows */}
          <div className="space-y-2">
            {heatMapData.map((resource) => {
              const badgeStyle = getRoleBadgeStyle(resource.role);
              const initialsBg = getInitialsBg(resource.role);
              
              return (
                <div key={resource.name} className="grid grid-cols-[220px_repeat(12,1fr)] gap-1 items-center">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: initialsBg }}
                    >
                      {resource.initials}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{resource.name}</div>
                      <span 
                        className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold inline-block"
                        style={{ backgroundColor: badgeStyle.bg, color: badgeStyle.color }}
                      >
                        {badgeStyle.label}
                      </span>
                    </div>
                  </div>
                  {resource.weeks.map((week, wi) => {
                    const cellKey = `${resource.name}-${wi}`;
                    const cellMark = cellMarks[cellKey];
                    const isLeave = cellMark === 'L' || week.status === 'leave';
                    const isUnallocated = cellMark === 'U';
                    
                    if (isLeave) {
                      return (
                        <button
                          key={wi}
                          onClick={() => handleToggleCellMark(cellKey)}
                          className="h-8 rounded flex items-center justify-center text-[10px] font-bold hover:opacity-80 transition-opacity"
                          style={{ backgroundColor: COLORS.grey, color: '#4b5563' }}
                        >
                          L
                        </button>
                      );
                    }
                    
                    if (isUnallocated) {
                      return (
                        <button
                          key={wi}
                          onClick={() => handleToggleCellMark(cellKey)}
                          className="h-8 rounded flex items-center justify-center text-[10px] font-bold bg-amber-200 text-amber-700 hover:opacity-80 transition-opacity"
                        >
                          U
                        </button>
                      );
                    }
                    
                    if (!week.status || week.count === 0) {
                      return (
                        <button
                          key={wi}
                          onClick={() => handleToggleCellMark(cellKey)}
                          className="h-8 rounded bg-muted hover:bg-accent transition-colors"
                        />
                      );
                    }
                    
                    return (
                      <div
                        key={wi}
                        className="h-8 rounded flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: FUNNEL_COLORS[week.status] }}
                      >
                        {week.count}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground border-t pt-4">
            <span>Click gray cells to cycle: L (Leave) → U (Unallocated) → Clear</span>
            <span>{leaveCount} leave, {unallocatedCount} unallocated marked</span>
          </div>
        </div>
      </div>
    </div>
  );
}
