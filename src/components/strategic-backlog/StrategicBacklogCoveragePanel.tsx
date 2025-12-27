/**
 * Coverage & Gaps Panel for Strategic Backlog
 * Pixel-perfect implementation matching mockups
 */
import { cn } from '@/lib/utils';
import { Check, AlertTriangle, Layers, Target, Box } from 'lucide-react';
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
    <div style={{ background: 'var(--surface-bg)', border: '1px solid var(--border-default)', borderRadius: '10px', overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
        <h3 style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', margin: 0 }}>
          Coverage & Gaps
        </h3>
      </div>
      
      <div>
        {/* Themes */}
        <button
          onClick={() => onNavigate('themes')}
          className="w-full flex items-center justify-between transition-colors group"
          style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', background: 'transparent' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(13, 148, 136, 0.1)' }}
            >
              <Layers className="h-4 w-4" style={{ color: '#0d9488' }} />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Themes</span>
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{themes}</span>
              </div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {themesWithObjectives} with objectives ({themesPercent}%)
              </div>
            </div>
          </div>
          {themesComplete ? (
            <Check className="h-4 w-4" style={{ color: '#0d9488' }} />
          ) : themes > 0 ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertTriangle className="h-4 w-4" style={{ color: '#f59e0b' }} />
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
          className="w-full flex items-center justify-between transition-colors group"
          style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', background: 'transparent' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(37, 99, 235, 0.1)' }}
            >
              <Target className="h-4 w-4" style={{ color: '#2563eb' }} />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Objectives</span>
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{objectives}</span>
              </div>
            </div>
          </div>
          {objectivesComplete ? (
            <Check className="h-4 w-4" style={{ color: '#0d9488' }} />
          ) : null}
        </button>

        {/* Epics aligned */}
        <button
          onClick={() => onNavigate('epics')}
          className="w-full flex items-center justify-between transition-colors group"
          style={{ padding: '12px 16px', background: 'transparent' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(107, 114, 128, 0.1)' }}
            >
              <Box className="h-4 w-4" style={{ color: '#6b7280' }} />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Epics aligned</span>
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{epics}</span>
              </div>
            </div>
          </div>
          {epicsComplete ? (
            <Check className="h-4 w-4" style={{ color: '#0d9488' }} />
          ) : null}
        </button>
      </div>
    </div>
  );
}
