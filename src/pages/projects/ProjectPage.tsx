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

export default function ProjectPage() {
  const { projectKey } = useParams<{ projectKey: string }>();
  const [activeTab, setActiveTab] = useState(0);
  
  const project = mockProjectData;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      background: token('elevation.surface'),
      width: '100%',
    }}>
      {/* BREADCRUMBS */}
      <div style={{
        padding: '12px 24px',
        borderBottom: `1px solid ${token('color.border')}`,
        background: token('elevation.surface'),
      }}>
        <Breadcrumbs>
          <BreadcrumbsItem href="/projects" text="Projects" />
          <BreadcrumbsItem text={project.name} />
        </Breadcrumbs>
      </div>

      {/* PROJECT HEADER */}
      <div style={{
        padding: '16px 24px',
        borderBottom: `1px solid ${token('color.border')}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: token('elevation.surface'),
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            background: token('color.background.discovery'),
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
          }}>
            📊
          </div>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 500,
            color: token('color.text'),
            margin: 0,
            lineHeight: 1.2,
          }}>
            {project.name}
          </h1>
          <span style={{
            fontSize: '14px',
            color: token('color.text.subtlest'),
          }}>
            {project.key}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button appearance="subtle" iconBefore={<SettingsIcon label="Settings" size="small" />} />
          <Button appearance="subtle" iconBefore={<MoreIcon label="More" size="small" />} />
        </div>
      </div>

      {/* TABS */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Tabs id="project-tabs" onChange={setActiveTab}>
          <div style={{ 
            borderBottom: `1px solid ${token('color.border')}`,
            paddingLeft: '24px',
            background: token('elevation.surface'),
          }}>
            <TabList>
              <Tab>Summary</Tab>
              <Tab>List</Tab>
              <Tab>Kanban board</Tab>
              <Tab>All work</Tab>
            </TabList>
          </div>

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
            <ListView project={project} />
          </TabPanel>
        </Tabs>
      </div>
    </div>
  );
}
