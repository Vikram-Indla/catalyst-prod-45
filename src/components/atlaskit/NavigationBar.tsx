import React, { useState } from 'react';
import {
  AtlassianNavigation,
  PrimaryButton,
  ProductHome,
  Settings,
  Help,
  Profile,
} from '@atlaskit/atlassian-navigation';
import Button from '@atlaskit/button';
import Popup from '@atlaskit/popup';
import Avatar from '@atlaskit/avatar';
import SearchIcon from '@atlaskit/icon/glyph/search';
import AddIcon from '@atlaskit/icon/glyph/add';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';

interface Program {
  id: string;
  key: string;
  name: string;
  isDefault: boolean;
}

interface Project {
  id: string;
  key: string;
  name: string;
  programName: string;
  icon: string;
  iconBg: string;
}

export default function NavigationBar() {
  const [isProgramOpen, setIsProgramOpen] = useState(false);
  const [isProjectOpen, setIsProjectOpen] = useState(false);

  return (
    <AtlassianNavigation
      label="Catalyst"
      primaryItems={[
        <PrimaryButton href="/" key="home">
          Home
        </PrimaryButton>,
        <PrimaryButton href="/enterprise" key="enterprise">
          Enterprise
        </PrimaryButton>,
        <PrimaryButton href="/demand" key="demand">
          Demand
        </PrimaryButton>,
        <ProgramDropdown
          key="program"
          isOpen={isProgramOpen}
          setIsOpen={setIsProgramOpen}
        />,
        <ProjectDropdown
          key="project"
          isOpen={isProjectOpen}
          setIsOpen={setIsProjectOpen}
        />,
        <PrimaryButton href="/release" key="release">
          Release
        </PrimaryButton>,
        <PrimaryButton href="/items" key="items">
          Items
        </PrimaryButton>,
      ]}
      renderProductHome={() => (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0 8px',
        }}>
          <span style={{
            fontSize: '20px',
            fontWeight: 600,
            color: '#FFFFFF',
          }}>
            Catalyst
          </span>
        </div>
      )}
      renderSearch={() => (
        <Button
          appearance="subtle"
          iconBefore={<SearchIcon label="Search" size="medium" />}
        />
      )}
      renderCreate={() => (
        <Button
          appearance="primary"
          iconBefore={<AddIcon label="Create" size="small" />}
        >
          Create
        </Button>
      )}
      renderSettings={() => <Settings tooltip="Settings" />}
      renderHelp={() => <Help tooltip="Help" />}
      renderProfile={() => (
        <Profile
          icon={
            <Avatar
              size="small"
              name="User"
            />
          }
          tooltip="Your profile"
        />
      )}
    />
  );
}

// ============================================
// PROGRAM DROPDOWN
// ============================================

function ProgramDropdown({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: (open: boolean) => void }) {
  return (
    <Popup
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      placement="bottom-start"
      content={() => (
        <ProgramDropdownContent onClose={() => setIsOpen(false)} />
      )}
      trigger={(triggerProps) => (
        <Button
          {...triggerProps}
          appearance="subtle"
          iconAfter={<ChevronDownIcon label="Program" size="small" />}
          onClick={() => setIsOpen(!isOpen)}
          isSelected={isOpen}
        >
          Program
        </Button>
      )}
    />
  );
}

function ProgramDropdownContent({ onClose }: { onClose: () => void }) {
  return (
    <div style={{
      width: '320px',
      background: '#FFFFFF',
      borderRadius: '3px',
      boxShadow: '0 4px 8px rgba(9, 30, 66, 0.25)',
      padding: '8px 0',
    }}>
      {/* HEADER */}
      <div style={{
        padding: '8px 16px',
        borderBottom: '1px solid #DFE1E6',
      }}>
        <h3 style={{
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: '#5E6C84',
          margin: 0,
        }}>
          Recent programs
        </h3>
      </div>

      {/* RECENT PROGRAMS */}
      <div style={{ padding: '4px 0' }}>
        {mockPrograms.map((program) => (
          <a
            key={program.id}
            href={`/programs/${program.key}`}
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '8px 16px',
              textDecoration: 'none',
              transition: 'background 150ms',
              background: 'transparent',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#F4F5F7';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <div style={{
              width: '24px',
              height: '24px',
              background: '#FFC400',
              borderRadius: '3px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              flexShrink: 0,
            }}>
              📁
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '14px',
                fontWeight: 500,
                color: '#172B4D',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {program.name}
              </div>
              <div style={{
                fontSize: '12px',
                color: '#5E6C84',
              }}>
                {program.key}
                {program.isDefault && ' • Default'}
              </div>
            </div>
          </a>
        ))}
      </div>

      {/* FOOTER */}
      <div style={{
        padding: '4px 0',
        borderTop: '1px solid #DFE1E6',
      }}>
        <a
          href="/programs"
          onClick={onClose}
          style={{
            display: 'block',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: 400,
            color: '#172B4D',
            textDecoration: 'none',
            transition: 'background 150ms',
            background: 'transparent',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#F4F5F7';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          View all programs
        </a>
        <button
          onClick={onClose}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            width: '100%',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: 400,
            color: '#172B4D',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'background 150ms',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#F4F5F7';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <AddIcon label="Create" size="small" />
          Create program
        </button>
      </div>
    </div>
  );
}

