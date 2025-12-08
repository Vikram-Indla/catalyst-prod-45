import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard,
  Users,
  Settings,
  Database,
  Link2,
  Activity,
  Shield,
  ChevronLeft,
  ChevronRight,
  Search,
  Pin,
  Palette
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useState, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AdminSidebarV2Props {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

// New IA: 7 top-level buckets + Design Audit
const adminPockets = [
  {
    id: 'overview',
    label: 'Overview',
    icon: LayoutDashboard,
    path: '/admin/overview',
  },
  {
    id: 'users-access',
    label: 'Users & Access',
    icon: Users,
    path: '/admin/users-access',
    children: [
      { label: 'Users', path: '/admin/users' },
      { label: 'Roles & Permissions', path: '/admin/roles-permissions' },
      { label: 'Team Roles', path: '/admin/team-roles' },
      { label: 'System Roles', path: '/admin/system-roles' },
    ],
  },
  {
    id: 'configuration',
    label: 'Configuration',
    icon: Settings,
    path: '/admin/configuration',
    children: [
      { label: 'Modules & Packages', path: '/admin/modules-packages' },
      { label: 'Product Settings', path: '/admin/product-settings' },
      { label: 'Work Codes', path: '/admin/work-codes' },
      { label: 'Details Panels', path: '/admin/details-panels' },
      { label: 'Terminology', path: '/admin/terminology' },
      { label: 'Team Settings', path: '/admin/team-settings' },
      { label: 'Project Settings', path: '/admin/program-settings' },
      { label: 'Program Settings', path: '/admin/portfolio-settings' },
      { label: 'Progress Bars', path: '/admin/progress-bars' },
      { label: 'Estimation', path: '/admin/estimation' },
      { label: 'General Settings', path: '/admin/general-settings' },
      { label: 'Theme Groups', path: '/admin/theme-groups' },
      { label: 'Announcements', path: '/admin/announcements' },
    ],
  },
  {
    id: 'reference-data',
    label: 'Reference Data',
    icon: Database,
    path: '/admin/reference-data',
    children: [
      { label: 'Teams', path: '/admin/teams' },
      { label: 'Projects', path: '/admin/programs' },
      { label: 'Programs', path: '/admin/portfolios' },
      { label: 'Business Units', path: '/admin/business-units' },
      { label: 'Regions', path: '/admin/regions' },
      { label: 'Cities', path: '/admin/cities' },
      { label: 'Countries', path: '/admin/countries' },
      { label: 'Customers', path: '/admin/customers' },
      { label: 'Cost Centers', path: '/admin/cost-centers' },
    ],
  },
  {
    id: 'integrations',
    label: 'Integrations',
    icon: Link2,
    path: '/admin/integrations-hub',
    children: [
      { label: 'Jira Integration', path: '/admin/jira-config' },
      { label: 'Import Data', path: '/admin/import-data' },
    ],
  },
  {
    id: 'audit-usage',
    label: 'Audit & Usage',
    icon: Activity,
    path: '/admin/activity',
    children: [
      { label: 'Activity', path: '/admin/activity' },
      { label: 'Changes', path: '/admin/changes' },
      { label: 'Changes Log', path: '/admin/changes-log' },
      { label: 'Usage Trends', path: '/admin/usage-trends' },
    ],
  },
  {
    id: 'security',
    label: 'Security',
    icon: Shield,
    path: '/admin/security',
  },
  {
    id: 'design-audit',
    label: 'Design Audit',
    icon: Palette,
    path: '/admin/design-audit',
  },
];

// Flatten all paths for search
const getAllPaths = () => {
  const paths: { label: string; path: string; parent?: string }[] = [];
  adminPockets.forEach(pocket => {
    paths.push({ label: pocket.label, path: pocket.path });
    pocket.children?.forEach(child => {
      paths.push({ label: child.label, path: child.path, parent: pocket.label });
    });
  });
  return paths;
};

export function AdminSidebarV2({ expanded, onToggle, className }: AdminSidebarV2Props) {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [pinnedItems] = useState<string[]>(['/admin/users', '/admin/activity']);
  
  const allPaths = useMemo(() => getAllPaths(), []);
  
  const filteredPaths = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return allPaths.filter(p => 
      p.label.toLowerCase().includes(query) || 
      p.parent?.toLowerCase().includes(query)
    );
  }, [searchQuery, allPaths]);

  const isActive = (path: string) => location.pathname === path;
  const isChildActive = (children?: { path: string }[]) => 
    children?.some(c => location.pathname === c.path);

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'h-full border-r bg-card transition-all duration-200 flex-shrink-0 relative flex flex-col',
          expanded ? 'w-60' : 'w-14',
          className
        )}
      >
        {/* Toggle Handle - Atlassian style */}
        <button
          onClick={onToggle}
          className={cn(
            'absolute -right-3 top-5 z-50 h-6 w-6 rounded-full bg-card border shadow-sm',
            'flex items-center justify-center hover:bg-accent transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
          )}
          aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {expanded ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>

        {/* Header - Compact Atlassian style */}
        <div className={cn(
          'h-14 border-b border-border flex items-center shrink-0',
          expanded ? 'px-4' : 'px-2 justify-center'
        )}>
          {expanded ? (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-md bg-brand-gold/15 flex items-center justify-center">
                <span className="text-brand-gold font-semibold text-xs">AD</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-foreground text-sm leading-tight">Admin</span>
                <span className="text-[11px] text-muted-foreground leading-tight">Configuration</span>
              </div>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-md bg-brand-gold/15 flex items-center justify-center">
              <span className="text-brand-gold font-semibold text-xs">AD</span>
            </div>
          )}
        </div>

        {/* Search - Only when expanded */}
        {expanded && (
          <div className="px-3 py-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search settings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-7 text-sm bg-muted/40 border-transparent focus:border-border focus:bg-background"
              />
            </div>
            
            {/* Search Results */}
            {filteredPaths.length > 0 && (
              <div className="mt-2 space-y-0.5 max-h-40 overflow-y-auto">
                {filteredPaths.map(item => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSearchQuery('')}
                    className="flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-accent transition-colors"
                  >
                    <span className="truncate">{item.label}</span>
                    {item.parent && (
                      <span className="text-[10px] text-muted-foreground">in {item.parent}</span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pinned Items - Compact */}
        {expanded && pinnedItems.length > 0 && !searchQuery && (
          <div className="px-3 py-2 border-b border-border">
            <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
              <Pin className="h-2.5 w-2.5" />
              <span>Pinned</span>
            </div>
            <div className="space-y-0.5">
              {pinnedItems.map(path => {
                const item = allPaths.find(p => p.path === path);
                if (!item) return null;
                const active = isActive(path);
                return (
                  <Link
                    key={path}
                    to={path}
                    className={cn(
                      'flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors relative',
                      active 
                        ? 'bg-brand-gold/10 text-brand-gold font-medium' 
                        : 'hover:bg-accent text-foreground'
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-brand-gold rounded-r" />
                    )}
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Navigation - Compact Atlassian style */}
        <ScrollArea className="flex-1">
          <nav className="p-2 space-y-0.5">
            {adminPockets.map((pocket) => {
              const Icon = pocket.icon;
              const active = isActive(pocket.path) || isChildActive(pocket.children);

              if (!expanded) {
                return (
                  <Tooltip key={pocket.id}>
                    <TooltipTrigger asChild>
                      <Link
                        to={pocket.children?.[0]?.path || pocket.path}
                        className={cn(
                          'flex items-center justify-center h-9 w-9 mx-auto rounded-md transition-colors relative',
                          active 
                            ? 'bg-brand-gold/10 text-brand-gold' 
                            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                        )}
                      >
                        {active && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand-gold rounded-r" />
                        )}
                        <Icon className="h-4 w-4" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8}>
                      {pocket.label}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return (
                <Link
                  key={pocket.id}
                  to={pocket.children?.[0]?.path || pocket.path}
                  className={cn(
                    'flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors relative group',
                    active 
                      ? 'bg-brand-gold/10 text-brand-gold font-medium' 
                      : 'text-foreground hover:bg-accent'
                  )}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand-gold rounded-r" />
                  )}
                  <Icon className={cn(
                    'h-4 w-4 flex-shrink-0',
                    active ? 'text-brand-gold' : 'text-muted-foreground group-hover:text-foreground'
                  )} />
                  <span className="truncate">{pocket.label}</span>
                </Link>
              );
            })}
          </nav>
        </ScrollArea>
      </aside>
    </TooltipProvider>
  );
}
