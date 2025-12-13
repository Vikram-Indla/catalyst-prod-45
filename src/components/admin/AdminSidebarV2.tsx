import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard,
  Users,
  Settings,
  Database,
  Link2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Search,
  Pin,
  Boxes,
  Code2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useState, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface AdminSidebarV2Props {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

// New IA: top-level buckets
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
    id: 'general',
    label: 'General',
    icon: Settings,
    path: '/admin/general',
    children: [
      { label: 'Modules & Packages', path: '/admin/modules-packages' },
      { label: 'Details Panels', path: '/admin/details-panels' },
      { label: 'General Settings', path: '/admin/general-settings' },
      { label: 'Announcements', path: '/admin/announcements' },
    ],
  },
  {
    id: 'field-configuration',
    label: 'Field Configuration',
    icon: Database,
    path: '/admin/field-configuration',
    children: [
      { label: 'Projects', path: '/admin/programs' },
      { label: 'Programs', path: '/admin/portfolios' },
      { label: 'Departments', path: '/admin/departments' },
      { label: 'Business Owners', path: '/admin/business-owners' },
      { label: 'Business Processes', path: '/admin/business-processes' },
      { label: 'Product Lines', path: '/admin/product-settings' },
      { label: 'Strategic Themes', path: '/admin/theme-groups' },
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
    id: 'inventory',
    label: 'Inventory',
    icon: Boxes,
    path: '/admin/resourceinventory',
    children: [
      { label: 'Resource Inventory', path: '/admin/resourceinventory' },
      { label: 'Development Inventory', path: '/admin/developmentinventory' },
    ],
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
  
  // Track which sections are expanded - default open sections that have active children
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    adminPockets.forEach(pocket => {
      if (pocket.children?.some(c => location.pathname === c.path)) {
        initial.add(pocket.id);
      }
    });
    return initial;
  });
  
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

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

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

        {/* Navigation - Collapsible sections */}
        <ScrollArea className="flex-1">
          <nav className="p-2 space-y-0.5">
            {adminPockets.map((pocket) => {
              const Icon = pocket.icon;
              const active = isActive(pocket.path) || isChildActive(pocket.children);
              const hasChildren = pocket.children && pocket.children.length > 0;
              const isOpen = expandedSections.has(pocket.id);

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

              // No children - simple link
              if (!hasChildren) {
                return (
                  <Link
                    key={pocket.id}
                    to={pocket.path}
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
              }

              // Has children - collapsible section
              return (
                <Collapsible 
                  key={pocket.id} 
                  open={isOpen} 
                  onOpenChange={() => toggleSection(pocket.id)}
                >
                  <CollapsibleTrigger asChild>
                    <button
                      className={cn(
                        'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors relative group',
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
                      <span className="truncate flex-1 text-left">{pocket.label}</span>
                      <ChevronDown className={cn(
                        'h-3.5 w-3.5 text-muted-foreground transition-transform',
                        isOpen && 'rotate-180'
                      )} />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pl-6 mt-0.5 space-y-0.5">
                    {pocket.children?.map(child => {
                      const childActive = isActive(child.path);
                      return (
                        <Link
                          key={child.path}
                          to={child.path}
                          className={cn(
                            'flex items-center px-2.5 py-1.5 rounded-md text-sm transition-colors relative',
                            childActive 
                              ? 'bg-brand-gold/10 text-brand-gold font-medium' 
                              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                          )}
                        >
                          {childActive && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-brand-gold rounded-r" />
                          )}
                          <span className="truncate">{child.label}</span>
                        </Link>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </nav>
        </ScrollArea>
      </aside>
    </TooltipProvider>
  );
}
