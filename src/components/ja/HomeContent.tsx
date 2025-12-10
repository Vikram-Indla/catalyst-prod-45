import React, { useState } from 'react';
import Avatar from '@atlaskit/avatar';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import { projects, activityItems, Project, ActivityItem } from '@/data/homePageData';
import { WorkItemTypeIcon } from './icons/WorkItemTypeIcon';

function RecentProjectCard({ project }: { project: Project }) {
  return (
    <div style={{
      width: '200px',
      minWidth: '200px',
      border: '1px solid #DFE1E6',
      borderRadius: '3px',
      backgroundColor: '#FFFFFF',
      overflow: 'hidden',
    }}>
      {/* Header with accent color */}
      <div style={{ height: '4px', backgroundColor: project.color }} />
      
      {/* Card content - padding 12-16px */}
      <div style={{ padding: '12px 16px' }}>
        {/* Project info */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '12px' }}>
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '3px',
            backgroundColor: project.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontSize: '11px',
            fontWeight: 600,
            flexShrink: 0,
          }}>
            {project.key.slice(0, 2)}
          </div>
          <div style={{ minWidth: 0 }}>
            {/* Card title: 14/20, weight 600 */}
            <div style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#172B4D',
              lineHeight: '20px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {project.name}
            </div>
            {/* Meta text: 12/16, weight 400 */}
            <div style={{
              fontSize: '12px',
              color: '#626F86',
              lineHeight: '16px',
              fontWeight: 400,
              marginTop: '2px',
            }}>
              {project.type}
            </div>
          </div>
        </div>

        {/* Quick links section */}
        <div style={{ fontSize: '11px', color: '#626F86', marginBottom: '8px', fontWeight: 500 }}>
          Quick links
        </div>
        
        {/* Quick links: gap 4px */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <a href="#" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '14px',
            color: '#172B4D',
            textDecoration: 'none',
            padding: '4px 0',
            lineHeight: '20px',
            fontWeight: 400,
          }}>
            <span>My open work items</span>
            {project.openCount > 0 && (
              <span style={{
                backgroundColor: '#DFE1E6',
                borderRadius: '10px',
                padding: '2px 6px',
                fontSize: '12px',
                fontWeight: 500,
                height: '20px',
                lineHeight: '16px',
                display: 'inline-flex',
                alignItems: 'center',
              }}>
                {project.openCount}
              </span>
            )}
          </a>
          <a href="#" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '14px',
            color: '#172B4D',
            textDecoration: 'none',
            padding: '4px 0',
            lineHeight: '20px',
            fontWeight: 400,
          }}>
            <span>Done work items</span>
            {project.doneCount > 0 && (
              <span style={{
                backgroundColor: '#DFE1E6',
                borderRadius: '10px',
                padding: '2px 6px',
                fontSize: '12px',
                fontWeight: 500,
                height: '20px',
                lineHeight: '16px',
                display: 'inline-flex',
                alignItems: 'center',
              }}>
                {project.doneCount}
              </span>
            )}
          </a>
        </div>
      </div>

      {/* Boards footer */}
      <div style={{
        padding: '8px 16px',
        borderTop: '1px solid #DFE1E6',
        backgroundColor: '#FAFBFC',
      }}>
        <DropdownMenu
          trigger={({ triggerRef, ...props }) => (
            <button
              {...props}
              ref={triggerRef as React.Ref<HTMLButtonElement>}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '14px',
                color: project.boardsCount > 0 ? '#172B4D' : '#A5ADBA',
                background: 'none',
                border: 'none',
                cursor: project.boardsCount > 0 ? 'pointer' : 'default',
                padding: 0,
                lineHeight: '20px',
                fontWeight: 400,
              }}
              disabled={project.boardsCount === 0}
            >
              {project.boardsCount} {project.boardsCount === 1 ? 'board' : 'boards'}
              {project.boardsCount > 0 && <ChevronDownIcon label="" size="small" />}
            </button>
          )}
        >
          <DropdownItemGroup>
            <DropdownItem>Board 1</DropdownItem>
          </DropdownItemGroup>
        </DropdownMenu>
      </div>
    </div>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  return (
    // 4-column layout: icon (24px), content (1fr), Updated (~70px), avatars (~72px)
    <div style={{
      display: 'grid',
      gridTemplateColumns: '24px 1fr 70px 72px',
      alignItems: 'center',
      padding: '12px 0',
      borderBottom: '1px solid #EBECF0',
      gap: '12px',
    }}>
      {/* Column 1: Work item type icon (24px) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <WorkItemTypeIcon type={item.type} size={16} />
      </div>

      {/* Column 2: Main content (1fr) */}
      <div style={{ minWidth: 0 }}>
        {/* Title: 14/20, weight 500 */}
        <div style={{
          fontSize: '14px',
          color: '#172B4D',
          fontWeight: 500,
          lineHeight: '20px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          <span style={{ color: '#0052CC' }}>{item.key}</span>
          <span> — {item.summary}</span>
        </div>
        {/* Subtext: 12/16 */}
        <div style={{
          fontSize: '12px',
          color: '#626F86',
          lineHeight: '16px',
          fontWeight: 400,
          marginTop: '2px',
        }}>
          {item.id} · {item.project}
        </div>
      </div>

      {/* Column 3: Updated status (~70px) */}
      <div style={{
        fontSize: '12px',
        color: '#626F86',
        lineHeight: '16px',
        fontWeight: 400,
        textAlign: 'left',
      }}>
        {item.status}
      </div>

      {/* Column 4: Avatar (~72px), pinned right */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Avatar size="small" name={item.assignee} />
      </div>
    </div>
  );
}

export function HomeContent() {
  const [selectedTab, setSelectedTab] = useState(0);

  // Calculate total assigned items
  const totalAssigned = activityItems.filter(item => 
    item.status !== 'In Production' && item.status !== 'Done'
  ).length;

  return (
    <div style={{
      padding: '32px 40px',
      backgroundColor: '#FFFFFF',
      minHeight: '100vh',
      fontSize: '14px',
      lineHeight: '20px',
      fontWeight: 400,
      color: '#172B4D',
    }}>
      {/* H1: 24/28, weight 600 */}
      <h1 style={{
        fontSize: '24px',
        fontWeight: 600,
        color: '#172B4D',
        lineHeight: '28px',
        margin: 0,
        marginBottom: '24px',
      }}>
        For you
      </h1>

      {/* Recent Projects Section */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}>
          {/* Section label: 14/20, weight 600 */}
          <h2 style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#626F86',
            margin: 0,
            lineHeight: '20px',
          }}>
            Recent projects
          </h2>
          <a href="#" style={{
            fontSize: '14px',
            color: '#0052CC',
            textDecoration: 'none',
            lineHeight: '20px',
            fontWeight: 400,
          }}>
            View all projects
          </a>
        </div>

        {/* Cards with 16px gap */}
        <div style={{
          display: 'flex',
          gap: '16px',
          overflowX: 'auto',
          paddingBottom: '8px',
        }}>
          {projects.map((project) => (
            <RecentProjectCard key={project.id} project={project} />
          ))}
        </div>
      </div>

      {/* Activity Tabs with Jira-style styling */}
      <style>{`
        #activity-tabs [role="tablist"] {
          border-bottom: 1px solid #DFE1E6;
          gap: 16px;
        }
        #activity-tabs [role="tablist"] [role="tab"] {
          font-size: 14px !important;
          line-height: 20px !important;
          padding: 12px 0 !important;
          font-weight: 500 !important;
          margin-right: 16px;
          border-bottom: 2px solid transparent;
          margin-bottom: -1px;
        }
        #activity-tabs [role="tablist"] [role="tab"][aria-selected="true"] {
          font-weight: 600 !important;
          border-bottom-color: #0052CC;
        }
        #activity-tabs [role="tablist"] [role="tab"]:hover {
          background: transparent;
        }
      `}</style>
      <Tabs id="activity-tabs" onChange={setSelectedTab} selected={selectedTab}>
        <TabList>
          <Tab>Worked on</Tab>
          <Tab>Viewed</Tab>
          <Tab>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              Assigned to me
              <span style={{
                backgroundColor: '#DFE1E6',
                borderRadius: '10px',
                padding: '2px 6px',
                fontSize: '12px',
                fontWeight: 500,
                color: '#172B4D',
                height: '20px',
                lineHeight: '16px',
                display: 'inline-flex',
                alignItems: 'center',
              }}>
                {totalAssigned}
              </span>
            </span>
          </Tab>
          <Tab>Starred</Tab>
          <Tab>Boards</Tab>
        </TabList>
        <TabPanel>
          <div style={{ marginTop: '16px' }}>
            <div style={{
              fontSize: '11px',
              fontWeight: 600,
              color: '#626F86',
              textTransform: 'uppercase',
              marginBottom: '8px',
              letterSpacing: '0.5px',
              lineHeight: '16px',
            }}>
              Recent Activity
            </div>
            {activityItems.map((item, index) => (
              <ActivityRow key={index} item={item} />
            ))}
          </div>
        </TabPanel>
        <TabPanel>
          <div style={{ padding: '40px', textAlign: 'center', color: '#626F86', fontSize: '14px', lineHeight: '20px' }}>
            No recently viewed items
          </div>
        </TabPanel>
        <TabPanel>
          <div style={{ marginTop: '16px' }}>
            <div style={{
              fontSize: '11px',
              fontWeight: 600,
              color: '#626F86',
              textTransform: 'uppercase',
              marginBottom: '8px',
              letterSpacing: '0.5px',
              lineHeight: '16px',
            }}>
              Assigned Work Items
            </div>
            {activityItems
              .filter(item => item.status !== 'In Production' && item.status !== 'Done')
              .map((item, index) => (
                <ActivityRow key={index} item={item} />
              ))}
          </div>
        </TabPanel>
        <TabPanel>
          <div style={{ padding: '40px', textAlign: 'center', color: '#626F86', fontSize: '14px', lineHeight: '20px' }}>
            No starred items
          </div>
        </TabPanel>
        <TabPanel>
          <div style={{ padding: '40px', textAlign: 'center', color: '#626F86', fontSize: '14px', lineHeight: '20px' }}>
            No boards available
          </div>
        </TabPanel>
      </Tabs>
    </div>
  );
}
