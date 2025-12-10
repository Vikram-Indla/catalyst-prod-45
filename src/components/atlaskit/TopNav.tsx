import { useState, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button';
import Tooltip from '@atlaskit/tooltip';
import Avatar from '@atlaskit/avatar';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import { PortalDropdown } from '@/components/ui/PortalDropdown';
import SearchIcon from '@atlaskit/icon/glyph/search';
import NotificationIcon from '@atlaskit/icon/glyph/notification';
import SettingsIcon from '@atlaskit/icon/glyph/settings';
import AddIcon from '@atlaskit/icon/glyph/add';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useUserRole } from "@/hooks/useUserRole";
import { DemandSelectorDropdown } from "@/components/ja/DemandSelectorDropdown";
import { ProgramSelectorDropdown } from "@/components/ja/ProgramSelectorDropdown";
import { ProjectSelectorDropdown } from "@/components/ja/ProjectSelectorDropdown";
import { ReleaseDropdown } from "@/components/ja/ReleaseDropdown";
import { ItemsDropdown } from "@/components/ja/ItemsDropdown";
import { UnifiedCreateModal, CreateType } from "./UnifiedCreateModal";
import { CreateWorkItemModal } from "./CreateWorkItemModal";
import { CreateEntityDialog } from "@/components/dialogs/CreateEntityDialog";
import { SearchOverlay } from "@/components/ja/SearchOverlay";

interface TopNavProps {
  isMobile?: boolean;
}

