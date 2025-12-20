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
import { Link } from 'react-router-dom';
import { Search, ToggleLeft, ToggleRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
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
    <div className="h-full flex flex-col" style={{ background: 'var(--surface-default)' }}>
      {/* HEADER — Catalyst breadcrumb/title row */}
      <div
        className="border-b shrink-0 px-4 py-3"
        style={{ borderColor: 'var(--border-default)', background: 'var(--surface-elevated)' }}
      >
        {/* Breadcrumb */}
        <Breadcrumb className="mb-1">
          <BreadcrumbList className="text-xs">
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/release" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                  Release
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="text-[var(--text-primary)] font-medium">Committee Queue</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Title row with count pills */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Committee Queue
            </h1>
            <Badge
              variant="secondary"
              className="text-[11px] font-semibold h-5 px-2"
              style={{ color: 'var(--text-primary)', background: 'var(--surface-subtle)', border: '1px solid var(--border-default)' }}
            >
              Open Approvals: {openCount}
            </Badge>
            {includeClosedDecisions && (
              <Badge
                variant="outline"
                className="text-[11px] font-medium h-5 px-2"
                style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-default)' }}
              >
                All Committee Items: {totalCount}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* TOOLBAR — minimal, purpose-driven */}
      <div
        className="flex items-center justify-between gap-2 px-4 py-2 border-b"
        style={{ borderColor: 'var(--border-default)', background: 'var(--surface-default)' }}
      >
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
        <div className="flex items-center gap-1.5">
          <div className="relative w-40">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3" style={{ color: 'var(--text-tertiary)' }} />
            <Input
              placeholder="Find by key or summary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 h-7 text-xs"
              style={{ borderColor: 'var(--border-default)' }}
            />
          </div>

          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v as any);
              setKpiFilter(null);
            }}
          >
            <SelectTrigger className="w-24 h-7 text-[11px]">
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
            <SelectTrigger className="w-20 h-7 text-[11px]">
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
            <SelectTrigger className="w-20 h-7 text-[11px]">
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
            className="h-7 gap-1.5 text-[11px] px-2"
            style={{ color: 'var(--text-secondary)' }}
            onClick={() => setIncludeClosedDecisions(!includeClosedDecisions)}
          >
            {includeClosedDecisions ? (
              <ToggleRight className="h-3.5 w-3.5" style={{ color: 'var(--brand-primary)' }} />
            ) : (
              <ToggleLeft className="h-3.5 w-3.5" style={{ color: 'var(--text-tertiary)' }} />
            )}
            {includeClosedDecisions ? 'Closed on' : 'Closed off'}
          </Button>
        </div>
      </div>

      {/* TABLE */}
      <div className="flex-1 overflow-hidden p-4">
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
