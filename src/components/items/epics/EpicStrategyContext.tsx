/**
 * =====================================================
 * EpicStrategyContext - Read-only Strategy context section
 * =====================================================
 * Catalyst Epics vNext Phase II - Step 2
 * 
 * Displays linked Theme, Objectives, and Key Results for an Epic.
 * Read-only summary with deep link to Strategy Room.
 * 
 * Linkage model:
 * - Direct: epic.theme_id → strategic_themes
 * - Link tables: objective_epic_links, theme_epic_links
 * - OKR v2: objectives → key_results
 */

import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Target, 
  Palette, 
  ExternalLink, 
  Info,
  TrendingUp,
  BarChart3
} from 'lucide-react';

interface EpicStrategyContextProps {
  epicId: string;
  themeId?: string | null;
  compact?: boolean;
}

interface ThemeData {
  id: string;
  name: string;
  status?: string;
  color_tag?: string;
}

interface KeyResultData {
  id: string;
  name: string;
  current_value?: number | null;
  target_value?: number | null;
}

interface ObjectiveData {
  id: string;
  name: string;
  health?: string;
  key_result_progress?: number;
  tier?: string;
  key_results?: KeyResultData[];
}

export function EpicStrategyContext({ epicId, themeId, compact = false }: EpicStrategyContextProps) {
  const navigate = useNavigate();

  // Fetch linked theme (direct via theme_id or via theme_epic_links)
  const { data: theme } = useQuery({
    queryKey: ['epic-strategy-theme', epicId, themeId],
    queryFn: async (): Promise<ThemeData | null> => {
      // First try direct theme_id
      if (themeId) {
        const { data } = await supabase
          .from('strategic_themes')
          .select('id, name, status, color_tag')
          .eq('id', themeId)
          .maybeSingle();
        if (data) return data;
      }

      // Fallback to theme_epic_links
      const { data: link } = await supabase
        .from('theme_epic_links')
        .select('theme_id')
        .eq('epic_id', epicId)
        .maybeSingle();

      if (link?.theme_id) {
        const { data: themeData } = await supabase
          .from('strategic_themes')
          .select('id, name, status, color_tag')
          .eq('id', link.theme_id)
          .maybeSingle();
        return themeData;
      }

      return null;
    },
    enabled: !!epicId,
  });

  // Fetch linked objectives via objective_epic_links with key results
  const { data: objectives = [] } = useQuery({
    queryKey: ['epic-strategy-objectives-with-krs', epicId],
    queryFn: async (): Promise<ObjectiveData[]> => {
      // First get the links
      const { data: links } = await supabase
        .from('objective_epic_links')
        .select('objective_id')
        .eq('epic_id', epicId);

      if (!links || links.length === 0) return [];

      // Then fetch the objectives
      const objectiveIds = links.map(l => l.objective_id);
      const { data: objectivesData } = await supabase
        .from('objectives')
        .select('id, name, health, key_result_progress, tier')
        .in('id', objectiveIds);

      if (!objectivesData || objectivesData.length === 0) return [];

      // Fetch key results for each objective
      const { data: keyResults } = await supabase
        .from('key_results')
        .select('id, name, current_value, target_value, objective_id')
        .in('objective_id', objectiveIds);

      // Map key results to their objectives
      return objectivesData.map(obj => ({
        ...obj,
        key_results: (keyResults || []).filter(kr => kr.objective_id === obj.id).map(kr => ({
          id: kr.id,
          name: kr.name,
          current_value: kr.current_value,
          target_value: kr.target_value,
        }))
      })) as ObjectiveData[];
    },
    enabled: !!epicId,
  });

  const hasLinkage = theme || objectives.length > 0;

  // Navigate to Strategy Room with context
  const handleOpenStrategyRoom = () => {
    if (theme?.id) {
      navigate(`/enterprise/okr-hub?themeId=${theme.id}`);
    } else if (objectives.length > 0) {
      navigate(`/enterprise/okr-hub?objectiveId=${objectives[0].id}`);
    } else {
      navigate('/enterprise/strategy-room');
    }
  };

  // Navigate to specific objective
  const handleOpenObjective = (objectiveId: string) => {
    navigate(`/enterprise/okr-hub?objectiveId=${objectiveId}`);
  };

  // Get health badge variant
  const getHealthVariant = (health?: string) => {
    switch (health?.toLowerCase()) {
      case 'good':
      case 'green': return 'default';
      case 'at_risk':
      case 'fair':
      case 'amber': return 'secondary';
      case 'poor':
      case 'red': return 'destructive';
      default: return 'outline';
    }
  };

  // Calculate KR progress
  const getKRProgress = (kr: KeyResultData): number => {
    if (!kr.target_value || kr.target_value === 0) return 0;
    return Math.round(((kr.current_value || 0) / kr.target_value) * 100);
  };

  // Compact version for backlog columns
  if (compact) {
    if (!hasLinkage) {
      return <span className="text-xs text-muted-foreground">—</span>;
    }

    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {theme && (
          <Badge variant="outline" className="text-xs h-5">
            <Palette className="h-3 w-3 mr-1" style={{ color: theme.color_tag || 'currentColor' }} />
            {theme.name.length > 15 ? `${theme.name.slice(0, 15)}...` : theme.name}
          </Badge>
        )}
        {objectives.length > 0 && (
          <Badge variant="secondary" className="text-xs h-5">
            <Target className="h-3 w-3 mr-1" />
            {objectives.length} obj
          </Badge>
        )}
      </div>
    );
  }

  // Full version for Epic details panel
  return (
    <div className="p-4 bg-muted/20 rounded-lg border border-border/40 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Target className="h-4 w-4 text-primary" />
          Strategy Context
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleOpenStrategyRoom}
          className="h-7 text-xs text-primary hover:text-primary/80"
        >
          <ExternalLink className="h-3.5 w-3.5 mr-1" />
          Open in Strategy Room
        </Button>
      </div>

      {!hasLinkage ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
          <Info className="h-4 w-4" />
          No Strategy / OKR linkage defined for this Epic.
        </div>
      ) : (
        <div className="space-y-4">
          {/* Theme section */}
          {theme && (
            <div className="space-y-1.5">
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Palette className="h-3 w-3" />
                Theme
              </div>
              <div className="flex items-center gap-2">
                <div 
                  className="w-2.5 h-2.5 rounded-full" 
                  style={{ backgroundColor: theme.color_tag || 'hsl(var(--primary))' }}
                />
                <span className="text-sm font-medium">{theme.name}</span>
                {theme.status && (
                  <Badge variant="outline" className="text-xs h-5 capitalize">
                    {theme.status}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Objectives section with Key Results */}
          {objectives.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Target className="h-3 w-3" />
                Linked Objectives ({objectives.length})
              </div>
              <div className="space-y-3">
                {objectives.map(obj => (
                  <div key={obj.id} className="bg-background/50 rounded-md border border-border/30 overflow-hidden">
                    <button
                      onClick={() => handleOpenObjective(obj.id)}
                      className="w-full flex items-center justify-between p-2.5 hover:bg-muted/30 transition-colors text-left group"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-sm font-medium truncate">{obj.name}</span>
                        {obj.tier && (
                          <Badge variant="outline" className="text-xs h-5 capitalize shrink-0">
                            {obj.tier}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {obj.health && (
                          <Badge variant={getHealthVariant(obj.health)} className="text-xs h-5 capitalize">
                            {obj.health.replace('_', ' ')}
                          </Badge>
                        )}
                        {typeof obj.key_result_progress === 'number' && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <TrendingUp className="h-3 w-3" />
                            {Math.round(obj.key_result_progress)}%
                          </div>
                        )}
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                    
                    {/* Key Results */}
                    {obj.key_results && obj.key_results.length > 0 && (
                      <div className="border-t border-border/30 px-2.5 py-2 space-y-1.5">
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <BarChart3 className="h-3 w-3" />
                          Key Results ({obj.key_results.length})
                        </div>
                        {obj.key_results.map(kr => (
                          <div key={kr.id} className="flex items-center gap-2 text-xs">
                            <span className="truncate flex-1 text-muted-foreground">{kr.name}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Progress value={getKRProgress(kr)} className="h-1.5 w-12" />
                              <span className="text-muted-foreground w-8 text-right">
                                {getKRProgress(kr)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
