/**
 * Program Roadmap Page
 * Based on catalyst-epic-roadmap-daily.html
 * 
 * Changes from original:
 * 1. Title: "Program Roadmap" (not Epic Roadmap)
 * 2. Toolbar: Search → My Projects → Group by → Filters (left), Milestones + Year + Info (right)
 * 3. No quick toggle chips
 * 4. Tooltip: "Linked Features" (open only, scrollable) instead of "Milestones"
 * 5. List header: "PROGRAMS" (not EPICS)
 * 
 * Stability pass done: no blanking, no spinners, single header.
 */

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ProgramPageLayout } from '@/components/program/ProgramPageLayout';
import { Search, Layers, Filter, Info, ChevronDown, Check, X, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProgramRoadmapFiltersDialog, ProgramFilters, DEFAULT_FILTERS, getCurrentQuarterDates, getNextQuarterDates } from '@/components/program/ProgramRoadmapFiltersDialog';
import GlobalPageHeader from '@/components/layout/GlobalPageHeader';
import { TimelineFilterPopover, TimelineFilterState, DEFAULT_TIMELINE_FILTER } from '@/components/roadmap/TimelineFilterPopover';

// ===== TYPES =====
interface LinkedFeature {
  key: string;
  title: string;
  status: 'Open' | 'In Progress' | 'Done' | 'Closed';
}

interface Milestone {
  title: string;
  date: string;
  status: 'complete' | 'current' | 'pending' | 'overdue';
}

interface ProgramItem {
  id: number;
  key: string;
  title: string;
  owner: string;
  platform: string;
  health: 'On Track' | 'At Risk' | 'Blocked';
  status: 'Draft' | 'Active' | 'Completed' | 'On Hold';
  startDate: string;
  endDate: string;
  progress: number;
  linkedProjects: string[];
  milestones: Milestone[];
  linkedFeatures: LinkedFeature[];
  hasDependencies?: boolean;
  isBlocked?: boolean;
  isBlocking?: boolean;
}

interface Project {
  id: string;
  name: string;
}

interface Quarter {
  label: string;
  start: Date;
  end: Date;
}

// (ProgramFilters and DEFAULT_FILTERS imported from ProgramRoadmapFiltersDialog)

// ===== REAL DATA (Mock data removed) =====
const TODAY = new Date();

// Empty arrays - data should come from database queries
const PROJECTS: Project[] = [];
const OWNERS: string[] = [];
const PROGRAM_STATUSES = ['Draft', 'Active', 'Completed', 'On Hold'] as const;
const HEALTH_STATUSES = ['On Track', 'At Risk', 'Blocked'] as const;
const ACTIVE_IN_PERIOD_OPTIONS = ['This Quarter', 'Next Quarter', 'Custom Range'] as const;

// Programs will be fetched from database
const PROGRAMS: ProgramItem[] = [];

// Dynamic quarters based on current date
const generateQuarters = (): Quarter[] => {
  const currentYear = new Date().getFullYear();
  return [
    { label: `Q1 ${currentYear}`, start: new Date(`${currentYear}-01-01`), end: new Date(`${currentYear}-03-31`) },
    { label: `Q2 ${currentYear}`, start: new Date(`${currentYear}-04-01`), end: new Date(`${currentYear}-06-30`) },
    { label: `Q3 ${currentYear}`, start: new Date(`${currentYear}-07-01`), end: new Date(`${currentYear}-09-30`) },
    { label: `Q4 ${currentYear}`, start: new Date(`${currentYear}-10-01`), end: new Date(`${currentYear}-12-31`) },
    { label: `Q1 ${currentYear + 1}`, start: new Date(`${currentYear + 1}-01-01`), end: new Date(`${currentYear + 1}-03-31`) },
    { label: `Q2 ${currentYear + 1}`, start: new Date(`${currentYear + 1}-04-01`), end: new Date(`${currentYear + 1}-06-30`) }
  ];
};

const QUARTERS: Quarter[] = generateQuarters();

