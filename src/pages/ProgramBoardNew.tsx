import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Maximize, Download, Settings, Info, 
  Square, Grid3x3, Users, Check, Search, Camera, Grip
} from 'lucide-react';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';
import { toPng } from 'html-to-image';

import { TeamRankDialog } from '@/components/program-board/TeamRankDialog';
import { OrphansDialog } from '@/components/program-board/OrphansDialog';
import { LegendDialog } from '@/components/program-board/LegendDialog';
import { ExtraConfigsDialog } from '@/components/program-board/ExtraConfigsDialog';
import { FeatureQuickView } from '@/components/program-board/FeatureQuickView';
import { FeatureCardTooltip } from '@/components/program-board/FeatureCardTooltip';
import { FeatureSymbolMarkers } from '@/components/program-board/FeatureSymbolMarkers';
import { DependencyQuickView } from '@/components/program-board/DependencyQuickView';
import { ObjectiveQuickView } from '@/components/program-board/ObjectiveQuickView';
import { FeatureHistoryDialog } from '@/components/program-board/FeatureHistoryDialog';
import { DependencyConnector } from '@/components/program-board/DependencyConnector';
import { getFeatureStatusColor } from '@/lib/programBoardUtils';

type ViewMode = 'normal' | 'small' | 'heatmap';
type QuickViewType = 'feature' | 'dependency' | 'objective' | null;

