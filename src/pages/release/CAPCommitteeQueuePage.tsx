/**
 * Committee Queue Page — Executive Governance Queue
 *
 * Purpose:
 *  - What incidents are awaiting committee decision?
 *  - Who must approve? Who already approved?
 *  - Did anyone veto?
 *  - How long is this stuck?
 *
 * Layout:
 *  - Catalyst breadcrumb/title row
 *  - Count pills (Open Approvals, All if closed toggle ON)
 *  - Minimal toolbar
 *  - 4 KPI chips (Pending, Vetoed, Aging, Approved when closed ON)
 *  - Enterprise table
 *  - Right drawer for governance decision trail
 */

import { useState, useMemo } from 'react';
import { Search, ToggleLeft, ToggleRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { GlobalPageHeader } from '@/components/layout/GlobalPageHeader';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCommitteeQueue, type CommitteeQueueItem, type CommitteeDecisionStatus } from '@/hooks/useCommitteeQueue';
import { CommitteeQueueTable } from '@/components/committee/CommitteeQueueTable';
import { CommitteeQueueDrawer } from '@/components/committee/CommitteeQueueDrawer';
import { CommitteeKPIWidgets } from '@/components/committee/CommitteeKPIWidgets';
import { generateCommitteeDemoData, shouldLoadDemoData } from '@/data/committeeDemoData';

type FilterSeverity = 'all' | 'SEV1' | 'SEV2' | 'SEV3' | 'SEV4';
type FilterAging = 'all' | '>3d' | '>7d' | '>14d';

export default function CAPCommitteeQueuePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [includeClosedDecisions, setIncludeClosedDecisions] = useState(false);
  const [statusFilter, setStatusFilter] = useState<CommitteeDecisionStatus | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<FilterSeverity>('all');
  const [agingFilter, setAgingFilter] = useState<FilterAging>('all');
  const [kpiFilter, setKpiFilter] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<CommitteeQueueItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [useDemoData, setUseDemoData] = useState(shouldLoadDemoData);

  const { data: realItems = [], isLoading } = useCommitteeQueue({ includeClosedDecisions });

  const items = useMemo(() => {
    if (useDemoData || (realItems.length === 0 && !isLoading)) {
      return generateCommitteeDemoData();
    }
    return realItems;
  }, [realItems, isLoading, useDemoData]);

  // Counts
  const openCount = items.filter((i) => i.committeeStatus === 'pending').length;
  const totalCount = items.length;

  // Filters
  const filteredItems = useMemo(() => {
    let result = items;

    // KPI filter
    if (kpiFilter) {
      switch (kpiFilter) {
        case 'pending':
          result = result.filter((i) => i.committeeStatus === 'pending');
          break;
        case 'approved':
          result = result.filter((i) => i.committeeStatus === 'approved');
          break;
        case 'vetoed':
          result = result.filter((i) => i.committeeStatus === 'vetoed');
          break;
        case 'aging':
          result = result.filter((i) => i.agingDays >= 7 && i.committeeStatus === 'pending');
          break;
      }
    }

    // Status filter
    if (statusFilter !== 'all' && !kpiFilter) {
      result = result.filter((i) => i.committeeStatus === statusFilter);
    }

    // Severity
    if (severityFilter !== 'all') {
      result = result.filter((i) => i.incident.severity === severityFilter);
    }

    // Aging
    if (agingFilter !== 'all') {
      result = result.filter((i) => {
        switch (agingFilter) {
          case '>3d':
            return i.agingDays > 3;
          case '>7d':
            return i.agingDays > 7;
          case '>14d':
            return i.agingDays > 14;
          default:
            return true;
        }
      });
    }

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (i) => i.incident.incident_key?.toLowerCase().includes(q) || i.incident.title?.toLowerCase().includes(q)
      );
    }

    // Sort: pending first, then aging desc
    return [...result].sort((a, b) => {
      if (a.committeeStatus === 'pending' && b.committeeStatus !== 'pending') return -1;
      if (a.committeeStatus !== 'pending' && b.committeeStatus === 'pending') return 1;
      return b.agingDays - a.agingDays;
    });
  }, [items, kpiFilter, statusFilter, severityFilter, agingFilter, searchQuery]);

  const handleRowClick = (item: CommitteeQueueItem) => {
    setSelectedItem(item);
    setDrawerOpen(true);
  };

  if (isLoading && !useDemoData) {
    return (
      <div className="h-full flex items-center justify-center">
        <div
          className="animate-spin h-6 w-6 border-2 rounded-full"
          style={{ borderColor: 'var(--brand-primary)', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <GlobalPageHeader
        sectionLabel="RELEASE"
        pageTitle="Committee Queue"
        showDivider={false}
        rightActions={
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-foreground bg-muted px-2 py-1 rounded border border-border">
              Open Approvals: {openCount}
            </span>
            {includeClosedDecisions && (
              <span className="text-xs text-muted-foreground border border-border px-2 py-1 rounded">
                All: {totalCount}
              </span>
            )}
          </div>
        }
      />

      {/* TOOLBAR */}
      <div className="px-4 py-3 border-b border-border bg-muted/20">
        <div className="flex items-center justify-between gap-4">
        {/* Left: KPI chips */}
        <CommitteeKPIWidgets
          items={items}
          activeFilter={kpiFilter}
          onFilterClick={(id) => {
            setKpiFilter(id);
            if (id) setStatusFilter('all');
          }}
          includeClosedDecisions={includeClosedDecisions}
        />

          {/* Right: controls */}
          <div className="flex items-center gap-2">
            <div className="relative w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by key or summary..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v as any);
                setKpiFilter(null);
              }}
            >
              <SelectTrigger className="w-28 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="vetoed">Vetoed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as FilterSeverity)}>
              <SelectTrigger className="w-24 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sev</SelectItem>
                <SelectItem value="SEV1">SEV1</SelectItem>
                <SelectItem value="SEV2">SEV2</SelectItem>
                <SelectItem value="SEV3">SEV3</SelectItem>
                <SelectItem value="SEV4">SEV4</SelectItem>
              </SelectContent>
            </Select>

            <Select value={agingFilter} onValueChange={(v) => setAgingFilter(v as FilterAging)}>
              <SelectTrigger className="w-24 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ages</SelectItem>
                <SelectItem value=">3d">&gt;3d</SelectItem>
                <SelectItem value=">7d">&gt;7d</SelectItem>
                <SelectItem value=">14d">&gt;14d</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="ghost"
              size="sm"
              className="h-9 gap-1.5 text-sm px-3"
              onClick={() => setIncludeClosedDecisions(!includeClosedDecisions)}
            >
              {includeClosedDecisions ? (
                <ToggleRight className="h-4 w-4 text-primary" />
              ) : (
                <ToggleLeft className="h-4 w-4 text-muted-foreground" />
              )}
              {includeClosedDecisions ? 'Closed on' : 'Closed off'}
            </Button>
          </div>
        </div>
      </div>

      {/* TABLE - fills remaining space */}
      <div className="flex-1 overflow-hidden px-6 py-4">
        <CommitteeQueueTable
          items={filteredItems}
          isLoading={isLoading}
          onRowClick={handleRowClick}
          onLoadDemoData={() => setUseDemoData(true)}
          includeClosedDecisions={includeClosedDecisions}
        />
      </div>

      {/* DRAWER */}
      <CommitteeQueueDrawer open={drawerOpen} onOpenChange={setDrawerOpen} item={selectedItem} />
    </div>
  );
}
