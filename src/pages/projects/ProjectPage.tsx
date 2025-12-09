import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { token } from '@atlaskit/tokens';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import Breadcrumbs, { BreadcrumbsItem } from '@atlaskit/breadcrumbs';
import Button from '@atlaskit/button';
import SettingsIcon from '@atlaskit/icon/glyph/settings';
import MoreIcon from '@atlaskit/icon/glyph/more';
import { mockProjectData } from '../../data/mockProjectData';
import SummaryView from './views/SummaryView';
import ListView from './views/ListView';
import KanbanView from './views/KanbanView';
import AllWorkView from './views/AllWorkView';

export default function ProjectPage() {
  const { projectKey } = useParams<{ projectKey: string }>();
  const [activeTab, setActiveTab] = useState(0);
  
  const project = mockProjectData; // In real app, fetch by projectKey

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 56px)',
      background: token('elevation.surface'),
    }}>
      {/* BREADCRUMBS */}
      <div style={{
        padding: `${token('space.150')} ${token('space.300')}`,
        borderBottom: `1px solid ${token('color.border')}`,
      }}>
        <Breadcrumbs>
          <BreadcrumbsItem href="/projects" text="Projects" />
          <BreadcrumbsItem text={project.name} />
        </Breadcrumbs>
      </div>

      {/* PROJECT HEADER */}
      <div style={{
        padding: `${token('space.200')} ${token('space.300')}`,
        borderBottom: `1px solid ${token('color.border')}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: token('space.150') }}>
          <div style={{
            width: '32px',
            height: '32px',
            background: token('color.background.discovery'),
            borderRadius: token('border.radius'),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
          }}>
            📊
          </div>
          <h2 style={{
            fontSize: '24px',
            fontWeight: 500,
            color: token('color.text'),
            margin: 0,
          }}>
            {project.name}
          </h2>
          <span style={{
            fontSize: '14px',
            color: token('color.text.subtlest'),
          }}>
            {project.key}
          </span>
        </div>

        <div style={{ display: 'flex', gap: token('space.100') }}>
          <Button appearance="subtle" iconBefore={<SettingsIcon label="Settings" size="small" />} />
          <Button appearance="subtle" iconBefore={<MoreIcon label="More" size="small" />} />
        </div>
      </div>

      {/* TABS */}
      <Tabs id="project-tabs" onChange={setActiveTab}>
        <TabList>
          <Tab>Summary</Tab>
          <Tab>List</Tab>
          <Tab>Kanban board</Tab>
          <Tab>All work</Tab>
        </TabList>

        <TabPanel>
          <SummaryView project={project} />
        </TabPanel>

        <TabPanel>
          <ListView project={project} />
        </TabPanel>

        <TabPanel>
          <KanbanView project={project} />
        </TabPanel>

        <TabPanel>
          <AllWorkView project={project} />
        </TabPanel>
      </Tabs>
    </div>
  );
}
