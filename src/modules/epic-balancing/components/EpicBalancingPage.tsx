import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, RefreshCw, AlertTriangle, Scale } from 'lucide-react';
import { useEpicBalancingData } from '../hooks/useEpicBalancingData';
import { EpicBalancingChart } from './EpicBalancingChart';
import { EpicBalancingLegend } from './EpicBalancingLegend';
import { EpicDetailsDrawer } from './EpicDetailsDrawer';
import { EpicBalancingEpic, EpicBalancingFilters } from '../types';

export function EpicBalancingPage() {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();
  
  const [filters] = useState<EpicBalancingFilters>({});
  const [selectedEpic, setSelectedEpic] = useState<EpicBalancingEpic | null>(null);

  const { 
    epics, 
    allEpics,
    stats, 
    scoringStats,
    isLoading, 
    error, 
    refetch,
    hiddenDrivers,
    toggleDriver,
    resetFilters,
  } = useEpicBalancingData(programId || '', filters);

  const handleEpicClick = (epic: EpicBalancingEpic) => {
    setSelectedEpic(epic);
  };

  const handleEpicSave = (updatedEpic: EpicBalancingEpic) => {
    // TODO: In production, this would trigger a refetch or optimistic update
    refetch();
    setSelectedEpic(null);
  };

  if (!programId) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>No program ID provided</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="h-[72px] border-b border-border bg-card flex-shrink-0 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <Scale className="h-5 w-5 text-brand-gold" />
          <div>
            <h1 className="text-lg font-semibold text-foreground">Epic Balancing</h1>
            <p className="text-xs text-muted-foreground">Visual balancing of epics using Technical Score (WSJF)</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => navigate(`/program/${programId}/room`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Program
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Chart Area */}
        <div className="flex-1 p-6 overflow-hidden">
          {/* Info banner for incomplete scoring */}
          {scoringStats.incomplete > 0 && !isLoading && (
            <Alert className="mb-4 border-brand-gold/50 bg-brand-gold/5">
              <AlertTriangle className="h-4 w-4 text-brand-gold" />
              <AlertDescription className="text-sm">
                {scoringStats.incomplete} epic{scoringStats.incomplete > 1 ? 's are' : ' is'} missing WSJF scores. 
                They appear at the bottom-left or are excluded. Use the Epic details drawer to complete scoring.
              </AlertDescription>
            </Alert>
          )}

          <Card className="h-full">
            <CardContent className="p-4 h-full">
              {isLoading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="space-y-4 w-full max-w-md">
                    <Skeleton className="h-8 w-48 mx-auto" />
                    <Skeleton className="h-[400px] w-full" />
                  </div>
                </div>
              ) : error ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
                    <p className="text-lg font-medium text-foreground mb-2">Unable to load Epic Balancing data</p>
                    <Button onClick={() => refetch()} variant="outline">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry
                    </Button>
                  </div>
                </div>
              ) : stats ? (
                <EpicBalancingChart 
                  epics={epics} 
                  stats={stats} 
                  onEpicClick={handleEpicClick}
                />
              ) : null}
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Legend & Metrics */}
        <div className="w-64 border-l border-border bg-card p-4 overflow-y-auto">
          <EpicBalancingLegend 
            hiddenDrivers={hiddenDrivers}
            onToggleDriver={toggleDriver}
            onReset={resetFilters}
            scoringStats={scoringStats}
            epics={allEpics}
            onEpicClick={handleEpicClick}
          />
        </div>
      </div>

      {/* Epic Details Drawer */}
      <EpicDetailsDrawer
        epic={selectedEpic}
        open={!!selectedEpic}
        onClose={() => setSelectedEpic(null)}
        onSave={handleEpicSave}
      />
    </div>
  );
}
