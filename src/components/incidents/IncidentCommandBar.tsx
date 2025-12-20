/**
 * IncidentCommandBar
 * Standardized header control for the Incident module
 * Used across List, Analytics, and Insights pages
 */

import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, List, BarChart3, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ViewMode = 'list' | 'analytics' | 'insights';

interface IncidentCommandBarProps {
  onCreateClick: () => void;
  /** Optional additional actions to show after the Create button */
  additionalActions?: React.ReactNode;
}

const VIEW_MODES: { value: ViewMode; label: string; icon: React.ElementType; path: string }[] = [
  { value: 'list', label: 'List', icon: List, path: '/release/incidents' },
  { value: 'analytics', label: 'Analytics', icon: BarChart3, path: '/release/incidents/analytics' },
  { value: 'insights', label: 'Insights', icon: Lightbulb, path: '/release/incidents/insights' },
];

export function IncidentCommandBar({ onCreateClick, additionalActions }: IncidentCommandBarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Determine current mode from URL
  const getCurrentMode = (): ViewMode => {
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
    <div className="px-6 py-3 border-b border-border bg-card/50 shadow-sm print:hidden">
      <div className="flex items-center justify-between gap-4">
        {/* Left: View Mode Segmented Control */}
        <div className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-1">
          {VIEW_MODES.map((mode) => {
            const Icon = mode.icon;
            const isActive = currentMode === mode.value;
            return (
              <button
                key={mode.value}
                onClick={() => handleModeChange(mode.value)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                  isActive 
                    ? "bg-background text-foreground shadow-sm border border-border/50" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{mode.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {additionalActions && (
            <>
              {additionalActions}
              <div className="h-6 w-px bg-border" />
            </>
          )}
          
          {/* Primary CTA: Create Incident */}
          <Button 
            size="sm"
            onClick={onCreateClick}
            className="h-9 px-4 text-sm font-medium bg-brand-primary hover:bg-brand-primary-hover text-white"
          >
            <Plus className="h-4 w-4 mr-1.5 flex-shrink-0" />
            Create Incident
          </Button>
        </div>
      </div>
    </div>
  );
}

export default IncidentCommandBar;
