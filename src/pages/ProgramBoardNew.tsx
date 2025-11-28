import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { 
  Maximize, Download, Settings, Info, 
  Square, Grid3x3, Users, Check
} from 'lucide-react';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';

import { TeamRankDialog } from '@/components/program-board/TeamRankDialog';
import { OrphansDialog } from '@/components/program-board/OrphansDialog';
import { FeatureHistoryDialog } from '@/components/program-board/FeatureHistoryDialog';
import { LegendDialog } from '@/components/program-board/LegendDialog';
import { ExtraConfigsDialog } from '@/components/program-board/ExtraConfigsDialog';
import { FeatureQuickView } from '@/components/program-board/FeatureQuickView';
import { DependencyQuickView } from '@/components/program-board/DependencyQuickView';
import { ObjectiveQuickView } from '@/components/program-board/ObjectiveQuickView';
import { getFeatureStatusColor } from '@/lib/programBoardUtils';

type ViewMode = 'normal' | 'small' | 'heatmap';
type QuickViewType = 'feature' | 'dependency' | 'objective' | null;

export default function ProgramBoard() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const programParam = searchParams.get('program');
  const piParam = searchParams.get('pi');
  
  const [viewMode, setViewMode] = useState<ViewMode>('normal');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showUnassigned, setShowUnassigned] = useState(false);
  
  // Modal states
  const [teamRankOpen, setTeamRankOpen] = useState(false);
  const [orphansOpen, setOrphansOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [extraConfigsOpen, setExtraConfigsOpen] = useState(false);
  
  // Quick View states
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [quickViewType, setQuickViewType] = useState<QuickViewType>(null);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  
  // Data queries
  const { data: programs } = useQuery({
    queryKey: ['programs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('programs').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });
  
  const { data: programIncrements } = useQuery({
    queryKey: ['program-increments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_increments')
        .select('*')
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  
  // Resolve actual UUIDs from params (could be slugs or UUIDs)
  const programId = useMemo(() => {
    if (!programParam) return programs?.[0]?.id;
    
    // Check if it's already a UUID
    if (programParam.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return programParam;
    }
    
    // Try to match by slug (case-insensitive)
    const matchedProgram = programs?.find(p => 
      p.name.toLowerCase().replace(/\s+/g, '-') === programParam.toLowerCase()
    );
    
    return matchedProgram?.id || programs?.[0]?.id;
  }, [programParam, programs]);
  
  const piId = useMemo(() => {
    if (!piParam) return programIncrements?.[0]?.id;
    
    // Check if it's already a UUID
    if (piParam.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return piParam;
    }
    
    // Try to match by name (case-insensitive)
    const matchedPI = programIncrements?.find(pi => 
      pi.name.toLowerCase() === piParam.toLowerCase()
    );
    
    return matchedPI?.id || programIncrements?.[0]?.id;
  }, [piParam, programIncrements]);

  console.log('Program Board Debug:', {
    programParam,
    piParam,
    resolvedProgramId: programId,
    resolvedPiId: piId,
    availablePrograms: programs?.map(p => ({ id: p.id, name: p.name })),
    availablePIs: programIncrements?.map(pi => ({ id: pi.id, name: pi.name }))
  });
  
  const { data: teams } = useQuery({
    queryKey: ['teams', programId],
    queryFn: async () => {
      if (!programId || !programId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        return [];
      }

      const { data: allTeams, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .eq('program_id', programId);
      
      if (teamsError) throw teamsError;
      
      const { data: rankings } = await supabase
        .from('program_team_rankings')
        .select('team_id, rank_order')
        .eq('program_id', programId)
        .order('rank_order');
      
      if (rankings && rankings.length > 0) {
        const rankMap = new Map(rankings.map(r => [r.team_id, r.rank_order]));
        const sortedTeams = allTeams.sort((a, b) => {
          const rankA = rankMap.get(a.id) ?? 999;
          const rankB = rankMap.get(b.id) ?? 999;
          return rankA - rankB;
        });
        console.log('Teams loaded:', sortedTeams.length, sortedTeams.map(t => ({ id: t.id, name: t.name, rank: rankMap.get(t.id) ?? 999 })));
        return sortedTeams;
      }
      
      console.log('Teams loaded (no rankings):', allTeams.length, allTeams.map(t => ({ id: t.id, name: t.name })));
      return allTeams.sort((a, b) => a.name.localeCompare(b.name));
    },
    enabled: !!programId,
  });
  
  const { data: sprints } = useQuery({
    queryKey: ['iterations', piId],
    queryFn: async () => {
      if (!piId) return [];
      const { data, error } = await supabase
        .from('iterations')
        .select('*')
        .eq('pi_id', piId)
        .order('start_date');
      if (error) throw error;
      
      const sprints = data.map((iteration) => ({
        ...iteration,
        code: iteration.name, // Use actual sprint name instead of generating S23, S24...
        sprint_dates: iteration.start_date && iteration.end_date
          ? `${new Date(iteration.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(iteration.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
          : ''
      }));
      
      console.log('Sprints loaded:', sprints.length, sprints.map(s => ({ id: s.id, code: s.code, name: s.name })));
      return sprints;
    },
    enabled: !!piId,
  });
  
  const { data: featuresData } = useQuery({
    queryKey: ['program-board-features', programId, piId],
    queryFn: async () => {
      if (!piId || !programId) return [];
      
      const { data, error } = await supabase
        .from('features')
        .select('*')
        .eq('pi_id', piId)
        .eq('program_id', programId);
      
      if (error) throw error;
      
      // Group by team for debugging
      const byTeam = data.reduce((acc: any, f: any) => {
        const teamId = f.team_id || 'unassigned';
        if (!acc[teamId]) acc[teamId] = [];
        acc[teamId].push(f);
        return acc;
      }, {});
      
      console.log('Features loaded:', data?.length, 'grouped by team:', 
        Object.entries(byTeam).map(([teamId, features]: [string, any]) => 
          `${teamId}: ${features.length} features`
        ).join(', ')
      );
      
      return data;
    },
    enabled: !!piId && !!programId,
  });
  
  // Render feature cards with proper Jira Align styling
  const renderFeatureCard = (feature: any, sprintId: string) => {
    const statusColor = getFeatureStatusColor(feature);
    const showCheckmark = feature.status === 'done';
    
    // Small view mode - compact tiles with IDs only
    if (viewMode === 'small') {
      return (
        <div
          key={`${feature.id}-${sprintId}`}
          className={`inline-flex items-center justify-center w-12 h-6 text-[10px] font-semibold rounded-sm ${statusColor} cursor-pointer hover:ring-1 ring-foreground/20 transition-all shadow-sm`}
          onClick={() => {
            setSelectedItem(feature);
            setQuickViewType('feature');
            setQuickViewOpen(true);
          }}
          title={`#${feature.id} - ${feature.name}`}
        >
          {feature.id}
        </div>
      );
    }

    // Heatmap view - tiny squares
    if (viewMode === 'heatmap') {
      return (
        <div
          key={`${feature.id}-${sprintId}`}
          className={`inline-block w-3 h-3 rounded-sm ${statusColor} cursor-pointer hover:opacity-80`}
          onClick={() => {
            setSelectedItem(feature);
            setQuickViewType('feature');
            setQuickViewOpen(true);
          }}
          title={`#${feature.id} - ${feature.name}`}
        />
      );
    }

    // Normal view - full cards with details
    return (
      <div
        key={`${feature.id}-${sprintId}`}
        className={`relative ${statusColor} rounded shadow-sm border border-foreground/10 cursor-pointer hover:shadow-md transition-all group`}
        onClick={() => {
          setSelectedItem(feature);
          setQuickViewType('feature');
          setQuickViewOpen(true);
        }}
      >
        <div className="px-2.5 py-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="font-bold text-base leading-tight mb-1">
                {feature.id}
              </div>
              <div className="text-[11px] leading-snug line-clamp-3 opacity-90">
                {feature.name}
              </div>
            </div>
            {showCheckmark && (
              <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{color: 'rgba(0,0,0,0.6)'}} />
            )}
          </div>
        </div>
        
        {/* Hover tooltip */}
        <div className="hidden group-hover:block absolute left-0 top-full mt-1 z-50 bg-popover border border-border rounded shadow-lg p-3 min-w-[320px] max-w-md">
          <div className="space-y-2 text-xs">
            <div>
              <span className="font-bold">Feature #{feature.id}</span>
              <span className="text-muted-foreground"> - {feature.name}</span>
            </div>
            <div>
              <span className="text-muted-foreground">State: </span>
              <span className="font-medium">{feature.status}</span>
            </div>
            {(feature.has_unassigned_story || feature.has_story_not_in_sprint) && (
              <div className="border-t pt-2 mt-2">
                <div className="text-xs font-bold text-orange-600 uppercase mb-1">Planning Issues</div>
                <div className="space-y-0.5 text-xs">
                  {feature.has_unassigned_story && <div>• Unassigned stories</div>}
                  {feature.has_story_not_in_sprint && <div>• Stories not in sprint</div>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  const handleCaptureBoard = () => {
    toast.info('Screen capture feature - TODO');
  };
  
  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };
  
  // Prerequisite check
  if (!programId || !piId) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-8">
        <Card className="p-12 max-w-md text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center">
            <Grid3x3 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-semibold">Program Board</h2>
          <p className="text-muted-foreground">
            Select a Program and Program Increment to view the board
          </p>
          <div className="space-y-3 pt-4">
            <Select value={programId || ''} onValueChange={(val) => setSearchParams({ program: val, pi: piId || '' })}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Program" />
              </SelectTrigger>
              <SelectContent>
                {programs?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={piId || ''} onValueChange={(val) => setSearchParams({ program: programId || '', pi: val })}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select PI" />
              </SelectTrigger>
              <SelectContent>
                {programIncrements?.map((pi) => (
                  <SelectItem key={pi.id} value={pi.id}>{pi.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>
      </div>
    );
  }
  
  const selectedProgram = programs?.find(p => p.id === programId);
  const selectedPI = programIncrements?.find(pi => pi.id === piId);
  
  return (
    <div className={`min-h-screen bg-background ${isFullscreen ? 'p-0' : 'p-6'}`}>
      {/* Header */}
      <div className="mb-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Grid3x3 className="h-5 w-5 text-muted-foreground" />
              <h1 className="text-xl font-semibold">Program Board</h1>
              <span className="text-sm text-muted-foreground">
                Are we on-track based on our Program Increment com...
              </span>
            </div>
            <p className="text-xs text-muted-foreground pl-8">
              {selectedPI ? `${new Date(selectedPI.start_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} To ${new Date(selectedPI.end_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}` : ''}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={viewMode} onValueChange={(v: ViewMode) => setViewMode(v)}>
              <SelectTrigger className="w-[130px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal View</SelectItem>
                <SelectItem value="small">Small View</SelectItem>
                <SelectItem value="heatmap">Heat Map</SelectItem>
              </SelectContent>
            </Select>
            
            <Select onValueChange={(action) => {
              if (action === 'orphans') setOrphansOpen(true);
              if (action === 'history') setHistoryOpen(true);
            }}>
              <SelectTrigger className="w-[130px] h-9">
                <SelectValue placeholder="More Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="orphans">Orphans</SelectItem>
                <SelectItem value="history">History</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" size="sm" className="h-9" onClick={() => setTeamRankOpen(true)}>
              Team Rank
            </Button>
            
            <Button variant="outline" size="sm" className="h-9" onClick={handleCaptureBoard}>
              Capture
            </Button>
            
            <Button variant="outline" size="sm" className="h-9" onClick={() => setExtraConfigsOpen(true)}>
              Extra Configs
            </Button>
            
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleFullscreen}>
              <Maximize className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {selectedProgram && (
          <div className="flex items-center gap-2 pl-8">
            <button className="text-sm text-muted-foreground hover:text-foreground">▼</button>
            <span className="text-sm font-medium">Program: {selectedProgram.name}</span>
          </div>
        )}
      </div>
      
      {/* Board Grid */}
      <div className="border border-border rounded bg-card shadow-sm overflow-auto">
        <div className="min-w-max">
          {/* Sprint Headers */}
          <div className="flex sticky top-0 bg-background z-10 border-b border-border">
            <div className="w-56 border-r border-border"></div>
            <div className="w-44 py-2 px-3 border-r border-border text-center bg-muted/20">
              <div className="text-xs font-medium text-foreground">Unplanned Iteration</div>
            </div>
            {sprints?.map((sprint) => (
              <div key={sprint.id} className="flex-1 min-w-[140px] py-2 px-3 border-r border-border text-center bg-background">
                <div className="font-semibold text-sm text-foreground">{sprint.code}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{sprint.sprint_dates}</div>
              </div>
            ))}
          </div>
          
          {/* Objectives row */}
          <div className="border-b border-border bg-background">
            <div className="flex">
              <div className="w-56 py-2 px-3 border-r border-border bg-muted/20 font-medium text-xs text-foreground">
                Objectives
              </div>
              <div className="w-44 py-2 px-3 border-r border-border bg-muted/10"></div>
              {sprints?.map((sprint) => (
                <div key={sprint.id} className="flex-1 min-w-[140px] py-2 px-3 border-r border-border bg-muted/5">
                  <div className="flex gap-1 flex-wrap justify-center">
                    {/* Placeholder objectives - replace with real data */}
                    {sprint.code === sprint.name && Math.random() > 0.5 && (
                      <>
                        <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center text-xs font-semibold text-white cursor-pointer hover:ring-2 ring-emerald-600 transition-all shadow-sm">
                          {Math.floor(1000 + Math.random() * 9000)}
                        </div>
                        {Math.random() > 0.6 && (
                          <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center text-xs font-semibold text-white cursor-pointer hover:ring-2 ring-emerald-600 transition-all shadow-sm">
                            {Math.floor(1000 + Math.random() * 9000)}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Team Header */}
          <div className="text-xs font-medium py-1.5 px-3 border-b border-border bg-muted/20 text-foreground">Teams</div>
          
          {/* Team rows */}
          {teams?.map((team) => (
            <div key={team.id} className="border-b border-border hover:bg-muted/5 transition-colors">
              <div className="flex">
                <div className="w-56 py-2.5 px-3 border-r border-border font-medium text-sm text-primary flex items-center gap-2.5">
                  <div className="w-12 h-12 rounded overflow-hidden bg-muted flex-shrink-0 shadow-sm border border-border/50">
                    {team.name.includes('Cheetah') && (
                      <div className="w-full h-full bg-gradient-to-br from-yellow-500 to-yellow-700" style={{backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(0,0,0,.12) 8px, rgba(0,0,0,.12) 16px)'}} />
                    )}
                    {team.name.includes('Giraffe') && (
                      <div className="w-full h-full bg-gradient-to-br from-yellow-600 to-orange-700" style={{backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 6px, rgba(0,0,0,.15) 6px, rgba(0,0,0,.15) 12px)'}} />
                    )}
                    {team.name.includes('Hunters') && (
                      <div className="w-full h-full bg-gradient-to-br from-amber-700 to-amber-900" style={{backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(0,0,0,.2) 4px, rgba(0,0,0,.2) 8px)'}} />
                    )}
                    {!team.name.includes('Cheetah') && !team.name.includes('Giraffe') && !team.name.includes('Hunters') && (
                      <div className="w-full h-full bg-gradient-to-br from-cyan-500 to-cyan-700" />
                    )}
                  </div>
                  <span className="text-xs text-blue-600 hover:text-blue-700 cursor-pointer font-medium">{team.name}</span>
                </div>
                <div className="w-44 py-2.5 px-2 border-r border-border bg-muted/5">
                  <div className={viewMode === 'small' ? 'flex flex-wrap gap-1' : 'space-y-1.5'}>
                    {featuresData?.filter((f) => f.team_id === team.id && !f.team_target_completion_sprint_id)
                      .map((feature) => renderFeatureCard(feature, 'unplanned'))}
                  </div>
                </div>
                {sprints?.map((sprint) => (
                  <div key={sprint.id} className="flex-1 min-w-[140px] py-2.5 px-2 border-r border-border bg-background">
                    <div className={viewMode === 'small' ? 'flex flex-wrap gap-1' : 'space-y-1.5'}>
                      {featuresData?.filter((f) => f.team_id === team.id && f.team_target_completion_sprint_id === sprint.id)
                        .map((feature) => renderFeatureCard(feature, sprint.id))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Dialogs */}
      <TeamRankDialog open={teamRankOpen} onOpenChange={setTeamRankOpen} programId={programId} />
      <OrphansDialog open={orphansOpen} onOpenChange={setOrphansOpen} programId={programId} piId={piId} />
      <FeatureHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} />
      <LegendDialog open={legendOpen} onOpenChange={setLegendOpen} />
      <ExtraConfigsDialog 
        open={extraConfigsOpen} 
        onOpenChange={setExtraConfigsOpen}
        showUnassigned={showUnassigned}
        onShowUnassignedChange={setShowUnassigned}
      />
      
      {/* Quick View Panels */}
      <Sheet open={quickViewOpen} onOpenChange={setQuickViewOpen}>
        <SheetContent className="w-[600px] sm:max-w-[600px]">
          {quickViewType === 'feature' && selectedItem && (
            <FeatureQuickView feature={selectedItem} onClose={() => setQuickViewOpen(false)} />
          )}
          {quickViewType === 'dependency' && selectedItem && (
            <DependencyQuickView dependency={selectedItem} onClose={() => setQuickViewOpen(false)} />
          )}
          {quickViewType === 'objective' && selectedItem && (
            <ObjectiveQuickView objective={selectedItem} onClose={() => setQuickViewOpen(false)} />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
