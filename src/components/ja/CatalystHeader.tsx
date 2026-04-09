import { useEffect, useRef, useState, lazy, Suspense } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Search, ChevronDown, LogOut, Settings, Bell, User } from "lucide-react";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { BADGE_DEBOUNCE_MS } from "@/constants/notificationConstants";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { useUserRole } from "@/hooks/useUserRole";
import { useEnabledModules } from "@/hooks/useModules";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { useFeatureFlags } from "@/contexts/FeatureFlagContext";
import { useSingleItemNavigation } from "@/hooks/useSingleItemNavigation";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
const CreateDropdown = lazy(() => import("./CreateDropdown").then(m => ({ default: m.CreateDropdown })));
import { useGlobalSearchStore } from "@/store/globalSearchStore";
const NotificationsPanel = lazy(() => import("./NotificationsPanel").then(m => ({ default: m.NotificationsPanel })));
const NotificationPanelNew = lazy(() => import("@/components/notifications/NotificationPanel"));
const ToastContainerNew = lazy(() => import("@/components/notifications/ToastContainer"));
const ProgramSelectorDropdown = lazy(() => import("./ProgramSelectorDropdown").then(m => ({ default: m.ProgramSelectorDropdown })));
const ProjectSelectorDropdown = lazy(() => import("./ProjectSelectorDropdown").then(m => ({ default: m.ProjectSelectorDropdown })));
const ProductSelectorDropdown = lazy(() => import("./ProductSelectorDropdown").then(m => ({ default: m.ProductSelectorDropdown })));
const MobileNavigationMenu = lazy(() => import("./MobileNavigationMenu").then(m => ({ default: m.MobileNavigationMenu })));
const ReleaseDropdown = lazy(() => import("./ReleaseDropdown").then(m => ({ default: m.ReleaseDropdown })));
const CreateEntityDialog = lazy(() => import("@/components/dialogs/CreateEntityDialog").then(m => ({ default: m.CreateEntityDialog })));
import { catalystToast } from "@/lib/catalystToast";
import { useCatalystContext } from "@/contexts/CatalystContext";
import { getActiveNavItem } from "@/lib/workspaceContext";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useAppHeaderOffset } from "@/hooks/useAppHeaderOffset";
import catalystLogoLight from "@/assets/catalyst-logo-light.svg";
import catalystFullLogoLight from "@/assets/catalyst-full-logo-light.svg";
import catalystWordmark3 from "@/assets/catalyst-wordmark-3.svg";
import catalystWordmark3Dark from "@/assets/catalyst-wordmark-3-dark.svg";
import catalystLogoMark2 from "@/assets/catalyst-logo-mark-2.svg";
import catalystLogoMark2Dark from "@/assets/catalyst-logo-mark-2-dark.svg";

