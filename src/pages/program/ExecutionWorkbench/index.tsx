/**
 * WorkBench views: Table/Gantt/Roadmap/Board/Swimlane
 * 
 * Program Execution Workbench - Main Page
 */

import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { ProgramPageLayout } from '@/components/program/ProgramPageLayout';
import { Search, Filter, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkItem, WorkbenchView, WorkbenchFilters, DEFAULT_WORKBENCH_FILTERS, VIEW_OPTIONS, Project } from './types';
import { WorkbenchFiltersDialog } from './WorkbenchFiltersDialog';
import { WorkbenchDetailsDrawer } from './WorkbenchDetailsDrawer';
import { TableView } from './views/TableView';
import { GanttView } from './views/GanttView';
import { RoadmapView } from './views/RoadmapView';
import { BoardView } from './views/BoardView';
import { SwimlaneView } from './views/SwimlaneView';
import { GlobalPageHeader } from '@/components/layout/GlobalPageHeader';

// Mock data - replace with real data hooks
const MOCK_PROJECTS: Project[] = [
  { id: 'proj-1', name: 'Investor Portal' },
  { id: 'proj-2', name: 'Licensing System' },
  { id: 'proj-3', name: 'Analytics Hub' },
];

const MOCK_OWNERS = ['Vikram Indla', 'Sarah Chen', 'Ahmed Khalid', 'Layla Hassan'];

const MOCK_ITEMS: WorkItem[] = [
  {
    id: 'epic-1', key: 'EPC-101', title: 'Digital Identity Verification', type: 'epic',
    status: 'In Progress', health: 'On Track', owner: 'Vikram Indla', ownerInitials: 'VI',
    startDate: '2025-01-15', endDate: '2025-09-30', progress: 65, projectId: 'proj-1', projectName: 'Investor Portal',
    dependencyCount: 2,
    children: [
      { id: 'feat-1', key: 'FTR-201', title: 'Biometric Auth Module', type: 'feature', status: 'In Progress', health: 'On Track', owner: 'Sarah Chen', progress: 70, dependencyCount: 1, startDate: '2025-02-01', endDate: '2025-06-30', children: [
        { id: 'story-1', key: 'STR-301', title: 'Face recognition API', type: 'story', status: 'Done', health: 'On Track', progress: 100, dependencyCount: 0 },
        { id: 'story-2', key: 'STR-302', title: 'Fingerprint scanner integration', type: 'story', status: 'In Progress', health: 'On Track', progress: 50, dependencyCount: 0 },
      ]},
      { id: 'feat-2', key: 'FTR-202', title: 'Document Verification API', type: 'feature', status: 'To Do', health: 'At Risk', owner: 'Ahmed Khalid', progress: 20, dependencyCount: 0, startDate: '2025-05-01', endDate: '2025-08-31' },
    ]
  },
  {
    id: 'epic-2', key: 'EPC-102', title: 'Investor Portal Enhancement', type: 'epic',
    status: 'In Progress', health: 'At Risk', owner: 'Sarah Chen', ownerInitials: 'SC',
    startDate: '2025-01-01', endDate: '2025-12-31', progress: 48, projectId: 'proj-1', projectName: 'Investor Portal',
    dependencyCount: 3,
    children: [
      { id: 'feat-3', key: 'FTR-301', title: 'Portfolio Dashboard Redesign', type: 'feature', status: 'In Progress', health: 'At Risk', owner: 'Layla Hassan', progress: 45, dependencyCount: 1, startDate: '2025-03-01', endDate: '2025-07-31' },
    ]
  },
  {
    id: 'epic-3', key: 'EPC-103', title: 'Regulatory Compliance Engine', type: 'epic',
    status: 'Done', health: 'On Track', owner: 'Ahmed Khalid', ownerInitials: 'AK',
    startDate: '2025-01-10', endDate: '2025-07-30', progress: 100, projectId: 'proj-2', projectName: 'Licensing System',
    dependencyCount: 0,
    children: []
  },
  {
    id: 'epic-4', key: 'EPC-104', title: 'Analytics Dashboard Suite', type: 'epic',
    status: 'Blocked', health: 'Blocked', owner: 'Layla Hassan', ownerInitials: 'LH',
    startDate: '2025-04-01', endDate: '2025-11-30', progress: 25, projectId: 'proj-3', projectName: 'Analytics Hub',
    dependencyCount: 4,
    children: []
  },
];

