import { useEffect, useRef, useState, lazy, Suspense } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Search, ChevronDown, LogOut, Settings, Bell, User, Sun, Moon } from "lucide-react";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { BADGE_DEBOUNCE_MS } from "@/constants/notificationConstants";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { resolveAvatarUrl } from "@/lib/avatars";
import { useUserRole } from "@/hooks/useUserRole";
import { useEnabledModules } from "@/hooks/useModules";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { useFeatureFlags } from "@/contexts/FeatureFlagContext";
import { useSingleItemNavigation } from "@/hooks/useSingleItemNavigation";
import { Button } from "@/components/ui/button";
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
import { Tooltip } from "@/components/ads";
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
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const globalSearch = useGlobalSearchStore();

  useEffect(() => {
    const handler = () => globalSearch.open();
    window.addEventListener('open-global-search', handler);
    return () => window.removeEventListener('open-global-search', handler);
  }, []);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [avatarImgError, setAvatarImgError] = useState(false);
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

  /**
   * §19 avatar chokepoint (2026-04-20):
   * Previously selected `profiles.avatar_url` → leaked external Atlassian-CDN /
   * Gravatar URLs into the global topnav. Now we SELECT only `full_name`,
   * then resolve the avatar URL synchronously via `resolveAvatarUrl(full_name)`
   * so every rendered URL is a local hashed asset or `null`.
   */
  const { data: userProfile } = useQuery({
    queryKey: ['current-user-profile-local', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user!.id)
        .maybeSingle();
      if (!data) return null;
      const avatar_url = data.full_name ? resolveAvatarUrl(data.full_name) : null;
      return { full_name: data.full_name, avatar_url };
    },
    staleTime: 5 * 60 * 1000,
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
          height: 'calc(56px + var(--app-safe-top))',
          paddingTop: 'var(--app-safe-top)',
          paddingLeft: '16px',
          paddingRight: '16px',
          borderBottom: `1px solid ${isDark ? '#2E2E2E' : '#DFE1E6'}`,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          backgroundColor: isDark ? '#0A0A0A' : '#FFFFFF',
          boxShadow: 'none',
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
        }}
      >
        {/* ===== LOGO ZONE (fixed-width brand zone — unified left column with sidebar) ===== */}
        {/* Width = sidebar width minus header's 16px left padding, so first nav item aligns with sidebar edge.
            2026-04-19: duration + easing unified with SidebarBase.tsx (180ms, Material emphasized decelerate).
            overflow:hidden clips the wordmark when it's fading out during collapse — otherwise the ~120px-wide
            asset would briefly spill into the nav zone before the parent width catches up. */}
        <div
          className="flex items-center flex-shrink-0 relative"
          style={{
            width: sidebarExpanded ? 'calc(240px - 16px)' : 'calc(56px - 16px)',
            transition: 'width 180ms cubic-bezier(0.2, 0, 0, 1)',
            overflow: 'hidden',
          }}
        >
          <a
            className="flex items-center flex-shrink-0 cursor-pointer no-underline transition-opacity"
            style={{
              opacity: 1,
              position: 'relative',
              height: '30px',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            onClick={() => navigate('/home')}
          >
            {/* Logo crossfade (2026-04-19): both assets are always rendered;
                opacity toggles between them to eliminate the hard wordmark↔mark
                cut at the sidebar-width midpoint. The mark is absolute-positioned
                so it doesn't contribute to the anchor's flow size — the wordmark
                determines layout, the mark overlays when collapsed.
                30px height: see earlier comment on nav rhythm. */}
            <img
              src={isDark ? catalystLogoMark2Dark : catalystLogoMark2}
              alt=""
              aria-hidden="true"
              style={{
                height: '30px',
                width: '30px',
                position: 'absolute',
                top: 0,
                left: 0,
                opacity: sidebarExpanded ? 0 : 1,
                transition: sidebarExpanded
                  ? 'opacity 80ms ease'
                  : 'opacity 120ms ease 60ms',
              }}
            />
            <img
              src={isDark ? catalystWordmark3Dark : catalystWordmark3}
              alt="Catalyst"
              style={{
                height: '30px',
                width: 'auto',
                opacity: sidebarExpanded ? 1 : 0,
                transition: sidebarExpanded
                  ? 'opacity 120ms ease 60ms'
                  : 'opacity 80ms ease',
              }}
            />
          </a>
        </div>
        
        {/* ===== NAVIGATION ZONE ===== */}
        <nav className="hidden lg:flex items-center flex-1 overflow-hidden" style={{ gap: '0px', marginRight: '12px', maskImage: 'linear-gradient(to right, black calc(100% - 24px), transparent)', WebkitMaskImage: 'linear-gradient(to right, black calc(100% - 24px), transparent)' }}>
          <>
            {navItems.map((item) => {
              if (!item.isEnabled) {
                return (
                  <Tooltip
                    key={item.label}
                    content={
                      <p>
                        {isAdmin
                          ? `This module is disabled. Enable it in Administration → Modules & Packages.`
                          : `This module is disabled by your organization.`}
                      </p>
                    }
                  >
                    <button
                      className="flex items-center cursor-not-allowed opacity-40"
                      style={{
                        height: '100%',
                        padding: '0 12px',
                        fontSize: '14px',
                        fontWeight: 500,
                        color: '#6B778C',
                        borderRadius: '0',
                        gap: '4px',
                        border: 'none',
                        background: 'transparent',
                      }}
                      onClick={() => handleDisabledModuleClick(item.label)}
                    >
                      {item.label}
                    </button>
                  </Tooltip>
                );
              }

              const isActive = item.label === activeNavItem;
              const activeColor = isDark ? '#FFFFFF' : '#0052CC';
              const inactiveColor = isDark ? '#878787' : '#6B778C';
              const hoverColor = isDark ? '#EDEDED' : '#172B4D';
              const activeUnderline = '#0052CC';
              const hoverUnderline = isDark ? '#454545' : '#C1C7D0';
              const navButtonStyle: React.CSSProperties = {
                height: '100%',
                padding: '0 12px',
                fontSize: '14px',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? activeColor : inactiveColor,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                transition: 'color 0.15s ease',
                border: 'none',
                background: 'transparent',
                position: 'relative' as const,
                fontFamily: "'Inter', sans-serif",
                outline: 'none',
                letterSpacing: '0',
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
                          color: location.pathname.startsWith('/release') ? '#0052CC' : navButtonStyle.color,
                          fontWeight: location.pathname.startsWith('/release') ? 600 : navButtonStyle.fontWeight,
                          borderBottom: location.pathname.startsWith('/release') ? '2px solid #0052CC' : '2px solid transparent',
                        }}
                        onMouseEnter={(e) => { if (!location.pathname.startsWith('/release')) e.currentTarget.style.color = '#172B4D'; }}
                        onMouseLeave={(e) => { if (!location.pathname.startsWith('/release')) e.currentTarget.style.color = '#6B778C'; }}
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
                              color: location.pathname.startsWith('/release') ? '#0052CC' : navButtonStyle.color,
                              fontWeight: location.pathname.startsWith('/release') ? 600 : navButtonStyle.fontWeight,
                              borderBottom: location.pathname.startsWith('/release') ? '2px solid #0052CC' : '2px solid transparent',
                            }}
                            onMouseEnter={(e) => { if (!location.pathname.startsWith('/release')) e.currentTarget.style.color = '#172B4D'; }}
                            onMouseLeave={(e) => { if (!location.pathname.startsWith('/release')) e.currentTarget.style.color = '#6B778C'; }}
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
                        color: location.pathname.startsWith('/taskhub') ? '#0052CC' : navButtonStyle.color,
                        fontWeight: location.pathname.startsWith('/taskhub') ? 600 : navButtonStyle.fontWeight,
                        borderBottom: location.pathname.startsWith('/taskhub') ? '2px solid #0052CC' : '2px solid transparent',
                      }}
                      onMouseEnter={(e) => { if (!location.pathname.startsWith('/taskhub')) e.currentTarget.style.color = '#172B4D'; }}
                      onMouseLeave={(e) => { if (!location.pathname.startsWith('/taskhub')) e.currentTarget.style.color = '#6B778C'; }}
                      onClick={() => navigate('/taskhub/boards')}
                    >
                      {item.label}
                    </button>
                  ) : item.label === "Releases" ? (
                    <button
                      style={{
                        ...navButtonStyle,
                        color: location.pathname.startsWith('/releases') ? '#0052CC' : navButtonStyle.color,
                        fontWeight: location.pathname.startsWith('/releases') ? 600 : navButtonStyle.fontWeight,
                        borderBottom: location.pathname.startsWith('/releases') ? '2px solid #0052CC' : '2px solid transparent',
                      }}
                      onMouseEnter={(e) => { if (!location.pathname.startsWith('/releases')) e.currentTarget.style.color = '#172B4D'; }}
                      onMouseLeave={(e) => { if (!location.pathname.startsWith('/releases')) e.currentTarget.style.color = '#6B778C'; }}
                      onClick={() => navigate('/releases/command-center')}
                    >
                      {item.label}
                    </button>
                  ) : (item as any).isLabel ? (
                    <span
                      style={{
                        height: '100%',
                        padding: '0 12px',
                        fontSize: '14px',
                        fontWeight: 500,
                        fontFamily: "'Inter', sans-serif",
                        color: '#6B778C',
                        borderRadius: '0',
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
          </>
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

          <>

            {/* Settings and Theme Toggle moved into user avatar dropdown (G4) */}

            {/* Search Trigger (full field at xl+, icon only below) */}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-global-search'))}
              className="hidden xl:flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cp-focus-ring)] focus-visible:ring-offset-1"
              style={{
                minWidth: '280px',
                height: '32px',
                padding: '0 12px',
                background: isDark ? '#1A1A1A' : '#F4F5F7',
                border: `1px solid ${isDark ? '#2E2E2E' : '#DFE1E6'}`,
                borderRadius: '3px',
                cursor: 'pointer',
                gap: '8px',
                alignItems: 'center',
                transition: 'border-color 120ms ease, background 120ms ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = isDark ? '#454545' : '#C1C7D0'; e.currentTarget.style.background = isDark ? '#1F1F1F' : '#EBECF0'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = isDark ? '#2E2E2E' : '#DFE1E6'; e.currentTarget.style.background = isDark ? '#1A1A1A' : '#F4F5F7'; }}
            >
              <Search style={{ width: '16px', height: '16px', color: isDark ? '#878787' : '#6B778C', flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: '13px', fontFamily: "'Inter', sans-serif", color: isDark ? '#878787' : '#6B778C', textAlign: 'left' }}>
                Search...
              </span>
              <kbd style={{ fontSize: '10px', background: isDark ? '#0A0A0A' : '#FFFFFF', border: `1px solid ${isDark ? '#2E2E2E' : '#DFE1E6'}`, borderRadius: '3px', padding: '2px 5px', fontFamily: "'JetBrains Mono', monospace", color: isDark ? '#878787' : '#6B778C', fontWeight: 500 }}>⌘</kbd>
              <kbd style={{ fontSize: '10px', background: isDark ? '#0A0A0A' : '#FFFFFF', border: `1px solid ${isDark ? '#2E2E2E' : '#DFE1E6'}`, borderRadius: '3px', padding: '2px 5px', fontFamily: "'JetBrains Mono', monospace", color: isDark ? '#878787' : '#6B778C', fontWeight: 500 }}>K</kbd>
            </button>
            {/* Compact search icon (shown below xl to preserve right-side action space) */}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-global-search'))}
              className="xl:hidden flex items-center justify-center rounded-lg transition-colors focus:outline-none"
              style={{ width: '32px', height: '32px', color: isDark ? '#A1A1A1' : '#94A3B8', background: 'transparent', borderRadius: '3px', border: 'none', cursor: 'pointer' }}
              title="Search (⌘K)"
              aria-label="Search"
            >
              <Search style={{ width: '16px', height: '16px' }} />
            </button>


            {/* Notification Bell */}
            <button
              onClick={() => setNotifPanelOpen(v => !v)}
              aria-label={`Notifications${debouncedUnreadCount > 0 ? `, ${debouncedUnreadCount} unread` : ''}`}
              style={{
                position: 'relative',
                width: '32px', height: '32px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'transparent', border: 'none', borderRadius: '3px',
                cursor: 'pointer',
                color: isDark ? '#A1A1A1' : '#6B778C',
                transition: 'color 150ms ease, background 120ms ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = isDark ? '#EDEDED' : '#172B4D'; e.currentTarget.style.background = isDark ? '#1F1F1F' : '#F4F5F7'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = isDark ? '#A1A1A1' : '#6B778C'; e.currentTarget.style.background = 'transparent'; }}
            >
              <Bell style={{ width: '16px', height: '16px' }} />
              {debouncedUnreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: '4px', right: '4px',
                  width: '8px', height: '8px',
                  background: '#DE350B',
                  borderRadius: '50%',
                  border: `2px solid ${isDark ? '#0A0A0A' : '#FFFFFF'}`,
                  boxSizing: 'content-box',
                }} />
              )}
            </button>

            {/* User Avatar */}
            <div ref={userMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={userMenuOpen}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-semibold cursor-pointer transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background overflow-hidden"
                  style={{
                    background: (userProfile?.avatar_url && !avatarImgError) ? 'transparent' : '#0052CC',
                    color: '#FFFFFF',
                    border: '2px solid',
                    borderColor: isDark ? '#454545' : '#DFE1E6',
                    transition: 'border-color 150ms ease, box-shadow 150ms ease',
                    padding: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = isDark ? '#6B7280' : '#C1C7D0';
                    e.currentTarget.style.boxShadow = `0 0 0 2px ${isDark ? '#1E3A5F' : '#DEEBFF'}`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = isDark ? '#454545' : '#E2E8F0';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  title={userProfile?.full_name || user?.email || 'Profile'}
                >
                  {userProfile?.avatar_url && !avatarImgError ? (
                    <img
                      src={userProfile.avatar_url}
                      alt={userProfile.full_name || 'Profile'}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover rounded-full"
                      onError={() => setAvatarImgError(true)}
                    />
                  ) : (
                    <span>{user?.email?.charAt(0).toUpperCase() || 'U'}</span>
                  )}
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
                    <p style={{ fontSize: '14px', fontWeight: 500, color: isDark ? '#EDEDED' : '#172B4D', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userProfile?.full_name || user?.email}</p>
                    <p style={{ fontSize: '12px', color: isDark ? '#878787' : '#6B778C', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</p>
                  </div>

                  {[
                    { icon: User, label: 'My Profile', onClick: () => { setUserMenuOpen(false); navigate('/profile'); } },
                    { icon: Bell, label: 'Notification Settings', onClick: () => { setUserMenuOpen(false); navigate('/admin/settings/notifications'); } },
                    { icon: isDark ? Sun : Moon, label: isDark ? 'Switch to light mode' : 'Switch to dark mode', onClick: () => { setTheme(isDark ? 'light' : 'dark'); } },
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
          </>
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
