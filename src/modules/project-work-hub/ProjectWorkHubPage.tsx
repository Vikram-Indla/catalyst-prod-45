import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Globe, Grid3X3, List, Package, Archive, Users, MoreHorizontal, ChevronRight } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ads';
import { SummaryTab } from './components/tabs/SummaryTab';
import { KanbanBoardTab } from './components/tabs/KanbanBoardTab';
import { ListTab } from './components/tabs/ListTab';
import { ReleasesTab } from './components/tabs/ReleasesTab';
import { ArchivedTab } from './components/tabs/ArchivedTab';
import { FilterDrawer } from './components/FilterDrawer';
import { CreateWorkItemDropdown } from './components/CreateWorkItemDropdown';
import { WorkItemDetailsDrawer } from './components/WorkItemDetailsDrawer';
import { WorkHubFilters, WorkItem, WorkItemType, WorkHubTab } from './types';

export const ProjectWorkHubPage: React.FC = () => {
  const { projectId = 'default' } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<WorkHubTab>('summary');
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<WorkItem | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState<WorkItemType | null>(null);
  const [filters, setFilters] = useState<WorkHubFilters>({
    search: '',
    types: [],
    statuses: [],
    priorities: [],
    assignees: [],
    reporters: [],
    quarters: [],
    releaseVersions: [],
  });

  // Mock project name
  const projectName = 'ESS Defects Kanban';

  const handleItemClick = (item: WorkItem) => {
    // Feature: Navigate to full-page view instead of drawer
    if (item.type === 'FEATURE') {
      navigate(`/projects/${projectId}/features/${item.id}`);
      return;
    }
    // Other types: Open drawer for now
    setSelectedItem(item);
  };

  const handleCreateItem = (type: WorkItemType) => {
    setCreateDialogOpen(type);
  };

  const handleCreateSubmit = (data: Partial<WorkItem>) => {
    // Legacy handler for dialogs that still use onSubmit pattern
    // Feature and Story dialogs now handle their own mutations
    setCreateDialogOpen(null);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
          <a href="#" className="hover:text-foreground transition-colors">Spaces</a>
          <ChevronRight className="h-3.5 w-3.5" />
          <a href="#" className="hover:text-foreground transition-colors">Enterprise Shared Services</a>
        </nav>

        {/* Title Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-medium text-foreground">
              {projectName}
            </h1>
            {/* Users icon - disabled with tooltip */}
            <Tooltip content={<p>Coming soon</p>}>
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                <Users className="h-5 w-5 text-muted-foreground" />
              </Button>
            </Tooltip>
            {/* More icon - disabled with tooltip */}
            <Tooltip content={<p>Coming soon</p>}>
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
              </Button>
            </Tooltip>
          </div>

          <CreateWorkItemDropdown onSelect={handleCreateItem} />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as WorkHubTab)} className="flex-1 flex flex-col">
        <div className="border-b border-border bg-background">
          <TabsList className="h-auto bg-transparent rounded-none px-6 gap-1">
            <TabsTrigger 
              value="summary" 
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none py-3 px-3 gap-1.5"
            >
              <Globe className="h-4 w-4" />
              Summary
            </TabsTrigger>
            <TabsTrigger 
              value="board"
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none py-3 px-3 gap-1.5"
            >
              <Grid3X3 className="h-4 w-4" />
              Kanban board
            </TabsTrigger>
            <TabsTrigger 
              value="list"
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none py-3 px-3 gap-1.5"
            >
              <List className="h-4 w-4" />
              List
            </TabsTrigger>
            <TabsTrigger 
              value="releases"
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none py-3 px-3 gap-1.5"
            >
              <Package className="h-4 w-4" />
              Releases
            </TabsTrigger>
            <TabsTrigger 
              value="archived"
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none py-3 px-3 gap-1.5"
            >
              <Archive className="h-4 w-4" />
              Archived work items
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          <TabsContent value="summary" className="h-full m-0">
            <SummaryTab projectId={projectId} />
          </TabsContent>
          <TabsContent value="board" className="h-full m-0">
            <KanbanBoardTab 
              projectId={projectId} 
              onItemClick={handleItemClick}
            />
          </TabsContent>
          <TabsContent value="list" className="h-full m-0">
            <ListTab 
              projectId={projectId} 
              onItemClick={handleItemClick}
              onFilterClick={() => setFilterDrawerOpen(true)}
            />
          </TabsContent>
          <TabsContent value="releases" className="h-full m-0">
            <ReleasesTab 
              projectId={projectId}
              onCreateVersion={() => {}}
              onVersionClick={() => {}}
            />
          </TabsContent>
          <TabsContent value="archived" className="h-full m-0">
            <ArchivedTab projectId={projectId} />
          </TabsContent>
        </div>
      </Tabs>

      {/* Filter Drawer */}
      <FilterDrawer
        isOpen={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        filters={filters}
        onApply={setFilters}
      />

      {/* Work Item Details Drawer */}
      <WorkItemDetailsDrawer
        item={selectedItem}
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
      />

    </div>
  );
};

export default ProjectWorkHubPage;
