/**
 * Coverage & Gaps Panel for Strategic Backlog
 * Pixel-perfect implementation matching mockups
 */
import { cn } from '@/lib/utils';
import { Check, AlertTriangle, Layers, Target, Box, Calendar } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface CoveragePanelProps {
  themes: number;
  themesWithObjectives: number;
  objectives: number;
  epics: number;
  snapshots?: number;
  onNavigate: (section: 'themes' | 'objectives' | 'epics' | 'snapshots') => void;
}

export function StrategicBacklogCoveragePanel({
  themes,
  themesWithObjectives,
  objectives,
  epics,
  snapshots = 0,
  onNavigate,
}: CoveragePanelProps) {
  const themesPercent = themes > 0 ? Math.round((themesWithObjectives / themes) * 100) : 0;
  const themesComplete = themesPercent === 100 && themes > 0;
  const objectivesComplete = objectives > 0;
  const epicsComplete = epics > 0;
  const snapshotsComplete = snapshots > 0;

  return (
    <div className="bg-card border border-border rounded-[10px] overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.5px] text-muted-foreground m-0">
          Coverage & Gaps
        </h3>
      </div>
      
      <div>
        {/* Themes */}
        <button
          onClick={() => onNavigate('themes')}
          className="w-full flex items-center justify-between transition-colors group px-4 py-3 border-b border-border hover:bg-muted/50"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-success/10">
              <Layers className="h-4 w-4 text-success" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-foreground">Themes</span>
                <span className="text-sm text-muted-foreground">{themes}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {themesWithObjectives} with objectives ({themesPercent}%)
              </div>
            </div>
          </div>
          {themesComplete ? (
            <Check className="h-4 w-4 text-success" />
          ) : themes > 0 ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertTriangle className="h-4 w-4 text-warning" />
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-[200px]">
                  <p>Some themes have no objectives linked. Consider aligning objectives to improve strategic coverage.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}
        </button>

        {/* Objectives */}
        <button
          onClick={() => onNavigate('objectives')}
          className="w-full flex items-center justify-between transition-colors group px-4 py-3 border-b border-border hover:bg-muted/50"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/10">
              <Target className="h-4 w-4 text-primary" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-foreground">Objectives</span>
                <span className="text-sm text-muted-foreground">{objectives}</span>
              </div>
            </div>
          </div>
          {objectivesComplete ? (
            <Check className="h-4 w-4 text-success" />
          ) : null}
        </button>

        {/* Epics aligned */}
        <button
          onClick={() => onNavigate('epics')}
          className="w-full flex items-center justify-between transition-colors group px-4 py-3 border-b border-border hover:bg-muted/50"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-muted-foreground/10">
              <Box className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-foreground">Epics aligned</span>
                <span className="text-sm text-muted-foreground">{epics}</span>
              </div>
            </div>
          </div>
          {epicsComplete ? (
            <Check className="h-4 w-4 text-success" />
          ) : null}
        </button>

        {/* Snapshots */}
        <button
          onClick={() => onNavigate('snapshots')}
          className="w-full flex items-center justify-between transition-colors group px-4 py-3 hover:bg-muted/50"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-accent/10">
              <Calendar className="h-4 w-4 text-accent" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-foreground">Snapshots</span>
                <span className="text-sm text-muted-foreground">{snapshots}</span>
              </div>
            </div>
          </div>
          {snapshotsComplete ? (
            <Check className="h-4 w-4 text-success" />
          ) : null}
        </button>
      </div>
    </div>
  );
}
