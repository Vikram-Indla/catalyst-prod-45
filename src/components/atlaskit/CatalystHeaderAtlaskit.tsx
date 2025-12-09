import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button';
import Tooltip from '@atlaskit/tooltip';
import Avatar from '@atlaskit/avatar';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import Popup from '@atlaskit/popup';
import SearchIcon from '@atlaskit/icon/glyph/search';
import NotificationIcon from '@atlaskit/icon/glyph/notification';
import SettingsIcon from '@atlaskit/icon/glyph/settings';
import AddIcon from '@atlaskit/icon/glyph/add';
import SignOutIcon from '@atlaskit/icon/glyph/sign-out';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useUserRole } from "@/hooks/useUserRole";
import { useEnabledModules } from "@/hooks/useModules";
import { useCatalystContext } from "@/contexts/CatalystContext";
import { getActiveNavItem } from "@/lib/workspaceContext";
import { SearchOverlay } from "@/components/ja/SearchOverlay";
import { NotificationsPanel } from "@/components/ja/NotificationsPanel";
import { CreateDropdown } from "@/components/ja/CreateDropdown";
import { ItemsDropdown } from "@/components/ja/ItemsDropdown";
import { ProductSelectorDropdown } from "@/components/ja/ProductSelectorDropdown";
import { ProgramSelectorDropdown } from "@/components/ja/ProgramSelectorDropdown";
import { ProjectSelectorDropdown } from "@/components/ja/ProjectSelectorDropdown";
import { ReleaseDropdown } from "@/components/ja/ReleaseDropdown";
import { CreateEntityDialog } from "@/components/dialogs/CreateEntityDialog";
import { catalystToast } from "@/lib/catalystToast";
import { MobileNavigationMenu } from "@/components/ja/MobileNavigationMenu";
import { UnifiedCreateModal, CreateType } from "./UnifiedCreateModal";

