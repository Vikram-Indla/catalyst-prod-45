import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { CreateDropdown } from "./CreateDropdown";
import { ItemsDropdown } from "./ItemsDropdown";
import { useUserRole } from "@/hooks/useUserRole";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { useFeatureFlags } from "@/contexts/FeatureFlagContext";
import { useTheme } from "next-themes";
import { useCatalystContext } from "@/contexts/CatalystContext";
import { getActiveNavItem } from "@/lib/workspaceContext";
import catalystWordmark3 from "@/assets/catalyst-wordmark-3.svg";
import catalystWordmark3Dark from "@/assets/catalyst-wordmark-3-dark.svg";

/* Hub items — canonical list matching CatalystHeader */
const HUB_ITEMS = [
  { label: "Home", path: "/for-you", moduleKey: "home", featureFlagKey: null as string | null, requiresEnterpriseAccess: false, visibleToProductOwner: true },
  { label: "StrategyHub", path: "/strategyhub", moduleKey: "enterprise", featureFlagKey: "strategy_hub", requiresEnterpriseAccess: true, visibleToProductOwner: true },
  { label: "ProductHub", path: "/producthub", moduleKey: "product", featureFlagKey: "product_hub", requiresEnterpriseAccess: false, visibleToProductOwner: true },
  { label: "ProjectHub", path: "/project-hub", moduleKey: "workhub", featureFlagKey: "project_hub", requiresEnterpriseAccess: false, visibleToProductOwner: true },
  { label: "ReleaseHub", path: "/release-hub/command-center", moduleKey: "releases", featureFlagKey: "release_hub", requiresEnterpriseAccess: false, visibleToProductOwner: false },
  { label: "TestHub", path: "/testhub/dashboard", moduleKey: "testhub", featureFlagKey: "test_hub", requiresEnterpriseAccess: false, visibleToProductOwner: false },
  { label: "IncidentHub", path: "/incident-hub", moduleKey: "operations", featureFlagKey: "incident_hub", requiresEnterpriseAccess: false, visibleToProductOwner: false },
  { label: "TaskHub", path: "/taskhub/boards", moduleKey: "planner", featureFlagKey: "task_hub", requiresEnterpriseAccess: false, visibleToProductOwner: true },
  { label: "PlanHub", path: "/planhub", moduleKey: "planhub", featureFlagKey: "plan_hub", requiresEnterpriseAccess: false, visibleToProductOwner: true },
  { label: "WikiHub", path: "/wiki", moduleKey: "wiki", featureFlagKey: "wiki_hub", requiresEnterpriseAccess: false, visibleToProductOwner: true },
];

export function MobileNavigationMenu() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const { isProductOwnerOnly, canAccessEnterprise } = useUserRole();
  const { canViewInNav } = useModuleAccess();
  const { isModuleEnabled: featureFlagEnabled } = useFeatureFlags();
  const { workspaceType } = useCatalystContext();
  const activeNavItem = getActiveNavItem(workspaceType);

  // Auto-close sheet when viewport crosses lg breakpoint (1024px)
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)');
    const handler = (e: MediaQueryListEvent) => { if (e.matches) setOpen(false); };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // Filter hub items — same logic as CatalystHeader
  const navItems = HUB_ITEMS
    .filter(item => !isProductOwnerOnly || item.visibleToProductOwner)
    .filter(item => {
      return item.requiresEnterpriseAccess
        ? canViewInNav(item.moduleKey) && canAccessEnterprise
        : canViewInNav(item.moduleKey);
    })
    .filter(item => {
      if (!item.featureFlagKey) return true;
      return featureFlagEnabled(item.featureFlagKey);
    });

  const handleNavigate = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 p-0 overflow-y-auto">
        <div className="flex flex-col h-full">
          {/* Header — proper Catalyst wordmark */}
          <div className="flex items-center p-4 border-b">
            <img
              src={isDark ? catalystWordmark3Dark : catalystWordmark3}
              alt="Catalyst"
              style={{ height: '24px', width: 'auto' }}
            />
          </div>

          {/* Hub Navigation — mirrors top nav */}
          <nav className="flex-1 py-2">
            {navItems.map((item) => {
              const isActive = item.label === activeNavItem;
              return (
                <button
                  key={item.label}
                  onClick={() => handleNavigate(item.path)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '10px 24px',
                    border: 'none',
                    background: isActive
                      ? (isDark ? 'rgba(59,130,246,0.10)' : 'rgba(37,99,235,0.06)')
                      : 'transparent',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: isActive ? 600 : 500,
                    color: isActive
                      ? (isDark ? '#FFFFFF' : '#2563EB')
                      : (isDark ? '#EDEDED' : '#1E293B'),
                    fontFamily: 'var(--ds-font-family-body)',
                    textAlign: 'left',
                    transition: 'background 0.1s',
                    borderLeft: isActive ? '3px solid #3B82F6' : '3px solid transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = isDark ? '#1F1F1F' : 'rgba(0,0,0,0.04)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isActive
                      ? (isDark ? 'rgba(59,130,246,0.10)' : 'rgba(37,99,235,0.06)')
                      : 'transparent';
                  }}
                >
                  {item.label}
                </button>
              );
            })}

            <Separator className="my-3" />

            {/* Actions */}
            <div className="px-6 py-2">
              <p className="text-xs font-semibold text-muted-foreground mb-2">ACTIONS</p>
              <div onClick={() => setOpen(false)}>
                <CreateDropdown />
              </div>
            </div>
            <div className="px-6 py-2">
              <div onClick={() => setOpen(false)}>
                <ItemsDropdown />
              </div>
            </div>
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
}
