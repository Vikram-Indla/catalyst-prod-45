// Enterprise Risks Page - Full analytics dashboard for enterprise-level risks
// Route: /enterprise/risks

import { useState, useMemo } from 'react';
import { Search, Filter, MoreVertical, Plus, Star, X, Check, Circle, Diamond } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useRisks, RiskWithBR } from '@/hooks/risks/useRisks';
import { useToast } from '@/hooks/use-toast';
import { Risk, RiskFormData, RiskGridFilters } from '@/types/risks';
import { RoamBadge } from '@/components/risks/RoamBadge';
import { RiskDrawer } from '@/components/risks/RiskDrawer';
import { RiskFiltersDialog } from '@/components/risks/RiskFiltersDialog';
import { CreateEditRiskPanel } from '@/components/risks/CreateEditRiskPanel';
import { DeleteRiskDialog } from '@/components/risks/DeleteRiskDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Catalyst Golden Hour Palette (semantic tokens)
const palette = {
  olive: 'hsl(var(--palette-expert))',
  bronze: 'hsl(var(--palette-advanced))',
  gold: 'hsl(var(--brand-gold))',
  champagne: 'hsl(var(--palette-beginner))',
  grey: 'hsl(var(--palette-none))',
};

const CHART_COLORS = {
  olive: '#5c7c5c',
  bronze: '#8b7355',
  gold: '#c69c6d',
  champagne: '#d4b896',
  grey: '#c8ccd0',
  critical: '#a65d57',
};

const DEFAULT_FILTERS: RiskGridFilters = {
  program_increment_id: null,
  owner_id: null,
  status: 'Open',
  resolution_method: null,
  occurrence: null,
  impact: null,
  critical_path: null
};

const ITEMS_PER_PAGE = 15;

// Drill-Down mode types
type DrillDownMode = 
  | { type: 'roam'; value: string }
  | { type: 'department'; value: string }
  | { type: 'owner'; value: string }
  | null;

