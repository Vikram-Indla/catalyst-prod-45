/**
 * Incident Analytics Page
 * Control room for IT Operations
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Printer, Lightbulb, Loader2, ChevronRight } from 'lucide-react';
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
import type { TimeRange, DrilldownFilter } from '../types';

export default function IncidentAnalyticsPage() {
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
            <div className="flex items-center gap-3">
              <TimeRangeSelector
                value={timeRange}
                onChange={handleTimeRangeChange}
                customStart={customStart}
                customEnd={customEnd}
              />
              <div className="h-5 w-px bg-border" />
              <Link to="/release/incidents/insights">
                <Button variant="outline" size="sm" className="h-8">
                  <Lightbulb className="h-4 w-4 mr-1.5" />
                  Insights
                </Button>
              </Link>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={handlePrint} className="h-8">
                    <Printer className="h-4 w-4 mr-1.5" />
                    Print / PDF
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
