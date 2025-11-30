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
  Megaphone
} from 'lucide-react';
import { cn } from '@/lib/utils';

const adminSections = [
  {
    title: 'Access Controls & Logs',
    items: [
      { label: 'Activity', path: '/admin/activity', icon: Activity },
      { label: 'Changes', path: '/admin/changes', icon: FileText },
      { label: 'Use Trend', path: '/admin/use-trend', icon: TrendingUp },
    ],
  },
  {
    title: 'Application Settings',
    items: [
      { label: 'Work Codes', path: '/admin/work-codes', icon: Database },
      { label: 'Details Panels', path: '/admin/details-panels', icon: Settings },
      { label: 'Terminology', path: '/admin/terminology', icon: FileText },
      { label: 'Team Settings', path: '/admin/team-settings', icon: Users },
      { label: 'Program Settings', path: '/admin/program-settings', icon: FolderTree },
      { label: 'Portfolio Settings', path: '/admin/portfolio-settings', icon: Building2 },
      { label: 'Progress Bars', path: '/admin/progress-bars', icon: TrendingUp },
      { label: 'Estimation Settings', path: '/admin/estimation-settings', icon: Settings },
      { label: 'General Settings', path: '/admin/general-settings', icon: Settings },
      { label: 'Security Settings', path: '/admin/security-settings', icon: Shield },
    ],
  },
  {
    title: 'Basic Structure',
    items: [
      { label: 'Cities', path: '/admin/cities', icon: Building2 },
      { label: 'Customers', path: '/admin/customers', icon: Users },
      { label: 'Cost Centers', path: '/admin/cost-centers', icon: Database },
      { label: 'Countries', path: '/admin/countries', icon: Building2 },
      { label: 'Business Units', path: '/admin/business-units', icon: Building2 },
      { label: 'Regions', path: '/admin/regions', icon: Building2 },
      { label: 'Theme Groups', path: '/admin/theme-groups', icon: FolderTree },
    ],
  },
  {
    title: 'Users & Roles',
    items: [
      { label: 'Users', path: '/admin/users', icon: Users },
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
    title: 'Other',
    items: [
      { label: 'Announcements', path: '/admin/announcements', icon: Megaphone },
    ],
  },
];

export function AdminSidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 border-r bg-card flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold text-foreground">Administration</h2>
        <p className="text-xs text-muted-foreground mt-1">System Configuration</p>
      </div>
      
      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        {adminSections.map((section) => (
          <div key={section.title}>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {section.title}
            </h3>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                        isActive 
                          ? "bg-brand-gold text-white font-medium" 
                          : "text-foreground hover:bg-muted"
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
  );
}
