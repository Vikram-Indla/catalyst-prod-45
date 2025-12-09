import React, { useState } from 'react';
import Breadcrumbs, { BreadcrumbsItem } from '@atlaskit/breadcrumbs';
import Button from '@atlaskit/button';
import Avatar from '@atlaskit/avatar';
import Tooltip from '@atlaskit/tooltip';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import StarIcon from '@atlaskit/icon/glyph/star';
import StarFilledIcon from '@atlaskit/icon/glyph/star-filled';
import SettingsIcon from '@atlaskit/icon/glyph/settings';
import MoreIcon from '@atlaskit/icon/glyph/more';
import SearchIcon from '@atlaskit/icon/glyph/search';
import AddIcon from '@atlaskit/icon/glyph/add';

interface Project {
  id: string;
  key: string;
  name: string;
  programKey: string;
  programName: string;
  lead: {
    name: string;
    avatar?: string;
  };
  isStarred: boolean;
}

interface ProjectHeaderProps {
  project: Project;
  currentTab: 'board' | 'list' | 'releases' | 'all-work' | 'release-management';
  onTabChange: (tab: string) => void;
  onToggleStar: () => void;
}

export default function ProjectHeader({
  project,
  currentTab,
  onTabChange,
  onToggleStar,
}: ProjectHeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div style={{
      background: '#FFFFFF',
      borderBottom: '1px solid #DFE1E6',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      {/* BREADCRUMBS & ACTIONS */}
      <div style={{
        padding: '12px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ flex: 1 }}>
          <Breadcrumbs>
            <BreadcrumbsItem href="/programs" text="Programs" />
            <BreadcrumbsItem
              href={`/programs/${project.programKey}`}
              text={project.programName}
            />
            <BreadcrumbsItem text={project.name} />
          </Breadcrumbs>
        </div>

        {/* ACTIONS */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <Button
            appearance="subtle"
            iconBefore={<SearchIcon label="Search" size="small" />}
            onClick={() => setSearchOpen(!searchOpen)}
          />

          <Button
            appearance="subtle"
            iconBefore={
              project.isStarred ? (
                <StarFilledIcon 
                  label="Starred" 
                  size="small" 
                  primaryColor="#FFAB00"
                />
              ) : (
                <StarIcon 
                  label="Star" 
                  size="small"
                />
              )
            }
            onClick={onToggleStar}
          />

          <Button
            appearance="subtle"
            iconBefore={<SettingsIcon label="Settings" size="small" />}
            href={`/projects/${project.key}/settings`}
          />

          <DropdownMenu
            trigger={({ triggerRef, ...props }) => (
              <Button
                {...props}
                ref={triggerRef}
                appearance="subtle"
                iconBefore={<MoreIcon label="More" size="small" />}
              />
            )}
          >
            <DropdownItemGroup>
              <DropdownItem>Project details</DropdownItem>
              <DropdownItem>Export issues</DropdownItem>
              <DropdownItem>Archive project</DropdownItem>
            </DropdownItemGroup>
          </DropdownMenu>
        </div>
      </div>

      {/* PROJECT INFO */}
      <div style={{
        padding: '0 40px 12px 40px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <h1 style={{
          fontSize: '20px',
          fontWeight: 500,
          lineHeight: '24px',
          color: '#172B4D',
          margin: 0,
        }}>
          {project.name}
        </h1>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '12px',
          color: '#5E6C84',
        }}>
          <span>•</span>
          <span>{project.key}</span>
          <span>•</span>
          <Tooltip content={project.lead.name}>
            <Avatar
              size="xsmall"
              src={project.lead.avatar}
              name={project.lead.name}
            />
          </Tooltip>
        </div>
      </div>

      {/* TABS */}
      <div style={{
        padding: '0 40px',
        borderTop: '1px solid #DFE1E6',
      }}>
        <div style={{
          display: 'flex',
          gap: '24px',
        }}>
          <TabItem
            label="Kanban board"
            isActive={currentTab === 'board'}
            onClick={() => onTabChange('board')}
            href={`/projects/${project.key}/board`}
          />
          <TabItem
            label="List"
            isActive={currentTab === 'list'}
            onClick={() => onTabChange('list')}
            href={`/projects/${project.key}/list`}
          />
          <TabItem
            label="Releases"
            isActive={currentTab === 'releases'}
            onClick={() => onTabChange('releases')}
            href={`/projects/${project.key}/releases`}
          />
          <TabItem
            label="All work"
            isActive={currentTab === 'all-work'}
            onClick={() => onTabChange('all-work')}
            href={`/projects/${project.key}/all-work`}
          />
          <TabItem
            label="Release Management"
            isActive={currentTab === 'release-management'}
            onClick={() => onTabChange('release-management')}
            href={`/projects/${project.key}/release-management`}
          />

          {/* ADD TAB BUTTON */}
          <button
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: '2px solid transparent',
              padding: '8px 0',
              fontSize: '14px',
              fontWeight: 500,
              color: '#6B778C',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <AddIcon label="Add" size="small" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// TAB ITEM COMPONENT
// ============================================

function TabItem({ label, isActive, onClick, href }: {
  label: string;
  isActive: boolean;
  onClick: () => void;
  href: string;
}) {
  return (
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      style={{
        background: 'transparent',
        border: 'none',
        borderBottom: isActive ? '2px solid #0052CC' : '2px solid transparent',
        padding: '8px 0',
        fontSize: '14px',
        fontWeight: 500,
        color: isActive ? '#0052CC' : '#42526E',
        cursor: 'pointer',
        textDecoration: 'none',
        display: 'block',
        marginBottom: '-1px',
      }}
    >
      {label}
    </a>
  );
}