export default function ProgramBoard() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const programParam = searchParams.get('program');
  const piParam = searchParams.get('pi');
  
  const [viewMode, setViewMode] = useState<ViewMode>('normal');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showUnassigned, setShowUnassigned] = useState(true);
  
  const [teamRankOpen, setTeamRankOpen] = useState(false);
  const [orphansOpen, setOrphansOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [extraConfigsOpen, setExtraConfigsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  
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
        .select('id, display_id, name, status, blocked, health, team_id, team_target_completion_sprint_id, is_orphan_on_board, epic_id, pi_id, program_id')
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
  
  const { data: piObjectives } = useQuery({
    queryKey: ['pi-objectives', piId],
    queryFn: async () => {
      if (!piId) return [];
      // Query objectives - using simplified approach
      const { data, error } = await supabase
        .from('objectives')
        .select('id, name, anchor_sprint_id')
        .contains('program_increment_ids', [piId]);
      if (error) {
        console.error('Objectives query error:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!piId,
  });
  
  const { data: dependencies } = useQuery({
    queryKey: ['dependencies', programId, piId],
    queryFn: async () => {
      if (!piId || !programId || !featuresData) return [];
      const featureIds = featuresData.map(f => f.id);
      if (featureIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('dependencies')
        .select('id, from_feature_id, to_feature_id, status, risk_level')
        .in('from_feature_id', featureIds);
      if (error) {
        console.error('Dependencies query error:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!piId && !!programId && !!featuresData && featuresData.length > 0,
  });
  
  // Render feature cards with proper Catalyst styling
  const renderFeatureCard = (feature: any, sprintId: string) => {
    const statusColor = getFeatureStatusColor(feature);
    const showCheckmark = feature.status === 'done' || feature.status === 'accepted';
    const displayId = feature.display_id || feature.id;
    
    // Small view mode - compact tiles with IDs only
    if (viewMode === 'small') {
      return (
        <div
          key={`${feature.id}-${sprintId}`}
          data-feature-id={feature.id}
          className={`inline-flex items-center justify-center w-10 h-4 sm:w-12 sm:h-5 text-[9px] sm:text-[10px] font-bold rounded ${statusColor} cursor-pointer hover:ring-1 ring-foreground/20 transition-all shadow-sm`}
          onClick={() => {
            setSelectedItem(feature);
            setQuickViewType('feature');
            setQuickViewOpen(true);
          }}
          title={`#${displayId} - ${feature.name}`}
        >
          {displayId}
        </div>
      );
    }

    // Heatmap view - tiny squares with density-based coloring
    if (viewMode === 'heatmap') {
      // Calculate intensity based on status
      const getHeatIntensity = (feature: any) => {
        if (feature.status === 'done' || feature.status === 'accepted') return 'bg-success';
        if (feature.status === 'in progress') return 'bg-info';
        if (feature.blocked) return 'bg-destructive';
        return 'bg-muted';
      };
      
      return (
        <div
          key={`${feature.id}-${sprintId}`}
          data-feature-id={feature.id}
          className={`inline-block w-3 h-3 sm:w-4 sm:h-4 rounded ${getHeatIntensity(feature)} cursor-pointer hover:opacity-80 transition-opacity m-0.5`}
          onClick={() => {
            setSelectedItem(feature);
            setQuickViewType('feature');
            setQuickViewOpen(true);
          }}
          title={`#${displayId} - ${feature.name}`}
        />
      );
    }

    // Normal view - full cards with details
    return (
      <Popover key={`${feature.id}-${sprintId}`}>
        <PopoverTrigger asChild>
          <div
            data-feature-id={feature.id}
            className={`relative ${statusColor} rounded shadow-sm border border-foreground/10 cursor-pointer hover:shadow-md transition-all group min-h-[40px] sm:min-h-[48px]`}
            onClick={() => {
              setSelectedItem(feature);
              setQuickViewType('feature');
              setQuickViewOpen(true);
            }}
          >
            {/* Left status strip */}
            <div className={`
              absolute left-0 top-0 bottom-0 w-0.5 sm:w-1 rounded-l
              ${feature.blocked ? 'bg-destructive' : ''}
              ${feature.status === 'done' ? 'bg-success' : ''}
              ${feature.status === 'in progress' ? 'bg-info' : ''}
              ${!feature.status || feature.status === 'not started' ? 'bg-muted' : ''}
            `} />
            
            <div className="px-1.5 py-1 sm:px-2 sm:py-1.5 pl-2 sm:pl-3">
              <div className="flex items-start justify-between gap-1 sm:gap-1.5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                    <div className="font-bold text-[11px] sm:text-sm leading-tight mb-0.5">
                      {displayId}
                    </div>
                    <div className="sm:hidden">
                      <FeatureSymbolMarkers feature={feature} size={10} />
                    </div>
                    <div className="hidden sm:block">
                      <FeatureSymbolMarkers feature={feature} size={12} />
                    </div>
                  </div>
                  <div className="text-[9px] sm:text-[10px] leading-tight line-clamp-2 opacity-90 font-medium">
                    {feature.name}
                  </div>
                </div>
                {showCheckmark && (
                  <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0 mt-0.5 opacity-60" />
                )}
              </div>
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent side="top" align="start" className="p-0 border-border">
          <FeatureCardTooltip feature={feature} />
        </PopoverContent>
      </Popover>
    );
  };
  
  const handleHistoryClick = () => {
    setHistoryOpen(true);
  };
  
  const handleCaptureBoard = async () => {
    const boardElement = document.getElementById('program-board-grid');
    if (!boardElement) {
      toast.error('Board not found');
      return;
    }

    try {
      toast.info('Capturing board...');
      
      const dataUrl = await toPng(boardElement, {
        cacheBust: true,
        backgroundColor: '#ffffff',
        pixelRatio: 2,
      });
      
      const link = document.createElement('a');
      link.download = `program-board-${selectedProgram?.name || 'board'}-${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();
      
      toast.success('Board captured successfully!');
    } catch (error) {
      console.error('Failed to capture board:', error);
      toast.error('Failed to capture board');
    }
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
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4 sm:p-8">
        <Card className="p-6 sm:p-12 max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-muted mx-auto flex items-center justify-center">
            <Grid3x3 className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold">Program Board</h2>
          <p className="text-sm sm:text-base text-muted-foreground">
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
    <div className={`min-h-screen bg-background ${isFullscreen ? 'p-0' : 'p-2 sm:p-4 lg:p-6'}`}>
      {/* Header */}
      <div className="mb-2 sm:mb-4 space-y-2 sm:space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <Grid3x3 className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
            <h1 className="text-lg sm:text-xl font-semibold">Program Board</h1>
            <div className="relative hidden md:block">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Help search..." 
                className="pl-8 h-8 w-[200px] text-sm"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap w-full sm:w-auto overflow-x-auto pb-1">
            <Select value={viewMode} onValueChange={(v: ViewMode) => setViewMode(v)}>
              <SelectTrigger className="w-[110px] sm:w-[140px] h-8 sm:h-9 text-xs sm:text-sm">
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
              if (action === 'history') handleHistoryClick();
            }}>
              <SelectTrigger className="w-[100px] sm:w-[140px] h-8 sm:h-9 text-xs sm:text-sm">
                <SelectValue placeholder="Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="orphans">Orphans</SelectItem>
                <SelectItem value="history">History</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" size="sm" className="h-8 sm:h-9 text-xs sm:text-sm hidden sm:flex" onClick={() => setTeamRankOpen(true)}>
              <Grip className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              Team Rank
            </Button>
            
            <Button variant="outline" size="icon" className="h-8 w-8 sm:hidden" onClick={() => setTeamRankOpen(true)} title="Team Rank">
              <Grip className="h-4 w-4" />
            </Button>
            
            <Button variant="outline" size="sm" className="h-8 sm:h-9 hidden lg:flex" onClick={handleCaptureBoard}>
              <Camera className="h-4 w-4 mr-1" />
              Capture
            </Button>
            
            <Button variant="outline" size="sm" className="h-8 sm:h-9 text-xs sm:text-sm hidden md:flex" onClick={() => setExtraConfigsOpen(true)}>
              <Settings className="h-4 w-4 mr-1" />
              Config
            </Button>
            
            <Button variant="outline" size="icon" className="h-8 w-8 md:hidden" onClick={() => setExtraConfigsOpen(true)} title="Config">
              <Settings className="h-4 w-4" />
            </Button>
            
            <div className="h-6 w-px bg-border mx-0.5 sm:mx-1 hidden sm:block" />
            
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={() => setLegendOpen(true)} title="Legend">
              <Info className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
            
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 hidden sm:flex" onClick={handleFullscreen} title="Full screen">
              <Maximize className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>
        
        {selectedProgram && (
          <div className="flex items-center gap-2 pl-2 sm:pl-8">
            <button className="text-xs sm:text-sm text-muted-foreground hover:text-foreground">▼</button>
            <span className="text-xs sm:text-sm font-medium truncate">Program: {selectedProgram.name}</span>
          </div>
        )}
        
        {selectedPI && (
          <p className="text-[10px] sm:text-xs text-muted-foreground pl-2 sm:pl-8 truncate">
            {`${new Date(selectedPI.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} To ${new Date(selectedPI.end_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`}
          </p>
        )}
      </div>
      
      {/* Board Grid */}
      <div className="border border-border rounded bg-card shadow-sm overflow-hidden board-grid-container">
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-160px)] sm:max-h-[calc(100vh-200px)]">
          <div className="min-w-[800px] sm:min-w-max relative" id="program-board-grid">
            {/* Sprint Headers */}
            <div className="flex sticky top-0 bg-background z-10 border-b border-border shadow-sm">
              <div className="w-32 sm:w-56 flex-shrink-0 border-r border-border"></div>
              <div className="w-28 sm:w-44 flex-shrink-0 py-2 px-2 sm:px-3 border-r border-border text-center bg-muted/20">
                <div className="text-[10px] sm:text-xs font-medium text-foreground">Unplanned</div>
              </div>
              {sprints?.map((sprint) => (
                <div key={sprint.id} className="flex-1 min-w-[100px] sm:min-w-[140px] py-2 px-2 sm:px-3 border-r border-border text-center bg-background">
                  <div className="font-semibold text-xs sm:text-sm text-foreground">{sprint.code}</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 hidden sm:block">{sprint.sprint_dates}</div>
                </div>
              ))}
            </div>
          
          {/* Objectives row */}
          <div className="border-b border-border bg-background">
            <div className="flex">
              <div className="w-32 sm:w-56 flex-shrink-0 py-2 px-2 sm:px-3 border-r border-border bg-muted/20 font-medium text-[10px] sm:text-xs text-foreground">
                Objectives
              </div>
              <div className="w-28 sm:w-44 flex-shrink-0 py-2 px-2 sm:px-3 border-r border-border bg-muted/10"></div>
              {sprints?.map((sprint) => {
                const sprintObjectives = piObjectives?.filter(obj => obj.anchor_sprint_id === sprint.id) || [];
                return (
                  <div key={sprint.id} className="flex-1 min-w-[100px] sm:min-w-[140px] py-2 px-2 sm:px-3 border-r border-border bg-muted/5">
                    <div className="flex gap-1 sm:gap-1.5 flex-wrap">
                      {sprintObjectives.map((objective, idx) => (
                        <div 
                          key={objective.id}
                          className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[9px] sm:text-[10px] font-medium cursor-pointer hover:bg-blue-200 transition-colors"
                          onClick={() => {
                            setSelectedItem(objective);
                            setQuickViewType('objective');
                            setQuickViewOpen(true);
                          }}
                        >
                          <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[8px] sm:text-[9px] font-bold">
                            {idx + 1}
                          </div>
                          <span className="line-clamp-1 hidden sm:inline">{objective.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Dependencies row */}
          <div className="border-b border-border bg-warning/10">
            <div className="flex">
              <div className="w-32 sm:w-56 flex-shrink-0 py-2 px-2 sm:px-3 border-r border-border bg-warning/20 font-medium text-[10px] sm:text-xs text-foreground">
                Dependencies
              </div>
              <div className="w-28 sm:w-44 flex-shrink-0 py-2 px-2 sm:px-3 border-r border-border bg-warning/10"></div>
              {sprints?.map((sprint) => {
                const sprintDependencies = dependencies?.filter(dep => {
                  const fromFeature = featuresData?.find(f => f.id === dep.from_feature_id);
                  return fromFeature?.team_target_completion_sprint_id === sprint.id;
                }) || [];
                return (
                  <div key={sprint.id} className="flex-1 min-w-[100px] sm:min-w-[140px] py-2 px-2 sm:px-3 border-r border-border bg-warning/5">
                    <div className="flex gap-1 flex-wrap">
                      {sprintDependencies.map((dep) => (
                        <div 
                          key={dep.id}
                          className={`w-5 h-5 sm:w-6 sm:h-6 rounded flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity ${
                            dep.risk_level === 'high' ? 'bg-destructive' :
                            dep.risk_level === 'med' ? 'bg-warning' :
                            'bg-warning/70'
                          }`}
                          onClick={() => {
                            setSelectedItem(dep);
                            setQuickViewType('dependency');
                            setQuickViewOpen(true);
                          }}
                          title="Dependency"
                        >
                          <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-b-[6px] sm:border-l-[6px] sm:border-r-[6px] sm:border-b-[8px] border-l-transparent border-r-transparent border-b-white" />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Team Header */}
          <div className="text-[10px] sm:text-xs font-medium py-1.5 px-2 sm:px-3 border-b border-border bg-muted/20 text-foreground">Teams</div>
          
          {/* Team rows */}
          {teams?.map((team) => (
            <div key={team.id} className="border-b border-border hover:bg-muted/5 transition-colors">
              <div className="flex">
                <div className="w-32 sm:w-56 flex-shrink-0 py-2 sm:py-2.5 px-2 sm:px-3 border-r border-border font-medium text-xs sm:text-sm text-primary flex items-center gap-1.5 sm:gap-2.5">
                  <div className="w-8 h-8 sm:w-12 sm:h-12 rounded overflow-hidden bg-muted flex-shrink-0 shadow-sm border border-border/50">
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
                  <span className="text-[10px] sm:text-xs text-blue-600 hover:text-blue-700 cursor-pointer font-medium truncate">{team.name}</span>
                </div>
                <div className="w-28 sm:w-44 flex-shrink-0 py-2 sm:py-2.5 px-1.5 sm:px-2 border-r border-border bg-muted/5">
                  <div className={viewMode === 'small' ? 'flex flex-wrap gap-0.5 sm:gap-1' : 'space-y-1 sm:space-y-1.5'}>
                    {featuresData?.filter((f) => f.team_id === team.id && !f.team_target_completion_sprint_id)
                      .map((feature) => renderFeatureCard(feature, 'unplanned'))}
                  </div>
                </div>
                {sprints?.map((sprint) => (
                  <div key={sprint.id} className="flex-1 min-w-[100px] sm:min-w-[140px] py-2 sm:py-2.5 px-1.5 sm:px-2 border-r border-border bg-background">
                    <div className={viewMode === 'small' ? 'flex flex-wrap gap-0.5 sm:gap-1' : 'space-y-1 sm:space-y-1.5'}>
                      {featuresData?.filter((f) => f.team_id === team.id && f.team_target_completion_sprint_id === sprint.id)
                        .map((feature) => renderFeatureCard(feature, sprint.id))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          {/* Unassigned Features row - conditionally shown */}
          {showUnassigned && (
            <div className="border-b border-border bg-muted/10 hover:bg-muted/20 transition-colors">
              <div className="flex">
                <div className="w-32 sm:w-56 flex-shrink-0 py-2 sm:py-2.5 px-2 sm:px-3 border-r border-border font-medium text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5 sm:gap-2.5">
                  <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="text-[10px] sm:text-xs">Unassigned</span>
                </div>
                <div className="w-28 sm:w-44 flex-shrink-0 py-2 sm:py-2.5 px-1.5 sm:px-2 border-r border-border">
                  <div className={viewMode === 'small' ? 'flex flex-wrap gap-0.5 sm:gap-1' : 'space-y-1 sm:space-y-1.5'}>
                    {featuresData?.filter((f) => !f.team_id && !f.team_target_completion_sprint_id)
                      .map((feature) => renderFeatureCard(feature, 'unplanned'))}
                  </div>
                </div>
                {sprints?.map((sprint) => (
                  <div key={sprint.id} className="flex-1 min-w-[100px] sm:min-w-[140px] py-2 sm:py-2.5 px-1.5 sm:px-2 border-r border-border">
                    <div className={viewMode === 'small' ? 'flex flex-wrap gap-0.5 sm:gap-1' : 'space-y-1 sm:space-y-1.5'}>
                      {featuresData?.filter((f) => !f.team_id && f.team_target_completion_sprint_id === sprint.id)
                        .map((feature) => renderFeatureCard(feature, sprint.id))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          </div>
        </div>
      </div>
      
      {/* Dialogs */}
      <TeamRankDialog open={teamRankOpen} onOpenChange={setTeamRankOpen} programId={programId} />
      <OrphansDialog open={orphansOpen} onOpenChange={setOrphansOpen} programId={programId} piId={piId} />
      <LegendDialog open={legendOpen} onOpenChange={setLegendOpen} />
      <FeatureHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} programId={programId} piId={piId} />
      <ExtraConfigsDialog
        open={extraConfigsOpen} 
        onOpenChange={setExtraConfigsOpen}
        showUnassigned={showUnassigned}
        onShowUnassignedChange={setShowUnassigned}
      />
      
      {/* Dependency Connectors */}
      {dependencies && dependencies.length > 0 && (
        <div className="absolute inset-0 pointer-events-none">
          {dependencies.map((dep) => (
            <DependencyConnector
              key={dep.id}
              fromFeatureId={dep.from_feature_id}
              toFeatureId={dep.to_feature_id}
              status={dep.risk_level === 'high' ? 'blocked' : 'open'}
            />
          ))}
        </div>
      )}
      
      {/* Quick View Panels */}
      <Sheet open={quickViewOpen} onOpenChange={setQuickViewOpen}>
        <SheetContent className="w-full sm:w-[600px] sm:max-w-[600px] overflow-y-auto">
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
