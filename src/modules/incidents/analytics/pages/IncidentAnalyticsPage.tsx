/**
 * Incident Analytics Page
 * Control room for IT Operations
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Printer, Lightbulb, Loader2, ChevronRight, BarChart3, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useIncidentAnalytics, useFilteredIncidents } from '../hooks/useIncidentAnalytics';
import { useIncidentDetail } from '../hooks/useIncidentDetail';
import { ExecutiveSnapshot } from '../components/ExecutiveSnapshot';
import { BreakdownTiles } from '../components/BreakdownTiles';
import { MajorIncidentsTable } from '../components/MajorIncidentsTable';
import { DrilldownDrawer } from '../components/DrilldownDrawer';
import { TimeRangeSelector } from '../components/TimeRangeSelector';
import IncidentDetailModal from '@/components/incidents/modal/IncidentDetailModal';
import { cn } from '@/lib/utils';
import type { TimeRange, DrilldownFilter } from '../types';

type ViewMode = 'list' | 'analytics' | 'insights';

function ModeSwitchSegment({ 
  currentMode, 
  onModeChange 
}: { 
  currentMode: ViewMode; 
  onModeChange: (mode: ViewMode) => void;
}) {
  const modes: { value: ViewMode; label: string; icon: React.ElementType }[] = [
    { value: 'list', label: 'List', icon: List },
    { value: 'analytics', label: 'Analytics', icon: BarChart3 },
    { value: 'insights', label: 'Insights', icon: Lightbulb },
  ];

  return (
    <div className="inline-flex items-center rounded-md border border-border bg-muted/30 p-0.5">
      {modes.map((mode) => {
        const Icon = mode.icon;
        const isActive = currentMode === mode.value;
        return (
          <button
            key={mode.value}
            onClick={() => onModeChange(mode.value)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded transition-all",
              isActive 
                ? "bg-background text-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {mode.label}
          </button>
        );
      })}
    </div>
  );
}

export default function IncidentAnalyticsPage() {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [customStart, setCustomStart] = useState<Date>();
  const [customEnd, setCustomEnd] = useState<Date>();
  const [activeFilter, setActiveFilter] = useState<DrilldownFilter | null>(null);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);

  const { incidents, snapshot, breakdowns, majorIncidents, isLoading } = useIncidentAnalytics(
    timeRange, customStart, customEnd
  );

  const { data: selectedIncident } = useIncidentDetail(selectedIncidentId);

  const filteredIncidents = useFilteredIncidents(
    incidents,
    activeFilter?.type || null,
    activeFilter?.value || null
  );

  const handleModeChange = (mode: ViewMode) => {
    if (mode === 'list') {
      navigate('/release/incidents');
    } else if (mode === 'analytics') {
      navigate('/release/incidents/analytics');
    } else if (mode === 'insights') {
      navigate('/release/incidents/insights');
    }
  };

  const handleTimeRangeChange = (range: TimeRange, start?: Date, end?: Date) => {
    setTimeRange(range);
    if (range === 'custom') {
      setCustomStart(start);
      setCustomEnd(end);
    }
  };

  const handleDrilldown = (filter: DrilldownFilter) => {
    setActiveFilter(filter);
  };

  const handleCloseDrilldown = () => {
    setActiveFilter(null);
  };

  const handleRowClick = (id: string) => {
    setSelectedIncidentId(id);
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card flex-shrink-0">
        <div className="px-6 py-4">
          {/* Breadcrumb Row */}
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
            <Link to="/release" className="hover:text-foreground transition-colors">
              Release
            </Link>
            <ChevronRight className="h-3 w-3" />
            <Link to="/release/incidents" className="hover:text-foreground transition-colors">
              Incident List
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium">Analytics</span>
          </nav>
          
          {/* Title Row */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-semibold text-foreground">Incident Analytics</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Operations control room</p>
            </div>
            <div className="flex items-center gap-4">
              <ModeSwitchSegment currentMode="analytics" onModeChange={handleModeChange} />
              <div className="h-5 w-px bg-border" />
              <TimeRangeSelector
                value={timeRange}
                onChange={handleTimeRangeChange}
                customStart={customStart}
                customEnd={customEnd}
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={handlePrint} className="h-8">
                    <Printer className="h-4 w-4 mr-1.5" />
                    Print
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Export current view to PDF</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <ExecutiveSnapshot
          snapshot={snapshot}
          onDrilldown={handleDrilldown}
          activeFilter={activeFilter}
        />
        <BreakdownTiles
          breakdowns={breakdowns}
          onDrilldown={handleDrilldown}
          activeFilter={activeFilter}
        />
        <MajorIncidentsTable
          incidents={majorIncidents}
          onRowClick={handleRowClick}
        />
      </div>

      {/* Drilldown Drawer */}
      <DrilldownDrawer
        isOpen={!!activeFilter}
        filter={activeFilter}
        incidents={filteredIncidents}
        timeRange={timeRange}
        onClose={handleCloseDrilldown}
        onClear={handleCloseDrilldown}
        onRowClick={handleRowClick}
      />

      {/* Incident Detail Modal */}
      {selectedIncident && (
        <IncidentDetailModal
          incident={selectedIncident}
          isOpen={!!selectedIncidentId}
          onClose={() => setSelectedIncidentId(null)}
        />
      )}
    </div>
  );
}
