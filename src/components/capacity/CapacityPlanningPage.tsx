/**
 * Capacity & Allocation Planning Page
 * Complete rebuild following specification exactly
 */

import { useState } from 'react';
import { useCapacity } from '@/hooks/useCapacity';
import { CapacitySummaryCards } from './CapacitySummaryCards';
import { CapacityPreview } from './CapacityPreview';
import { PeopleRoster } from './PeopleRoster';
import { ProjectGrid } from './ProjectGrid';
import { TimelineView } from './TimelineView';
import { VacancyCards } from './VacancyCards';
import { AvailableCapacityTab } from './AvailableCapacityTab';
import { ExecutiveReportsTab } from './ExecutiveReportsTab';
import { FilterDrawer } from './FilterDrawer';
import { CopyWeekModal } from './CopyWeekModal';
import { AddMemberDrawer } from './AddMemberDrawer';
import { NewAllocationDrawer } from './NewAllocationDrawer';
import { ResourceDetailDrawer } from './ResourceDetailDrawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, Copy, UserPlus, Plus, Users, LayoutGrid, Calendar, Clock, FileText } from 'lucide-react';
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
      {/* Page Header */}
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground mb-1">
              Catalyst / Resource Management / Capacity & Allocation
            </div>
            <h1 className="text-xl font-semibold text-foreground">Capacity & Allocation Planning</h1>
            <p className="text-sm text-muted-foreground">Manage team capacity and allocations by week</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setCopyModalOpen(true)}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Week
            </Button>
            <Button variant="outline" onClick={() => setAddMemberOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Member
            </Button>
            <Button onClick={() => setNewAllocationOpen(true)} className="bg-[#c69c6d] hover:bg-[#8b7355] text-white">
              <Plus className="h-4 w-4 mr-2" />
              New Allocation
            </Button>
          </div>
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

        {/* Capacity Preview - 4 weeks (clickable to Available Capacity tab) */}
        <CapacityPreview
          weeks={capacityPreview}
          currentWeek={currentWeek}
          totalPeople={stats.total}
          onWeekClick={() => setActiveTab('available')}
        />

        {/* Search and Filter */}
        <div className="flex items-center justify-between">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button 
            variant="outline" 
            onClick={() => setFilterOpen(true)}
            className="relative"
          >
            <Filter className="h-4 w-4" />
            {filterCount > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-[#c69c6d] text-white text-xs">
                {filterCount}
              </Badge>
            )}
          </Button>
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

      {/* Drawers & Modals */}
      <FilterDrawer
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

      <AddMemberDrawer
        open={addMemberOpen}
        onOpenChange={setAddMemberOpen}
        onAdd={handleAddMember}
      />

      <NewAllocationDrawer
        open={newAllocationOpen}
        onOpenChange={setNewAllocationOpen}
        resources={allResources}
        projects={projects}
        startWeek={startWeek}
        startYear={startYear}
        onAdd={handleAddAllocation}
      />

      <ResourceDetailDrawer
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
