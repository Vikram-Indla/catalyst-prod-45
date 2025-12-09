import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import Button from '@atlaskit/button';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import AddIcon from '@atlaskit/icon/glyph/add';

interface NavItem {
  label: string;
  href: string;
  isActive?: boolean;
}

interface RecentItem {
  id: string;
  name: string;
  parentName?: string;
  href: string;
}

export default function TopNavigation() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <nav style={{
      background: '#0052CC',
      height: '56px',
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
      gap: '4px',
    }}>
      {/* HOME */}
      <NavButton
        label="Home"
        href="/home"
        isActive={isActive('/home')}
        onClick={() => navigate('/home')}
      />

      {/* ENTERPRISE */}
      <NavButton
        label="Enterprise"
        href="/enterprise"
        isActive={isActive('/enterprise')}
        onClick={() => navigate('/enterprise')}
      />

      {/* PRODUCT */}
      <NavButton
        label="Product"
        href="/product"
        isActive={isActive('/product')}
        onClick={() => navigate('/product')}
      />

      {/* PROGRAM DROPDOWN */}
      <ProgramDropdown
        isActive={isActive('/programs')}
        recentPrograms={mockRecentPrograms}
        onNavigate={navigate}
      />

      {/* PROJECT DROPDOWN */}
      <ProjectDropdown
        isActive={isActive('/projects')}
        recentProjects={mockRecentProjects}
        onNavigate={navigate}
      />

      {/* RELEASE */}
      <NavButton
        label="Release"
        href="/releases"
        isActive={isActive('/releases')}
        onClick={() => navigate('/releases')}
      />
    </nav>
  );
}

// ============================================
// NAV BUTTON
// ============================================

function NavButton({ label, href, isActive, onClick }: {
  label: string;
  href: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: isActive ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
        border: 'none',
        borderRadius: '3px',
        padding: '6px 12px',
        fontSize: '14px',
        fontWeight: 500,
        color: '#FFFFFF',
        cursor: 'pointer',
        transition: 'background 150ms',
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = 'transparent';
        }
      }}
    >
      {label}
    </button>
  );
}

// ============================================
// PROGRAM DROPDOWN
// ============================================

function ProgramDropdown({ isActive, recentPrograms, onNavigate }: {
  isActive: boolean;
  recentPrograms: RecentItem[];
  onNavigate: (path: string) => void;
}) {
  return (
    <DropdownMenu
      trigger={({ triggerRef, ...props }) => (
        <button
          {...props}
          ref={triggerRef as React.Ref<HTMLButtonElement>}
          style={{
            background: isActive ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
            border: 'none',
            borderRadius: '3px',
            padding: '6px 12px',
            fontSize: '14px',
            fontWeight: 500,
            color: '#FFFFFF',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'background 150ms',
          }}
          onMouseEnter={(e) => {
            if (!isActive) {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isActive) {
              e.currentTarget.style.background = 'transparent';
            }
          }}
        >
          Program
          <ChevronDownIcon label="" size="small" primaryColor="#FFFFFF" />
        </button>
      )}
    >
      <DropdownItemGroup title="Recent Programs">
        {recentPrograms.map((program) => (
          <DropdownItem
            key={program.id}
            onClick={() => onNavigate(program.href)}
          >
            {program.name}
          </DropdownItem>
        ))}
      </DropdownItemGroup>

      <DropdownItemGroup>
        <DropdownItem onClick={() => onNavigate('/programs')}>
          View all programs
        </DropdownItem>
        <DropdownItem
          onClick={() => onNavigate('/programs/create')}
          elemBefore={<AddIcon label="Create" size="small" />}
        >
          Create program
        </DropdownItem>
      </DropdownItemGroup>
    </DropdownMenu>
  );
}

// ============================================
// PROJECT DROPDOWN
// ============================================

function ProjectDropdown({ isActive, recentProjects, onNavigate }: {
  isActive: boolean;
  recentProjects: RecentItem[];
  onNavigate: (path: string) => void;
}) {
  return (
    <DropdownMenu
      trigger={({ triggerRef, ...props }) => (
        <button
          {...props}
          ref={triggerRef as React.Ref<HTMLButtonElement>}
          style={{
            background: isActive ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
            border: 'none',
            borderRadius: '3px',
            padding: '6px 12px',
            fontSize: '14px',
            fontWeight: 500,
            color: '#FFFFFF',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'background 150ms',
          }}
          onMouseEnter={(e) => {
            if (!isActive) {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isActive) {
              e.currentTarget.style.background = 'transparent';
            }
          }}
        >
          Project
          <ChevronDownIcon label="" size="small" primaryColor="#FFFFFF" />
        </button>
      )}
    >
      <DropdownItemGroup title="Recent Projects">
        {recentProjects.map((project) => (
          <DropdownItem
            key={project.id}
            onClick={() => onNavigate(project.href)}
          >
            <div>
              <div style={{ fontSize: '14px', color: '#172B4D' }}>
                {project.name}
              </div>
              {project.parentName && (
                <div style={{ fontSize: '11px', color: '#6B778C' }}>
                  {project.parentName}
                </div>
              )}
            </div>
          </DropdownItem>
        ))}
      </DropdownItemGroup>

      <DropdownItemGroup>
        <DropdownItem onClick={() => onNavigate('/projects')}>
          View all projects
        </DropdownItem>
        <DropdownItem
          onClick={() => onNavigate('/projects/create')}
          elemBefore={<AddIcon label="Create" size="small" />}
        >
          Create project
        </DropdownItem>
      </DropdownItemGroup>
    </DropdownMenu>
  );
}

// ============================================
// MOCK DATA
// ============================================

const mockRecentPrograms: RecentItem[] = [
  { id: '1', name: 'Product Program', href: '/programs/PROD' },
  { id: '2', name: 'Engineering Program', href: '/programs/ENG' },
  { id: '3', name: 'Default', href: '/programs/DEFAULT' },
];

const mockRecentProjects: RecentItem[] = [
  { id: '1', name: 'ICP', parentName: 'Product Program', href: '/projects/ICP' },
  { id: '2', name: 'Mobile App', parentName: 'Product Program', href: '/projects/MOB' },
  { id: '3', name: 'Backend Services', parentName: 'Engineering Program', href: '/projects/BACK' },
];
