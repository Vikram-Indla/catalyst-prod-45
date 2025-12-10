import React, { useState } from 'react';
import Avatar from '@atlaskit/avatar';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import { projects, activityItems, Project, ActivityItem, groupItemsByTimePeriod } from '@/data/homePageData';
import { WorkItemTypeIcon } from './icons/WorkItemTypeIcon';

const ITEMS_PER_PAGE = 10;

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
      {/* Header accent bar */}
      <div style={{ height: '8px', backgroundColor: project.color }} />
      
      {/* Card content */}
      <div style={{ padding: '12px 12px 8px 12px' }}>
        {/* Project info row */}
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
            fontSize: '10px',
            fontWeight: 700,
            flexShrink: 0,
          }}>
            {project.key.slice(0, 2)}
          </div>
          <div style={{ minWidth: 0 }}>
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
            <div style={{
              fontSize: '12px',
              color: '#5E6C84',
              lineHeight: '16px',
              fontWeight: 400,
            }}>
              {project.type}
            </div>
          </div>
        </div>

        {/* Quick links label */}
        <div style={{ 
          fontSize: '11px', 
          color: '#5E6C84', 
          marginBottom: '4px', 
          fontWeight: 400,
          lineHeight: '14px',
        }}>
          Quick links
        </div>
        
        {/* Quick link items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
          <a href="#" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '14px',
            color: '#172B4D',
            textDecoration: 'none',
            padding: '6px 0',
            lineHeight: '20px',
            fontWeight: 400,
          }}>
            <span>My open work items</span>
            {project.openCount > 0 && (
              <span style={{
                backgroundColor: '#DFE1E6',
                borderRadius: '3px',
                padding: '0 6px',
                fontSize: '12px',
                fontWeight: 600,
                minWidth: '20px',
                height: '20px',
                lineHeight: '20px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
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
            padding: '6px 0',
            lineHeight: '20px',
            fontWeight: 400,
          }}>
            <span>Done work items</span>
          </a>
        </div>
      </div>

      {/* Boards footer */}
      <div style={{
        padding: '8px 12px',
        borderTop: '1px solid #DFE1E6',
      }}>
        <DropdownMenu
          trigger={({ triggerRef, ...props }) => (
            <button
              {...props}
              ref={triggerRef as React.Ref<HTMLButtonElement>}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
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
    <div style={{
      display: 'grid',
      gridTemplateColumns: '24px 1fr 60px 72px',
      alignItems: 'center',
      padding: '10px 0',
      gap: '12px',
    }}>
      {/* Icon column */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <WorkItemTypeIcon type={item.type} size={16} />
      </div>

      {/* Main content */}
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: '14px',
          color: '#172B4D',
          fontWeight: 400,
          lineHeight: '20px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {item.key} — {item.summary}
        </div>
        <div style={{
          fontSize: '12px',
          color: '#5E6C84',
          lineHeight: '16px',
          fontWeight: 400,
          marginTop: '2px',
        }}>
          {item.id} · {item.project}
        </div>
      </div>

      {/* Activity type label */}
      <div style={{
        fontSize: '12px',
        color: '#5E6C84',
        lineHeight: '16px',
        fontWeight: 400,
      }}>
        {item.activityType}
      </div>

      {/* Avatar stack */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ display: 'flex', marginLeft: '0' }}>
          <Avatar size="small" name={item.assignee} />
          <div style={{ marginLeft: '-8px' }}>
            <Avatar size="small" name="AA" appearance="circle" />
          </div>
        </div>
      </div>
    </div>
  );
}

function GroupedActivityList({ items, visibleCount, onLoadMore }: { 
  items: ActivityItem[]; 
  visibleCount: number;
  onLoadMore: () => void;
}) {
  const groupedItems = groupItemsByTimePeriod(items);
  let displayedCount = 0;
  const hasMore = visibleCount < items.length;

  return (
    <div style={{ marginTop: '20px' }}>
      {groupedItems.map((group, groupIndex) => {
        const remainingSlots = visibleCount - displayedCount;
        if (remainingSlots <= 0) return null;
        
        const itemsToShow = group.items.slice(0, remainingSlots);
        displayedCount += itemsToShow.length;

        return (
          <div key={groupIndex}>
            <div style={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#5E6C84',
              textTransform: 'uppercase',
              marginBottom: '4px',
              marginTop: groupIndex > 0 ? '16px' : '0',
              letterSpacing: '0',
              lineHeight: '16px',
            }}>
              {group.label}
            </div>
            {itemsToShow.map((item, index) => (
              <ActivityRow key={`${group.label}-${index}`} item={item} />
            ))}
          </div>
        );
      })}
      
      {/* Load more button */}
      {hasMore && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          marginTop: '24px',
          paddingBottom: '16px',
        }}>
          <button
            onClick={onLoadMore}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: 500,
              color: '#172B4D',
              backgroundColor: '#FFFFFF',
              border: '1px solid #DFE1E6',
              borderRadius: '3px',
              cursor: 'pointer',
              lineHeight: '20px',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#F4F5F7';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#FFFFFF';
            }}
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}