export function CatalystHeaderAtlaskit() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const { isAdmin, canAccessEnterprise } = useUserRole();
  const { isModuleEnabled, isLoading: modulesLoading } = useEnabledModules();
  const { workspaceType } = useCatalystContext();
  
  const activeNavItem = getActiveNavItem(workspaceType);
  const [createDialogType, setCreateDialogType] = useState<'program' | 'project' | 'product' | null>(null);
  const [isUnifiedCreateOpen, setIsUnifiedCreateOpen] = useState(false);

  const handleUnifiedCreateSelect = (type: CreateType) => {
    console.log('[CatalystHeader] handleUnifiedCreateSelect called with type:', type);
    switch (type) {
      case 'program':
        setCreateDialogType('program');
        break;
      case 'project':
        setCreateDialogType('project');
        break;
      case 'issue':
      case 'epic':
      case 'release':
        // Navigate to respective create pages or show respective modals
        if (type === 'issue') {
          navigate('/items/stories/new');
        } else if (type === 'epic') {
          navigate('/items/epics/new');
        } else if (type === 'release') {
          navigate('/release/vehicles/new');
        }
        break;
    }
  };

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const handleCreateSuccess = (entity: { id: string; name: string; key?: string }) => {
    if (createDialogType === 'program') {
      navigate(`/program/${entity.id}/room`);
    } else if (createDialogType === 'project') {
      navigate(`/programs/${entity.id}/room`);
    } else if (createDialogType === 'product') {
      const key = entity.key || entity.name.toUpperCase().slice(0, 3);
      const path = key.toUpperCase() === 'IND' || key.toUpperCase() === 'INDUSTRY' 
        ? '/industry' 
        : key.toUpperCase() === 'MIN' || key.toUpperCase() === 'MINING'
          ? '/mining'
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

  const handleDisabledModuleClick = (label: string) => {
    if (isAdmin) {
      navigate('/admin/modules-packages');
    } else {
      catalystToast.info(
        'Module Disabled',
        'This module is disabled by your organization.'
      );
    }
  };

  const allNavItems = [
    { label: "Home", path: "/home", moduleCode: null },
    { label: "Enterprise", path: "/enterprise/strategy-room", moduleCode: "ENTERPRISE", requiresEnterpriseAccess: true },
    { label: "Product", hasDropdown: true, moduleCode: "PRODUCT" },
    { label: "Program", hasDropdown: true, moduleCode: "PORTFOLIO" },
    { label: "Project", hasDropdown: true, moduleCode: "PROGRAM" },
    { label: "Release", hasDropdown: true, path: "/release", moduleCode: null },
    { label: "Items", hasDropdown: true, moduleCode: null },
  ];

  const navItems = allNavItems.map(item => ({
    ...item,
    isEnabled: item.moduleCode === null 
      ? true 
      : item.requiresEnterpriseAccess 
        ? isModuleEnabled(item.moduleCode) && canAccessEnterprise
        : isModuleEnabled(item.moduleCode),
  }));

  const isItemActive = (item: typeof navItems[0]) => {
    if (item.label === "Home") return location.pathname === '/home';
    if (item.label === "Enterprise") return location.pathname.startsWith('/enterprise');
    if (item.label === "Product") return location.pathname.startsWith('/product') || location.pathname.startsWith('/industry');
    if (item.label === "Program") return workspaceType === 'program';
    if (item.label === "Project") return workspaceType === 'project';
    if (item.label === "Release") return location.pathname.startsWith('/release');
    return false;
  };

  return (
    <>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          width: '100%',
          borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
          background: token('elevation.surface', '#FFFFFF'),
          height: '56px',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr auto',
            alignItems: 'center',
            height: '100%',
            padding: '0 24px',
          }}
        >
          {/* Left: Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Mobile menu - hidden on desktop */}
            <div className="md:hidden">
              <MobileNavigationMenu />
            </div>
            <div
              onClick={() => navigate('/home')}
              style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                }}
              >
                <span style={{ color: token('color.text', '#172B4D') }}>Cata</span>
                <span style={{ color: '#C69C6D' }}>lyst</span>
              </span>
            </div>
          </div>

          {/* Center: Navigation */}
          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              gap: '4px',
              marginLeft: '32px',
            }}
            className="hidden md:flex"
          >
            {navItems.map((item) => {
              if (!item.isEnabled) {
                return (
                  <Tooltip key={item.label} content={isAdmin ? 'Module disabled. Enable in Administration.' : 'Module disabled by your organization.'}>
                    <button
                      onClick={() => handleDisabledModuleClick(item.label)}
                      style={{
                        padding: '8px 12px',
                        fontSize: '14px',
                        fontWeight: 500,
                        color: token('color.text.disabled', '#A5ADBA'),
                        background: 'transparent',
                        border: 'none',
                        cursor: 'not-allowed',
                        opacity: 0.5,
                      }}
                    >
                      {item.label}
                    </button>
                  </Tooltip>
                );
              }

              const isActive = isItemActive(item);

              // Items dropdown - use existing component
              if (item.label === "Items") {
                return <ItemsDropdown key={item.label} />;
              }

              // Dropdowns for Product, Program, Project, Release
              if (item.hasDropdown) {
                const isDropdownOpen = activeDropdown === item.label;
                
                // Render dropdown content only when open to prevent removeChild errors
                const renderDropdownContent = () => {
                  if (!isDropdownOpen) return null;
                  
                  return (
                    <div style={{ 
                      background: '#FFFFFF', 
                      borderRadius: '3px', 
                      boxShadow: '0 4px 8px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)',
                    }}>
                      {item.label === "Product" && (
                        <ProductSelectorDropdown 
                          onClose={() => setActiveDropdown(null)} 
                          onCreateClick={() => setCreateDialogType('product')}
                        />
                      )}
                      {item.label === "Program" && (
                        <ProgramSelectorDropdown 
                          onClose={() => setActiveDropdown(null)} 
                          onCreateClick={() => setCreateDialogType('program')}
                        />
                      )}
                      {item.label === "Project" && (
                        <ProjectSelectorDropdown 
                          onClose={() => setActiveDropdown(null)} 
                          onCreateClick={() => setCreateDialogType('project')}
                        />
                      )}
                      {item.label === "Release" && (
                        <ReleaseDropdown onClose={() => setActiveDropdown(null)} />
                      )}
                    </div>
                  );
                };
                
                return (
                  <Popup
                    key={item.label}
                    isOpen={isDropdownOpen}
                    onClose={() => setActiveDropdown(null)}
                    placement="bottom-start"
                    content={renderDropdownContent}
                    trigger={(triggerProps) => (
                      <button
                        ref={triggerProps.ref as React.Ref<HTMLButtonElement>}
                        aria-expanded={triggerProps['aria-expanded']}
                        aria-haspopup={triggerProps['aria-haspopup']}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setActiveDropdown(isDropdownOpen ? null : item.label);
                        }}
                        style={{
                          padding: '8px 12px',
                          fontSize: '14px',
                          fontWeight: isActive || isDropdownOpen ? 600 : 500,
                          color: isActive || isDropdownOpen ? token('color.text.brand', '#0052CC') : token('color.text', '#172B4D'),
                          background: isDropdownOpen ? '#F4F5F7' : 'transparent',
                          border: 'none',
                          borderRadius: '3px',
                          borderBottom: isActive ? `2px solid ${token('color.border.brand', '#0052CC')}` : '2px solid transparent',
                          cursor: 'pointer',
                          marginBottom: '-1px',
                          transition: 'all 150ms',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                        onMouseEnter={(e) => {
                          if (!isDropdownOpen) {
                            e.currentTarget.style.background = '#F4F5F7';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isDropdownOpen) {
                            e.currentTarget.style.background = 'transparent';
                          }
                        }}
                      >
                        {item.label}
                        <svg 
                          width="16" 
                          height="16" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          style={{
                            transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 150ms',
                          }}
                        >
                          <path 
                            d="M8.292 10.293a1.009 1.009 0 0 0 0 1.419l2.939 2.965c.218.215.5.322.779.322s.556-.107.769-.322l2.93-2.955a1.01 1.01 0 0 0 0-1.419.987.987 0 0 0-1.406 0l-2.298 2.317-2.307-2.327a.99.99 0 0 0-1.406 0z" 
                            fill="currentColor"
                          />
                        </svg>
                      </button>
                    )}
                  />
                );
              }

              // Simple nav items (Home, Enterprise)
              return (
                <button
                  key={item.label}
                  onClick={() => item.path && navigate(item.path)}
                  style={{
                    padding: '8px 12px',
                    fontSize: '14px',
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? token('color.text.brand', '#0052CC') : token('color.text', '#172B4D'),
                    background: 'transparent',
                    border: 'none',
                    borderBottom: isActive ? `2px solid ${token('color.border.brand', '#0052CC')}` : '2px solid transparent',
                    cursor: 'pointer',
                    marginBottom: '-1px',
                    transition: 'color 150ms, border-color 150ms',
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right: Actions */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {/* Create Button */}
            <button
              type="button"
              onClick={() => {
                console.log('[CatalystHeader] Create button clicked, opening modal');
                setIsUnifiedCreateOpen(true);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 12px',
                background: token('color.background.brand.bold', '#0052CC'),
                color: token('color.text.inverse', '#FFFFFF'),
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

            {/* Notifications */}
            <Tooltip content="Notifications">
              <Button
                appearance="subtle"
                iconBefore={<NotificationIcon label="Notifications" size="medium" />}
                style={{ borderRadius: '50%' }}
              />
            </Tooltip>

            {/* Settings */}
            <Tooltip content="Settings">
              <Button
                appearance="subtle"
                iconBefore={<SettingsIcon label="Settings" size="medium" />}
                onClick={() => navigate('/admin/activity')}
                style={{ borderRadius: '50%' }}
              />
            </Tooltip>

            {/* Search */}
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
                <DropdownItem onClick={handleSignOut}>
                  Sign out
                </DropdownItem>
              </DropdownItemGroup>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Search Overlay */}
      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      {/* Unified Create Modal */}
      <UnifiedCreateModal
        isOpen={isUnifiedCreateOpen}
        onClose={() => setIsUnifiedCreateOpen(false)}
        onSelectType={handleUnifiedCreateSelect}
      />

      {/* Create Entity Dialog */}
      {createDialogType && (
        <CreateEntityDialog
          open={true}
          onOpenChange={(open) => !open && setCreateDialogType(null)}
          entityType={createDialogType}
          onSuccess={handleCreateSuccess}
        />
      )}
    </>
  );
}
