/**
 * Incident Analytics Page
 * Premium Operations Control Room for CIO/Operations Head
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Printer, Loader2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useIncidentAnalytics, useFilteredIncidents } from '../hooks/useIncidentAnalytics';
import { useIncidentDetail } from '../hooks/useIncidentDetail';
import { ExecutiveSnapshot } from '../components/ExecutiveSnapshot';
import { BreakdownTiles } from '../components/BreakdownTiles';
import { MajorIncidentsTable } from '../components/MajorIncidentsTable';
import { AgingPressureBar } from '../components/AgingPressureBar';
import { DrilldownDrawer } from '../components/DrilldownDrawer';
import { TimeRangeSelector } from '../components/TimeRangeSelector';
import { ModeSwitchSegment } from '../components/ModeSwitchSegment';
import IncidentDetailModal from '@/components/incidents/modal/IncidentDetailModal';
import type { TimeRange, DrilldownFilter, IncidentWithSLA } from '../types';

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

  const handleAgingDrilldown = (filter: DrilldownFilter, incidents: IncidentWithSLA[]) => {
    setActiveFilter(filter);
    setFilteredIncidentsList(incidents);
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
      {/* Header */}
      <div className="border-b border-border bg-card flex-shrink-0">
        <div className="px-8 py-5">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3">
            <Link to="/release" className="hover:text-foreground transition-colors">
              Release
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link to="/release/incidents" className="hover:text-foreground transition-colors">
              Incident List
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground font-medium">Analytics</span>
          </nav>
          
          {/* Title Row */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground tracking-tight">
                Incident Analytics
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Operations control room
              </p>
            </div>
            <div className="flex items-center gap-5">
              <ModeSwitchSegment currentMode="analytics" />
              <div className="h-6 w-px bg-border" />
              <TimeRangeSelector
                value={timeRange}
                onChange={handleTimeRangeChange}
                customStart={customStart}
                customEnd={customEnd}
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={handlePrint} className="h-9">
                    <Printer className="h-4 w-4 mr-2" />
                    Print
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Export current view to PDF</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>

      {/* Content - Full width */}
      <div className="flex-1 overflow-auto">
        <div className="px-8 py-6 max-w-[1600px]">
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
          <MajorIncidentsTable
            incidents={majorIncidents}
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
