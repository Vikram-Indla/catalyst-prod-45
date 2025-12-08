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
  Pin
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useState, useMemo } from 'react';

interface AdminSidebarV2Props {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

// New IA: 7 top-level buckets
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
    path: '/admin/audit',
    children: [
      { label: 'Activity', path: '/admin/audit/activity' },
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
  const [pinnedItems] = useState<string[]>(['/admin/users', '/admin/audit/activity']);
  
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
    <TooltipProvider>
      <aside
        className={cn(
          'h-full border-r bg-card transition-all duration-300 flex-shrink-0 relative flex flex-col',
          expanded ? 'w-56' : 'w-16',
          className
        )}
      >
        {/* Toggle Handle */}
        <button
          onClick={onToggle}
          className="absolute -right-3 top-6 z-50 w-6 h-6 rounded-full bg-card border shadow-sm flex items-center justify-center hover:bg-accent transition-transform"
          aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {expanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        {/* Header */}
        <div className="h-[72px] px-4 border-b border-border flex items-center shrink-0">
          {expanded ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-brand-gold/20 flex items-center justify-center text-brand-gold font-semibold text-sm">
                AD
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-foreground text-sm">Admin</span>
                <span className="text-xs text-muted-foreground">Configuration</span>
              </div>
            </div>
          ) : (
            <div className="w-9 h-9 rounded-lg bg-brand-gold/20 flex items-center justify-center text-brand-gold font-semibold text-sm mx-auto">
              AD
            </div>
          )}
        </div>

        {/* Search */}
        {expanded && (
          <div className="px-3 py-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search settings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-sm bg-muted/50"
              />
            </div>
            
            {/* Search Results */}
            {filteredPaths.length > 0 && (
              <div className="mt-2 space-y-0.5 max-h-48 overflow-y-auto">
                {filteredPaths.map(item => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSearchQuery('')}
                    className="flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-muted transition-colors"
                  >
                    <span className="truncate">{item.label}</span>
                    {item.parent && (
                      <span className="text-xs text-muted-foreground">in {item.parent}</span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pinned Items */}
        {expanded && pinnedItems.length > 0 && !searchQuery && (
          <div className="px-3 py-2 border-b border-border">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
              <Pin className="h-3 w-3" />
              <span>Pinned</span>
            </div>
            <div className="space-y-0.5">
              {pinnedItems.map(path => {
                const item = allPaths.find(p => p.path === path);
                if (!item) return null;
                return (
                  <Link
                    key={path}
                    to={path}
                    className={cn(
                      'flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors',
                      isActive(path) 
                        ? 'bg-brand-gold/10 text-brand-gold font-medium' 
                        : 'hover:bg-muted text-foreground'
                    )}
                  >
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Navigation - Pockets */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {adminPockets.map((pocket) => {
            const Icon = pocket.icon;
            const active = isActive(pocket.path) || isChildActive(pocket.children);

            if (!expanded) {
              return (
                <Tooltip key={pocket.id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                      className={cn(
                        'w-full h-10 flex items-center justify-center',
                        active && 'bg-brand-gold/10 text-brand-gold'
                      )}
                    >
                      <Link to={pocket.children?.[0]?.path || pocket.path}>
                        <Icon className="h-5 w-5" />
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-popover border">
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
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                  active 
                    ? 'bg-brand-gold/10 text-brand-gold font-medium' 
                    : 'text-foreground hover:bg-muted'
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{pocket.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </TooltipProvider>
  );
}