// Unified Drill-Down Drawer Component
function RiskDrillDownDrawer({
  mode,
  allRisks,
  onClose,
  onRiskClick,
}: {
  mode: DrillDownMode;
  allRisks: RiskWithBR[];
  onClose: () => void;
  onRiskClick: (risk: RiskWithBR) => void;
}) {
  if (!mode) return null;

  // Filter risks based on drill-down mode - FIXED: use department and business_owner from joined BR
  const filteredRisks = allRisks.filter(risk => {
    if (mode.type === 'roam') return risk.resolution_method === mode.value;
    if (mode.type === 'department') return (risk.department || 'Unassigned') === mode.value;
    if (mode.type === 'owner') return (risk.business_owner || 'Unassigned') === mode.value;
    return false;
  });

  const criticalCount = filteredRisks.filter(r => r.critical_path === 'Yes').length;
  const highImpactCount = filteredRisks.filter(r => r.impact === 'High' || r.impact === 'Critical').length;
  const openCount = filteredRisks.filter(r => r.status === 'Open').length;

  // Build title and subtitle based on mode
  const getHeaderInfo = () => {
    switch (mode.type) {
      case 'roam':
        return { 
          label: 'ROAM Category', 
          title: mode.value, 
          subtitle: `${filteredRisks.length} risks in this category` 
        };
      case 'department':
        return { 
          label: 'Department', 
          title: mode.value, 
          subtitle: `Open risks owned by this department` 
        };
      case 'owner':
        return { 
          label: 'Business Owner', 
          title: mode.value, 
          subtitle: `Open risks linked to this business owner` 
        };
      default:
        return { label: '', title: '', subtitle: '' };
    }
  };

  const { label, title, subtitle } = getHeaderInfo();

  return (
    <Sheet open={!!mode} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="pb-4 border-b border-border">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1 text-brand-gold">{label}</p>
              <SheetTitle className="text-xl font-bold">{title}</SheetTitle>
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            </div>
          </div>
          
          {/* Quick stats tiles */}
          <div className="flex gap-3 mt-4">
            <div className="px-3 py-2 rounded-lg bg-brand-gold/10">
              <p className="text-xs text-muted-foreground">Critical</p>
              <p className="text-lg font-bold text-brand-gold">{criticalCount}</p>
            </div>
            <div className="px-3 py-2 rounded-lg bg-brand-gold/10">
              <p className="text-xs text-muted-foreground">High Impact</p>
              <p className="text-lg font-bold text-brand-gold">{highImpactCount}</p>
            </div>
            <div className="px-3 py-2 rounded-lg bg-brand-gold/10">
              <p className="text-xs text-muted-foreground">Open</p>
              <p className="text-lg font-bold text-brand-gold">{openCount}</p>
            </div>
          </div>
        </SheetHeader>
        
        {/* Risk list */}
        <div className="py-4 space-y-3">
          {filteredRisks.map(risk => (
            <div 
              key={risk.id} 
              className="p-4 rounded-xl border border-border hover:shadow-md transition-all cursor-pointer bg-card"
              onClick={() => onRiskClick(risk)}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-brand-gold/20 text-brand-gold">
                  R-{String(risk.risk_number).padStart(3, '0')}
                </span>
                <div className="flex gap-1">
                  {risk.critical_path === 'Yes' && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">
                      Critical
                    </span>
                  )}
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {risk.relationship || 'Enterprise'}
                  </span>
                </div>
              </div>
              <h3 className="font-medium mb-2 text-foreground">{risk.title}</h3>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-1 rounded-full bg-palette-expert/15 text-palette-expert">
                  {risk.department || 'Unassigned'}
                </span>
                {risk.target_resolution_date && (
                  <span className="px-2 py-1 rounded-full bg-palette-beginner/50 text-palette-advanced">
                    {new Date(risk.target_resolution_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </span>
                )}
              </div>
              <div className="mt-3 pt-3 border-t border-border flex gap-4 text-xs">
                <span className="text-muted-foreground">
                  Occ: <strong className="text-foreground">{risk.occurrence || '-'}</strong>
                </span>
                <span className="text-muted-foreground">
                  Impact: <strong className="text-foreground">{risk.impact || '-'}</strong>
                </span>
              </div>
            </div>
          ))}
          {filteredRisks.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No risks in this category</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function EnterpriseRisks() {
  const { toast } = useToast();
  const { risks, isLoading, createRisk, updateRisk, deleteRisk, isCreating, isUpdating } = useRisks();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRiskIds, setSelectedRiskIds] = useState<string[]>([]);
  const [selectedRisk, setSelectedRisk] = useState<Risk | null>(null);
  const [isFiltersDialogOpen, setIsFiltersDialogOpen] = useState(false);
  const [isCreateEditOpen, setIsCreateEditOpen] = useState(false);
  const [editingRisk, setEditingRisk] = useState<Risk | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [riskToDelete, setRiskToDelete] = useState<Risk | null>(null);
  const [filters, setFilters] = useState<RiskGridFilters>(DEFAULT_FILTERS);
  const [activeTab, setActiveTab] = useState<'summary' | 'roam'>('summary');
  const [drillDownMode, setDrillDownMode] = useState<DrillDownMode>(null);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  // Filtered risks based on filters and search
  const filteredRisks = useMemo(() => {
    return (risks || []).filter((risk: Risk) => {
      if (filters.status && risk.status !== filters.status) return false;
      if (filters.resolution_method && risk.resolution_method !== filters.resolution_method) return false;
      if (filters.occurrence && risk.occurrence !== filters.occurrence) return false;
      if (filters.impact && risk.impact !== filters.impact) return false;
      
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = risk.title.toLowerCase().includes(query);
        const matchesId = `R-${String(risk.risk_number).padStart(3, '0')}`.toLowerCase().includes(query);
        if (!matchesTitle && !matchesId) return false;
      }

      return true;
    });
  }, [risks, filters, searchQuery]);

  // Calculate KPI metrics - using RiskWithBR type with joined department/business_owner
  const allRisks = (risks || []) as RiskWithBR[];
  const openRisks = allRisks.filter(r => r.status === 'Open');
  const criticalHighRisks = openRisks.filter(r => 
    r.critical_path === 'Yes' || r.impact === 'Critical' || r.impact === 'High'
  );
  const mitigatedRisks = openRisks.filter(r => r.resolution_method === 'Mitigated');
  // FIXED: Proper filter for BR-linked risks - check actual business_request_id value
  const brRisks = openRisks.filter(r => 
    r.business_request_id !== null && r.business_request_id !== undefined
  );

  // ROAM summary
  const roamSummary = useMemo(() => ({
    resolved: allRisks.filter(r => r.resolution_method === 'Resolved'),
    owned: allRisks.filter(r => r.resolution_method === 'Owned'),
    accepted: allRisks.filter(r => r.resolution_method === 'Accepted'),
    mitigated: allRisks.filter(r => r.resolution_method === 'Mitigated'),
  }), [allRisks]);

  // Chart data
  const openClosedData = [
    { name: 'Open', value: openRisks.length, color: CHART_COLORS.gold },
    { name: 'Closed', value: allRisks.filter(r => r.status === 'Closed').length, color: CHART_COLORS.olive },
  ];

  const occurrenceData = [
    { name: 'High', value: openRisks.filter(r => r.occurrence === 'High').length, color: CHART_COLORS.bronze },
    { name: 'Medium', value: openRisks.filter(r => r.occurrence === 'Medium').length, color: CHART_COLORS.gold },
    { name: 'Low', value: openRisks.filter(r => r.occurrence === 'Low').length, color: CHART_COLORS.champagne },
  ];

  const impactData = [
    { name: 'Critical', value: openRisks.filter(r => r.impact === 'Critical').length, color: CHART_COLORS.critical },
    { name: 'High', value: openRisks.filter(r => r.impact === 'High').length, color: CHART_COLORS.bronze },
    { name: 'Medium', value: openRisks.filter(r => r.impact === 'Medium').length, color: CHART_COLORS.gold },
    { name: 'Low', value: openRisks.filter(r => r.impact === 'Low').length, color: CHART_COLORS.olive },
  ];

  // By Level distribution - uses relationship (temporary, shows work item level)
  const businessLineData = useMemo(() => {
    const byLevel: Record<string, number> = {};
    allRisks.forEach(r => {
      // Use relationship for Level chart, default to 'Demand' for BR-linked risks
      const level = r.relationship || 'Demand';
      byLevel[level] = (byLevel[level] || 0) + 1;
    });
    return Object.entries(byLevel)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [allRisks]);

  // FIXED: Department distribution - uses department from joined business_requests
  const departmentData = useMemo(() => {
    const byDept: Record<string, number> = {};
    openRisks.forEach(r => {
      const dept = r.department || 'Unassigned';
      byDept[dept] = (byDept[dept] || 0) + 1;
    });
    return Object.entries(byDept)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [openRisks]);

  // FIXED: Top business owners by risk count - uses business_owner from joined BR
  const topBusinessOwners = useMemo(() => {
    const byOwner: Record<string, { count: number; department: string }> = {};
    openRisks.forEach(r => {
      const ownerName = r.business_owner || 'Unassigned';
      const dept = r.department || 'Unassigned';
      if (!byOwner[ownerName]) {
        byOwner[ownerName] = { count: 0, department: dept };
      }
      byOwner[ownerName].count++;
    });
    return Object.entries(byOwner)
      .map(([owner, data]) => ({ owner, openRisks: data.count, unit: data.department }))
      .sort((a, b) => b.openRisks - a.openRisks)
      .slice(0, 5);
  }, [openRisks]);

  const handleRoamClick = (category: keyof typeof roamSummary, label: string) => {
    setDrillDownMode({ type: 'roam', value: label });
  };

  const handleDepartmentClick = (departmentName: string) => {
    setDrillDownMode({ type: 'department', value: departmentName });
  };

  const handleOwnerClick = (ownerName: string) => {
    setDrillDownMode({ type: 'owner', value: ownerName });
  };

  const toggleRiskSelection = (riskId: string) => {
    setSelectedRiskIds(prev =>
      prev.includes(riskId) ? prev.filter(id => id !== riskId) : [...prev, riskId]
    );
  };

  const handleCreateEditSave = (data: RiskFormData) => {
    if (editingRisk) {
      updateRisk({ id: editingRisk.id, ...data });
    } else {
      createRisk(data);
    }
    setIsCreateEditOpen(false);
    setEditingRisk(null);
  };

  const handleDelete = (risk: Risk) => {
    setRiskToDelete(risk);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (riskToDelete) {
      deleteRisk(riskToDelete.id);
      setIsDeleteDialogOpen(false);
      setRiskToDelete(null);
      if (selectedRisk?.id === riskToDelete.id) {
        setSelectedRisk(null);
      }
    }
  };

  const handleExport = () => {
    const csv = [
      ["Risk #", "Title", "Status", "ROAM", "Level", "Quarter", "Occurrence", "Impact", "Critical"].join(","),
      ...filteredRisks.map((risk) =>
        [
          `R-${String(risk.risk_number).padStart(3, '0')}`,
          `"${risk.title}"`,
          risk.status,
          risk.resolution_method,
          risk.relationship || 'Enterprise',
          risk.target_resolution_date ? new Date(risk.target_resolution_date).toLocaleDateString() : '',
          risk.occurrence || "",
          risk.impact || "",
          risk.critical_path || "",
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `enterprise-risks-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Risks exported to CSV successfully",
    });
  };

  const displayedRisks = filteredRisks.slice(0, visibleCount);
  const hasMore = filteredRisks.length > visibleCount;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Loading risks...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Page Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Page Title Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button className="text-muted-foreground hover:text-brand-gold">
              <Star className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-foreground">Enterprise Risks</h1>
            {filters.status && (
              <span className="text-sm px-2 py-0.5 rounded bg-muted text-muted-foreground">
                Where Status = {filters.status}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsFiltersDialogOpen(true)}>
              <Filter className="w-4 h-4 mr-2" />
              Apply Filters
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreVertical className="w-4 h-4 mr-2" />
                  More Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExport}>Export Risks</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button 
              size="sm" 
              className="bg-brand-gold hover:bg-brand-gold-hover text-white"
              onClick={() => {
                setEditingRisk(null);
                setIsCreateEditOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Risk
            </Button>
          </div>
        </div>

        {/* KPI Cards Row */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="rounded-2xl p-5 border bg-gradient-to-br from-brand-gold/5 to-brand-gold/15 border-brand-gold/30">
            <p className="text-xs font-medium uppercase tracking-wide mb-2 text-brand-gold">Total Open Risks</p>
            <p className="text-3xl font-bold text-foreground">{openRisks.length}</p>
            <p className="text-xs mt-1 text-muted-foreground">of {allRisks.length} total risks</p>
          </div>
          <div className="rounded-2xl p-5 border bg-gradient-to-br from-palette-advanced/5 to-palette-advanced/15 border-palette-advanced/30">
            <p className="text-xs font-medium uppercase tracking-wide mb-2 text-palette-advanced">Critical / High</p>
            <p className="text-3xl font-bold text-foreground">{criticalHighRisks.length}</p>
            <p className="text-xs mt-1 text-muted-foreground">require immediate attention</p>
          </div>
          <div className="rounded-2xl p-5 border bg-gradient-to-br from-palette-expert/5 to-palette-expert/15 border-palette-expert/30">
            <p className="text-xs font-medium uppercase tracking-wide mb-2 text-palette-expert">Mitigated</p>
            <p className="text-3xl font-bold text-foreground">{mitigatedRisks.length}</p>
            <p className="text-xs mt-1 text-muted-foreground">controls in place</p>
          </div>
          <div className="rounded-2xl p-5 border bg-gradient-to-br from-palette-beginner/15 to-palette-beginner/30 border-palette-beginner">
            <p className="text-xs font-medium uppercase tracking-wide mb-2 text-palette-advanced">Business Requests</p>
            <p className="text-3xl font-bold text-foreground">{brRisks.length}</p>
            <p className="text-xs mt-1 text-muted-foreground">BR-linked risks open</p>
          </div>
        </div>

        {/* Analytics & ROAM Section */}
        <div className="bg-card rounded-2xl border border-border p-5 mb-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-foreground">Analytics & ROAM</h2>
              <p className="text-xs text-muted-foreground">Risk distribution and ROAM status overview</p>
            </div>
            <div className="flex rounded-lg p-1 bg-muted">
              {(['summary', 'roam'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                    activeTab === tab 
                      ? 'bg-card shadow-sm text-brand-gold' 
                      : 'text-muted-foreground'
                  }`}
                >
                  {tab === 'summary' ? 'Summary' : 'ROAM Board'}
                </button>
              ))}
            </div>
          </div>

          {activeTab === 'summary' && (
            <>
              <div className="grid grid-cols-4 gap-4">
                {/* Open vs Closed */}
                <div className="rounded-xl p-4 border border-border bg-muted/50">
                  <h3 className="text-sm font-medium mb-1 text-foreground">Open vs Closed</h3>
                  <p className="text-xs mb-3 text-muted-foreground">Current risk posture</p>
                  <div className="h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={openClosedData} cx="50%" cy="50%" innerRadius={35} outerRadius={50} paddingAngle={3} dataKey="value" stroke="none">
                          {openClosedData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-4 mt-2">
                    {openClosedData.map((item, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                        {item.name}: <strong className="text-foreground">{item.value}</strong>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Occurrence Likelihood */}
                <div className="rounded-xl p-4 border border-border bg-muted/50">
                  <h3 className="text-sm font-medium mb-1 text-foreground">Occurrence Likelihood</h3>
                  <p className="text-xs mb-3 text-muted-foreground">Probability distribution</p>
                  <div className="h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={occurrenceData} cx="50%" cy="50%" innerRadius={35} outerRadius={50} paddingAngle={3} dataKey="value" stroke="none">
                          {occurrenceData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-3 mt-2">
                    {occurrenceData.map((item, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                        {item.name}: <strong className="text-foreground">{item.value}</strong>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Impact Severity */}
                <div className="rounded-xl p-4 border border-border bg-muted/50">
                  <h3 className="text-sm font-medium mb-1 text-foreground">Impact Severity</h3>
                  <p className="text-xs mb-3 text-muted-foreground">Business impact levels</p>
                  <div className="h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={impactData} cx="50%" cy="50%" innerRadius={35} outerRadius={50} paddingAngle={3} dataKey="value" stroke="none">
                          {impactData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-2 mt-2 flex-wrap">
                    {impactData.map((item, i) => (
                      <div key={i} className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                        {item.name}: <strong className="text-foreground">{item.value}</strong>
                      </div>
                    ))}
                  </div>
                </div>

                {/* By Business Line */}
                <div className="rounded-xl p-4 border border-border bg-muted/50">
                  <h3 className="text-sm font-medium mb-1 text-foreground">By Level</h3>
                  <p className="text-xs mb-3 text-muted-foreground">Distribution across units</p>
                  <div className="h-36">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={businessLineData.slice(0, 6)} layout="vertical" margin={{ left: -20 }}>
                        <XAxis type="number" hide />
                        <YAxis 
                          type="category" 
                          dataKey="name" 
                          width={90} 
                          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} 
                          axisLine={false} 
                          tickLine={false} 
                        />
                        <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                        <Bar dataKey="value" fill={CHART_COLORS.gold} radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Second row: Risks by Department + Top Business Owners (with scroll) */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                {/* Risks by Department */}
                <div className="rounded-xl p-4 border border-border bg-muted/50">
                  <h3 className="text-sm font-medium mb-1 text-foreground">Risks by Department</h3>
                  <p className="text-xs mb-3 text-muted-foreground">Open risks grouped by department</p>
                  <div className="max-h-56 overflow-y-auto">
                    <div className="min-h-[176px]" style={{ height: Math.max(176, departmentData.length * 32) }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={departmentData} layout="vertical" margin={{ left: 0 }}>
                          <XAxis type="number" hide />
                          <YAxis 
                            type="category" 
                            dataKey="name" 
                            width={130} 
                            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
                            axisLine={false} 
                            tickLine={false} 
                          />
                          <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                          <Bar 
                            dataKey="value" 
                            fill={CHART_COLORS.bronze} 
                            radius={[0, 4, 4, 0]} 
                            className="cursor-pointer"
                            onClick={(data: any) => handleDepartmentClick(data.name)}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Top Business Owners by Risk */}
                <div className="rounded-xl p-4 border border-border bg-muted/50">
                  <h3 className="text-sm font-medium mb-1 text-foreground">Top Business Owners by Risk</h3>
                  <p className="text-xs mb-3 text-muted-foreground">Open risks per business owner (top 5)</p>
                  <div className="max-h-56 overflow-y-auto space-y-2">
                    {topBusinessOwners.length > 0 ? (
                      topBusinessOwners.map((item, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleOwnerClick(item.owner)}
                          className="flex items-center justify-between py-2 px-3 rounded-lg bg-card w-full text-left hover:bg-muted transition-colors cursor-pointer"
                        >
                          <div>
                            <p className="text-sm font-medium text-foreground">{item.owner}</p>
                            <p className="text-xs text-muted-foreground">{item.unit}</p>
                          </div>
                          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-brand-gold/20 text-brand-gold">
                            {item.openRisks}
                          </span>
                        </button>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground py-4 text-center">No owners with open risks</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'roam' && (
            <div className="grid grid-cols-4 gap-4">
              {[
                { key: 'resolved' as const, label: 'Resolved', color: CHART_COLORS.olive, icon: Check },
                { key: 'owned' as const, label: 'Owned', color: CHART_COLORS.gold, icon: Circle },
                { key: 'accepted' as const, label: 'Accepted', color: CHART_COLORS.champagne, icon: Circle },
                { key: 'mitigated' as const, label: 'Mitigated', color: CHART_COLORS.bronze, icon: Diamond },
              ].map(({ key, label, color, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => handleRoamClick(key, label)}
                  className="rounded-xl p-5 border text-left transition-all hover:shadow-lg hover:scale-[1.02] group"
                  style={{ 
                    borderColor: `${color}40`, 
                    background: `linear-gradient(135deg, ${color}10 0%, ${color}20 100%)` 
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <Icon className="w-6 h-6" style={{ color }} />
                    <span 
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: `${color}30`, color }}
                    >
                      {roamSummary[key].filter(r => r.critical_path === 'Yes').length} critical
                    </span>
                  </div>
                  <p className="text-sm font-medium mb-1 text-foreground">{label}</p>
                  <p className="text-3xl font-bold mb-2" style={{ color }}>{roamSummary[key].length}</p>
                  <p className="text-xs text-muted-foreground">
                    {allRisks.length > 0 
                      ? ((roamSummary[key].length / allRisks.length) * 100).toFixed(0) 
                      : 0}% of total • Click to drill down
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search risks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 pl-12 pr-4 rounded-xl"
            />
          </div>
        </div>

        {/* Risk Register Table */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted">
                <th className="w-10 px-4 py-3 text-left">
                  <Star className="w-4 h-4 text-muted-foreground" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">ROAM</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Level</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Occ</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Imp</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Critical</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                <th className="w-10 px-4 py-3">
                  <Checkbox 
                    checked={selectedRiskIds.length === displayedRisks.length && displayedRisks.length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedRiskIds(displayedRisks.map(r => r.id));
                      } else {
                        setSelectedRiskIds([]);
                      }
                    }}
                  />
                </th>
              </tr>
            </thead>
            <tbody>
              {displayedRisks.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-muted-foreground">
                    No risks found. Try adjusting your filters or create a new risk.
                  </td>
                </tr>
              ) : (
                displayedRisks.map((risk) => (
                  <tr 
                    key={risk.id}
                    className="border-t border-border hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedRisk(risk)}
                  >
                    <td className="px-4 py-3">
                      <button className="text-muted-foreground hover:text-brand-gold">
                        <Star className="w-4 h-4" />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground">
                      {String(risk.risk_number).padStart(3, '0')}
                    </td>
                    <td className="px-4 py-3">
                      <RoamBadge status={risk.resolution_method} />
                    </td>
                    <td className="px-4 py-3 text-sm max-w-xs truncate text-foreground">{risk.title}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{risk.relationship || 'Enterprise'}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{risk.occurrence || '-'}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{risk.impact || '-'}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{risk.critical_path === 'Yes' ? 'Yes' : '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                        risk.status === 'Open' 
                          ? 'bg-brand-gold/20 text-brand-gold' 
                          : 'bg-palette-expert/20 text-palette-expert'
                      }`}>
                        {risk.status}
                      </span>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox 
                        checked={selectedRiskIds.includes(risk.id)}
                        onCheckedChange={() => toggleRiskSelection(risk.id)}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          
          {hasMore && (
            <div className="p-4 border-t border-border text-center">
              <button 
                className="text-sm font-medium px-4 py-2 rounded-lg hover:bg-muted text-brand-gold"
                onClick={() => setVisibleCount(prev => prev + ITEMS_PER_PAGE)}
              >
                Load more ({filteredRisks.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Panels and Dialogs */}
      {selectedRisk && (
        <RiskDrawer
          risk={selectedRisk}
          isOpen={!!selectedRisk}
          onClose={() => setSelectedRisk(null)}
          onUpdate={(updates) => updateRisk({ id: selectedRisk.id, ...updates })}
        />
      )}

      <CreateEditRiskPanel
        risk={editingRisk}
        isOpen={isCreateEditOpen}
        onClose={() => {
          setIsCreateEditOpen(false);
          setEditingRisk(null);
        }}
        onSave={handleCreateEditSave}
        isSubmitting={isCreating || isUpdating}
      />

      <DeleteRiskDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        riskTitle={riskToDelete?.title || ''}
      />

      <RiskFiltersDialog
        isOpen={isFiltersDialogOpen}
        onClose={() => setIsFiltersDialogOpen(false)}
        filters={filters}
        onFiltersChange={setFilters}
      />

      {/* Unified Drill-Down Drawer */}
      <RiskDrillDownDrawer
        mode={drillDownMode}
        allRisks={allRisks}
        onClose={() => setDrillDownMode(null)}
        onRiskClick={(risk) => {
          setDrillDownMode(null);
          setSelectedRisk(risk);
        }}
      />
    </div>
  );
}
