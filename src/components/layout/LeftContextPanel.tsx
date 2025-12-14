import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Settings,
  LayoutDashboard,
  ListTree,
  Map,
  Workflow,
  Share2,
  TrendingUp,
  Users as UsersIcon,
  Focus,
  CircleDot,
  Component,
  Link,
  Blocks,
  Lock,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { useEnabledModules } from '@/hooks/useModules';
import { ENTERPRISE_NAV_ICONS } from '@/components/icons/EnterpriseNavIcons';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useCatalystContext, TierType } from '@/contexts/CatalystContext';
import { useStrategicSnapshots } from '@/hooks/useStrategicSnapshots';


interface MenuItem {
  id: string;
  label: string;
  icon: any;
  path: string;
  tiers?: TierType[];
  expandable?: boolean;
}

// Enterprise menu items (when tier === 'enterprise')
const getEnterpriseMenuItems = (): MenuItem[] => [
  { id: 'strategy-room', label: 'Strategy Room', icon: Focus, path: '/enterprise/strategy-room', tiers: ['enterprise'] },
  { id: 'strategic-snapshots', label: 'Strategic Snapshots', icon: CircleDot, path: '/enterprise/snapshots', tiers: ['enterprise'] },
  { id: 'strategic-backlog', label: 'Strategic Backlog', icon: ListTree, path: '/enterprise/backlog', tiers: ['enterprise'] },
  { id: 'objective-tree', label: 'Objective tree', icon: Workflow, path: '/enterprise/okr-hub', tiers: ['enterprise'] },
  { id: 'roadmaps', label: 'Roadmaps', icon: Map, path: '/enterprise/roadmaps', tiers: ['enterprise'] },
  { id: 'risks', label: 'Risks', icon: Blocks, path: '/enterprise/risks', tiers: ['enterprise'] },
  { id: 'capacity-planning', label: 'Capacity', icon: UsersIcon, path: '/enterprise/reports/demand-capacity', tiers: ['enterprise'] },
  { id: 'reports', label: 'Reports', icon: TrendingUp, path: '/reports-discovery', tiers: ['enterprise'] },
];

// Portfolio/Program/Team menu items
const getMenuItems = (portfolioId?: string, programId?: string, tier?: string): MenuItem[] => [
  { id: 'room', label: 'Portfolio Room', icon: LayoutDashboard, path: portfolioId ? `/portfolio/${portfolioId}/room` : '/portfolio-room', tiers: ['portfolio', 'program', 'team'] },
  { id: 'initiatives', label: 'Initiatives', icon: Focus, path: '/initiatives', tiers: ['portfolio', 'program'] },
  { id: 'backlog', label: 'Backlog', icon: ListTree, path: '/items/epics', tiers: ['portfolio', 'program'] },
  { id: 'roadmaps', label: 'Roadmaps', icon: Map, path: '/roadmaps', tiers: ['portfolio', 'program'] },
  { id: 'program-board', label: 'Program Board', icon: Blocks, path: '/programs/program-board', tiers: ['program'] },
  { id: 'dependencies', label: 'Dependencies', icon: Link, path: '/dependencies', tiers: ['program'] },
  { id: 'more-items', label: 'More items', icon: Blocks, path: '#', tiers: ['portfolio', 'program'], expandable: true },
  { id: 'reports', label: 'Reports', icon: TrendingUp, path: '/reports-discovery', tiers: ['portfolio', 'program'] },
];

interface LeftContextPanelProps {
  className?: string;
}