// ===== UTILITIES =====
function parseDate(str: string): Date {
  return new Date(str);
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseDate(date) : date;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

function formatDateRange(start: string, end: string): string {
  return `${formatDate(start)} → ${formatDate(end)}`;
}

function getHealthClass(health: string): string {
  if (health === 'On Track') return 'on-track';
  if (health === 'At Risk') return 'at-risk';
  if (health === 'Blocked') return 'blocked';
  return 'on-track';
}

function getOwnerInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function getProjectName(id: string): string {
  const p = PROJECTS.find(proj => proj.id === id);
  return p ? p.name : id;
}

function getTimelineStart(): Date {
  return QUARTERS[0].start;
}

function getTimelineEnd(): Date {
  return QUARTERS[QUARTERS.length - 1].end;
}

function dateToPercent(date: Date | string): number {
  const d = typeof date === 'string' ? parseDate(date) : date;
  const start = getTimelineStart();
  const end = getTimelineEnd();
  const total = end.getTime() - start.getTime();
  const offset = d.getTime() - start.getTime();
  return Math.max(0, Math.min(100, (offset / total) * 100));
}

function getTodayPercent(): number {
  return dateToPercent(TODAY);
}

// ===== COMPONENT =====
export default function ProgramRoadmapPage() {
  const { programId } = useParams<{ programId: string }>();
  
  // State
  const [search, setSearch] = useState('');
  const [groupBy, setGroupBy] = useState<'platform' | 'owner' | 'health'>('platform');
  const [showMilestones, setShowMilestones] = useState(true);
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilterState>(DEFAULT_TIMELINE_FILTER);
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  
  // Filter state
  const [filters, setFilters] = useState<ProgramFilters>(DEFAULT_FILTERS);
  const [filtersDialogOpen, setFiltersDialogOpen] = useState(false);
  
  // Dropdown states
  const [projectsMenuOpen, setProjectsMenuOpen] = useState(false);
  const [groupByMenuOpen, setGroupByMenuOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  
  // Tooltip state
  const [tooltip, setTooltip] = useState<{ visible: boolean; program: ProgramItem | null; x: number; y: number }>({
    visible: false,
    program: null,
    x: 0,
    y: 0
  });
  
  // Refs for scroll sync
  const listBodyRef = useRef<HTMLDivElement>(null);
  const timelineBodyRef = useRef<HTMLDivElement>(null);
  
  // Helper to check if program is overdue
  const isProgramOverdue = (program: ProgramItem): boolean => {
    const endDate = parseDate(program.endDate);
    return endDate < TODAY && program.progress < 100;
  };
  
  // Helper to check if program is active in a period using timeline overlap logic
  // A program is active if: program.start_date <= period_end AND program.end_date >= period_start
  const isProgramActiveInPeriod = (program: ProgramItem, filters: ProgramFilters): boolean => {
    if (filters.activeInPeriod === 'any') return true;
    
    const programStart = parseDate(program.startDate);
    const programEnd = parseDate(program.endDate);
    
    let periodStart: Date;
    let periodEnd: Date;
    
    if (filters.activeInPeriod === 'this-quarter') {
      const quarter = getCurrentQuarterDates();
      periodStart = quarter.start;
      periodEnd = quarter.end;
    } else if (filters.activeInPeriod === 'next-quarter') {
      const quarter = getNextQuarterDates();
      periodStart = quarter.start;
      periodEnd = quarter.end;
    } else if (filters.activeInPeriod === 'custom') {
      if (!filters.customRangeStart || !filters.customRangeEnd) return true;
      periodStart = filters.customRangeStart;
      periodEnd = filters.customRangeEnd;
    } else {
      return true;
    }
    
    // Timeline overlap logic: program overlaps period if program starts before period ends AND program ends after period starts
    return programStart <= periodEnd && programEnd >= periodStart;
  };
  
  // Helper to check if program has open features only
  const hasOnlyOpenFeatures = (program: ProgramItem): boolean => {
    const openFeatures = program.linkedFeatures.filter(f => f.status === 'Open' || f.status === 'In Progress');
    return openFeatures.length > 0;
  };
  
  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.owners.length > 0) count += filters.owners.length;
    if (filters.linkedProjects.length > 0) count += filters.linkedProjects.length;
    if (filters.status.length > 0) count += filters.status.length;
    if (filters.health.length > 0) count += filters.health.length;
    if (filters.activeInPeriod !== 'any') count += 1;
    if (filters.overdueOnly) count += 1;
    if (filters.hasDependencies !== null) count += 1;
    if (filters.blockedOrBlocking !== null) count += 1;
    if (filters.hasLinkedFeatures !== null) count += 1;
    if (filters.featureStatusOpenOnly) count += 1;
    return count;
  }, [filters]);
  
  // Filter programs
  const filteredPrograms = useMemo(() => {
    let filtered = [...PROGRAMS];
    
    // Text search
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(p =>
        p.key.toLowerCase().includes(s) ||
        p.title.toLowerCase().includes(s) ||
        p.owner.toLowerCase().includes(s)
      );
    }
    
    // Owner filter
    if (filters.owners.length > 0) {
      filtered = filtered.filter(p => filters.owners.includes(p.owner));
    }
    
    // Linked Project filter
    if (filters.linkedProjects.length > 0) {
      filtered = filtered.filter(p => 
        p.linkedProjects.some(proj => filters.linkedProjects.includes(proj))
      );
    }
    
    // Status filter
    if (filters.status.length > 0) {
      filtered = filtered.filter(p => filters.status.includes(p.status));
    }
    
    // Health filter
    if (filters.health.length > 0) {
      filtered = filtered.filter(p => filters.health.includes(p.health));
    }
    
    // Active in period filter (timeline overlap logic)
    if (filters.activeInPeriod !== 'any') {
      filtered = filtered.filter(p => isProgramActiveInPeriod(p, filters));
    }
    
    // Overdue filter
    if (filters.overdueOnly) {
      filtered = filtered.filter(p => isProgramOverdue(p));
    }
    
    // Has Dependencies filter
    if (filters.hasDependencies !== null) {
      filtered = filtered.filter(p => p.hasDependencies === filters.hasDependencies);
    }
    
    // Blocked / Blocking filter
    if (filters.blockedOrBlocking !== null) {
      filtered = filtered.filter(p => 
        filters.blockedOrBlocking ? (p.isBlocked || p.isBlocking) : (!p.isBlocked && !p.isBlocking)
      );
    }
    
    // Has Linked Features filter
    if (filters.hasLinkedFeatures !== null) {
      filtered = filtered.filter(p => 
        filters.hasLinkedFeatures ? p.linkedFeatures.length > 0 : p.linkedFeatures.length === 0
      );
    }
    
    // Feature Status (Open only) filter
    if (filters.featureStatusOpenOnly) {
      filtered = filtered.filter(p => hasOnlyOpenFeatures(p));
    }
    
    return filtered;
  }, [search, filters]);
  
  // Handle filter change from dialog
  const handleFiltersChange = (newFilters: ProgramFilters) => {
    setFilters(newFilters);
  };
  
  // Group programs
  const groupedPrograms = useMemo(() => {
    const groups: Record<string, ProgramItem[]> = {};
    
    filteredPrograms.forEach(program => {
      let key: string;
      if (groupBy === 'platform') key = program.platform;
      else if (groupBy === 'owner') key = program.owner;
      else if (groupBy === 'health') key = program.health;
      else key = 'All';
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(program);
    });
    
    return Object.entries(groups).map(([key, programs]) => ({ key, programs }));
  }, [filteredPrograms, groupBy]);
  
  // Toggle group collapse
  const toggleGroup = useCallback((key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);
  
  // Toggle project selection
  const toggleProject = useCallback((id: string) => {
    setSelectedProjects(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  
  // Scroll sync
  const handleListScroll = useCallback(() => {
    if (listBodyRef.current && timelineBodyRef.current) {
      timelineBodyRef.current.scrollTop = listBodyRef.current.scrollTop;
    }
  }, []);
  
  const handleTimelineScroll = useCallback(() => {
    if (listBodyRef.current && timelineBodyRef.current) {
      listBodyRef.current.scrollTop = timelineBodyRef.current.scrollTop;
    }
  }, []);
  
  // Tooltip handlers
  const showTooltip = useCallback((e: React.MouseEvent, program: ProgramItem) => {
    setTooltip({
      visible: true,
      program,
      x: e.clientX + 16,
      y: e.clientY + 16
    });
  }, []);
  
  const moveTooltip = useCallback((e: React.MouseEvent) => {
    if (!tooltip.visible) return;
    
    let x = e.clientX + 16;
    let y = e.clientY + 16;
    
    // Keep tooltip on screen
    if (x + 300 > window.innerWidth - 20) x = e.clientX - 316;
    if (y + 400 > window.innerHeight - 20) y = e.clientY - 400;
    
    setTooltip(prev => ({ ...prev, x, y }));
  }, [tooltip.visible]);
  
  const hideTooltip = useCallback(() => {
    setTooltip(prev => ({ ...prev, visible: false }));
  }, []);
  
  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = () => {
      setProjectsMenuOpen(false);
      setGroupByMenuOpen(false);
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);
  
  // Get open features only for tooltip
  const getOpenFeatures = (program: ProgramItem): LinkedFeature[] => {
    return program.linkedFeatures.filter(f => f.status !== 'Done' && f.status !== 'Closed');
  };
  
  const todayPercent = getTodayPercent();
  
  return (
    <ProgramPageLayout>
      <div className="flex flex-col h-full bg-background overflow-hidden">
        {/* Canonical Header - matches Enterprise Objective Roadmap exactly */}
        <GlobalPageHeader 
          sectionLabel="PROGRAM" 
          pageTitle="Program Roadmap"
          toolbar={
            <div className="flex items-center justify-between w-full">
              {/* Left: Search → Group by → Filters */}
              <div className="flex items-center gap-3">
                {/* Search */}
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    className="h-9 w-52 pl-9 pr-8 text-sm border border-border rounded-lg bg-background focus:outline-none focus:border-brand-primary"
                    placeholder="Search programs..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {search && (
                    <button 
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                      onClick={() => setSearch('')}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                
                {/* Group By */}
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <button 
                    className="h-9 px-3 flex items-center gap-2 text-sm border border-border rounded-lg bg-background hover:bg-muted"
                    onClick={() => {
                      setGroupByMenuOpen(!groupByMenuOpen);
                      setProjectsMenuOpen(false);
                    }}
                  >
                    <Layers size={16} />
                    Group by
                    <ChevronDown size={12} />
                  </button>
                  {groupByMenuOpen && (
                    <div className="absolute top-full mt-1 left-0 w-40 py-1 bg-background border border-border rounded-lg shadow-lg z-50">
                      {[
                        { value: 'platform', label: 'Delivery Platform' },
                        { value: 'owner', label: 'Program Owner' },
                        { value: 'health', label: 'Health' }
                      ].map(option => (
                        <div
                          key={option.value}
                          className={cn(
                            "flex items-center justify-between px-3 py-2 text-sm cursor-pointer hover:bg-muted",
                            groupBy === option.value && "text-brand-primary"
                          )}
                          onClick={() => {
                            setGroupBy(option.value as typeof groupBy);
                            setCollapsedGroups(new Set());
                            setGroupByMenuOpen(false);
                          }}
                        >
                          {option.label}
                          {groupBy === option.value && <Check size={16} className="text-brand-primary" />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Filters Button */}
                <button 
                  className={cn(
                    "h-9 px-3 flex items-center gap-2 text-sm border border-border rounded-lg bg-background hover:bg-muted",
                    activeFilterCount > 0 && "border-brand-primary text-brand-primary"
                  )}
                  onClick={() => setFiltersDialogOpen(true)}
                >
                  <Filter size={16} />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="min-w-[20px] h-5 px-1.5 flex items-center justify-center text-xs font-semibold bg-brand-primary text-white rounded-full">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              </div>
              
              {/* Right: Milestones toggle + Year + Info */}
              <div className="flex items-center gap-3">
                {/* Milestones Toggle */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Milestones</span>
                  <div 
                    className={cn(
                      "w-10 h-5 rounded-full cursor-pointer transition-colors relative",
                      showMilestones ? "bg-brand-primary" : "bg-muted"
                    )}
                    onClick={() => setShowMilestones(!showMilestones)}
                  >
                    <div className={cn(
                      "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
                      showMilestones ? "translate-x-5" : "translate-x-0.5"
                    )} />
                  </div>
                </div>
                
                <div className="w-px h-6 bg-border" />
                
                {/* Timeline Filter Popover */}
                <TimelineFilterPopover
                  value={timelineFilter}
                  onChange={setTimelineFilter}
                />
                
                {/* Info Button */}
                <button
                  className={cn(
                    "h-9 w-9 flex items-center justify-center border border-border rounded-lg transition-colors",
                    legendOpen 
                      ? "bg-brand-primary text-white border-brand-primary" 
                      : "bg-background text-muted-foreground hover:bg-muted"
                  )}
                  onClick={() => setLegendOpen(!legendOpen)}
                >
                  <Info size={16} />
                </button>
              </div>
            </div>
          }
        />
        
        {/* Roadmap Container */}
        <div className="flex-1 flex overflow-hidden border-t border-border">
          {/* Left List Panel */}
          <div className="w-[36%] min-w-[340px] max-w-[480px] border-r border-border flex flex-col">
            <div className="h-10 px-4 flex items-center border-b border-border bg-background">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                PROGRAMS
              </span>
            </div>
            
            <div
              ref={listBodyRef}
              onScroll={handleListScroll}
              className="flex-1 overflow-y-auto"
            >
              {groupedPrograms.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="text-4xl opacity-40 mb-3">📋</div>
                  <div className="text-sm text-muted-foreground">No programs match your filters</div>
                </div>
              ) : (
                groupedPrograms.map(group => {
                  const isCollapsed = collapsedGroups.has(group.key);
                  
                  return (
                    <React.Fragment key={group.key}>
                      {/* Group Header */}
                      <div
                        onClick={() => toggleGroup(group.key)}
                        className="h-11 px-3 pl-4 flex items-center gap-2 border-b border-border bg-muted/50 cursor-pointer hover:bg-muted"
                      >
                        <div className={cn(
                          "w-5 h-5 flex items-center justify-center text-muted-foreground text-xs transition-transform",
                          isCollapsed && "-rotate-90"
                        )}>
                          ▾
                        </div>
                        <div className="w-[3px] h-6 rounded bg-brand-primary" />
                        <div className="flex-1">
                          <div className="text-[13px] font-semibold text-foreground">{group.key}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {group.programs.length} program{group.programs.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                      </div>
                      
                      {/* Program Rows */}
                      {!isCollapsed && group.programs.map(program => {
                        const linkedCount = program.linkedProjects.length;
                        const isMyProject = program.linkedProjects.some(p => selectedProjects.has(p));
                        
                        return (
                          <div
                            key={program.id}
                            onMouseEnter={(e) => showTooltip(e, program)}
                            onMouseMove={moveTooltip}
                            onMouseLeave={hideTooltip}
                            className="h-14 px-3 pl-4 flex items-center gap-2.5 border-b border-border bg-background cursor-pointer hover:bg-muted"
                          >
                            {/* Icon */}
                            <div className="w-7 h-7 rounded-full border-2 border-brand-primary flex items-center justify-center flex-shrink-0">
                              <div className="w-2.5 h-2.5 rounded-full bg-brand-primary" />
                            </div>
                            
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="text-[13px] font-medium text-foreground truncate">
                                {program.title}
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                {formatDateRange(program.startDate, program.endDate)}
                              </div>
                            </div>
                            
                            {/* Project Impact */}
                            <div className={cn(
                              "flex items-center gap-1 px-2 py-1 rounded-xl text-[11px] flex-shrink-0",
                              isMyProject
                                ? "bg-brand-primary-muted text-brand-primary"
                                : "bg-muted text-muted-foreground"
                            )}>
                              <Home className="h-3 w-3" />
                              {linkedCount}
                            </div>
                            
                            {/* Owner */}
                            <div className="w-6 h-6 rounded-full bg-secondary-champagne flex items-center justify-center text-[10px] font-semibold text-secondary-bronze flex-shrink-0">
                              {getOwnerInitials(program.owner)}
                            </div>
                            
                            {/* Status */}
                            <div className={cn(
                              "px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-wide flex-shrink-0",
                              program.health === 'On Track' && "bg-brand-primary text-white",
                              program.health === 'At Risk' && "bg-secondary-bronze text-white",
                              program.health === 'Blocked' && "bg-destructive text-white"
                            )}>
                              {program.health.toUpperCase().replace(' ', '')}
                            </div>
                          </div>
                        );
                      })}
                    </React.Fragment>
                  );
                })
              )}
            </div>
          </div>
          
          {/* Right Timeline Panel */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Timeline Header */}
            <div className="h-10 flex border-b border-border bg-background relative">
              {QUARTERS.map((q, i) => {
                const qStart = dateToPercent(q.start);
                const qEnd = dateToPercent(q.end);
                const showBadge = todayPercent >= qStart && todayPercent < qEnd;
                const badgePos = ((todayPercent - qStart) / (qEnd - qStart)) * 100;
                
                return (
                  <div
                    key={q.label}
                    className={cn(
                      "flex-1 min-w-[120px] flex items-center justify-center text-xs font-medium text-muted-foreground relative",
                      i < QUARTERS.length - 1 && "border-r border-border"
                    )}
                  >
                    {q.label}
                    {showBadge && (
                      <div
                        className="absolute top-1.5 bg-secondary-bronze text-white text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider z-10"
                        style={{ left: `${badgePos}%` }}
                      >
                        TODAY
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Timeline Body */}
            <div
              ref={timelineBodyRef}
              onScroll={handleTimelineScroll}
              className="flex-1 overflow-auto relative"
            >
              <div className="min-w-full relative">
                {/* Grid Lines */}
                <div className="absolute inset-0 flex pointer-events-none">
                  {QUARTERS.map((q, i) => (
                    <div
                      key={q.label}
                      className={cn(
                        "flex-1 min-w-[120px]",
                        i < QUARTERS.length - 1 && "border-r border-border"
                      )}
                    />
                  ))}
                </div>
                
                {/* Today Line */}
                <div
                  className="absolute top-0 w-0.5 bg-secondary-bronze z-10 pointer-events-none"
                  style={{
                    left: `${todayPercent}%`,
                    height: `${groupedPrograms.reduce((acc, g) => {
                      const collapsed = collapsedGroups.has(g.key);
                      return acc + 44 + (collapsed ? 0 : g.programs.length * 56);
                    }, 0)}px`
                  }}
                />
                
                {/* Rows */}
                {groupedPrograms.map(group => {
                  const isCollapsed = collapsedGroups.has(group.key);
                  
                  return (
                    <React.Fragment key={group.key}>
                      {/* Group Row */}
                      <div className={cn(
                        "h-11 border-b border-border bg-muted/50",
                        isCollapsed && "hidden"
                      )} />
                      
                      {/* Program Rows */}
                      {!isCollapsed && group.programs.map(program => {
                        const startPct = dateToPercent(program.startDate);
                        const endPct = dateToPercent(program.endDate);
                        const width = endPct - startPct;
                        
                        return (
                          <div
                            key={program.id}
                            onMouseEnter={(e) => showTooltip(e, program)}
                            onMouseMove={moveTooltip}
                            onMouseLeave={hideTooltip}
                            className="h-14 border-b border-border bg-background relative hover:bg-muted cursor-pointer"
                          >
                            {/* Bar */}
                            <div
                              className="absolute top-1/2 -translate-y-1/2 h-1.5"
                              style={{ left: `${startPct}%`, width: `${width}%` }}
                            >
                              {/* Track */}
                              <div className="absolute inset-0 bg-brand-primary/20 rounded-sm" />
                              {/* Progress */}
                              <div
                                className="absolute left-0 top-0 h-full bg-brand-primary rounded-sm"
                                style={{ width: `${program.progress}%` }}
                              />
                            </div>
                            
                            {/* Milestones */}
                            {showMilestones && program.milestones.map((ms, i) => {
                              const msPct = dateToPercent(ms.date);
                              return (
                                <div
                                  key={i}
                                  className={cn(
                                    "absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rotate-45 border-2 z-[3]",
                                    ms.status === 'complete' && "bg-brand-primary border-brand-primary",
                                    ms.status === 'current' && "bg-background border-brand-gold",
                                    ms.status === 'pending' && "bg-background border-secondary-champagne",
                                    ms.status === 'overdue' && "bg-destructive border-destructive"
                                  )}
                                  style={{ left: `${msPct}%` }}
                                />
                              );
                            })}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        
        {/* Tooltip */}
        {tooltip.visible && tooltip.program && (
          <div
            className="fixed bg-background border border-border rounded-xl shadow-lg p-3.5 w-[300px] z-[1000] pointer-events-none"
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            {/* Header */}
            <div className="mb-2.5 pb-2.5 border-b border-border">
              <div className="text-[11px] font-semibold text-brand-primary mb-0.5">
                {tooltip.program.key}
              </div>
              <div className="text-sm font-semibold text-foreground">
                {tooltip.program.title}
              </div>
            </div>
            
            {/* Details */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Dates</span>
                <span className="font-medium text-foreground">
                  {formatDateRange(tooltip.program.startDate, tooltip.program.endDate)}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Health</span>
                <span className="font-medium text-foreground flex items-center gap-1.5">
                  <div className={cn(
                    "w-3 h-3 rounded",
                    tooltip.program.health === 'On Track' && "bg-brand-primary",
                    tooltip.program.health === 'At Risk' && "bg-secondary-bronze",
                    tooltip.program.health === 'Blocked' && "bg-destructive"
                  )} />
                  {tooltip.program.health}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Owner</span>
                <span className="font-medium text-foreground">{tooltip.program.owner}</span>
              </div>
            </div>
            
            {/* Linked Projects */}
            <div className="mt-2.5 pt-2.5 border-t border-border">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Linked Projects
              </div>
              <div className="flex flex-wrap gap-1">
                {tooltip.program.linkedProjects.slice(0, 3).map(p => (
                  <span key={p} className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded-xl text-[11px] text-muted-foreground">
                    {getProjectName(p)}
                  </span>
                ))}
                {tooltip.program.linkedProjects.length > 3 && (
                  <span className="text-[11px] text-muted-foreground">
                    +{tooltip.program.linkedProjects.length - 3} more
                  </span>
                )}
              </div>
            </div>
            
            {/* LINKED FEATURES (Open only) — Critical change */}
            <div className="mt-2.5 pt-2.5 border-t border-border">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Linked Features
              </div>
              {(() => {
                const openFeatures = getOpenFeatures(tooltip.program);
                
                if (openFeatures.length === 0) {
                  return (
                    <div className="text-[11px] text-muted-foreground italic">
                      No open features
                    </div>
                  );
                }
                
                return (
                  <div className="max-h-[180px] overflow-auto pr-1.5 space-y-1">
                    {openFeatures.map(feature => (
                      <div key={feature.key} className="flex items-center gap-1.5 text-[11px]">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-primary flex-shrink-0" />
                        <span className="text-muted-foreground flex-shrink-0">{feature.key}</span>
                        <span className="text-foreground truncate flex-1">{feature.title}</span>
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-[9px] font-medium flex-shrink-0",
                          feature.status === 'Open' && "bg-muted text-muted-foreground",
                          feature.status === 'In Progress' && "bg-brand-gold/20 text-brand-gold"
                        )}>
                          {feature.status}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        )}
        
        {/* Legend Panel - Two clear sections only */}
        {legendOpen && (
          <div className="fixed top-40 right-5 bg-background border border-border rounded-xl shadow-lg p-4 w-[200px] z-50">
            {/* Close button */}
            <button
              onClick={() => setLegendOpen(false)}
              className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            
            {/* Program Health Section */}
            <div className="mb-4">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
                Program Health
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2.5 text-xs">
                  <div className="w-3.5 h-3.5 rounded-full bg-brand-primary flex-shrink-0" />
                  <span className="text-foreground">On Track</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs">
                  <div className="w-3.5 h-3.5 rounded-full bg-secondary-bronze flex-shrink-0" />
                  <span className="text-foreground">At Risk</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs">
                  <div className="w-3.5 h-3.5 rounded-full bg-destructive flex-shrink-0" />
                  <span className="text-foreground">Blocked</span>
                </div>
              </div>
            </div>
            
            {/* Divider */}
            <div className="border-t border-border mb-4" />
            
            {/* Milestones Section */}
            <div>
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
                Milestones
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2.5 text-xs">
                  <div className="w-3 h-3 rotate-45 bg-brand-primary flex-shrink-0" />
                  <span className="text-foreground">Completed</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs">
                  <div className="w-3 h-3 rotate-45 border-2 border-brand-gold bg-background flex-shrink-0" />
                  <span className="text-foreground">Current</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs">
                  <div className="w-3 h-3 rotate-45 border-2 border-secondary-champagne bg-background flex-shrink-0" />
                  <span className="text-foreground">Pending</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Filters Dialog */}
        <ProgramRoadmapFiltersDialog
          open={filtersDialogOpen}
          onOpenChange={setFiltersDialogOpen}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          owners={OWNERS}
          projects={PROJECTS}
        />
      </div>
    </ProgramPageLayout>
  );
}
