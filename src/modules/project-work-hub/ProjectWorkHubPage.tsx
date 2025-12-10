import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { token } from '@atlaskit/tokens';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import Breadcrumbs, { BreadcrumbsItem } from '@atlaskit/breadcrumbs';
import { Globe, Grid3X3, List, Package, Archive, Users, MoreHorizontal } from 'lucide-react';
import { SummaryTab } from './components/tabs/SummaryTab';
import { KanbanBoardTab } from './components/tabs/KanbanBoardTab';
import { ListTab } from './components/tabs/ListTab';
import { ReleasesTab } from './components/tabs/ReleasesTab';
import { ArchivedTab } from './components/tabs/ArchivedTab';
import { FilterDrawer } from './components/FilterDrawer';
import { CreateWorkItemDropdown } from './components/CreateWorkItemDropdown';
import { WorkHubFilters, WorkItem, WorkItemType, WorkHubTab } from './types';

export const ProjectWorkHubPage: React.FC = () => {
  const { projectId = 'default' } = useParams();
  const [activeTab, setActiveTab] = useState<WorkHubTab>('summary');
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<WorkItem | null>(null);
  const [createItemType, setCreateItemType] = useState<WorkItemType | null>(null);
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
    setSelectedItem(item);
  };

  const handleCreateItem = (type: WorkItemType) => {
    setCreateItemType(type);
    // TODO: Open create dialog
  };

  const tabIndex = ['summary', 'board', 'list', 'releases', 'archived'].indexOf(activeTab);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      backgroundColor: token('elevation.surface', '#FFFFFF'),
    }}>
      {/* Header */}
      <div style={{
        padding: `${token('space.200', '16px')} ${token('space.300', '24px')}`,
        borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
      }}>
        {/* Breadcrumb */}
        <div style={{ marginBottom: token('space.100', '8px') }}>
          <Breadcrumbs>
            <BreadcrumbsItem href="#" text="Spaces" />
            <BreadcrumbsItem href="#" text="Enterprise Shared Services" />
          </Breadcrumbs>
        </div>

        {/* Title Row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: token('space.150', '12px') }}>
            <h1 style={{ 
              fontSize: '24px', 
              fontWeight: 500, 
              color: token('color.text', '#172B4D'),
              margin: 0,
            }}>
              {projectName}
            </h1>
            <button
              style={{
                padding: token('space.050', '4px'),
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: token('color.icon', '#5E6C84'),
              }}
            >
              <Users size={20} />
            </button>
            <button
              style={{
                padding: token('space.050', '4px'),
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: token('color.icon', '#5E6C84'),
              }}
            >
              <MoreHorizontal size={20} />
            </button>
          </div>

          <CreateWorkItemDropdown onSelect={handleCreateItem} />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ 
        borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
        backgroundColor: token('elevation.surface', '#FFFFFF'),
      }}>
        <Tabs
          id="work-hub-tabs"
          onChange={(index) => setActiveTab(['summary', 'board', 'list', 'releases', 'archived'][index] as WorkHubTab)}
          selected={tabIndex}
        >
          <TabList>
            <Tab>
              <div style={{ display: 'flex', alignItems: 'center', gap: token('space.050', '4px') }}>
                <Globe size={16} />
                Summary
              </div>
            </Tab>
            <Tab>
              <div style={{ display: 'flex', alignItems: 'center', gap: token('space.050', '4px') }}>
                <Grid3X3 size={16} />
                Kanban board
              </div>
            </Tab>
            <Tab>
              <div style={{ display: 'flex', alignItems: 'center', gap: token('space.050', '4px') }}>
                <List size={16} />
                List
              </div>
            </Tab>
            <Tab>
              <div style={{ display: 'flex', alignItems: 'center', gap: token('space.050', '4px') }}>
                <Package size={16} />
                Releases
              </div>
            </Tab>
            <Tab>
              <div style={{ display: 'flex', alignItems: 'center', gap: token('space.050', '4px') }}>
                <Archive size={16} />
                Archived work items
              </div>
            </Tab>
          </TabList>
        </Tabs>
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeTab === 'summary' && (
          <SummaryTab projectId={projectId} />
        )}
        {activeTab === 'board' && (
          <KanbanBoardTab 
            projectId={projectId} 
            onItemClick={handleItemClick}
          />
        )}
        {activeTab === 'list' && (
          <ListTab 
            projectId={projectId} 
            onItemClick={handleItemClick}
            onFilterClick={() => setFilterDrawerOpen(true)}
          />
        )}
        {activeTab === 'releases' && (
          <ReleasesTab 
            projectId={projectId}
            onCreateVersion={() => {}}
            onVersionClick={() => {}}
          />
        )}
        {activeTab === 'archived' && (
          <ArchivedTab projectId={projectId} />
        )}
      </div>

      {/* Filter Drawer */}
      <FilterDrawer
        isOpen={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        filters={filters}
        onApply={setFilters}
      />
    </div>
  );
};

export default ProjectWorkHubPage;