// ============================================
// PROJECT DROPDOWN
// ============================================

function ProjectDropdown({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: (open: boolean) => void }) {
  return (
    <Popup
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      placement="bottom-start"
      content={() => (
        <ProjectDropdownContent onClose={() => setIsOpen(false)} />
      )}
      trigger={(triggerProps) => (
        <Button
          {...triggerProps}
          appearance="subtle"
          iconAfter={<ChevronDownIcon label="Project" size="small" />}
          onClick={() => setIsOpen(!isOpen)}
          isSelected={isOpen}
        >
          Project
        </Button>
      )}
    />
  );
}

function ProjectDropdownContent({ onClose }: { onClose: () => void }) {
  return (
    <div style={{
      width: '320px',
      background: '#FFFFFF',
      borderRadius: '3px',
      boxShadow: '0 4px 8px rgba(9, 30, 66, 0.25)',
      padding: '8px 0',
    }}>
      {/* HEADER */}
      <div style={{
        padding: '8px 16px',
        borderBottom: '1px solid #DFE1E6',
      }}>
        <h3 style={{
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: '#5E6C84',
          margin: 0,
        }}>
          Recent projects
        </h3>
      </div>

      {/* RECENT PROJECTS */}
      <div style={{ padding: '4px 0' }}>
        {mockProjects.map((project) => (
          <a
            key={project.id}
            href={`/projects/${project.key}`}
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '8px 16px',
              textDecoration: 'none',
              transition: 'background 150ms',
              background: 'transparent',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#F4F5F7';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <div style={{
              width: '24px',
              height: '24px',
              background: project.iconBg,
              borderRadius: '3px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              flexShrink: 0,
            }}>
              {project.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '14px',
                fontWeight: 500,
                color: '#172B4D',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {project.name}
              </div>
              <div style={{
                fontSize: '12px',
                color: '#5E6C84',
              }}>
                {project.programName}
              </div>
            </div>
          </a>
        ))}
      </div>

      {/* FOOTER */}
      <div style={{
        padding: '4px 0',
        borderTop: '1px solid #DFE1E6',
      }}>
        <a
          href="/projects"
          onClick={onClose}
          style={{
            display: 'block',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: 400,
            color: '#172B4D',
            textDecoration: 'none',
            transition: 'background 150ms',
            background: 'transparent',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#F4F5F7';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          View all projects
        </a>
        <button
          onClick={onClose}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            width: '100%',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: 400,
            color: '#172B4D',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'background 150ms',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#F4F5F7';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <AddIcon label="Create" size="small" />
          Create project
        </button>
      </div>
    </div>
  );
}

// ============================================
// MOCK DATA
// ============================================

const mockPrograms: Program[] = [
  {
    id: '1',
    key: 'PROD',
    name: 'Product Program',
    isDefault: false,
  },
  {
    id: '2',
    key: 'ENG',
    name: 'Engineering Program',
    isDefault: false,
  },
  {
    id: 'default',
    key: 'DEFAULT',
    name: 'Default',
    isDefault: true,
  },
];

const mockProjects: Project[] = [
  {
    id: '1',
    key: 'ICP',
    name: 'ICP Project',
    programName: 'Product Program',
    icon: '📊',
    iconBg: '#FFC400',
  },
  {
    id: '2',
    key: 'MOB',
    name: 'Mobile App',
    programName: 'Product Program',
    icon: '📱',
    iconBg: '#4C9AFF',
  },
  {
    id: '3',
    key: 'BACK',
    name: 'Backend Services',
    programName: 'Engineering Program',
    icon: '⚙️',
    iconBg: '#00B8D9',
  },
];
