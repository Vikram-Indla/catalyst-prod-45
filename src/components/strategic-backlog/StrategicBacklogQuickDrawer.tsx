/**
 * Strategic Backlog Quick Drawer
 * Right-side panel for Theme/Objective/Epic quick view
 * Full-height overlay using Sheet component
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { X, ExternalLink, FileText, Target } from 'lucide-react';
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
        className={cn(
          "text-xs font-medium px-2.5 py-0.5 border",
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
    <Sheet open={!!item} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        hideClose
        className="w-[420px] p-0 flex flex-col overflow-hidden"
        style={{ background: 'var(--surface-bg)' }}
      >
        <SheetHeader className="sr-only">
          <SheetTitle>{item?.name || 'Details'}</SheetTitle>
          <SheetDescription>Quick view panel</SheetDescription>
        </SheetHeader>

        {/* Header */}
        <div 
          className="sticky top-0 z-10 p-5 shrink-0"
          style={{ background: 'var(--surface-bg)', borderBottom: '1px solid var(--border-default)' }}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-4">
              <div
                className="mb-1"
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: 'var(--text-muted)',
                }}
              >
                {getTypeLabel()}
              </div>
              <h2 className="text-lg font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>{item.name}</h2>
              <div className="mt-2">
                {getStatusBadge()}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Description */}
          <div>
            <label
              className="block mb-2"
              style={{
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: 'var(--text-muted)',
              }}
            >
              Description
            </label>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {getDescription()}
            </p>
          </div>

          {/* Theme-specific: Linked Objectives */}
          {type === 'theme' && (
            <div>
              <label
                className="block mb-3"
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: 'var(--text-muted)',
                }}
              >
                Linked Objectives
              </label>
              <div
                className="flex flex-col items-center justify-center py-8 px-4 rounded-lg text-center"
                style={{
                  border: '2px dashed var(--border-default)',
                  background: 'var(--surface-subtle)',
                }}
              >
                <Target className="h-8 w-8 mb-2" style={{ color: 'var(--text-muted)' }} />
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {objectiveCount} objectives linked
                </span>
              </div>
            </div>
          )}

          {/* Objective-specific: Progress */}
          {type === 'objective' && (
            <div>
              <label
                className="block mb-3"
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: 'var(--text-muted)',
                }}
              >
                Progress
              </label>
              <div
                className="p-4 rounded-lg"
                style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border-default)' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{krCount} Key Results</span>
                  <span className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{progress}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border-default)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${progress}%`, background: 'var(--secondary-green)' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Epic-specific: Work Items */}
          {type === 'epic' && (
            <div>
              <label 
                className="block mb-3"
                style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}
              >
                Work Items
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div 
                  className="p-3 rounded-lg text-center"
                  style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border-default)' }}
                >
                  <div className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{epicCounts.features}</div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Features</div>
                </div>
                <div 
                  className="p-3 rounded-lg text-center"
                  style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border-default)' }}
                >
                  <div className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{epicCounts.stories}</div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Stories</div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div>
            <label 
              className="block mb-3"
              style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}
            >
              Quick Actions
            </label>
            <div className="space-y-2">
              <button 
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left group"
                style={{ background: 'var(--surface-bg)', border: '1px solid var(--border-default)' }}
                onMouseEnter={(e) => { 
                  e.currentTarget.style.borderColor = 'rgba(198, 156, 109, 0.4)'; 
                  e.currentTarget.style.background = 'var(--surface-hover)'; 
                }}
                onMouseLeave={(e) => { 
                  e.currentTarget.style.borderColor = 'var(--border-default)'; 
                  e.currentTarget.style.background = 'var(--surface-bg)'; 
                }}
              >
                <ExternalLink className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>View in Strategy Room</span>
              </button>
              <button 
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left group"
                style={{ background: 'var(--surface-bg)', border: '1px solid var(--border-default)' }}
                onMouseEnter={(e) => { 
                  e.currentTarget.style.borderColor = 'rgba(198, 156, 109, 0.4)'; 
                  e.currentTarget.style.background = 'var(--surface-hover)'; 
                }}
                onMouseLeave={(e) => { 
                  e.currentTarget.style.borderColor = 'var(--border-default)'; 
                  e.currentTarget.style.background = 'var(--surface-bg)'; 
                }}
              >
                <FileText className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Export to PDF</span>
              </button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
