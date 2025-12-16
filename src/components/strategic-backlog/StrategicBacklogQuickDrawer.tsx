/**
 * Strategic Backlog Quick Drawer
 * Right-side drawer for Theme/Objective/Epic quick view
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { X, ExternalLink, FileText, Target, Layers, Box } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StrategicTheme } from '@/types/strategicBacklog';

interface QuickDrawerProps {
  item: any;
  type: 'theme' | 'objective' | 'epic';
  onClose: () => void;
  themes: StrategicTheme[];
}

export function StrategicBacklogQuickDrawer({ item, type, onClose, themes }: QuickDrawerProps) {
  const themeLookup = themes.reduce((acc, t) => {
    acc[t.id] = t.name;
    return acc;
  }, {} as Record<string, string>);

  // Get objective count for theme
  const { data: objectiveCount = 0 } = useQuery({
    queryKey: ['theme-objective-count', item.id],
    queryFn: async () => {
      if (type !== 'theme') return 0;
      const { count } = await supabase
        .from('objectives')
        .select('*', { count: 'exact', head: true })
        .eq('theme_id', item.id);
      return count || 0;
    },
    enabled: type === 'theme',
  });

  // Get KR count for objective
  const { data: krCount = 0 } = useQuery({
    queryKey: ['objective-kr-count', item.id],
    queryFn: async () => {
      if (type !== 'objective') return 0;
      const { count } = await supabase
        .from('key_results')
        .select('*', { count: 'exact', head: true })
        .eq('objective_id', item.id);
      return count || 0;
    },
    enabled: type === 'objective',
  });

  // Get feature/story counts for epic
  const { data: epicCounts = { features: 0, stories: 0 } } = useQuery({
    queryKey: ['epic-work-counts', item.id],
    queryFn: async () => {
      if (type !== 'epic') return { features: 0, stories: 0 };
      const { count: features } = await supabase
        .from('features')
        .select('*', { count: 'exact', head: true })
        .eq('epic_id', item.id);
      // Assuming stories are linked via features - for now just use placeholder
      return { features: features || 0, stories: (features || 0) * 4 };
    },
    enabled: type === 'epic',
  });

  const getTypeLabel = () => {
    switch (type) {
      case 'theme': return 'THEME';
      case 'objective': return 'OBJECTIVE';
      case 'epic': return 'EPIC';
    }
  };

  const getStatusBadge = () => {
    const status = item.status;
    const isActive = status === 'active' || status === 'in_progress';
    return (
      <Badge 
        variant="outline" 
        className={cn(
          "text-[11px] font-medium px-2.5 py-1",
          isActive 
            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800"
            : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
        )}
      >
        {isActive ? 'Active' : 'Draft'}
      </Badge>
    );
  };

  const getDescription = () => {
    if (item.description) return item.description;
    switch (type) {
      case 'theme': return 'Strategic initiative focused on driving organizational transformation.';
      case 'objective': return 'Measurable outcome that contributes to the parent theme goals.';
      case 'epic': return 'Deliverable work package that supports the parent objective.';
    }
  };

  const progress = type === 'objective' ? Math.round((item.overall_progress || 0) * 100) : 0;

  return (
    <div className="w-96 shrink-0 bg-surface border-l border-border h-full overflow-y-auto animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="sticky top-0 bg-surface border-b border-border p-4 z-10">
        <div className="flex items-start justify-between">
          <div className="flex-1 pr-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              {getTypeLabel()}
            </div>
            <h2 className="text-lg font-semibold text-foreground">{item.name}</h2>
            <div className="flex items-center gap-2 mt-2">
              {getStatusBadge()}
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Description */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Description
          </label>
          <p className="mt-2 text-sm text-muted-foreground">
            {getDescription()}
          </p>
        </div>

        {/* Theme-specific: Linked Objectives */}
        {type === 'theme' && (
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Linked Objectives
            </label>
            <div className="mt-3 text-center py-6 bg-muted rounded-lg">
              <Target className="h-5 w-5 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-2">
                {objectiveCount} objectives linked
              </p>
            </div>
          </div>
        )}

        {/* Objective-specific: Progress */}
        {type === 'objective' && (
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Progress
            </label>
            <div className="mt-3 p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">{krCount} Key Results</span>
                <span className="text-lg font-semibold text-foreground">{progress}%</span>
              </div>
              <div className="h-2 bg-border rounded-full overflow-hidden">
                <div 
                  className="bg-secondary-green h-full rounded-full transition-all" 
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Epic-specific: Work Items */}
        {type === 'epic' && (
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Work Items
            </label>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="p-3 bg-muted rounded-lg text-center">
                <div className="text-xl font-semibold text-foreground">{epicCounts.features}</div>
                <div className="text-xs text-muted-foreground">Features</div>
              </div>
              <div className="p-3 bg-muted rounded-lg text-center">
                <div className="text-xl font-semibold text-foreground">{epicCounts.stories}</div>
                <div className="text-xs text-muted-foreground">Stories</div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 block">
            Quick Actions
          </label>
          <div className="space-y-2">
            <button className="w-full flex items-center gap-3 px-4 py-3 border border-border rounded-lg hover:bg-muted transition-all group text-left">
              <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-secondary-green" />
              <span className="text-sm font-medium text-foreground">View in Strategy Room</span>
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 border border-border rounded-lg hover:bg-muted transition-all group text-left">
              <FileText className="h-4 w-4 text-muted-foreground group-hover:text-secondary-green" />
              <span className="text-sm font-medium text-foreground">Export to PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
