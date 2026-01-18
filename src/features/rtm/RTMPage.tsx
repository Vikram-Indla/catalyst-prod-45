import { useEffect } from 'react';
import { Download, AlertTriangle, Link, Search, LayoutGrid, List, GitBranch, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRTMStore } from './hooks/useRTMStore';
import { useRTMData } from './hooks/useRTMData';
import { RTMMetricsRow } from './components/RTMMetricsRow';
import { RTMTree } from './components/RTMTree';
import { RTMTable } from './components/RTMTable';
import { RTMDetailPanel } from './components/RTMDetailPanel';
import { exportTraceabilityMatrix } from '@/modules/test-management/utils/exportTraceabilityMatrix';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useNavigation } from '@/contexts/NavigationContext';

const RTMPage = () => {
  const { selectedProjectId } = useNavigation();
  const {
    metrics, tree, tableData, selectedRequirement, isDetailPanelOpen, viewMode, sorting, filters, selectedTreeNodeId, isLoading,
    setData, setLoading, toggleTreeNode, selectTreeNode, expandAll, collapseAll, setSorting, setSearchQuery, setViewMode, selectTableRow, closeDetailPanel,
  } = useRTMStore();

  // Fetch real data from Supabase
  const { data: rtmData, isLoading: dataLoading } = useRTMData(selectedProjectId);

  // Sync data to store when it changes
  useEffect(() => {
    setLoading(dataLoading);
    if (rtmData) {
      setData(rtmData.metrics, rtmData.tree, rtmData.tableData);
    }
  }, [rtmData, dataLoading, setData, setLoading]);

  const handleExport = () => {
    try {
      const requirements = tableData.map(r => ({ id: r.id, requirement_key: r.key, title: r.title, priority: r.priority, status: r.coverageStatus }));
      const testCases = tableData.flatMap(r => r.linkedTests.map(t => ({ id: t.testCaseId, case_key: t.testCaseKey, title: t.testCaseTitle })));
      const links = tableData.flatMap(r => r.linkedTests.map(t => ({ requirement_id: r.id, test_case_id: t.testCaseId })));
      exportTraceabilityMatrix(requirements, testCases, links, 'Release 9.8');
      toast.success('RTM exported successfully');
    } catch { toast.error('Export failed'); }
  };

  if (isLoading || !metrics) {
    return <div className="flex items-center justify-center h-full"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Page Header */}
      <div className="p-6 border-b border-border bg-card space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Requirement Traceability Matrix</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Track test coverage across requirements</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}><Download className="w-4 h-4 mr-1.5" />Export</Button>
            <Button variant="outline" size="sm"><AlertTriangle className="w-4 h-4 mr-1.5" />Gap Analysis</Button>
            <Button size="sm"><Link className="w-4 h-4 mr-1.5" />Link Tests</Button>
          </div>
        </div>

        <RTMMetricsRow metrics={metrics} />

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search requirements... ⌘K" className="pl-9 h-9" value={filters.searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
          
          <Button variant="outline" size="sm" className="gap-2">Release <ChevronDown className="w-3 h-3" /></Button>
          <Button variant="outline" size="sm" className="gap-2">Type <ChevronDown className="w-3 h-3" /></Button>
          <Button variant="outline" size="sm" className="gap-2">Coverage <ChevronDown className="w-3 h-3" /></Button>
          
          <div className="ml-auto flex bg-muted rounded-lg p-0.5">
            {[{ mode: 'matrix' as const, icon: LayoutGrid }, { mode: 'list' as const, icon: List }, { mode: 'tree' as const, icon: GitBranch }].map(v => (
              <button key={v.mode} onClick={() => setViewMode(v.mode)} className={cn("p-1.5 rounded transition-colors", viewMode === v.mode ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                <v.icon className="w-4 h-4" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {viewMode === 'matrix' && <RTMTree tree={tree} onToggle={toggleTreeNode} onSelect={selectTreeNode} onExpandAll={expandAll} onCollapseAll={collapseAll} />}
        <RTMTable data={tableData} sorting={sorting} onSort={setSorting} onRowClick={selectTableRow} selectedId={selectedTreeNodeId} />
        <RTMDetailPanel requirement={selectedRequirement} isOpen={isDetailPanelOpen} onClose={closeDetailPanel} />
      </div>
    </div>
  );
};

export default RTMPage;
