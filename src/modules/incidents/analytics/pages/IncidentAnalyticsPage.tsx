/**
 * Incident Analytics Page
 * Premium Operations Control Room for CIO/Operations Head
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Printer, Loader2, List, BarChart3, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlobalPageHeader } from '@/components/layout/GlobalPageHeader';
import { useIncidentAnalytics, useFilteredIncidents } from '../hooks/useIncidentAnalytics';
import { useIncidentDetail } from '../hooks/useIncidentDetail';
import { ExecutiveSnapshot } from '../components/ExecutiveSnapshot';
import { BreakdownTiles } from '../components/BreakdownTiles';
import { AgingPressureBar } from '../components/AgingPressureBar';
import { RequiresAttentionTabs } from '../components/RequiresAttentionTabs';
import { DrilldownDrawer } from '../components/DrilldownDrawer';
import { TimeRangeSelector } from '../components/TimeRangeSelector';
import IncidentDetailModal from '@/components/incidents/modal/IncidentDetailModal';
import { cn } from '@/lib/utils';
import type { TimeRange, DrilldownFilter, IncidentWithSLA } from '../types';

type ViewMode = 'list' | 'analytics' | 'insights';

function ViewSwitch({ currentMode }: { currentMode: ViewMode }) {
  const navigate = useNavigate();
  
  const modes: { value: ViewMode; label: string; icon: React.ElementType; path: string }[] = [
    { value: 'list', label: 'List', icon: List, path: '/release/incidents' },
    { value: 'analytics', label: 'Analytics', icon: BarChart3, path: '/release/incidents/analytics' },
    { value: 'insights', label: 'Insights', icon: Lightbulb, path: '/release/incidents/insights' },
  ];

  return (
    <div className="inline-flex items-center rounded-lg border border-border bg-muted/30 p-1">
      {modes.map((mode) => {
        const Icon = mode.icon;
        const isActive = currentMode === mode.value;
        return (
          <button
            key={mode.value}
            onClick={() => navigate(mode.path)}
            className={cn(
              "inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-md transition-all",
              isActive 
                ? "bg-background text-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <Icon className="h-4 w-4" />
            {mode.label}
          </button>
        );
      })}
    </div>
  );
}

export default function IncidentAnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [customStart, setCustomStart] = useState<Date>();
  const [customEnd, setCustomEnd] = useState<Date>();
  const [activeFilter, setActiveFilter] = useState<DrilldownFilter | null>(null);
  const [filteredIncidentsList, setFilteredIncidentsList] = useState<IncidentWithSLA[]>([]);
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

  const handleTimeRangeChange = (range: TimeRange, start?: Date, end?: Date) => {
    setTimeRange(range);
    if (range === 'custom') {
      setCustomStart(start);
      setCustomEnd(end);
    }
  };

  const handleDrilldown = (filter: DrilldownFilter) => {
    setActiveFilter(filter);
    setFilteredIncidentsList([]);
  };

  const handleAgingDrilldown = (filter: DrilldownFilter, incidentList: IncidentWithSLA[]) => {
    setActiveFilter(filter);
    setFilteredIncidentsList(incidentList);
  };

  const handleCloseDrilldown = () => {
    setActiveFilter(null);
    setFilteredIncidentsList([]);
  };

  const handleRowClick = (id: string) => {
    setSelectedIncidentId(id);
  };

  const handlePrint = () => {
    window.print();
  };

  // Use filtered incidents from aging bar if available, otherwise use standard filter
  const drawerIncidents = filteredIncidentsList.length > 0 ? filteredIncidentsList : filteredIncidents;

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      <GlobalPageHeader
        sectionLabel="RELEASE"
        pageTitle="Incident Analytics"
        showDivider={false}
        rightActions={
          <div className="flex items-center gap-4">
            <ViewSwitch currentMode="analytics" />
            <div className="h-6 w-px bg-border" />
            <TimeRangeSelector
              value={timeRange}
              onChange={handleTimeRangeChange}
              customStart={customStart}
              customEnd={customEnd}
            />
            <Button variant="outline" size="sm" onClick={handlePrint} className="h-8 px-3 text-sm">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        }
      />


      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="px-6 py-6 max-w-[1600px]">
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
          <AgingPressureBar
            incidents={incidents}
            onDrilldown={handleAgingDrilldown}
          />
          <RequiresAttentionTabs
            incidents={incidents}
            onRowClick={handleRowClick}
          />
        </div>
      </div>

      {/* Drilldown Drawer */}
      <DrilldownDrawer
        isOpen={!!activeFilter}
        filter={activeFilter}
        incidents={drawerIncidents}
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