export function HomeContent() {
  const [selectedTab, setSelectedTab] = useState(0);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  const totalAssigned = activityItems.filter(item => 
    item.status !== 'In Production' && item.status !== 'Done'
  ).length;

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + ITEMS_PER_PAGE);
  };

  return (
    <div style={{
      padding: '24px 40px',
      backgroundColor: '#FFFFFF',
      minHeight: '100vh',
      fontFamily: '"Atlassian Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
    }}>
      {/* Page title */}
      <div style={{
        fontSize: '24px',
        fontWeight: 600,
        color: '#172B4D',
        lineHeight: '28px',
        letterSpacing: '-0.01em',
        margin: 0,
      }}>
        For you
      </div>

      {/* Divider */}
      <div style={{ 
        height: '1px',
        backgroundColor: '#EBECF0',
        marginTop: '24px',
        marginBottom: '20px',
      }} />

      {/* Recent Projects Section */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
        }}>
          <div style={{
            fontSize: '14px',
            fontWeight: 400,
            color: '#172B4D',
            margin: 0,
            lineHeight: '20px',
          }}>
            Recent projects
          </div>
          <a href="#" style={{
            fontSize: '14px',
            color: '#C69C6D',
            textDecoration: 'none',
            lineHeight: '20px',
            fontWeight: 400,
          }}>
            View all projects
          </a>
        </div>

        <div style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
        }}>
          {projects.map((project) => (
            <RecentProjectCard key={project.id} project={project} />
          ))}
        </div>
      </div>

      {/* Tabs */}
      <style>{`
        #activity-tabs [role="tablist"] {
          border-bottom: 1px solid #DFE1E6;
          gap: 0;
          padding: 0;
        }
        #activity-tabs [role="tablist"] [role="tab"] {
          font-size: 14px !important;
          line-height: 20px !important;
          padding: 8px 0 12px 0 !important;
          font-weight: 400 !important;
          color: #172B4D !important;
          margin-right: 24px;
          border-bottom: 2px solid transparent;
          margin-bottom: -1px;
          background: transparent !important;
        }
        #activity-tabs [role="tablist"] [role="tab"][aria-selected="true"] {
          font-weight: 600 !important;
          color: #C69C6D !important;
          border-bottom-color: #C69C6D;
        }
        #activity-tabs [role="tablist"] [role="tab"]:hover {
          background: transparent !important;
          color: #B8905F !important;
        }
        #activity-tabs [role="tablist"] [role="tab"]:focus {
          box-shadow: none !important;
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
                borderRadius: '3px',
                padding: '0 6px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#172B4D',
                height: '16px',
                lineHeight: '16px',
                display: 'inline-flex',
                alignItems: 'center',
              }}>
                {totalAssigned > 99 ? '99+' : totalAssigned}
              </span>
            </span>
          </Tab>
          <Tab>Starred</Tab>
          <Tab>Boards</Tab>
        </TabList>
        <TabPanel>
          <GroupedActivityList 
            items={activityItems} 
            visibleCount={visibleCount}
            onLoadMore={handleLoadMore}
          />
        </TabPanel>
        <TabPanel>
          <div style={{ padding: '40px', textAlign: 'center', color: '#5E6C84', fontSize: '14px', lineHeight: '20px' }}>
            No recently viewed items
          </div>
        </TabPanel>
        <TabPanel>
          <GroupedActivityList 
            items={activityItems.filter(item => item.status !== 'In Production' && item.status !== 'Done')} 
            visibleCount={visibleCount}
            onLoadMore={handleLoadMore}
          />
        </TabPanel>
        <TabPanel>
          <div style={{ padding: '40px', textAlign: 'center', color: '#5E6C84', fontSize: '14px', lineHeight: '20px' }}>
            No starred items
          </div>
        </TabPanel>
        <TabPanel>
          <div style={{ padding: '40px', textAlign: 'center', color: '#5E6C84', fontSize: '14px', lineHeight: '20px' }}>
            No boards available
          </div>
        </TabPanel>
      </Tabs>
    </div>
  );
}