export function CatalystHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const globalSearch = useGlobalSearchStore();

  useEffect(() => {
    const handler = () => globalSearch.open();
    window.addEventListener('open-global-search', handler);
    return () => window.removeEventListener('open-global-search', handler);
  }, []);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);
  const { data: rawUnreadCount = 0 } = useUnreadCount();
  const debouncedUnreadCount = useDebouncedValue(rawUnreadCount, BADGE_DEBOUNCE_MS);
  
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);
  const { isAdmin, isSuperAdmin, isProgramManager, canAccessEnterprise, isProductOwnerOnly } = useUserRole();
  
  const canAccessSettings = isAdmin || isSuperAdmin || isProgramManager;
  const { isModuleEnabled, isLoading: modulesLoading } = useEnabledModules();
  const { canViewInNav, isLoading: accessLoading } = useModuleAccess();
  const { isModuleEnabled: featureFlagEnabled } = useFeatureFlags();
  const { workspaceType, sidebarExpanded } = useCatalystContext();
  const singleItemNav = useSingleItemNavigation();
  
  const activeNavItem = getActiveNavItem(workspaceType);
  useAppHeaderOffset(headerRef);

  const [createDialogType, setCreateDialogType] = useState<'program' | 'project' | 'product' | null>(null);

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
        ? '/producthub' 
        : key.toUpperCase() === 'MIN' || key.toUpperCase() === 'MINING'
          ? '/mining'
          : `/product/${key.toLowerCase()}/room`;
      navigate(path);
    }
    setCreateDialogType(null);
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut({ scope: 'local' });
      toast.success('Signed out successfully');
      navigate('/auth');
    } catch (error: any) {
      console.error('Sign out error:', error);
      navigate('/auth');
    }
  };

  useEffect(() => {
    if (!userMenuOpen) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (userMenuRef.current?.contains(target)) return;
      setUserMenuOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [userMenuOpen]);

  const handleDisabledModuleClick = (label: string) => {
    if (isAdmin) {
      navigate('/admin/modules-packages');
    } else {
      catalystToast.info('Module Disabled', 'This module is disabled by your organization.');
    }
  };

  const allNavItems = [
    { label: "Home", path: "/for-you", moduleKey: "home", featureFlagKey: null, visibleToProductOwner: true },
    { label: "StrategyHub", path: "/strategyhub", moduleKey: "enterprise", featureFlagKey: "strategy_hub", requiresEnterpriseAccess: true, visibleToProductOwner: true },
    { label: "ProductHub", path: "/producthub", moduleKey: "product", featureFlagKey: "product_hub", visibleToProductOwner: true },
    { label: "ProjectHub", path: "/project-hub", moduleKey: "workhub", featureFlagKey: "project_hub", visibleToProductOwner: true },
    { label: "ReleaseHub", path: "/release-hub/command-center", moduleKey: "releases", featureFlagKey: "release_hub", visibleToProductOwner: false },
    { label: "TestHub", path: "/testhub/dashboard", moduleKey: "testhub", featureFlagKey: "test_hub", visibleToProductOwner: false },
    { label: "IncidentHub", path: "/incident-hub", moduleKey: "operations", featureFlagKey: "incident_hub", visibleToProductOwner: false },
    { label: "TaskHub", path: "/taskhub/boards", moduleKey: "planner", featureFlagKey: "task_hub", visibleToProductOwner: true },
    { label: "PlanHub", path: "/planhub", moduleKey: "planhub", featureFlagKey: "plan_hub", visibleToProductOwner: true },
    { label: "WikiHub", path: "/wiki", moduleKey: "wiki", featureFlagKey: "wiki_hub", visibleToProductOwner: true },
  ];

  const navItems = allNavItems
    .filter(item => !isProductOwnerOnly || item.visibleToProductOwner)
    .map(item => ({
      ...item,
      isEnabled: item.requiresEnterpriseAccess 
        ? canViewInNav(item.moduleKey) && canAccessEnterprise
        : canViewInNav(item.moduleKey),
    }))
    .filter(item => {
      if (!item.featureFlagKey) return true;
      return featureFlagEnabled(item.featureFlagKey);
    })
    .filter(item => item.isEnabled);

  return (
    <>
      <header
        ref={headerRef}
        className="sticky top-0 z-[100] flex items-center"
        style={{
          height: 'calc(52px + var(--app-safe-top))',
          paddingTop: 'var(--app-safe-top)',
          paddingLeft: '20px',
          paddingRight: '20px',
          borderBottom: '1px solid var(--cp-bd)',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          backgroundColor: 'var(--cp-bg)',
          boxShadow: 'none',
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
        }}
      >
        {/* ===== LOGO ZONE ===== */}
        <a 
          className="flex items-center flex-shrink-0 cursor-pointer no-underline transition-opacity"
          style={{ 
            marginRight: '16px',
            opacity: 1,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          onClick={() => navigate('/home')}
        >
          {!sidebarExpanded ? (
            <img src={isDark ? catalystLogoMark2Dark : catalystLogoMark2} alt="Catalyst" style={{ height: '24px', width: '24px' }} />
          ) : (
            <img src={isDark ? catalystWordmark3Dark : catalystWordmark3} alt="Catalyst" style={{ height: '26px', width: 'auto' }} />
          )}
        </a>
        
        {/* ===== NAVIGATION ZONE ===== */}
        <nav className="hidden lg:flex items-center flex-1 overflow-hidden" style={{ gap: '4px' }}>
          <TooltipProvider>
            {navItems.map((item) => {
              if (!item.isEnabled) {
                return (
                  <Tooltip key={item.label}>
                    <TooltipTrigger asChild>
                      <button
                        className="flex items-center cursor-not-allowed opacity-40"
                        style={{
                          height: '50px',
                          padding: '0 14px',
                          fontSize: '14px',
                          fontWeight: 500,
                          color: 'var(--cp-t3)',
                          borderRadius: '6px',
                          gap: '4px',
                          border: 'none',
                          background: 'transparent',
                        }}
                        onClick={() => handleDisabledModuleClick(item.label)}
                      >
                        {item.label}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {isAdmin 
                          ? `This module is disabled. Enable it in Administration → Modules & Packages.`
                          : `This module is disabled by your organization.`}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                );
              }

              const isActive = item.label === activeNavItem;
              const activeColor = isDark ? '#FFFFFF' : 'var(--cp-blue-text)';
              const inactiveColor = isDark ? '#A1A1A1' : 'var(--cp-t3)';
              const hoverColor = isDark ? '#FFFFFF' : 'var(--cp-t1)';
              const activeUnderline = '#3B82F6';
              const hoverUnderline = isDark ? '#484F58' : 'var(--cp-bd)';
              const navButtonStyle: React.CSSProperties = {
                height: '100%',
                padding: '0 14px',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? activeColor : inactiveColor,
                display: 'flex',
                alignItems: 'center',
                gap: '1px',
                cursor: 'pointer',
                transition: 'color 0.15s ease',
                border: 'none',
                background: 'transparent',
                position: 'relative' as const,
                fontFamily: "'Inter', sans-serif",
                outline: 'none',
                letterSpacing: '-0.1px',
                borderRadius: '0',
                borderBottom: isActive ? `2px solid ${activeUnderline}` : '2px solid transparent',
              };
              
              const handleHover = (e: React.MouseEvent<HTMLButtonElement>, isEnter: boolean) => {
                if (!isActive) {
                  e.currentTarget.style.color = isEnter ? hoverColor : inactiveColor;
                  e.currentTarget.style.borderBottom = isEnter ? `2px solid ${hoverUnderline}` : '2px solid transparent';
                  e.currentTarget.style.background = 'transparent';
                }
              };
              
              return (
                <div key={item.label} className="inline-flex items-center relative">
                  {item.label === "Product" ? (
                    singleItemNav.product.hasSingleItem && singleItemNav.product.directPath ? (
                      <button
                        style={navButtonStyle}
                        onMouseEnter={(e) => handleHover(e, true)}
                        onMouseLeave={(e) => handleHover(e, false)}
                        onClick={() => navigate(singleItemNav.product.directPath!)}
                      >
                        {item.label}
                      </button>
                    ) : (
                      <Popover
                        open={activeDropdown === item.label}
                        onOpenChange={(open) => setActiveDropdown(open ? item.label : null)}
                      >
                        <PopoverTrigger asChild>
                          <button 
                            style={navButtonStyle}
                            onMouseEnter={(e) => handleHover(e, true)}
                            onMouseLeave={(e) => handleHover(e, false)}
                          >
                            {item.label}
                            <ChevronDown style={{ width: '16px', height: '16px' }} />
                          </button>
                        </PopoverTrigger>
                        {activeDropdown === item.label && (
                          <PopoverContent className="p-0 w-auto" align="start">
                            <ProductSelectorDropdown 
                              onClose={() => setActiveDropdown(null)} 
                              onCreateClick={() => setCreateDialogType('product')}
                            />
                          </PopoverContent>
                        )}
                      </Popover>
                    )
                  ) : item.label === "Program" ? (
                    singleItemNav.program.hasSingleItem && singleItemNav.program.directPath ? (
                      <button
                        style={navButtonStyle}
                        onMouseEnter={(e) => handleHover(e, true)}
                        onMouseLeave={(e) => handleHover(e, false)}
                        onClick={() => navigate(singleItemNav.program.directPath!)}
                      >
                        {item.label}
                      </button>
                    ) : (
                      <Popover
                        open={activeDropdown === item.label}
                        onOpenChange={(open) => setActiveDropdown(open ? item.label : null)}
                      >
                        <PopoverTrigger asChild>
                          <button 
                            style={navButtonStyle}
                            onMouseEnter={(e) => handleHover(e, true)}
                            onMouseLeave={(e) => handleHover(e, false)}
                          >
                            {item.label}
                            <ChevronDown style={{ width: '16px', height: '16px' }} />
                          </button>
                        </PopoverTrigger>
                        {activeDropdown === item.label && (
                          <PopoverContent className="p-0 w-auto" align="start">
                            <ProgramSelectorDropdown 
                              onClose={() => setActiveDropdown(null)} 
                              onCreateClick={() => setCreateDialogType('program')}
                            />
                          </PopoverContent>
                        )}
                      </Popover>
                    )
                  ) : item.label === "Project" ? (
                    singleItemNav.project.hasSingleItem && singleItemNav.project.directPath ? (
                      <button
                        style={navButtonStyle}
                        onMouseEnter={(e) => handleHover(e, true)}
                        onMouseLeave={(e) => handleHover(e, false)}
                        onClick={() => navigate(singleItemNav.project.directPath!)}
                      >
                        {item.label}
                      </button>
                    ) : (
                      <Popover
                        open={activeDropdown === item.label}
                        onOpenChange={(open) => setActiveDropdown(open ? item.label : null)}
                      >
                        <PopoverTrigger asChild>
                          <button 
                            style={navButtonStyle}
                            onMouseEnter={(e) => handleHover(e, true)}
                            onMouseLeave={(e) => handleHover(e, false)}
                          >
                            {item.label}
                            <ChevronDown style={{ width: '16px', height: '16px' }} />
                          </button>
                        </PopoverTrigger>
                        {activeDropdown === item.label && (
                          <PopoverContent className="p-0 w-auto" align="start">
                            <ProjectSelectorDropdown 
                              onClose={() => setActiveDropdown(null)} 
                              onCreateClick={() => setCreateDialogType('project')}
                            />
                          </PopoverContent>
                        )}
                      </Popover>
                    )
                  ) : item.label === "Release" ? (
                    singleItemNav.release.hasSingleItem && singleItemNav.release.directPath ? (
                      <button
                        style={{
                          ...navButtonStyle,
                          color: location.pathname.startsWith('/release') ? 'var(--cp-blue-text)' : navButtonStyle.color,
                          fontWeight: location.pathname.startsWith('/release') ? 600 : navButtonStyle.fontWeight,
                          borderBottom: location.pathname.startsWith('/release') ? '2px solid var(--cp-blue-text)' : '2px solid transparent',
                        }}
                        onMouseEnter={(e) => { if (!location.pathname.startsWith('/release')) e.currentTarget.style.color = 'var(--cp-t1)'; }}
                        onMouseLeave={(e) => { if (!location.pathname.startsWith('/release')) e.currentTarget.style.color = 'var(--cp-t3)'; }}
                        onClick={() => navigate(singleItemNav.release.directPath!)}
                      >
                        {item.label}
                      </button>
                    ) : (
                      <Popover
                        open={activeDropdown === item.label}
                        onOpenChange={(open) => setActiveDropdown(open ? item.label : null)}
                      >
                        <PopoverTrigger asChild>
                          <button 
                            style={{
                              ...navButtonStyle,
                              color: location.pathname.startsWith('/release') ? 'var(--cp-blue-text)' : navButtonStyle.color,
                              fontWeight: location.pathname.startsWith('/release') ? 600 : navButtonStyle.fontWeight,
                              borderBottom: location.pathname.startsWith('/release') ? '2px solid var(--cp-blue-text)' : '2px solid transparent',
                            }}
                            onMouseEnter={(e) => { if (!location.pathname.startsWith('/release')) e.currentTarget.style.color = 'var(--cp-t1)'; }}
                            onMouseLeave={(e) => { if (!location.pathname.startsWith('/release')) e.currentTarget.style.color = 'var(--cp-t3)'; }}
                          >
                            {item.label}
                            <ChevronDown style={{ width: '16px', height: '16px' }} />
                          </button>
                        </PopoverTrigger>
                        {activeDropdown === item.label && (
                          <PopoverContent className="p-0 w-auto" align="start">
                            <ReleaseDropdown onClose={() => setActiveDropdown(null)} />
                          </PopoverContent>
                        )}
                      </Popover>
                    )
                  ) : item.label === "TaskHub" ? (
                    <button
                      style={{
                        ...navButtonStyle,
                        color: location.pathname.startsWith('/taskhub') ? 'var(--cp-blue-text)' : navButtonStyle.color,
                        fontWeight: location.pathname.startsWith('/taskhub') ? 600 : navButtonStyle.fontWeight,
                        borderBottom: location.pathname.startsWith('/taskhub') ? '2px solid var(--cp-blue-text)' : '2px solid transparent',
                      }}
                      onMouseEnter={(e) => { if (!location.pathname.startsWith('/taskhub')) e.currentTarget.style.color = 'var(--cp-t1)'; }}
                      onMouseLeave={(e) => { if (!location.pathname.startsWith('/taskhub')) e.currentTarget.style.color = 'var(--cp-t3)'; }}
                      onClick={() => navigate('/taskhub/boards')}
                    >
                      {item.label}
                    </button>
                  ) : item.label === "Releases" ? (
                    <button
                      style={{
                        ...navButtonStyle,
                        color: location.pathname.startsWith('/releases') ? 'var(--cp-blue-text)' : navButtonStyle.color,
                        fontWeight: location.pathname.startsWith('/releases') ? 600 : navButtonStyle.fontWeight,
                        borderBottom: location.pathname.startsWith('/releases') ? '2px solid var(--cp-blue-text)' : '2px solid transparent',
                      }}
                      onMouseEnter={(e) => { if (!location.pathname.startsWith('/releases')) e.currentTarget.style.color = 'var(--cp-t1)'; }}
                      onMouseLeave={(e) => { if (!location.pathname.startsWith('/releases')) e.currentTarget.style.color = 'var(--cp-t3)'; }}
                      onClick={() => navigate('/releases/command-center')}
                    >
                      {item.label}
                    </button>
                  ) : (item as any).isLabel ? (
                    <span
                      style={{
                        height: '50px',
                        padding: '0 14px',
                        fontSize: '0.84rem',
                        fontWeight: 500,
                        fontFamily: "'Inter', sans-serif",
                        color: 'var(--cp-t3)',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        opacity: 0.6,
                        cursor: 'default',
                      }}
                    >
                      {item.label}
                    </span>
                  ) : (
                    <button
                      style={navButtonStyle}
                      onMouseEnter={(e) => handleHover(e, true)}
                      onMouseLeave={(e) => handleHover(e, false)}
                      onClick={() => item.path && navigate(item.path)}
                    >
                      {item.label}
                    </button>
                  )}
                </div>
              );
            })}
          </TooltipProvider>
        </nav>

        {/* Mobile Menu */}
        <div className="lg:hidden flex-1">
          <Suspense fallback={null}>
            <MobileNavigationMenu />
          </Suspense>
        </div>
        
        {/* ===== ACTIONS ZONE ===== */}
        <div className="flex items-center flex-shrink-0" style={{ gap: '8px' }}>
          {/* Create Button */}
          <CreateDropdown />
          
          <TooltipProvider>

            {/* Settings */}
            {canAccessSettings && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="relative flex items-center justify-center rounded-lg transition-all"
                    style={{
                      width: '36px',
                      height: '50px',
                      color: location.pathname.startsWith('/admin') ? 'var(--cp-blue-text)' : 'var(--cp-t3)',
                      background: location.pathname.startsWith('/admin') ? 'var(--cp-hover)' : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      borderRadius: '8px',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--cp-t1)';
                      e.currentTarget.style.background = 'var(--cp-hover)';
                    }}
                    onMouseLeave={(e) => {
                      const isOnAdmin = location.pathname.startsWith('/admin');
                      e.currentTarget.style.color = isOnAdmin ? 'var(--cp-blue-text)' : 'var(--cp-t3)';
                      e.currentTarget.style.background = isOnAdmin ? 'var(--cp-hover)' : 'transparent';
                    }}
                    onClick={() => navigate('/admin/users')}
                    title="Settings"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Settings</p>
                </TooltipContent>
              </Tooltip>
            )}

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Search Trigger */}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-global-search'))}
              className="hidden sm:flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cp-focus-ring)] focus-visible:ring-offset-1"
              style={{
                minWidth: '200px',
                height: '32px',
                padding: '0 10px',
                background: isDark ? '#1A1A1A' : '#F8FAFC',
                border: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`,
                borderRadius: '6px',
                cursor: 'pointer',
                gap: '8px',
                alignItems: 'center',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = isDark ? '#454545' : '#CBD5E1'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = isDark ? '#2E2E2E' : '#E2E8F0'; }}
            >
              <Search style={{ width: '14px', height: '14px', color: isDark ? '#878787' : '#94A3B8', flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: '12px', fontFamily: "'Inter', sans-serif", color: isDark ? '#878787' : '#94A3B8', textAlign: 'left' }}>
                Search...
              </span>
              <kbd style={{ fontSize: '10px', background: isDark ? '#0A0A0A' : '#F1F5F9', border: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`, borderRadius: '4px', padding: '1px 4px', fontFamily: 'monospace', color: isDark ? '#878787' : '#64748B' }}>⌘</kbd>
              <kbd style={{ fontSize: '10px', background: isDark ? '#0A0A0A' : '#F1F5F9', border: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`, borderRadius: '4px', padding: '1px 4px', fontFamily: 'monospace', color: isDark ? '#878787' : '#64748B' }}>K</kbd>
            </button>
            {/* Mobile search icon */}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-global-search'))}
              className="sm:hidden flex items-center justify-center rounded-lg transition-colors focus:outline-none"
              style={{ width: '36px', height: '50px', color: isDark ? '#A1A1A1' : '#94A3B8', background: 'transparent', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
            >
              <Search style={{ width: '18px', height: '18px' }} />
            </button>


            {/* Notification Bell */}
            <button
              onClick={() => setNotifPanelOpen(v => !v)}
              aria-label={`Notifications${debouncedUnreadCount > 0 ? `, ${debouncedUnreadCount} unread` : ''}`}
              style={{
                position: 'relative',
                width: '36px', height: '50px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'transparent', border: 'none', borderRadius: '8px',
                cursor: 'pointer',
                color: isDark ? '#A1A1A1' : '#64748B',
                transition: 'color 150ms ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = isDark ? '#EDEDED' : '#0F172A'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = isDark ? '#A1A1A1' : '#64748B'; }}
            >
              <Bell style={{ width: '18px', height: '18px' }} />
              {debouncedUnreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: '4px', right: '4px',
                  minWidth: '16px', height: '16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: '#EF4444', color: '#FFFFFF',
                  borderRadius: '8px', padding: '0 4px',
                  fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 700,
                  lineHeight: 1,
                }}>
                  {debouncedUnreadCount > 99 ? '99+' : String(debouncedUnreadCount)}
                </span>
              )}
            </button>

            {/* User Avatar */}
            <div ref={userMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={userMenuOpen}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-semibold cursor-pointer transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  style={{
                    background: 'linear-gradient(135deg, var(--cp-blue), #6366F1)',
                    color: '#FFFFFF',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 0 2px var(--cp-blue-wash)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  title="Profile"
                >
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </button>

              {userMenuOpen && (
                <div
                  role="menu"
                  aria-label="User menu"
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '100%',
                    marginTop: '8px',
                    zIndex: 9999,
                    width: '224px',
                    borderRadius: '6px',
                    border: '1px solid var(--cp-bd)',
                    background: 'var(--cp-float)',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                    padding: '4px',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '8px' }}>
                    <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--cp-t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</p>
                    <p style={{ fontSize: '12px', color: 'var(--cp-t3)' }}>User Account</p>
                  </div>

                  {[
                    { icon: User, label: 'My Profile', onClick: () => { setUserMenuOpen(false); navigate('/profile'); } },
                    { icon: Bell, label: 'Notification Settings', onClick: () => { setUserMenuOpen(false); navigate('/admin/settings/notifications'); } },
                    ...(canAccessSettings ? [{ icon: Settings, label: 'Administration', onClick: () => { setUserMenuOpen(false); navigate('/admin/users'); } }] : []),
                    { icon: LogOut, label: 'Sign out', onClick: () => { setUserMenuOpen(false); void handleSignOut(); } },
                  ].map((menuItem) => (
                    <button
                      key={menuItem.label}
                      type="button"
                      role="menuitem"
                      onClick={menuItem.onClick}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 8px',
                        borderRadius: '4px',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        fontSize: '14px',
                        color: 'var(--cp-t2)',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--cp-hover)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <menuItem.icon style={{ width: '16px', height: '16px' }} />
                      <span>{menuItem.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </TooltipProvider>
        </div>
      </header>

      {/* Global Search is rendered by CatalystShell via zustand store */}

      {/* NotifyHub Stage A — shell panels (render null until Stage C) */}
      <Suspense fallback={null}>
        <NotificationPanelNew isOpen={notifPanelOpen} onClose={() => setNotifPanelOpen(false)} />
        <ToastContainerNew drawerOpen={false} />
      </Suspense>

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
