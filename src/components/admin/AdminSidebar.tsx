import { Link, useLocation } from 'react-router-dom';
import { 
  Activity, 
  FileText, 
  TrendingUp, 
  Settings, 
  Users, 
  Building2,
  Shield,
  Database,
  FolderTree,
  Megaphone,
  BarChart3,
  Package,
  ChevronLeft,
  ChevronRight,
  Upload,
  Columns,
  Boxes,
  Code2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AdminSidebarProps {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

const adminSections = [
  {
    title: 'General',
    items: [
      { label: 'Modules & Packages', path: '/admin/modules-packages', icon: Package },
      { label: 'Kanban Configuration', path: '/admin/kanban-settings', icon: Columns },
      { label: 'Details Panels', path: '/admin/details-panels', icon: Settings },
      { label: 'General Settings', path: '/admin/general-settings', icon: Settings },
      { label: 'General Config', path: '/admin/general-config', icon: Settings },
    ],
  },
  {
    title: 'Field Configuration',
    items: [
      { label: 'Projects', path: '/admin/programs', icon: FolderTree },
      { label: 'Programs', path: '/admin/portfolios', icon: Building2 },
      { label: 'Departments', path: '/admin/departments', icon: Building2 },
      { label: 'Business Owners', path: '/admin/business-owners', icon: Users },
      { label: 'Product Lines', path: '/admin/product-settings', icon: Settings },
      { label: 'Strategic Themes', path: '/admin/theme-groups', icon: FolderTree },
      { label: 'Process Steps', path: '/admin/business/ProcessStep', icon: Activity },
    ],
  },
  {
    title: 'Users & Roles',
    items: [
      { label: 'Users', path: '/admin/users', icon: Users },
      { label: 'Roles & Permissions', path: '/admin/roles-permissions', icon: Shield },
      { label: 'Team Roles', path: '/admin/team-roles', icon: Users },
      { label: 'System Roles', path: '/admin/system-roles', icon: Shield },
    ],
  },
  {
    title: 'Connectors',
    items: [
      { label: 'Jira Integration', path: '/admin/jira-config', icon: Database },
    ],
  },
  {
    title: 'Inventory',
    items: [
      { label: 'Resource Inventory', path: '/admin/resourceinventory', icon: Boxes },
      { label: 'Development Inventory', path: '/admin/developmentinventory', icon: Code2 },
    ],
  },
  {
    title: 'Other',
    items: [
      { label: 'Announcements', path: '/admin/announcements', icon: Megaphone },
      { label: 'Import Data', path: '/admin/import-data', icon: Upload },
    ],
  },
];

export function AdminSidebar({ expanded, onToggle, className }: AdminSidebarProps) {
  const location = useLocation();

  return (
    <TooltipProvider>
      <aside
        className={cn(
          'h-full border-r bg-card transition-all duration-300 flex-shrink-0 relative flex flex-col',
          expanded ? 'w-48' : 'w-16',
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

        {/* Header - fixed height to align with page header (72px = py-4 + content) */}
        <div className="h-[72px] px-4 border-b border-border flex items-center shrink-0">
          {expanded ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand-gold/20 flex items-center justify-center text-brand-gold font-semibold text-sm">
                AD
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-foreground">Admin</span>
                <span className="text-xs text-muted-foreground">Configuration</span>
              </div>
            </div>
          ) : (
            <div className="w-10 h-10 rounded-lg bg-brand-gold/20 flex items-center justify-center text-brand-gold font-semibold text-sm mx-auto">
              AD
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-3">
          {adminSections.map((section) => (
            <div key={section.title}>
              {expanded && (
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 px-2">
                  {section.title}
                </h3>
              )}
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;

                  if (!expanded) {
                    return (
                      <li key={item.path}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                              className={cn(
                                'w-full h-10 flex items-center justify-center',
                                isActive && 'bg-brand-gold-pale text-brand-gold'
                              )}
                            >
                              <Link to={item.path}>
                                <Icon className="h-5 w-5" />
                              </Link>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="bg-popover border">
                            {item.label}
                          </TooltipContent>
                        </Tooltip>
                      </li>
                    );
                  }

                  return (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        className={cn(
                          'flex items-center gap-3 px-3 py-1.5 rounded-md text-sm transition-colors',
                          isActive 
                            ? 'bg-brand-gold-pale text-brand-gold font-medium' 
                            : 'text-foreground hover:bg-muted'
                        )}
                      >
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </TooltipProvider>
  );
}