export function LeftContextPanel({ className }: LeftContextPanelProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  // Start collapsed when on admin routes
  const isAdminRoute = location.pathname.startsWith('/admin');
  const [expanded, setExpanded] = useState(!isAdminRoute);
  const [moreItemsExpanded, setMoreItemsExpanded] = useState(false);
  const [reportsExpanded, setReportsExpanded] = useState(false);
  const [morePagesExpanded, setMorePagesExpanded] = useState(false);
  const {
    tier,
    workspaceType,
    portfolioId,
    setPortfolioId,
    programId,
    setProgramId,
    piIds,
    setPiIds,
    snapshotId,
    setSnapshotId,
  } = useCatalystContext();

  const { isModuleEnabled } = useEnabledModules();
  
  // Fetch snapshots from database
  const { data: snapshotsData } = useStrategicSnapshots(false);
  const snapshots = useMemo(() => 
    (snapshotsData || []).map(s => ({ id: s.id, name: s.name })),
    [snapshotsData]
  );

  // Sync snapshot from URL param
  useEffect(() => {
    const urlSnapshotId = searchParams.get('snapshotId');
    if (urlSnapshotId && urlSnapshotId !== snapshotId) {
      setSnapshotId(urlSnapshotId);
    }
  }, [searchParams, snapshotId, setSnapshotId]);

  // Auto-collapse when navigating to admin routes
  useEffect(() => {
    if (location.pathname.startsWith('/admin')) {
      setExpanded(false);
    }
  }, [location.pathname]);

  // More items sub-menu for Enterprise - simplified to only Risks and Capacity & Planning
  const allMoreItemsSubMenu = [
    { id: 'risks', label: 'Risks', path: '/risks', moduleCode: 'PORTFOLIO' },
    { id: 'capacity-planning', label: 'Capacity & Planning', path: '/capacity-planning', moduleCode: 'ENTERPRISE' },
  ];

  // Filter items based on enabled modules
  const moreItemsSubMenu = useMemo(() => 
    allMoreItemsSubMenu.filter(item => isModuleEnabled(item.moduleCode)),
    [isModuleEnabled]
  );

  // Reports sub-menu for Enterprise
  const reportsSubMenu = [
    { id: 'assessment-report', label: 'Assessment report', path: '/enterprise/reports/assessment' },
    { id: 'assessment-results', label: 'Assessment results', path: '/enterprise/reports/assessment-results' },
    { id: 'cumulative-effort', label: 'Cumulative effort', path: '/enterprise/reports/cumulative-effort' },
    { id: 'strategic-balancing', label: 'Strategic balancing', path: '/enterprise/reports/strategic-balancing' },
    { id: 'folios', label: 'Folios', path: '/enterprise/reports/folios' },
    { id: 'external-reports', label: 'External reports', path: '/enterprise/reports/external' },
    { id: 'organizational-hierarchy', label: 'Organizational hierarchy', path: '/enterprise/reports/organizational-hierarchy' },
    { id: 'work-tree-report', label: 'Work tree', path: '/enterprise/reports/work-tree' },
    { id: 'risk-roam-report', label: 'Risk ROAM Report', path: '/risk-roam-report' },
  ];

  // More pages sub-menu for Enterprise
  const morePagesSubMenu = [
    { id: 'knowledge-hub', label: 'Knowledge Hub', path: '/knowledge-hub' },
    { id: 'assessments', label: 'Assessments', path: '/enterprise/pages/assessments' },
    { id: 'definition-of-done', label: 'Definition of done', path: '/enterprise/pages/definition-of-done' },
    { id: 'framework-maps', label: 'Framework maps', path: '/enterprise/pages/framework-maps' },
    { id: 'lean-process', label: 'Lean process', path: '/enterprise/pages/lean-process' },
    { id: 'metrics', label: 'Metrics', path: '/enterprise/pages/metrics' },
    { id: 'meetings', label: 'Meetings', path: '/enterprise/pages/meetings' },
    { id: 'story-point-progress', label: 'Story point progress by team', path: '/enterprise/pages/story-point-progress' },
  ];

  // Empty data - populated from database
  const portfolios: { id: string; name: string; abbr: string; color: string }[] = [];
  const programs: { id: string; name: string; portfolioId: string }[] = [];
  const pis: { id: string; code: string; dates: string; status: string }[] = [];

  const currentPortfolio = portfolios.find(p => p.id === portfolioId);
  const currentProgram = programs.find(p => p.id === programId);

  const handleNavigation = (path: string) => {
    if (path === '#') return; // Don't navigate for expandable items
    
    // Collapse sidebar when navigating
    setExpanded(false);
    
    // For program board, add program and pi query params from context
    if (path.includes('program-board')) {
      const params = new URLSearchParams();
      if (programId) params.set('program', programId);
      if (piIds[0]) params.set('pi', piIds[0]);
      navigate(`${path}?${params.toString()}`);
    } else {
      navigate(path);
    }
  };

  const isActive = (path: string) => {
    if (path === '#') return false;
    return location.pathname === path || location.pathname.startsWith(path);
  };

  const getFilteredMenuItems = () => {
    // Use Enterprise menu items when in enterprise workspace (route-based)
    if (workspaceType === 'enterprise') {
      return getEnterpriseMenuItems();
    }
    // Otherwise use regular menu items for portfolio/program contexts
    const menuItems = getMenuItems(portfolioId || undefined, programId || undefined, tier);
    return menuItems.filter(item => !item.tiers || item.tiers.includes(tier));
  };

  const handleExpandableClick = (itemId: string) => {
    if (itemId === 'more-items') {
      setMoreItemsExpanded(!moreItemsExpanded);
    } else if (itemId === 'reports') {
      setReportsExpanded(!reportsExpanded);
    } else if (itemId === 'more-pages') {
      setMorePagesExpanded(!morePagesExpanded);
    }
  };

  return (
    <aside
      style={{
        width: expanded ? '220px' : '60px',
        height: '100%',
        background: 'var(--surface-1)',
        borderRight: '1px solid var(--divider)',
        transition: 'all 0.3s ease',
        flexShrink: 0,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}
      className={className}
    >
      {/* Toggle Handle */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          position: 'absolute',
          right: '-12px',
          top: '24px',
          zIndex: 50,
          width: '24px',
          height: '24px',
          borderRadius: '9999px',
          background: 'var(--surface-1)',
          border: '1px solid var(--divider)',
          boxShadow: 'var(--card-shadow)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'var(--icon-default)',
        }}
        aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
      >
        {expanded ? (
          <ChevronLeft style={{ width: '16px', height: '16px' }} />
        ) : (
          <ChevronRight style={{ width: '16px', height: '16px' }} />
        )}
      </button>

      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Context Header - 52px per reference */}
        <div 
          style={{ 
            height: '52px', 
            padding: expanded ? '0 12px' : '0',
            display: 'flex', 
            alignItems: 'center',
            justifyContent: expanded ? 'space-between' : 'center',
            borderBottom: expanded ? '1px solid var(--divider)' : 'none',
            flexShrink: 0,
          }}
        >
          {!expanded && (
            <div 
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                background: 'linear-gradient(135deg, #5c7c5c 0%, #6d8d6d 100%)',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              EN
            </div>
          )}
          {expanded && workspaceType === 'enterprise' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div 
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  background: 'linear-gradient(135deg, #5c7c5c 0%, #6d8d6d 100%)',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                EN
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)' }}>Enterprise</div>
                <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>Strategy</div>
              </div>
            </div>
          )}
          {expanded && (workspaceType === 'project' || workspaceType === 'program') && currentPortfolio && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div 
                className={currentPortfolio.color}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {currentPortfolio.abbr}
              </div>
              <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentPortfolio.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-2)' }}>Portfolio</div>
              </div>
            </div>
          )}
        </div>

        {/* Filters section - only when expanded AND has content to show */}
        {expanded && tier === 'enterprise' && (
          <div className="px-4 py-4 border-b border-border">
              {/* Snapshot selector for Enterprise */}
              {tier === 'enterprise' && (
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase mb-2 block tracking-wider">
                    SNAPSHOT
                  </label>
                  <Select value={snapshotId || undefined} onValueChange={setSnapshotId}>
                    <SelectTrigger className="h-9 text-sm w-full bg-background border-border">
                      <SelectValue placeholder={snapshots.length === 0 ? "No snapshots" : "Select Snapshot"} />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border z-[100]">
                      {snapshots.length === 0 ? (
                        <div className="py-2 px-3 text-sm text-muted-foreground">No snapshots available</div>
                      ) : (
                        snapshots.map(snap => (
                          <SelectItem key={snap.id} value={snap.id}>
                            {snap.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
              </div>
            )}
          </div>
        )}

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto py-1">
          <TooltipProvider delayDuration={0}>
            {getFilteredMenuItems().map((item) => {
              const CustomIcon = ENTERPRISE_NAV_ICONS[item.id];
              const LucideIcon = item.icon;
              const active = isActive(item.path);
              const isExpandable = item.expandable;
              const isMoreItems = item.id === 'more-items';
              const isReports = item.id === 'reports';
              const isMorePages = item.id === 'more-pages';

              const menuButton = (
                <button
                  onClick={() => {
                    if (isExpandable) {
                      handleExpandableClick(item.id);
                    } else {
                      handleNavigation(item.path);
                    }
                  }}
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: expanded ? '0 12px' : '0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease, color 0.15s ease',
                    marginBottom: '2px',
                    position: 'relative',
                    justifyContent: expanded ? 'flex-start' : 'center',
                    // Active state: use nav-active-bg, text-1 for text
                    background: active ? 'var(--nav-active-bg)' : 'transparent',
                    color: active ? 'var(--text-1)' : 'var(--text-2)',
                    fontWeight: active ? 600 : 500,
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    outline: 'none',
                  }}
                  onMouseEnter={(e) => { 
                    if (!active) e.currentTarget.style.background = 'var(--nav-hover-bg)'; 
                  }}
                  onMouseLeave={(e) => { 
                    e.currentTarget.style.background = active ? 'var(--nav-active-bg)' : 'transparent'; 
                  }}
                >
                  {/* Left indicator bar for active state - 2px brand-active */}
                  {active && (
                    <span 
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: '8px',
                        bottom: '8px',
                        width: '2px',
                        background: 'var(--brand-active)',
                        borderRadius: '0 1px 1px 0',
                      }}
                    />
                  )}
                  {CustomIcon ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: active ? 'var(--text-1)' : 'var(--icon-default)', flexShrink: 0 }}>
                      <CustomIcon className="w-5 h-5" />
                    </span>
                  ) : (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: active ? 'var(--text-1)' : 'var(--icon-default)', flexShrink: 0 }}>
                      <LucideIcon style={{ width: '20px', height: '20px' }} />
                    </span>
                  )}
                  {expanded && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left', flex: 1 }}>{item.label}</span>}
                  {expanded && item.expandable && (
                    <ChevronRight 
                      style={{
                        width: '16px',
                        height: '16px',
                        color: 'var(--icon-muted)',
                        transition: 'transform 0.15s ease',
                        transform: ((isMoreItems && moreItemsExpanded) || 
                         (isReports && reportsExpanded) || 
                         (isMorePages && morePagesExpanded)) ? 'rotate(90deg)' : 'rotate(0deg)',
                      }}
                    />
                  )}
                </button>
              );

              return (
                <div key={item.id}>
                  {!expanded ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {menuButton}
                      </TooltipTrigger>
                      <TooltipContent side="right" className="z-[100]">
                        <p>{item.label}</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    menuButton
                  )}

                  {/* More items submenu - only for Enterprise workspace */}
                {isMoreItems && moreItemsExpanded && expanded && workspaceType === 'enterprise' && (
                  <div style={{ background: 'var(--surface-2)' }}>
                    {moreItemsSubMenu.map((subItem) => (
                      <button
                        key={subItem.id}
                        onClick={() => handleNavigation(subItem.path)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          paddingLeft: '48px',
                          paddingRight: '16px',
                          paddingTop: '8px',
                          paddingBottom: '8px',
                          fontSize: '13px',
                          fontWeight: isActive(subItem.path) ? 600 : 400,
                          color: isActive(subItem.path) ? 'var(--text-1)' : 'var(--text-2)',
                          background: isActive(subItem.path) ? 'var(--nav-active-bg)' : 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          transition: 'background 0.15s ease',
                          textAlign: 'left',
                        }}
                        onMouseEnter={(e) => { if (!isActive(subItem.path)) e.currentTarget.style.background = 'var(--nav-hover-bg)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = isActive(subItem.path) ? 'var(--nav-active-bg)' : 'transparent'; }}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subItem.label}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Reports submenu - only for Enterprise workspace */}
                {isReports && reportsExpanded && expanded && workspaceType === 'enterprise' && (
                  <div style={{ background: 'var(--surface-2)' }}>
                    {reportsSubMenu.map((subItem) => (
                      <button
                        key={subItem.id}
                        onClick={() => handleNavigation(subItem.path)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          paddingLeft: '48px',
                          paddingRight: '16px',
                          paddingTop: '8px',
                          paddingBottom: '8px',
                          fontSize: '13px',
                          fontWeight: isActive(subItem.path) ? 600 : 400,
                          color: isActive(subItem.path) ? 'var(--text-1)' : 'var(--text-2)',
                          background: isActive(subItem.path) ? 'var(--nav-active-bg)' : 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          transition: 'background 0.15s ease',
                          textAlign: 'left',
                        }}
                        onMouseEnter={(e) => { if (!isActive(subItem.path)) e.currentTarget.style.background = 'var(--nav-hover-bg)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = isActive(subItem.path) ? 'var(--nav-active-bg)' : 'transparent'; }}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subItem.label}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* More pages submenu - only for Enterprise workspace */}
                {isMorePages && morePagesExpanded && expanded && workspaceType === 'enterprise' && (
                  <div style={{ background: 'var(--surface-2)' }}>
                    {morePagesSubMenu.map((subItem) => (
                      <button
                        key={subItem.id}
                        onClick={() => handleNavigation(subItem.path)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          paddingLeft: '48px',
                          paddingRight: '16px',
                          paddingTop: '8px',
                          paddingBottom: '8px',
                          fontSize: '13px',
                          fontWeight: isActive(subItem.path) ? 600 : 400,
                          color: isActive(subItem.path) ? 'var(--text-1)' : 'var(--text-2)',
                          background: isActive(subItem.path) ? 'var(--nav-active-bg)' : 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          transition: 'background 0.15s ease',
                          textAlign: 'left',
                        }}
                        onMouseEnter={(e) => { if (!isActive(subItem.path)) e.currentTarget.style.background = 'var(--nav-hover-bg)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = isActive(subItem.path) ? 'var(--nav-active-bg)' : 'transparent'; }}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subItem.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          </TooltipProvider>
        </nav>

        {/* Footer */}
        {expanded && (
          <div style={{ borderTop: '1px solid var(--divider)', padding: '8px' }}>
            <button 
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '0 12px',
                height: '40px',
                fontSize: '14px',
                fontWeight: 500,
                color: 'var(--text-2)',
                background: 'transparent',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--nav-hover-bg)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              onClick={() => toast.info('Enterprise Settings coming soon', { icon: <Lock className="h-4 w-4" /> })}
            >
              <Lock style={{ width: '20px', height: '20px', color: 'var(--icon-muted)' }} />
              <span style={{ textAlign: 'left' }}>Enterprise Settings</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
