import React, { useState } from 'react';
import Avatar from '@atlaskit/avatar';
import Badge from '@atlaskit/badge';
import Button from '@atlaskit/button/standard-button';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import Lozenge from '@atlaskit/lozenge';
import { token } from '@atlaskit/tokens';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import StarIcon from '@atlaskit/icon/glyph/star';

// Mock data - replace "spaces" with "projects" in Catalyst terminology
const recentProjects = [
  { id: '1', key: 'SB', name: 'Senaei BAU', type: 'Company-managed software', color: '#0052CC', openCount: 18, doneCount: 0, boardsCount: 0 },
  { id: '2', key: 'IP', name: 'IP Implementation', type: 'Company-managed software', color: '#FF5630', openCount: 18, doneCount: 0, boardsCount: 1 },
  { id: '3', key: 'OB', name: 'One Backlog', type: 'Company-managed software', color: '#FFAB00', openCount: 0, doneCount: 0, boardsCount: 1 },
  { id: '4', key: 'ES', name: 'Enterprise Shared Servic...', type: 'Company-managed software', color: '#36B37E', openCount: 1, doneCount: 0, boardsCount: 2 },
  { id: '5', key: 'IC', name: 'ICP Project', type: 'Company-managed software', color: '#6554C0', openCount: 0, doneCount: 0, boardsCount: 1 },
];

const activityItems = [
  { key: 'US-02', id: 'IP-302', summary: 'View Detailed Performance Reviews (Innovator & Partner)', project: 'IP Implementation', updated: 'Updated' },
  { key: 'US-02', id: 'IP-341', summary: 'Innovator Submits Performance Review', project: 'IP Implementation', updated: 'Updated' },
  { key: 'US-01', id: 'IP-340', summary: 'Trigger Performance Review Period Automatically', project: 'IP Implementation', updated: 'Updated' },
  { key: 'US-03', id: 'IP-303', summary: 'View Evaluation Criteria for Context', project: 'IP Implementation', updated: 'Updated' },
  { key: 'US-03', id: 'IP-342', summary: 'Partner Submits Performance Review', project: 'IP Implementation', updated: 'Updated' },
  { key: 'US-04', id: 'IP-343', summary: 'Send Reminders for Pending Reviews', project: 'IP Implementation', updated: 'Updated' },
  { key: 'US-08', id: 'IP-467', summary: 'Configurable Evaluation Period for Selected Contracts', project: 'IP Implementation', updated: 'Updated' },
  { key: 'US-07', id: 'IP-346', summary: 'Mark Review as Not Submitted (System Auto)', project: 'IP Implementation', updated: 'Updated' },
  { key: 'US-06', id: 'IP-345', summary: 'Innovation Management Views Submitted Performance Reviews', project: 'IP Implementation', updated: 'Updated' },
  { key: 'US-05', id: 'IP-349', summary: 'Audit Logging for All Evaluation Actions', project: 'IP Implementation', updated: 'Updated' },
  { key: 'US-04', id: 'IP-348', summary: 'Export Performance Review Reports', project: 'IP Implementation', updated: 'Updated' },
];

