/**
 * IncidentCommandBar
 * Executive-grade control strip for the Incident module
 * Branded, accessible, and enterprise-ready
 */

import { useNavigate, useLocation } from 'react-router-dom';
import { List, BarChart3, Lightbulb, Kanban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ViewMode = 'list' | 'analytics' | 'insights' | 'kanban';

interface IncidentCommandBarProps {
  onCreateClick: () => void;
  /** Optional additional actions to show before the Create button */
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
    <div className="px-4 md:px-6 py-3 print:hidden">
      {/* Command Strip Container - Executive Surface */}
      <div 
        className={cn(
          "flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4",
          "px-4 py-2.5 rounded-lg",
          "bg-[var(--surface-2)] border border-[var(--border-subtle)]",
          "border-t-[1px] border-t-[var(--brand-primary)]"
        )}
      >
        {/* Left: View Mode Control Strip */}
        <nav 
          className="inline-flex items-center gap-0.5 w-full md:w-auto"
          role="tablist"
          aria-label="Incident views"
        >
          {VIEW_MODES.map((mode) => {
            const Icon = mode.icon;
            const isActive = currentMode === mode.value;
            return (
              <button
                key={mode.value}
                onClick={() => handleModeChange(mode.value)}
                role="tab"
                aria-selected={isActive}
                aria-controls={`${mode.value}-panel`}
                className={cn(
                  "relative flex-1 md:flex-none inline-flex items-center justify-center gap-1.5",
                  "px-3 py-2 text-sm transition-colors rounded-md",
                  isActive 
                    ? [
                        "bg-[var(--surface-1)] font-semibold",
                        "text-[var(--text-primary)]",
                      ]
                    : [
                        "bg-transparent font-medium",
                        "text-[var(--text-muted)]",
                        "hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]",
                      ]
                )}
              >
                <Icon 
                  className={cn(
                    "h-4 w-4 flex-shrink-0 transition-colors",
                    isActive 
                      ? "text-[var(--brand-primary)]" 
                      : "text-current"
                  )} 
                />
                <span className="hidden xs:inline sm:inline">{mode.label}</span>
                
                {/* Active indicator */}
                {isActive && (
                  <span 
                    className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-[var(--brand-primary)]"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right: Actions */}
        <div className="w-full md:w-auto flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
          {/* Secondary actions - stack on mobile, row on desktop */}
          <div className="w-full md:w-auto min-w-0 flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
            {additionalActions}
          </div>
          
          {/* Primary CTA: Create Incident */}
          <Button 
            size="sm"
            onClick={onCreateClick}
            className={cn(
              "h-9 px-4 text-sm font-semibold",
              "w-full md:w-auto",
              "bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]",
              "text-white border-0"
            )}
          >
            <span className="whitespace-nowrap">+ Create Incident</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default IncidentCommandBar;
