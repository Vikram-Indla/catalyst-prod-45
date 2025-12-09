import React, { useState } from 'react';
import Button from '@atlaskit/button';
import Tooltip from '@atlaskit/tooltip';
import BoardIcon from '@atlaskit/icon/glyph/board';
import BacklogIcon from '@atlaskit/icon/glyph/backlog';
import GraphLineIcon from '@atlaskit/icon/glyph/graph-line';
import IssuesIcon from '@atlaskit/icon/glyph/issues';
import ComponentIcon from '@atlaskit/icon/glyph/component';
import SettingsIcon from '@atlaskit/icon/glyph/settings';
import ChevronLeftIcon from '@atlaskit/icon/glyph/chevron-left';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';
import AddIcon from '@atlaskit/icon/glyph/add';

interface ProjectSidebarProps {
  projectKey: string;
  currentPage: string;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  href: string;
}

export default function ProjectSidebar({ projectKey, currentPage }: ProjectSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems: MenuItem[] = [
    {
      id: 'board',
      label: 'Board',
      icon: BoardIcon,
      href: `/projects/${projectKey}/board`,
    },
    {
      id: 'backlog',
      label: 'Backlog',
      icon: BacklogIcon,
      href: `/projects/${projectKey}/backlog`,
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: GraphLineIcon,
      href: `/projects/${projectKey}/reports`,
    },
    {
      id: 'issues',
      label: 'Issues',
      icon: IssuesIcon,
      href: `/projects/${projectKey}/issues`,
    },
    {
      id: 'components',
      label: 'Components',
      icon: ComponentIcon,
      href: `/projects/${projectKey}/components`,
    },
  ];

  return (
    <div style={{
      width: isCollapsed ? '48px' : '240px',
      background: '#F4F5F7',
      borderRight: '1px solid #DFE1E6',
      height: '100vh',
      position: 'sticky',
      top: '0px',
      transition: 'width 200ms',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* COLLAPSE BUTTON */}
      <div style={{
        padding: '12px',
        borderBottom: '1px solid #DFE1E6',
        display: 'flex',
        justifyContent: isCollapsed ? 'center' : 'flex-end',
      }}>
        <Tooltip content={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          <Button
            appearance="subtle"
            iconBefore={
              isCollapsed ? (
                <ChevronRightIcon label="Expand" size="small" />
              ) : (
                <ChevronLeftIcon label="Collapse" size="small" />
              )
            }
            onClick={() => setIsCollapsed(!isCollapsed)}
          />
        </Tooltip>
      </div>

      {/* MENU ITEMS */}
      <div style={{
        flex: 1,
        padding: '8px',
        overflowY: 'auto',
      }}>
        {menuItems.map((item) => (
          <SidebarItem
            key={item.id}
            item={item}
            isActive={currentPage === item.id}
            isCollapsed={isCollapsed}
          />
        ))}

        {/* DIVIDER */}
        <div style={{
          height: '1px',
          background: '#DFE1E6',
          margin: '8px 0',
        }} />

        {/* SETTINGS */}
        <SidebarItem
          item={{
            id: 'settings',
            label: 'Project settings',
            icon: SettingsIcon,
            href: `/projects/${projectKey}/settings`,
          }}
          isActive={currentPage === 'settings'}
          isCollapsed={isCollapsed}
        />
      </div>

      {/* FOOTER - CREATE SHORTCUT */}
      {!isCollapsed && (
        <div style={{
          padding: '12px',
          borderTop: '1px solid #DFE1E6',
        }}>
          <Button
            appearance="subtle"
            iconBefore={<AddIcon label="Add" size="small" />}
            shouldFitContainer
          >
            Add shortcut
          </Button>
        </div>
      )}
    </div>
  );
}

// ============================================
// SIDEBAR ITEM COMPONENT
// ============================================

function SidebarItem({ item, isActive, isCollapsed }: {
  item: MenuItem;
  isActive: boolean;
  isCollapsed: boolean;
}) {
  const Icon = item.icon;

  if (isCollapsed) {
    return (
      <Tooltip content={item.label} position="right">
        <a
          href={item.href}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px',
            marginBottom: '4px',
            borderRadius: '3px',
            background: isActive ? '#DEEBFF' : 'transparent',
            textDecoration: 'none',
            transition: 'background 150ms',
          }}
          onMouseEnter={(e) => {
            if (!isActive) {
              e.currentTarget.style.background = '#EBECF0';
            }
          }}
          onMouseLeave={(e) => {
            if (!isActive) {
              e.currentTarget.style.background = 'transparent';
            }
          }}
        >
          <Icon
            label={item.label}
            size="medium"
            primaryColor={isActive ? '#0052CC' : '#42526E'}
          />
        </a>
      </Tooltip>
    );
  }

  return (
    <a
      href={item.href}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        marginBottom: '4px',
        borderRadius: '3px',
        background: isActive ? '#DEEBFF' : 'transparent',
        textDecoration: 'none',
        transition: 'background 150ms',
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = '#EBECF0';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = 'transparent';
        }
      }}
    >
      <Icon
        label={item.label}
        size="medium"
        primaryColor={isActive ? '#0052CC' : '#42526E'}
      />
      <span style={{
        fontSize: '14px',
        fontWeight: isActive ? 600 : 400,
        color: isActive ? '#0052CC' : '#172B4D',
      }}>
        {item.label}
      </span>
    </a>
  );
}
