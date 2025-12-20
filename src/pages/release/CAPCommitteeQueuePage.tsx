/**
 * Committee Queue Page — Executive-grade governance and approval system
 * 
 * Redesigned with:
 * - Same enterprise table pattern as Incident List
 * - Governance-focused columns (Committee Status, Approval Progress, Approvers)
 * - KPI widgets for filtering
 * - Right drawer for decision trail
 * - Typography contract enforced
 */

import { useState, useMemo } from 'react';
import { Search, Shield, ToggleLeft, ToggleRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

type FilterSeverity = 'all' | 'SEV1' | 'SEV2' | 'SEV3' | 'SEV4';
type FilterAging = 'all' | '>3d' | '>7d' | '>14d';

export default function CAPCommitteeQueuePage() {
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [includeClosedDecisions, setIncludeClosedDecisions] = useState(false);
  const [statusFilter, setStatusFilter] = useState<CommitteeDecisionStatus | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<FilterSeverity>('all');
  const [agingFilter, setAgingFilter] = useState<FilterAging>('all');
  const [kpiFilter, setKpiFilter] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<CommitteeQueueItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Fetch data
  const { data: items = [], isLoading } = useCommitteeQueue({ 
    includeClosedDecisions 
  });

  // Apply filters
  const filteredItems = useMemo(() => {
    let result = items;

    // KPI filter (takes precedence)
    if (kpiFilter) {
      switch (kpiFilter) {
        case 'pending':
          result = result.filter(i => i.committeeStatus === 'pending');
          break;
        case 'approved':
          result = result.filter(i => i.committeeStatus === 'approved');
          break;
        case 'vetoed':
          result = result.filter(i => i.committeeStatus === 'vetoed');
          break;
        case 'aging':
          result = result.filter(i => i.agingDays >= 7);
          break;
      }
    }

    // Status filter
    if (statusFilter !== 'all' && !kpiFilter) {
      result = result.filter(i => i.committeeStatus === statusFilter);
    }

    // Severity filter
    if (severityFilter !== 'all') {
      result = result.filter(i => i.incident.severity === severityFilter);
    }

    // Aging filter
    if (agingFilter !== 'all') {
      result = result.filter(i => {
        switch (agingFilter) {
          case '>3d': return i.agingDays > 3;
          case '>7d': return i.agingDays > 7;
          case '>14d': return i.agingDays > 14;
          default: return true;
        }
      });
    }

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(i =>
        i.incident.incident_key?.toLowerCase().includes(q) ||
        i.incident.title?.toLowerCase().includes(q)
      );
    }

    // Sort: Pending first, then by aging desc
    result = [...result].sort((a, b) => {
      if (a.committeeStatus === 'pending' && b.committeeStatus !== 'pending') return -1;
      if (a.committeeStatus !== 'pending' && b.committeeStatus === 'pending') return 1;
      return b.agingDays - a.agingDays;
    });

    return result;
  }, [items, kpiFilter, statusFilter, severityFilter, agingFilter, searchQuery]);

  const handleRowClick = (item: CommitteeQueueItem) => {
    setSelectedItem(item);
    setDrawerOpen(true);
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-[var(--brand-primary)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[var(--surface-default)]">
      {/* Header */}
      <div className="h-14 border-b border-[var(--border-default)] bg-[var(--surface-elevated)] shrink-0 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-[var(--brand-primary)]" />
          <div>
            <h1 className="text-base font-semibold text-[var(--text-1)]">Committee Queue</h1>
            <p className="text-xs text-[var(--text-3)]">Incidents awaiting committee decision and approval</p>
          </div>
          <Badge variant="secondary" className="ml-2 text-xs">
            {filteredItems.length} {!includeClosedDecisions ? 'Pending' : 'Total'}
          </Badge>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-3)]" />
            <Input
              placeholder="Search key or summary..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>

          {/* Status filter */}
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as any); setKpiFilter(null); }}>
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="vetoed">Vetoed</SelectItem>
            </SelectContent>
          </Select>

          {/* Severity filter */}
          <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as FilterSeverity)}>
            <SelectTrigger className="w-24 h-8 text-xs">
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

          {/* Aging filter */}
          <Select value={agingFilter} onValueChange={(v) => setAgingFilter(v as FilterAging)}>
            <SelectTrigger className="w-24 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ages</SelectItem>
              <SelectItem value=">3d">&gt;3 days</SelectItem>
              <SelectItem value=">7d">&gt;7 days</SelectItem>
              <SelectItem value=">14d">&gt;14 days</SelectItem>
            </SelectContent>
          </Select>

          {/* Include closed toggle */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-2 text-xs"
            onClick={() => setIncludeClosedDecisions(!includeClosedDecisions)}
          >
            {includeClosedDecisions ? (
              <ToggleRight className="h-4 w-4 text-emerald-600" />
            ) : (
              <ToggleLeft className="h-4 w-4 text-[var(--text-3)]" />
            )}
            {includeClosedDecisions ? 'Include closed' : 'Open only'}
          </Button>
        </div>
      </div>

      {/* KPI Widgets */}
      <div className="px-4 py-3 border-b border-[var(--border-default)] bg-[var(--surface-default)]">
        <CommitteeKPIWidgets
          items={items}
          activeFilter={kpiFilter}
          onFilterClick={setKpiFilter}
        />
      </div>

      {/* Table */}
      <div className="flex-1 overflow-hidden p-4">
        <CommitteeQueueTable
          items={filteredItems}
          isLoading={isLoading}
          onRowClick={handleRowClick}
        />
      </div>

      {/* Drawer */}
      <CommitteeQueueDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        item={selectedItem}
      />
    </div>
  );
}
