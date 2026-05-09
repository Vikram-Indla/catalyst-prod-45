import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Settings,
  Database,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Search,
  Pin,
  Code2,
  Cable,
  GitBranch,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Tooltip } from '@/components/ads';
import { useState, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { adminPockets, getAdminLeafPaths } from './admin-nav';

/** Maps iconName strings (stored in admin-nav.ts) to Lucide components. */
const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  Settings,
  Database,
  GitBranch,
  Cable,
  Code2,
};

interface AdminSidebarV2Props {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

// Flatten all paths for search — derived from canonical admin-nav.ts source
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

// Suppress unused-import warning — getAdminLeafPaths is used by the parity test
void getAdminLeafPaths;

export function AdminSidebarV2({ expanded, onToggle, className }: AdminSidebarV2Props) {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  // Pinned items — must be valid registered routes (no dead links)
  const [pinnedItems] = useState<string[]>(['/admin/users', '/admin/workhub/sync-logs']);
  
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
    // Normalize query: replace hyphens/underscores with spaces for flexible matching
    const normalizedQuery = searchQuery.toLowerCase().replace(/[-_]/g, ' ').trim();
    const queryParts = normalizedQuery.split(/\s+/);
    
    return allPaths.filter(p => {
      const normalizedLabel = p.label.toLowerCase();
      const normalizedParent = p.parent?.toLowerCase() || '';
      
      // Match if ALL query parts are found in label or parent
      return queryParts.every(part => 
        normalizedLabel.includes(part) || normalizedParent.includes(part)
      );
    });
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
      <aside
        className={cn(
          'h-full border-r transition-all duration-200 flex-shrink-0 relative flex flex-col',
          expanded ? 'w-60' : 'w-16',
          className
        )}
        style={{
          background: 'var(--surface-elevated, var(--surface-1))',
          borderColor: 'var(--divider)',
        }}
      >
        {/* V10 Header with circular badge */}
        <div 
          className={cn(
            'border-b shrink-0',
            expanded 
              ? 'flex items-center justify-between px-3' 
              : 'flex flex-col items-center justify-center'
          )}
          style={{
            height: expanded ? '56px' : '64px',
            borderColor: 'var(--divider)',
            padding: expanded ? '0 12px' : '8px 0',
            gap: expanded ? undefined : '6px',
          }}
        >
          <div className={cn(
            "flex items-center gap-3",
            expanded ? "overflow-hidden min-w-0" : "w-full justify-center"
          )}>
            {/* V10 circular badge */}
            <div 
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, var(--cp-blue) 0%, var(--ds-background-brand-bold-hovered, #1d4ed8) 100%)',
                color: 'var(--bg-app)',
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '0.02em',
                boxShadow: '0 1px 3px rgba(37, 99, 235, 0.15)',
              }}
            >
              AD
            </div>
            {expanded && (
              <span 
                className="text-[13px] font-semibold truncate tracking-tight"
                style={{ color: 'var(--text-1)' }}
              >
                Admin
              </span>
            )}
          </div>
          {/* V10 collapse button */}
          <button
            onClick={onToggle}
            className={cn(
              "flex items-center justify-center rounded-md transition-all flex-shrink-0 border bg-transparent hover:bg-blue-500/6",
              expanded ? "w-6 h-6 ml-2" : "w-5 h-5"
            )}
            style={{
              borderColor: 'var(--divider)',
              color: 'var(--text-3)',
            }}
            aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {expanded ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
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
                        ? 'bg-brand-primary/10 text-brand-primary font-medium' 
                        : 'hover:bg-accent text-foreground'
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-brand-primary rounded-r" />
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
          <nav style={{ padding: '4px 8px' }}>
            {adminPockets.map((pocket) => {
              const Icon = ICON_MAP[pocket.iconName] ?? Settings;
              const active = isActive(pocket.path) || isChildActive(pocket.children);
              const hasChildren = pocket.children && pocket.children.length > 0;
              const isOpen = expandedSections.has(pocket.id);

              if (!expanded) {
                return (
                  <Tooltip key={pocket.id} content={pocket.label} position="right">
                    <Link
                      to={pocket.children?.[0]?.path || pocket.path}
                      className={cn(
                        'flex items-center justify-center rounded-md transition-colors relative mx-auto',
                        active
                          ? 'bg-blue-500/12 text-blue-600'
                          : 'text-muted-foreground hover:bg-blue-500/6 hover:text-foreground'
                      )}
                      style={{ width: '36px', height: '50px', marginBottom: '1px' }}
                    >
                      {active && (
                        <span
                          style={{
                            position: 'absolute',
                            left: 0,
                            top: '6px',
                            bottom: '6px',
                            width: '3px',
                            background: 'var(--nav-accent-bar, var(--cp-blue))',
                            borderRadius: '0 2px 2px 0',
                          }}
                        />
                      )}
                      <Icon style={{ width: '17px', height: '17px', strokeWidth: 1.4 }} />
                    </Link>
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
                      'flex items-center gap-3 px-3 rounded-md text-[13px] transition-colors relative group',
                      active 
                        ? 'bg-blue-500/12 text-blue-600 font-medium' 
                        : 'text-foreground hover:bg-blue-500/6 font-normal'
                    )}
                    style={{ height: '50px', marginBottom: '1px' }}
                  >
                    {active && (
                      <span 
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: '4px',
                          bottom: '4px',
                          width: '3px',
                          background: 'var(--nav-accent-bar, var(--cp-blue))',
                          borderRadius: '0 2px 2px 0',
                        }}
                      />
                    )}
                    <Icon 
                      className="flex-shrink-0"
                      style={{ 
                        width: '17px', 
                        height: '17px', 
                        strokeWidth: 1.4,
                        color: active ? 'var(--cp-blue)' : 'var(--nav-text-secondary)',
                      }} 
                    />
                    <span className="truncate">{pocket.label}</span>
                  </Link>
                );
              }

