import { cn } from '@/lib/utils';
import { 
  Building2, 
  LayoutGrid, 
  Workflow, 
  Eye, 
  Shield, 
  Database 
} from 'lucide-react';
import type { ProductSettingsTab } from '@/pages/admin/ProductSettings';
import { useAdminSidebar } from '@/contexts/AdminSidebarContext';

interface ProductSettingsNavProps {
  activeTab: ProductSettingsTab;
  onTabChange: (tab: ProductSettingsTab) => void;
}

const navItems: Array<{ id: ProductSettingsTab; label: string; icon: React.ElementType }> = [
  { id: 'business-lines', label: 'Business Lines', icon: Building2 },
  { id: 'fields-layout', label: 'Fields & Layout', icon: LayoutGrid },
  { id: 'workflow-statuses', label: 'Workflow & Statuses', icon: Workflow },
  { id: 'intake-views', label: 'Intake Views & Kanban', icon: Eye },
  { id: 'access-control', label: 'Access Control', icon: Shield },
  { id: 'data-management', label: 'Data Management', icon: Database },
];

export function ProductSettingsNav({ activeTab, onTabChange }: ProductSettingsNavProps) {
  const { collapse } = useAdminSidebar();

  const handleTabChange = (tab: ProductSettingsTab) => {
    collapse();
    onTabChange(tab);
  };

  return (
    <nav className="w-56 flex-shrink-0">
      <div className="bg-card border rounded-lg p-2 sticky top-0">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <li key={item.id}>
                <button
                  onClick={() => handleTabChange(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-muted text-foreground" 
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