export const TopNav = ({ isMobile = false }: TopNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isUnifiedCreateOpen, setIsUnifiedCreateOpen] = useState(false);
  const [isWorkItemModalOpen, setIsWorkItemModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [createDialogType, setCreateDialogType] = useState<'program' | 'project' | 'product' | null>(null);
  const { isAdmin } = useUserRole();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  // Memoized close handlers to prevent recreation
  const handleCloseDemand = useCallback(() => setActiveDropdown(null), []);
  const handleCloseProgram = useCallback(() => setActiveDropdown(null), []);
  const handleCloseProject = useCallback(() => setActiveDropdown(null), []);
  const handleCloseRelease = useCallback(() => setActiveDropdown(null), []);
  
  const handleCreateProgram = useCallback(() => setCreateDialogType('program'), []);
  const handleCreateProject = useCallback(() => setCreateDialogType('project'), []);

  const handleUnifiedCreateSelect = (type: CreateType) => {
    switch (type) {
      case 'program':
        setCreateDialogType('program');
        break;
      case 'project':
        setCreateDialogType('project');
        break;
      case 'work-item':
        setIsWorkItemModalOpen(true);
        break;
    }
  };

  const handleCreateSuccess = (entity: { id: string; name: string; key?: string }) => {
    if (createDialogType === 'program') {
      navigate(`/program/${entity.id}/room`);
    } else if (createDialogType === 'project') {
      navigate(`/programs/${entity.id}/room`);
    } else if (createDialogType === 'product') {
      const key = entity.key || entity.name.toUpperCase().slice(0, 3);
      const path = key.toUpperCase() === 'IND' || key.toUpperCase() === 'INDUSTRY' 
        ? '/industry' 
        : `/product/${key.toLowerCase()}/room`;
      navigate(path);
    }
    setCreateDialogType(null);
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success('Signed out successfully');
      navigate('/auth');
    } catch (error: any) {
      toast.error('Error signing out: ' + error.message);
    }
  };

  const navItems = useMemo(() => [
    { label: "Home", path: "/home" },
    { label: "Enterprise", path: "/enterprise/strategy-room" },
    { label: "Demand", hasDropdown: true },
    { label: "Program", hasDropdown: true },
    { label: "Project", hasDropdown: true },
    { label: "Release", hasDropdown: true },
    { label: "Items", hasDropdown: true },
  ], []);

  const isItemActive = useCallback((item: typeof navItems[0]) => {
    if (item.label === "Home") return location.pathname === '/home';
    if (item.label === "Enterprise") return location.pathname.startsWith('/enterprise');
    if (item.label === "Demand") return location.pathname.startsWith('/industry');
    if (item.label === "Program") return location.pathname.startsWith('/program/');
    if (item.label === "Project") return location.pathname.startsWith('/programs/') || location.pathname.startsWith('/project/');
    if (item.label === "Release") return location.pathname.startsWith('/release');
    return false;
  }, [location.pathname]);

  const handleDropdownToggle = useCallback((label: string, isOpen: boolean) => {
    setActiveDropdown(isOpen ? null : label);
  }, []);

  return (
    <>
      <header style={{
        height: '56px',
        minHeight: '56px',
        maxHeight: '56px',
        backgroundColor: token('elevation.surface', '#FFFFFF'),
        borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: `0 ${token('space.300', '24px')}`,
        flexShrink: 0,
        position: 'relative',
        zIndex: 200,
      }}>
        {/* Left Section - Logo + Nav */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: token('space.300', '24px'),
        }}>
          {/* Logo - Cata (dark) + lyst (gold) */}
          <div
            onClick={() => navigate('/home')}
            style={{
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span style={{
              fontSize: '18px',
              fontWeight: 600,
              letterSpacing: '-0.01em',
            }}>
              <span style={{ color: token('color.text', '#172B4D') }}>Cata</span>
              <span style={{ color: '#C69C6D' }}>lyst</span>
            </span>
          </div>
          
          {/* Navigation Items */}
          {!isMobile && (
            <nav style={{ display: 'flex', alignItems: 'center', gap: token('space.050', '4px') }}>
              {navItems.map((item) => {
                const isActive = isItemActive(item);

                // Items dropdown
                if (item.label === "Items") {
                  return <ItemsDropdown key={item.label} />;
                }

                // Dropdowns for Product, Program, Project, Release
                if (item.hasDropdown) {
                  const isDropdownOpen = activeDropdown === item.label;
                  
                  return (
                    <NavDropdownItem
                      key={item.label}
                      label={item.label}
                      isActive={isActive}
                      isOpen={isDropdownOpen}
                      onToggle={() => handleDropdownToggle(item.label, isDropdownOpen)}
                      onClose={
                        item.label === "Demand" ? handleCloseDemand :
                        item.label === "Program" ? handleCloseProgram :
                        item.label === "Project" ? handleCloseProject :
                        handleCloseRelease
                      }
                      onCreateClick={
                        item.label === "Program" ? handleCreateProgram :
                        item.label === "Project" ? handleCreateProject :
                        undefined
                      }
                    />
                  );
                }

                // Simple nav items (Home, Enterprise) - ATLASSIAN COMPLIANT
                return (
                  <button
                    key={item.label}
                    onClick={() => item.path && navigate(item.path)}
                    style={{
                      position: 'relative',
                      padding: `${token('space.100', '8px')} ${token('space.150', '12px')}`,
                      fontSize: '14px',
                      fontWeight: 500,
                      lineHeight: '20px',
                      color: isActive ? token('color.text.brand', '#0052CC') : token('color.text', '#172B4D'),
                      background: 'transparent',
                      border: 'none',
                      borderRadius: token('border.radius', '3px'),
                      cursor: 'pointer',
                      transition: 'background 150ms, color 150ms',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = token('color.background.neutral.hovered', '#F4F5F7');
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {item.label}
                    {isActive && (
                      <div style={{
                        position: 'absolute',
                        bottom: '-1px',
                        left: token('space.150', '12px'),
                        right: token('space.150', '12px'),
                        height: '2px',
                        background: token('color.border.brand', '#0052CC'),
                        borderRadius: '1px',
                      }} />
                    )}
                  </button>
                );
              })}
            </nav>
          )}
        </div>
        
        {/* Right Section - Actions */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: token('space.100', '8px'),
        }}>
          {/* Create Button */}
          <button
            type="button"
            onClick={() => setIsUnifiedCreateOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 12px',
              background: '#C69C6D',
              color: '#FFFFFF',
              borderRadius: '3px',
              fontWeight: 500,
              fontSize: '14px',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <AddIcon label="Create" size="small" />
            Create
          </button>

          <Tooltip content="Notifications">
            <Button
              appearance="subtle"
              iconBefore={<NotificationIcon label="Notifications" size="medium" />}
              style={{ borderRadius: '50%' }}
            />
          </Tooltip>

          <Tooltip content="Settings">
            <Button
              appearance="subtle"
              iconBefore={<SettingsIcon label="Settings" size="medium" />}
              onClick={() => navigate('/admin/activity')}
              style={{ borderRadius: '50%' }}
            />
          </Tooltip>

          <Tooltip content="Search (Ctrl+K)">
            <Button
              appearance="subtle"
              iconBefore={<SearchIcon label="Search" size="medium" />}
              onClick={() => setIsSearchOpen(true)}
              style={{ borderRadius: '50%' }}
            />
          </Tooltip>

          {/* User Menu */}
          <DropdownMenu
            trigger={({ triggerRef, ...props }) => (
              <button
                ref={triggerRef as React.Ref<HTMLButtonElement>}
                {...props}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  borderRadius: '50%',
                }}
              >
                <Avatar
                  size="medium"
                  name={user?.email || 'User'}
                  appearance="circle"
                />
              </button>
            )}
          >
            <DropdownItemGroup>
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${token('color.border', '#DFE1E6')}` }}>
                <p style={{ fontSize: '14px', fontWeight: 500, color: token('color.text', '#172B4D'), margin: 0 }}>
                  {user?.email}
                </p>
                <p style={{ fontSize: '12px', color: token('color.text.subtlest', '#6B778C'), margin: '4px 0 0 0' }}>
                  User Account
                </p>
              </div>
              {isAdmin && (
                <DropdownItem onClick={() => navigate('/admin/activity')}>
                  Administration
                </DropdownItem>
              )}
              <DropdownItem onClick={() => navigate('/profile')}>Profile</DropdownItem>
              <DropdownItem onClick={handleSignOut}>Sign out</DropdownItem>
            </DropdownItemGroup>
          </DropdownMenu>
        </div>
      </header>

      {/* Search Overlay */}
      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      {/* Modals */}
      <UnifiedCreateModal
        isOpen={isUnifiedCreateOpen}
        onClose={() => setIsUnifiedCreateOpen(false)}
        onSelectType={handleUnifiedCreateSelect}
      />

      <CreateWorkItemModal
        isOpen={isWorkItemModalOpen}
        onClose={() => setIsWorkItemModalOpen(false)}
      />

      {createDialogType && (
        <CreateEntityDialog
          open={!!createDialogType}
          onOpenChange={(open) => !open && setCreateDialogType(null)}
          entityType={createDialogType}
          onSuccess={handleCreateSuccess}
        />
      )}
    </>
  );
};

// Separate component for dropdown items to isolate re-renders
interface NavDropdownItemProps {
  label: string;
  isActive: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onCreateClick?: () => void;
}

function NavDropdownItem({ label, isActive, isOpen, onToggle, onClose, onCreateClick }: NavDropdownItemProps) {
  // Render the appropriate dropdown content based on label
  const renderContent = useCallback(() => {
    switch (label) {
      case "Demand":
        return <DemandSelectorDropdown onClose={onClose} />;
      case "Program":
        return <ProgramSelectorDropdown onClose={onClose} onCreateClick={onCreateClick} />;
      case "Project":
        return <ProjectSelectorDropdown onClose={onClose} onCreateClick={onCreateClick} />;
      case "Release":
        return <ReleaseDropdown onClose={onClose} />;
      default:
        return null;
    }
  }, [label, onClose, onCreateClick]);

  return (
    <PortalDropdown
      isOpen={isOpen}
      onClose={onClose}
      placement="bottom-start"
      trigger={
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggle();
          }}
          style={{
            position: 'relative',
            padding: `${token('space.100', '8px')} ${token('space.150', '12px')}`,
            fontSize: '14px',
            fontWeight: 500,
            lineHeight: '20px',
            color: isActive || isOpen ? token('color.text.brand', '#0052CC') : token('color.text', '#172B4D'),
            background: isOpen ? token('color.background.neutral.hovered', '#F4F5F7') : 'transparent',
            border: 'none',
            borderRadius: token('border.radius', '3px'),
            cursor: 'pointer',
            transition: 'background 150ms, color 150ms',
            display: 'flex',
            alignItems: 'center',
            gap: token('space.050', '4px'),
          }}
          onMouseEnter={(e) => {
            if (!isOpen) {
              e.currentTarget.style.background = token('color.background.neutral.hovered', '#F4F5F7');
            }
          }}
          onMouseLeave={(e) => {
            if (!isOpen) {
              e.currentTarget.style.background = 'transparent';
            }
          }}
        >
          {label}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 150ms',
          }}>
            <path d="M8.292 10.293a1.009 1.009 0 0 0 0 1.419l2.939 2.965c.218.215.5.322.779.322s.556-.107.769-.322l2.93-2.955a1.01 1.01 0 0 0 0-1.419.987.987 0 0 0-1.406 0l-2.298 2.317-2.307-2.327a.99.99 0 0 0-1.406 0z" fill="currentColor"/>
          </svg>
          {isActive && (
            <div style={{
              position: 'absolute',
              bottom: '-1px',
              left: token('space.150', '12px'),
              right: token('space.150', '12px'),
              height: '2px',
              background: token('color.border.brand', '#0052CC'),
              borderRadius: '1px',
            }} />
          )}
        </button>
      }
    >
      {renderContent()}
    </PortalDropdown>
  );
}

export default TopNav;