              // Has children - collapsible section (V10 styling)
              return (
                <Collapsible 
                  key={pocket.id} 
                  open={isOpen} 
                  onOpenChange={() => toggleSection(pocket.id)}
                >
                  <CollapsibleTrigger asChild>
                    <button
                      className={cn(
                        'w-full flex items-center gap-3 px-3 rounded-md text-[13px] transition-colors relative group',
                        active 
                          ? 'bg-blue-500/12 text-blue-600 font-medium' 
                          : 'text-foreground hover:bg-blue-500/6 font-normal'
                      )}
                      style={{ height: '50px', marginBottom: '1px' }}
                    >
                      {active && (
                        <span 
                          style={{
                            position: 'absolute',
                            left: 0,
                            top: '4px',
                            bottom: '4px',
                            width: '3px',
                            background: 'var(--nav-accent-bar, var(--cp-blue))',
                            borderRadius: '0 2px 2px 0',
                          }}
                        />
                      )}
                      <Icon 
                        className="flex-shrink-0"
                        style={{ 
                          width: '17px', 
                          height: '17px', 
                          strokeWidth: 1.4,
                          color: active ? 'var(--cp-blue)' : 'var(--nav-text-secondary)',
                        }} 
                      />
                      <span className="truncate flex-1 text-left">{pocket.label}</span>
                      <ChevronDown 
                        className={cn(
                          'h-3.5 w-3.5 transition-transform',
                          isOpen && 'rotate-180'
                        )}
                        style={{ color: 'var(--text-4)' }} 
                      />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="ml-5 mt-0.5">
                    {pocket.children?.map(child => {
                      const childActive = isActive(child.path);
                      return (
                        <Link
                          key={child.path}
                          to={child.path}
                          className={cn(
                            'flex items-center px-3 rounded-md text-[12px] transition-colors relative',
                            childActive 
                              ? 'bg-blue-500/12 text-blue-600 font-medium' 
                              : 'text-muted-foreground hover:bg-blue-500/6 hover:text-foreground'
                          )}
                          style={{ height: '32px', marginBottom: '1px' }}
                        >
                          {childActive && (
                            <span 
                              style={{
                                position: 'absolute',
                                left: 0,
                                top: '4px',
                                bottom: '4px',
                                width: '3px',
                                background: 'var(--nav-accent-bar, var(--cp-blue))',
                                borderRadius: '0 2px 2px 0',
                              }}
                            />
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
  );
}
