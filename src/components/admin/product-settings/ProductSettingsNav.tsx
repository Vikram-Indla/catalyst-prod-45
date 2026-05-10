import { cn } from '@/lib/utils';
import type { ProductSettingsTab } from '@/pages/admin/ProductSettings';
import { useAdminSidebar } from '@/contexts/AdminSidebarContext';
import BoardsIcon from '@atlaskit/icon/core/boards';
import DatabaseIcon from '@atlaskit/icon/core/database';
import EyeOpenIcon from '@atlaskit/icon/core/eye-open';
import GridIcon from '@atlaskit/icon/core/grid';
import OfficeBuildingIcon from '@atlaskit/icon/core/office-building';
import ShieldIcon from '@atlaskit/icon/core/shield';

interface ProductSettingsNavProps {
  activeTab: ProductSettingsTab;
  onTabChange: (tab: ProductSettingsTab) => void;
}

const navItems: Array<{ id: ProductSettingsTab; label: string; icon: React.ElementType }> = [
  { id: 'business-lines', label: 'Business Lines', icon: OfficeBuildingIcon },
  { id: 'fields-layout', label: 'Fields & Layout', icon: GridIcon },
  { id: 'workflow-statuses', label: 'Workflow & Statuses', icon: BoardsIcon },
  { id: 'intake-views', label: 'Intake Views & Kanban', icon: EyeOpenIcon },
  { id: 'access-control', label: 'Access Control', icon: ShieldIcon },
  { id: 'data-management', label: 'Data Management', icon: DatabaseIcon },
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
                  <Icon label="" size="small" />
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
