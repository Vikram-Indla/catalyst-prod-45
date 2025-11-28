import { useState } from 'react';
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
  
  const programId = searchParams.get('program');
  const piId = searchParams.get('pi');
  
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
  
  const { data: teams } = useQuery({
    queryKey: ['teams', programId],
    queryFn: async () => {
      // If no program or invalid program ID, get all teams
      if (!programId || !programId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        const { data: teams, error } = await supabase
          .from('teams')
          .select('*');
        
        if (error) throw error;
        return teams.sort((a, b) => a.name.localeCompare(b.name));
      }
      
      const { data: rankings } = await supabase
        .from('program_team_rankings')
        .select('team_id, rank_order')
        .eq('program_id', programId)
        .order('rank_order');
      
      const { data: teams, error } = await supabase
        .from('teams')
        .select('*')
        .eq('program_id', programId);
      
      if (error) throw error;
      
      if (rankings && rankings.length > 0) {
        const rankMap = new Map(rankings.map(r => [r.team_id, r.rank_order]));
        return teams.sort((a, b) => {
          const rankA = rankMap.get(a.id) ?? 999;
          const rankB = rankMap.get(b.id) ?? 999;
          return rankA - rankB;
        });
      }
      
      return teams.sort((a, b) => a.name.localeCompare(b.name));
    },
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
      return data.map((iteration, idx) => ({
        ...iteration,
        code: `S${23 + idx}`,
        sprint_dates: iteration.start_date && iteration.end_date
          ? `${new Date(iteration.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(iteration.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
          : ''
      }));
    },
    enabled: !!piId,
  });
  
  const { data: featuresData } = useQuery({
    queryKey: ['program-board-features', programId, piId],
    queryFn: async () => {
      if (!piId) return [];
      
      // If programId is provided and valid, filter by it
      let query = supabase
        .from('features')
        .select('*')
        .eq('pi_id', piId);
      
      // Only filter by program if we have a valid UUID
      if (programId && programId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        query = query.eq('program_id', programId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      console.log('Loaded features:', data?.length, 'for PI:', piId, 'program:', programId);
      return data;
    },
    enabled: !!piId,
  });
  
  // Render feature cards
  const renderFeatureCard = (feature: any, sprintId: string) => {
    const statusColor = getFeatureStatusColor(feature);
    const showCheckmark = feature.status === 'done';
    
    if (viewMode === 'small') {
      return (
        <div
          key={`${feature.id}-${sprintId}`}
          className={`inline-block w-4 h-4 rounded-sm ${statusColor} cursor-pointer hover:opacity-80 m-0.5`}
          onClick={() => {
            setSelectedItem(feature);
            setQuickViewType('feature');
            setQuickViewOpen(true);
          }}
          title={`#${feature.id} - ${feature.name}`}
        />
      );
    }

    return (
      <div
        key={`${feature.id}-${sprintId}`}
        className={`relative ${statusColor} rounded p-2 mb-2 cursor-pointer hover:shadow-md transition-shadow group`}
        onClick={() => {
          setSelectedItem(feature);
          setQuickViewType('feature');
          setQuickViewOpen(true);
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm text-foreground">
              {feature.id}
            </div>
            <div className="text-xs text-foreground/80 line-clamp-2 mt-0.5">
              {feature.name}
            </div>
          </div>
          {showCheckmark && (
            <Check className="w-4 h-4 flex-shrink-0 text-green-700" />
          )}
        </div>
        
        {/* Hover tooltip */}
        <div className="hidden group-hover:block absolute left-0 top-full mt-1 z-50 bg-popover border border-border rounded-lg shadow-lg p-3 min-w-[300px]">
          <div className="space-y-2">
            <div>
              <span className="text-sm font-semibold text-primary">Feature #{feature.id}</span>
              <span className="text-sm text-muted-foreground"> - {feature.name}</span>
            </div>
            <div className="text-xs">
              <span className="text-muted-foreground">State: </span>
              <span className="text-foreground">{feature.status}</span>
            </div>
            {(feature.has_unassigned_story || feature.has_story_not_in_sprint) && (
              <div className="border-t pt-2 mt-2">
                <div className="text-xs font-semibold text-orange-600 uppercase">Planning Issues</div>
                <div className="mt-1 space-y-1 text-xs text-muted-foreground">
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
    <div className={`min-h-screen ${isFullscreen ? 'p-0' : 'p-6'}`}>
      {/* Header */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Grid3x3 className="h-6 w-6 text-muted-foreground" />
              <h1 className="text-2xl font-semibold">Program Board</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              {selectedPI ? `${new Date(selectedPI.start_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} To ${new Date(selectedPI.end_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}` : ''}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={viewMode} onValueChange={(v: ViewMode) => setViewMode(v)}>
              <SelectTrigger className="w-[140px]">
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
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="More Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="orphans">Orphans</SelectItem>
                <SelectItem value="history">History</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" size="sm" onClick={() => setTeamRankOpen(true)}>
              Team Rank
            </Button>
            
            <Button variant="outline" size="sm" onClick={handleCaptureBoard}>
              <Download className="h-4 w-4" />
              Capture
            </Button>
            
            <Button variant="outline" size="sm" onClick={() => setExtraConfigsOpen(true)}>
              <Settings className="h-4 w-4" />
              Extra Configs
            </Button>
          </div>
        </div>
        
        {selectedProgram && (
          <div className="flex items-center gap-2">
            <button className="text-sm text-muted-foreground hover:text-foreground">▼</button>
            <span className="text-sm font-medium">Program: {selectedProgram.name}</span>
          </div>
        )}
      </div>
      
      {/* Board Grid */}
      <div className="border rounded-lg bg-card overflow-auto">
        <div className="min-w-max">
          {/* Sprint Headers */}
          <div className="flex sticky top-0 bg-background z-10 border-b">
            <div className="w-48 p-3 border-r"></div>
            <div className="w-48 p-3 border-r text-center text-sm font-medium bg-muted/10">
              Unplanned Iteration
            </div>
            {sprints?.map((sprint) => (
              <div key={sprint.id} className="flex-1 min-w-[120px] p-3 border-r text-center">
                <div className="font-semibold text-sm">{sprint.code}</div>
                <div className="text-xs text-muted-foreground">{sprint.sprint_dates}</div>
              </div>
            ))}
          </div>
          
          {/* Objectives row */}
          <div className="border-b bg-background">
            <div className="flex">
              <div className="w-48 p-3 border-r bg-muted/30 font-medium text-sm">
                Objectives
              </div>
              <div className="w-48 p-3 border-r bg-muted/10"></div>
              {sprints?.map((sprint) => (
                <div key={sprint.id} className="flex-1 min-w-[120px] p-3 border-r bg-muted/10">
                  <div className="flex gap-1.5 flex-wrap">
                    {sprint.code === 'S23' && (
                      <>
                        <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-xs font-bold text-white cursor-pointer hover:ring-2 ring-green-600 transition-all">1241</div>
                        <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-xs font-bold text-white cursor-pointer hover:ring-2 ring-green-600 transition-all">1252</div>
                      </>
                    )}
                    {sprint.code === 'S24' && (
                      <>
                        <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-xs font-bold text-white cursor-pointer hover:ring-2 ring-green-600 transition-all">1456</div>
                        <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-xs font-bold text-white cursor-pointer hover:ring-2 ring-green-600 transition-all">1490</div>
                        <div className="w-10 h-10 rounded-full bg-yellow-500 flex items-center justify-center text-xs font-bold text-white cursor-pointer hover:ring-2 ring-yellow-600 transition-all">3495</div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Team rows */}
          <div className="text-sm font-medium p-3 border-b bg-muted/30">Teams</div>
          {teams?.map((team) => (
            <div key={team.id} className="border-b hover:bg-muted/10 transition-colors">
              <div className="flex">
                <div className="w-48 p-3 border-r font-medium text-sm text-primary flex items-center gap-3">
                  <div className="w-10 h-10 rounded overflow-hidden bg-muted flex-shrink-0">
                    {team.name.includes('Cheetah') && (
                      <div className="w-full h-full bg-gradient-to-br from-yellow-600 to-yellow-800" style={{backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,.1) 10px, rgba(0,0,0,.1) 20px)'}} />
                    )}
                    {team.name.includes('Giraffe') && (
                      <div className="w-full h-full bg-gradient-to-br from-yellow-700 to-orange-800" style={{backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 8px, rgba(0,0,0,.15) 8px, rgba(0,0,0,.15) 16px)'}} />
                    )}
                    {team.name.includes('Hunters') && (
                      <div className="w-full h-full bg-gradient-to-br from-amber-600 to-amber-800" style={{backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 5px, rgba(0,0,0,.2) 5px, rgba(0,0,0,.2) 10px)'}} />
                    )}
                    {!team.name.includes('Cheetah') && !team.name.includes('Giraffe') && !team.name.includes('Hunters') && (
                      <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-700" />
                    )}
                  </div>
                  <span>{team.name}</span>
                </div>
                <div className="w-48 p-3 border-r bg-muted/5">
                  <div className={viewMode === 'small' ? 'flex flex-wrap gap-0.5' : 'space-y-1'}>
                    {featuresData?.filter((f) => f.team_id === team.id && !f.team_target_completion_sprint_id)
                      .map((feature) => renderFeatureCard(feature, 'unplanned'))}
                  </div>
                </div>
                {sprints?.map((sprint) => (
                  <div key={sprint.id} className="flex-1 min-w-[120px] p-3 border-r">
                    <div className={viewMode === 'small' ? 'flex flex-wrap gap-0.5' : 'space-y-1'}>
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
