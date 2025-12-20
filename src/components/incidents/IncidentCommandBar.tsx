/**
 * IncidentCommandBar
 * Standardized header control for the Incident module
 * Used across List, Analytics, and Insights pages
 */

import { useNavigate, useLocation } from 'react-router-dom';
import { List, BarChart3, Lightbulb, Kanban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ViewMode = 'list' | 'analytics' | 'insights' | 'kanban';

interface IncidentCommandBarProps {
  onCreateClick: () => void;
  /** Optional additional actions to show after the Create button */
  additionalActions?: React.ReactNode;
}

const VIEW_MODES: { value: ViewMode; label: string; icon: React.ElementType; path: string }[] = [
  { value: 'list', label: 'List', icon: List, path: '/release/incidents' },
  { value: 'analytics', label: 'Analytics', icon: BarChart3, path: '/release/incidents/analytics' },
  { value: 'insights', label: 'Insights', icon: Lightbulb, path: '/release/incidents/insights' },
  { value: 'kanban', label: 'Kanban', icon: Kanban, path: '/release/incidents/kanban' },
];

export function IncidentCommandBar({ onCreateClick, additionalActions }: IncidentCommandBarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Determine current mode from URL
  const getCurrentMode = (): ViewMode => {
    if (location.pathname.includes('/kanban')) return 'kanban';
    if (location.pathname.includes('/insights')) return 'insights';
    if (location.pathname.includes('/analytics')) return 'analytics';
    return 'list';
  };
  
  const currentMode = getCurrentMode();

  const handleModeChange = (mode: ViewMode) => {
    const target = VIEW_MODES.find(m => m.value === mode);
    if (target) {
      navigate(target.path);
    }
  };

  return (
    <div className="px-4 sm:px-6 py-3 border-b border-border bg-card/50 shadow-sm print:hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        {/* Left: View Mode Segmented Control */}
        <div className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-1 w-full sm:w-auto">
          {VIEW_MODES.map((mode) => {
            const Icon = mode.icon;
            const isActive = currentMode === mode.value;
            return (
              <button
                key={mode.value}
                onClick={() => handleModeChange(mode.value)}
                className={cn(
                  "flex-1 sm:flex-none inline-flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all",
                  isActive 
                    ? "bg-background text-foreground shadow-sm border border-border/50" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline sm:inline">{mode.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
          {/* Secondary actions - rendered with lower emphasis */}
          {additionalActions}
          
          {/* Primary CTA: Create Incident */}
          <Button 
            size="sm"
            onClick={onCreateClick}
            className="h-9 px-3 sm:px-4 text-xs sm:text-sm font-medium bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <span className="whitespace-nowrap">+ Create Incident</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default IncidentCommandBar;
