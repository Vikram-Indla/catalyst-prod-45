/**
 * Capacity & Allocation Planning Page
 * Complete rebuild following specification exactly
 */

import { useState } from 'react';
import { useCapacity } from '@/hooks/useCapacity';
import { CapacitySummaryCards } from './CapacitySummaryCards';
import { PeopleRoster } from './PeopleRoster';
import { ProjectGrid } from './ProjectGrid';
import { TimelineView } from './TimelineView';
import { VacancyCards } from './VacancyCards';
import { AvailableCapacityTab } from './AvailableCapacityTab';
import { ExecutiveReportsTab } from './ExecutiveReportsTab';
import { FilterModal } from './FilterModal';
import { CopyWeekModal } from './CopyWeekModal';
import { AddMemberModal } from './AddMemberModal';
import { NewAllocationModal } from './NewAllocationModal';
import { ResourceDetailModal } from './ResourceDetailModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Search, Filter, Copy, UserPlus, Plus, Users, LayoutGrid, Calendar, Clock, FileText, ChevronLeft, ChevronRight, Lock, LockOpen } from 'lucide-react';
import { toast } from 'sonner';

type CapacityTab = 'roster' | 'grid' | 'timeline' | 'available' | 'vacancies' | 'reports';

export function CapacityPlanningPage() {
  const [activeTab, setActiveTab] = useState<CapacityTab>('roster');
  const [filterOpen, setFilterOpen] = useState(false);
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [newAllocationOpen, setNewAllocationOpen] = useState(false);
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);

  const {
    resources,
    allResources,
    projects,
    vacancies,
    stats,
    openVacancies,
    currentWeek,
    currentYear,
    startWeek,
    startYear,
    navigateWeeks,
    goToCurrentWeek,
    adminMode,
    gridChanges,
    handleGridChange,
    resetGridChanges,
    saveGridChanges,
    addResource,
    addAllocation,
    copyWeekAllocations,
    searchQuery,
    setSearchQuery,
    activeFilters,
    setActiveFilters,
    activeQuickFilters,
    toggleQuickFilter,
    clearAllFilters,
    isLocked,
    lockedBy,
    lockedAt,
    toggleLock,
  } = useCapacity();

  const selectedResource = selectedResourceId 
    ? allResources.find(r => r.id === selectedResourceId) 
    : null;

  const handleCopyWeek = (options: any) => {
    const count = copyWeekAllocations(options);
    toast.success(`Copied ${count} allocations to next week`);
    return count;
  };

  const handleAddMember = (data: any) => {
    addResource(data);
    toast.success('Team member added successfully');
  };

  const handleAddAllocation = (data: any) => {
    addAllocation(data);
    toast.success('Allocation created successfully');
  };

  const handleSave = () => {
    saveGridChanges();
    toast.success('Allocations saved successfully');
  };

  const handleReset = () => {
    resetGridChanges();
  };

  const filterCount = activeQuickFilters.length + Object.values(activeFilters).filter(v => v).length;

  return (
    <div className="flex-1 flex flex-col bg-background min-h-0">
      {/* Page Header - align header pattern */}
      <div className="h-[72px] border-b border-border bg-card flex-shrink-0 flex items-center px-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Capacity & Allocation Planning</h1>
          <p className="text-sm text-muted-foreground">Manage team capacity and allocations by week</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Summary Cards - 5 cards */}
        <CapacitySummaryCards
          totalMembers={stats.total}
          underallocated={stats.under}
          fullyAllocated={stats.full}
          overallocated={stats.over}
          openVacancies={openVacancies}
        />

        {/* Search, Week Navigation, and Actions */}
        <div className="flex items-center justify-between gap-4">
          {/* Search */}
          <div className="relative w-64 flex-shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Week Navigation */}
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-2 py-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => navigateWeeks(-4)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-1">
              {[0, 1, 2, 3].map((offset) => {
                let weekNum = startWeek + offset;
                let yearNum = startYear;
                if (weekNum > 52) {
                  weekNum = weekNum - 52;
                  yearNum++;
                }
                const isCurrentWeek = weekNum === currentWeek && yearNum === currentYear;
                
                return (
                  <div
                    key={`${yearNum}-${weekNum}`}
                    className={`px-3 py-1 text-xs font-medium rounded-md cursor-pointer transition-colors ${
                      isCurrentWeek 
                        ? 'bg-brand-gold text-white' 
                        : offset === 0 
                          ? 'bg-card border border-border text-foreground' 
                          : 'text-muted-foreground hover:bg-card'
                    }`}
                    onClick={() => {
                      if (!isCurrentWeek) goToCurrentWeek();
                    }}
                  >
                    W{weekNum}
                  </div>
                );
              })}
            </div>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => navigateWeeks(4)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 px-2 text-brand-gold hover:text-brand-gold-hover"
              onClick={goToCurrentWeek}
            >
              Today
            </Button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={() => setCopyModalOpen(true)} disabled={isLocked}>
                  <Copy className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy Week</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant={isLocked ? "default" : "outline"} 
                  size="icon" 
                  onClick={() => {
                    toggleLock('Current User');
                    toast.success(isLocked ? 'Allocations unlocked' : 'Allocations locked');
                  }}
                  className={isLocked ? "bg-muted-foreground hover:bg-muted-foreground/80 text-white" : ""}
                >
                  {isLocked ? <Lock className="h-4 w-4" /> : <LockOpen className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isLocked ? `Locked by ${lockedBy}` : 'Lock Allocations'}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={() => setAddMemberOpen(true)} disabled={isLocked}>
                  <UserPlus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Add Member</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="icon" 
                  onClick={() => setNewAllocationOpen(true)} 
                  className="bg-brand-gold hover:bg-brand-gold-hover text-white"
                  disabled={isLocked}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>New Allocation</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setFilterOpen(true)}
                  className="relative"
                >
                  <Filter className="h-4 w-4" />
                  {filterCount > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-brand-gold text-white text-xs">
                      {filterCount}
                    </Badge>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Filter</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Tabs - 6 tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as CapacityTab)}>
          <TabsList className="bg-muted/50">
            <TabsTrigger value="roster" className="data-[state=active]:text-[#c69c6d]">
              <Users className="h-4 w-4 mr-2" />
              People Roster
            </TabsTrigger>
            <TabsTrigger value="grid" className="data-[state=active]:text-[#c69c6d]">
              <LayoutGrid className="h-4 w-4 mr-2" />
              Project Grid
            </TabsTrigger>
            <TabsTrigger value="timeline" className="data-[state=active]:text-[#c69c6d]">
              <Calendar className="h-4 w-4 mr-2" />
              Timeline
            </TabsTrigger>
            <TabsTrigger value="available" className="data-[state=active]:text-[#c69c6d]">
              <Clock className="h-4 w-4 mr-2" />
              Available Capacity
            </TabsTrigger>
            <TabsTrigger value="vacancies" className="data-[state=active]:text-[#c69c6d]">
              Vacancies
              <Badge variant="secondary" className="ml-2 text-xs">{openVacancies}</Badge>
            </TabsTrigger>
            <TabsTrigger value="reports" className="data-[state=active]:text-[#c69c6d]">
              <FileText className="h-4 w-4 mr-2" />
              Executive Reports
            </TabsTrigger>
          </TabsList>

          {isLocked && lockedBy && lockedAt && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
              <Lock className="h-3 w-3" />
              <span>Locked by: {lockedBy} on {lockedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          )}

          <div className="mt-4">
            <TabsContent value="roster" className="m-0">
              <PeopleRoster
                resources={resources}
                projects={projects}
                startWeek={startWeek}
                startYear={startYear}
                onResourceClick={(id) => setSelectedResourceId(id)}
                onEdit={(id) => setSelectedResourceId(id)}
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
                onSave={handleSave}
                onReset={handleReset}
                isLocked={isLocked}
                lockedBy={lockedBy}
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

            <TabsContent value="available" className="m-0">
              <AvailableCapacityTab
                resources={allResources}
                projects={projects}
                currentWeek={currentWeek}
                currentYear={currentYear}
                onAllocate={(resourceId) => {
                  setSelectedResourceId(resourceId);
                  setNewAllocationOpen(true);
                }}
              />
            </TabsContent>

            <TabsContent value="vacancies" className="m-0">
              <VacancyCards 
                vacancies={vacancies} 
                projects={projects} 
                onFillGap={(vacancyId) => console.log('Fill gap:', vacancyId)}
              />
            </TabsContent>

            <TabsContent value="reports" className="m-0">
              <ExecutiveReportsTab
                resources={allResources}
                projects={projects}
                vacancies={vacancies}
                currentWeek={currentWeek}
                currentYear={currentYear}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Modals */}
      <FilterModal
        open={filterOpen}
        onOpenChange={setFilterOpen}
        activeFilters={activeFilters}
        activeQuickFilters={activeQuickFilters}
        onApplyFilters={setActiveFilters}
        onToggleQuickFilter={toggleQuickFilter}
        onClearAll={clearAllFilters}
      />

      <CopyWeekModal
        open={copyModalOpen}
        onOpenChange={setCopyModalOpen}
        fromWeek={startWeek}
        fromYear={startYear}
        resources={allResources}
        onCopy={handleCopyWeek}
      />

      <AddMemberModal
        open={addMemberOpen}
        onOpenChange={setAddMemberOpen}
        onAdd={handleAddMember}
      />

      <NewAllocationModal
        open={newAllocationOpen}
        onOpenChange={setNewAllocationOpen}
        resources={allResources}
        projects={projects}
        startWeek={startWeek}
        startYear={startYear}
        onAdd={handleAddAllocation}
      />

      <ResourceDetailModal
        open={!!selectedResourceId}
        onOpenChange={(open) => !open && setSelectedResourceId(null)}
        resource={selectedResource || null}
        projects={projects}
        startWeek={startWeek}
        startYear={startYear}
      />
    </div>
  );
}