// Dropdown component
function Dropdown({ label, value, options, onChange, className }: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find(o => o.value === value)?.label || label;

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-md bg-background hover:bg-muted/50 transition-colors"
      >
        <span>{selectedLabel}</span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 bg-background border border-border rounded-md shadow-lg z-[500] min-w-[150px]">
            {options.map(opt => (
              <div
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted cursor-pointer",
                  opt.value === value && "bg-muted"
                )}
              >
                {opt.value === value && <Check className="h-4 w-4 text-brand-primary" />}
                <span className={opt.value !== value ? "pl-6" : ""}>{opt.label}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function ExecutionWorkbenchPage() {
  const { programId } = useParams<{ programId: string }>();
  
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<WorkbenchView>('table');
  const [filters, setFilters] = useState<WorkbenchFilters>(DEFAULT_WORKBENCH_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<WorkItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.owners.length > 0) count++;
    if (filters.health.length > 0) count++;
    if (filters.status.length > 0) count++;
    if (filters.activeInPeriod !== 'any') count++;
    if (filters.hasDependencies !== null) count++;
    return count;
  }, [filters]);

  // Filter items
  const filteredItems = useMemo(() => {
    if (!selectedProject) return [];
    
    let items = MOCK_ITEMS.filter(item => item.projectId === selectedProject);

    if (search) {
      const q = search.toLowerCase();
      items = items.filter(item => 
        item.key.toLowerCase().includes(q) || 
        item.title.toLowerCase().includes(q)
      );
    }

    if (filters.owners.length > 0) {
      items = items.filter(item => item.owner && filters.owners.includes(item.owner));
    }
    if (filters.health.length > 0) {
      items = items.filter(item => filters.health.includes(item.health));
    }
    if (filters.status.length > 0) {
      items = items.filter(item => filters.status.includes(item.status));
    }

    return items;
  }, [selectedProject, search, filters]);

  const handleItemClick = (item: WorkItem) => {
    setSelectedItem(item);
    setDrawerOpen(true);
  };

  const projectOptions = [{ value: '', label: 'Select a project...' }, ...MOCK_PROJECTS.map(p => ({ value: p.id, label: p.name }))];

  return (
    <ProgramPageLayout>
      <div className="flex flex-col h-full">
        <GlobalPageHeader sectionLabel="PROGRAM" pageTitle="Execution Workbench" />

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-border bg-background">
          <div className="flex items-center gap-3">
            <Dropdown label="Project" value={selectedProject} options={projectOptions} onChange={setSelectedProject} />
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-2 text-sm border border-border rounded-md bg-background w-[200px] focus:outline-none focus:ring-1 focus:ring-brand-primary"
              />
            </div>

            <button
              onClick={() => setFiltersOpen(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-md hover:bg-muted/50 transition-colors"
            >
              <Filter className="h-4 w-4" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="text-xs text-muted-foreground">({activeFilterCount} applied)</span>
              )}
            </button>
          </div>

          <Dropdown label="View" value={view} options={VIEW_OPTIONS} onChange={(v) => setView(v as WorkbenchView)} />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {!selectedProject ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Select a project to load execution data
            </div>
          ) : (
            <>
              {view === 'table' && <TableView items={filteredItems} onItemClick={handleItemClick} />}
              {view === 'gantt' && <GanttView items={filteredItems} onItemClick={handleItemClick} />}
              {view === 'roadmap' && <RoadmapView items={filteredItems} onItemClick={handleItemClick} />}
              {view === 'board' && <BoardView items={filteredItems} onItemClick={handleItemClick} />}
              {view === 'swimlane' && <SwimlaneView items={filteredItems} onItemClick={handleItemClick} />}
            </>
          )}
        </div>
      </div>

      <WorkbenchFiltersDialog
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        filters={filters}
        onFiltersChange={setFilters}
        owners={MOCK_OWNERS}
      />

      <WorkbenchDetailsDrawer
        item={selectedItem}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </ProgramPageLayout>
  );
}
