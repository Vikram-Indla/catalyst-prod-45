/**
 * Capacity & Allocation Planning Page
 * Main component integrating all capacity planning features
 * Following Skills Inventory layout pattern
 */

import { useState } from 'react';
import { useCapacity } from '@/hooks/useCapacity';
import { CapacitySummaryCards } from './CapacitySummaryCards';
import { CapacityPreview } from './CapacityPreview';
import { PeopleRoster } from './PeopleRoster';
import { ProjectGrid } from './ProjectGrid';
import { TimelineView } from './TimelineView';
import { VacancyCards } from './VacancyCards';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, Filter, Copy, UserPlus, Plus, ChevronLeft, ChevronRight, 
  ChevronsLeft, ChevronsRight, Unlock, Lock, Users, LayoutGrid, 
  Calendar, AlertCircle, Download
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type CapacityTab = 'roster' | 'grid' | 'timeline' | 'vacancies';

export function CapacityPlanningPage() {
  const [activeTab, setActiveTab] = useState<CapacityTab>('roster');
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);

  const {
    resources,
    allResources,
    projects,
    vacancies,
    stats,
    openVacancies,
    capacityPreview,
    currentWeek,
    currentYear,
    startWeek,
    startYear,
    navigateWeeks,
    goToCurrentWeek,
    adminMode,
    toggleAdminMode,
    gridChanges,
    handleGridChange,
    resetGridChanges,
    saveGridChanges,
    searchQuery,
    setSearchQuery,
    copyWeekAllocations
  } = useCapacity();

  const handleSaveGrid = () => {
    const count = saveGridChanges();
    if (count > 0) {
      toast.success(`${count} allocation(s) saved`);
    } else {
      toast.info('No changes to save');
    }
  };

  const handleResetGrid = () => {
    resetGridChanges();
    toast.success('Changes discarded');
  };

  const handleCopyWeek = () => {
    const count = copyWeekAllocations({ mode: 'all' });
    toast.success(`${count} allocation(s) copied to W${startWeek + 1 > 52 ? 1 : startWeek + 1}`);
  };

  const handleAllocate = (resourceId: string) => {
    setSelectedResourceId(resourceId);
    toast.info('Allocation drawer coming soon');
  };

  const handleFillGap = (vacancyId: string) => {
    toast.info('Fill gap drawer coming soon');
  };

  const handleAdminToggle = () => {
    toggleAdminMode();
    if (!adminMode) {
      toast.warning('Admin mode enabled - past weeks now editable');
    } else {
      toast.success('Admin mode disabled');
    }
  };

  const tabItems = [
    { value: 'roster', label: 'People Roster', icon: Users },
    { value: 'grid', label: 'Project Grid', icon: LayoutGrid },
    { value: 'timeline', label: 'Timeline', icon: Calendar },
    { value: 'vacancies', label: 'Vacancies', icon: AlertCircle, badge: openVacancies > 0 ? openVacancies : undefined },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Capacity & Allocation</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Plan and manage team capacity, allocations, and identify resource gaps
        </p>
      </div>

      {/* View Tabs - Top level like Skills Inventory */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as CapacityTab)}>
        <TabsList className="bg-muted p-1 h-auto rounded-lg">
          {tabItems.map((tab) => (
            <TabsTrigger 
              key={tab.value}
              value={tab.value}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                "data-[state=active]:bg-brand-gold data-[state=active]:text-white",
                "data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.badge && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold bg-destructive/20 text-destructive rounded-full">
                  {tab.badge}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Summary Cards */}
        <div className="mt-6">
          <CapacitySummaryCards
            totalMembers={stats.total}
            underallocated={stats.under}
            fullyAllocated={stats.full}
            overallocated={stats.over}
            openVacancies={openVacancies}
          />
        </div>

        {/* Capacity Preview */}
        <div className="mt-4">
          <CapacityPreview 
            weeks={capacityPreview}
            currentWeek={currentWeek}
            totalPeople={allResources.length}
          />
        </div>

        {/* Content Card */}
        <div className="mt-4 bg-card border border-border rounded-lg">
          {/* Toolbar Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-border">
            <h2 className="text-base font-semibold text-foreground">
              {activeTab === 'roster' && 'People Roster'}
              {activeTab === 'grid' && 'Project Grid'}
              {activeTab === 'timeline' && 'Timeline View'}
              {activeTab === 'vacancies' && 'Open Vacancies'}
            </h2>
            
            <div className="flex items-center gap-2">
              {/* Week Navigation - only for grid/timeline */}
              {(activeTab === 'grid' || activeTab === 'timeline') && (
                <>
                  <div className="flex items-center gap-1 bg-muted border border-border rounded-md p-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateWeeks(-4)}>
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateWeeks(-1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="px-3 text-sm font-medium min-w-[100px] text-center">
                      W{startWeek} · {startYear}
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateWeeks(1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateWeeks(4)}>
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <Button variant="outline" size="sm" className="h-8" onClick={goToCurrentWeek}>
                    Today
                  </Button>

                  <Button 
                    variant={adminMode ? "default" : "outline"} 
                    size="sm" 
                    className={cn("h-8", adminMode && "bg-warning text-warning-foreground hover:bg-warning/90")}
                    onClick={handleAdminToggle}
                  >
                    {adminMode ? <Unlock className="h-3.5 w-3.5 mr-1.5" /> : <Lock className="h-3.5 w-3.5 mr-1.5" />}
                    {adminMode ? 'Unlock' : 'Lock'}
                  </Button>

                  <Button variant="outline" size="sm" className="h-8" onClick={handleCopyWeek}>
                    <Copy className="h-3.5 w-3.5 mr-1.5" />
                    Copy Week
                  </Button>
                </>
              )}

              {/* Common actions */}
              <Button variant="outline" size="sm" className="h-8">
                <Filter className="h-3.5 w-3.5 mr-1.5" />
                Filters
              </Button>

              <Button variant="outline" size="sm" className="h-8">
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Export CSV
              </Button>

              <Button size="sm" className="h-8 bg-brand-gold hover:bg-brand-gold-hover text-white">
                <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                Add Resource
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="px-4 py-3 border-b border-border">
            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search resources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-muted border-border"
              />
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-4">
            <TabsContent value="roster" className="m-0">
              <PeopleRoster
                resources={resources}
                projects={projects}
                startWeek={startWeek}
                startYear={startYear}
                onAllocate={handleAllocate}
              />
            </TabsContent>

            <TabsContent value="grid" className="m-0">
              <ProjectGrid
                resources={resources}
                projects={projects}
                startWeek={startWeek}
                startYear={startYear}
                currentWeek={currentWeek}
                currentYear={currentYear}
                adminMode={adminMode}
                gridChanges={gridChanges}
                onGridChange={handleGridChange}
                onSave={handleSaveGrid}
                onReset={handleResetGrid}
              />
            </TabsContent>

            <TabsContent value="timeline" className="m-0">
              <TimelineView
                resources={resources}
                projects={projects}
                startWeek={startWeek}
                startYear={startYear}
                currentWeek={currentWeek}
              />
            </TabsContent>

            <TabsContent value="vacancies" className="m-0">
              <VacancyCards
                vacancies={vacancies}
                projects={projects}
                onFillGap={handleFillGap}
              />
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
