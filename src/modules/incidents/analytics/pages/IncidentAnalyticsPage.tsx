/**
 * Incident Analytics Page
 * Premium Operations Control Room for CIO/Operations Head
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Printer, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlobalPageHeader } from '@/components/layout/GlobalPageHeader';
import { IncidentCommandBar } from '@/components/incidents/IncidentCommandBar';
import { CreateIncidentModal, IncidentFormData } from '@/components/incidents/CreateIncidentModal';
import { useIncidentAnalytics, useFilteredIncidents } from '../hooks/useIncidentAnalytics';
import { useIncidentDetail } from '../hooks/useIncidentDetail';
import { useCreateIncident } from '@/hooks/useIncidents';
import { ExecutiveSnapshot } from '../components/ExecutiveSnapshot';
import { BreakdownTiles } from '../components/BreakdownTiles';
import { AgingPressureBar } from '../components/AgingPressureBar';
import { RequiresAttentionTabs } from '../components/RequiresAttentionTabs';
import { DrilldownDrawer } from '../components/DrilldownDrawer';
import { TimeRangeSelector } from '../components/TimeRangeSelector';
import IncidentDetailModal from '@/components/incidents/modal/IncidentDetailModal';
import { toast } from 'sonner';
import type { TimeRange, DrilldownFilter, IncidentWithSLA } from '../types';

export default function IncidentAnalyticsPage() {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [customStart, setCustomStart] = useState<Date>();
  const [customEnd, setCustomEnd] = useState<Date>();
  const [activeFilter, setActiveFilter] = useState<DrilldownFilter | null>(null);
  const [filteredIncidentsList, setFilteredIncidentsList] = useState<IncidentWithSLA[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { incidents, snapshot, breakdowns, majorIncidents, isLoading } = useIncidentAnalytics(
    timeRange, customStart, customEnd
  );

  const { data: selectedIncident } = useIncidentDetail(selectedIncidentId);
  const createIncident = useCreateIncident();

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

  const handleCreateIncident = async (formData: IncidentFormData) => {
    try {
      const result = await createIncident.mutateAsync({
        title: formData.title,
        description: formData.description,
        severity: formData.severity,
        impact: formData.impact,
        urgency: formData.urgency,
        support_level: formData.support_level,
        project_id: formData.project_id,
        release_version_id: formData.release_version_id,
        is_major_incident: formData.is_major_incident,
        incident_type: formData.incident_type,
        reporter_id: formData.reporterId,
        reporter_name: formData.reporterName,
        assignee_id: formData.assigneeId,
        target_date: formData.target_resolution_date,
      });
      
      toast.success('Incident created successfully');
      setCreateDialogOpen(false);
      
      if (result?.id) {
        navigate(`/release/incidents/${result.id}?created=true`);
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to create incident');
    }
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
      />

      {/* Standardized Command Bar */}
      <IncidentCommandBar
        onCreateClick={() => setCreateDialogOpen(true)}
        additionalActions={
          <div className="w-full flex flex-col gap-2 md:flex-row md:items-center md:gap-2">
            <TimeRangeSelector
              value={timeRange}
              onChange={handleTimeRangeChange}
              customStart={customStart}
              customEnd={customEnd}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="h-9 px-3 text-sm w-full md:w-auto justify-center"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        }
      />

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-[1600px] mx-auto">
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

      {/* Create Incident Modal */}
      <CreateIncidentModal
        isOpen={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSubmit={handleCreateIncident}
      />
    </div>
  );
}
