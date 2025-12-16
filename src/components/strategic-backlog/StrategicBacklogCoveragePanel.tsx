/**
 * Coverage & Gaps Panel for Strategic Backlog
 * Matches mockup exactly
 */
import { cn } from '@/lib/utils';
import { Check, AlertTriangle, Layers, Target, Box } from 'lucide-react';

interface CoveragePanelProps {
  themes: number;
  themesWithObjectives: number;
  objectives: number;
  epics: number;
  onNavigate: (section: 'themes' | 'objectives' | 'epics') => void;
}

export function StrategicBacklogCoveragePanel({
  themes,
  themesWithObjectives,
  objectives,
  epics,
  onNavigate,
}: CoveragePanelProps) {
  const themesPercent = themes > 0 ? Math.round((themesWithObjectives / themes) * 100) : 0;
  const themesComplete = themesPercent === 100 && themes > 0;
  const objectivesComplete = objectives > 0;
  const epicsComplete = epics > 0;

  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
        Coverage & Gaps
      </h3>
      
      <div className="space-y-4">
        {/* Themes */}
        <button
          onClick={() => onNavigate('themes')}
          className="w-full flex items-center justify-between hover:bg-muted/50 -mx-2 px-2 py-1 rounded transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
              <Layers className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">Themes</span>
                <span className="text-sm text-muted-foreground">{themes}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {themesWithObjectives} with objectives ({themesPercent}%)
              </div>
            </div>
          </div>
          {themesComplete ? (
            <Check className="h-4 w-4 text-emerald-500" />
          ) : themes > 0 ? (
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          ) : null}
        </button>

        {/* Objectives */}
        <button
          onClick={() => onNavigate('objectives')}
          className="w-full flex items-center justify-between hover:bg-muted/50 -mx-2 px-2 py-1 rounded transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
              <Target className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">Objectives</span>
                <span className="text-sm text-muted-foreground">{objectives}</span>
              </div>
            </div>
          </div>
          {objectivesComplete ? (
            <Check className="h-4 w-4 text-emerald-500" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          )}
        </button>

        {/* Epics aligned */}
        <button
          onClick={() => onNavigate('epics')}
          className="w-full flex items-center justify-between hover:bg-muted/50 -mx-2 px-2 py-1 rounded transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
              <Box className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">Epics aligned</span>
                <span className="text-sm text-muted-foreground">{epics}</span>
              </div>
            </div>
          </div>
          {epicsComplete ? (
            <Check className="h-4 w-4 text-emerald-500" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          )}
        </button>
      </div>
    </div>
  );
}
