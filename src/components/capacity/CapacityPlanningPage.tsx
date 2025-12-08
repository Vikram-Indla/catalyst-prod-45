/**
 * Capacity & Allocation Planning Page
 * Main component integrating all capacity planning features
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
  ChevronsLeft, ChevronsRight, Unlock, Lock
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getWeekDateRange } from '@/lib/capacityUtils';

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

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <CapacitySummaryCards
        totalMembers={stats.total}
        underallocated={stats.under}
        fullyAllocated={stats.full}
        overallocated={stats.over}
        openVacancies={openVacancies}
      />

      {/* Capacity Preview */}
      <CapacityPreview 
        weeks={capacityPreview}
        currentWeek={currentWeek}
        totalPeople={allResources.length}
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-[200px] pl-9 h-9"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Week Navigation */}
          <div className="flex items-center gap-1 bg-card border border-border rounded-md p-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateWeeks(-4)}>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateWeeks(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-3 text-sm font-medium min-w-[120px] text-center">
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
            className={cn("h-8", adminMode && "bg-warning text-warning-foreground")}
            onClick={handleAdminToggle}
          >
            {adminMode ? <Unlock className="h-3.5 w-3.5 mr-1.5" /> : <Lock className="h-3.5 w-3.5 mr-1.5" />}
            {adminMode ? 'Unlock Past' : 'Lock Past'}
          </Button>

          <Button variant="outline" size="sm" className="h-8" onClick={handleCopyWeek}>
            <Copy className="h-3.5 w-3.5 mr-1.5" />
            Copy Week
          </Button>

          <Button size="sm" className="h-8 bg-brand-gold hover:bg-brand-gold/90 text-white">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New Allocation
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as CapacityTab)}>
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="roster">People Roster</TabsTrigger>
          <TabsTrigger value="grid">Project Grid</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="vacancies" className="relative">
            Vacancies
            {openVacancies > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-semibold bg-destructive/10 text-destructive rounded-full">
                {openVacancies}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <div className="mt-4 bg-card border border-border rounded-lg p-4">
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
      </Tabs>
    </div>
  );
}