function RecentProjectCard({ project }: { project: typeof recentProjects[0] }) {
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
      
      {/* Card content - padding 12px vertical, 16px horizontal */}
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
            {/* Card title: font-size 14px, font-weight 500 */}
            <div style={{
              fontSize: '14px',
              fontWeight: 500,
              color: '#172B4D',
              lineHeight: '20px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {project.name}
            </div>
            {/* Meta text: font-size 12px, color #626F86 */}
            <div style={{
              fontSize: '12px',
              color: '#626F86',
              lineHeight: '16px',
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
          }}>
            <span>My open work items</span>
            {project.openCount > 0 && (
              // Badge: height 20px, padding 2px 6px, font-size 12px
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
            fontSize: '14px',
            color: '#172B4D',
            textDecoration: 'none',
            padding: '4px 0',
          }}>
            Done work items
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

function ActivityRow({ item }: { item: typeof activityItems[0] }) {
  return (
    // Activity rows: padding 8px vertical, min-height 52px
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      padding: '8px 0',
      minHeight: '52px',
      borderBottom: '1px solid #EBECF0',
      gap: '12px',
    }}>
      {/* Star icon: margin-top 2px for alignment */}
      <div style={{ color: '#C1C7D0', flexShrink: 0, marginTop: '2px' }}>
        <StarIcon label="" size="medium" />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Title: font-size 14px, font-weight 500 */}
        <div style={{
          fontSize: '14px',
          color: '#172B4D',
          fontWeight: 500,
          lineHeight: '20px',
        }}>
          <span style={{ color: '#0052CC' }}>{item.key}</span>
          <span> — {item.summary}</span>
        </div>
        {/* Meta text: font-size 12px, color #626F86 */}
        <div style={{
          fontSize: '12px',
          color: '#626F86',
          marginTop: '4px',
        }}>
          {item.id} · {item.project}
        </div>
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        {/* "Updated" label: font-size 12px, color #626F86 */}
        <span style={{ fontSize: '12px', color: '#626F86' }}>{item.updated}</span>
        {/* Avatar clusters: margin -4px (tighter overlap) */}
        <div style={{ display: 'flex' }}>
          <Avatar size="small" />
          <div style={{ marginLeft: '-4px' }}>
            <Avatar size="small" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function HomeContent() {
  const [selectedTab, setSelectedTab] = useState(0);

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '32px 40px',
      backgroundColor: '#FFFFFF',
      minHeight: '100vh',
    }}>
      {/* Page title: font-size 32px, font-weight 600, line-height 1.25 */}
      <h1 style={{
        fontSize: '32px',
        fontWeight: 600,
        color: '#172B4D',
        marginBottom: '24px',
        lineHeight: 1.25,
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
          {/* Section header: font-size 14px, font-weight 400, color #626F86 */}
          <h2 style={{
            fontSize: '14px',
            fontWeight: 400,
            color: '#626F86',
            margin: 0,
          }}>
            Recent projects
          </h2>
          <a href="#" style={{
            fontSize: '14px',
            color: '#0052CC',
            textDecoration: 'none',
          }}>
            View all projects
          </a>
        </div>

        <div style={{
          display: 'flex',
          gap: '16px',
          overflowX: 'auto',
          paddingBottom: '8px',
        }}>
          {recentProjects.map((project) => (
            <RecentProjectCard key={project.id} project={project} />
          ))}
        </div>
      </div>

      {/* Activity Tabs with custom styling */}
      <style>{`
        #activity-tabs [role="tablist"] [role="tab"] {
          font-size: 13px !important;
          padding: 8px 12px !important;
          font-weight: 500 !important;
        }
        #activity-tabs [role="tablist"] [role="tab"][aria-selected="true"] {
          font-weight: 600 !important;
        }
      `}</style>
      <Tabs id="activity-tabs" onChange={setSelectedTab} selected={selectedTab}>
        <TabList>
          <Tab>Worked on</Tab>
          <Tab>Viewed</Tab>
          <Tab>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              Assigned to me
              {/* Badge: height 20px, padding 2px 6px, font-size 12px */}
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
                99+
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
            }}>
              Yesterday
            </div>
            {activityItems.map((item, index) => (
              <ActivityRow key={index} item={item} />
            ))}
          </div>
        </TabPanel>
        <TabPanel>
          <div style={{ padding: '40px', textAlign: 'center', color: '#626F86' }}>
            No recently viewed items
          </div>
        </TabPanel>
        <TabPanel>
          <div style={{ padding: '40px', textAlign: 'center', color: '#626F86' }}>
            No items assigned to you
          </div>
        </TabPanel>
        <TabPanel>
          <div style={{ padding: '40px', textAlign: 'center', color: '#626F86' }}>
            No starred items
          </div>
        </TabPanel>
        <TabPanel>
          <div style={{ padding: '40px', textAlign: 'center', color: '#626F86' }}>
            No boards available
          </div>
        </TabPanel>
      </Tabs>
    </div>
  );
}
