import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Download, Search, LayoutGrid, List, Calendar, 
  Layers 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { CycleCard } from '@/components/releases/test-cycles/CycleCard';
import { CycleStatsBar } from '@/components/releases/test-cycles/CycleStatsBar';
import { CycleTableView } from '@/components/releases/test-cycles/CycleTableView';
import { CycleCalendarView } from '@/components/releases/test-cycles/CycleCalendarView';
import { CreateCycleModal, CreateCycleData } from '@/components/releases/test-cycles/CreateCycleModal';
import { 
  testCycles as initialCycles, 
  releaseOptions, 
  statusOptions, 
  environmentOptions,
  TestCycle 
} from '@/data/testCyclesData';

type ViewMode = 'card' | 'list' | 'calendar';

export default function TestCyclesPage() {
  const navigate = useNavigate();
  
  // Data
  const [cycles, setCycles] = useState<TestCycle[]>(initialCycles);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [releaseFilter, setReleaseFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [envFilter, setEnvFilter] = useState('all');
  
  // View
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  
  // Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // Filtered cycles
  const filteredCycles = useMemo(() => {
    return cycles.filter(cycle => {
      if (searchQuery && !cycle.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
          !cycle.id.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (releaseFilter !== 'all' && cycle.releaseId !== releaseFilter) return false;
      if (statusFilter !== 'all' && cycle.status !== statusFilter) return false;
      if (envFilter !== 'all' && cycle.environment !== envFilter) return false;
      return true;
    });
  }, [cycles, searchQuery, releaseFilter, statusFilter, envFilter]);
  
  // Grouped by status (for card view)
  const groupedCycles = useMemo(() => ({
    in_progress: filteredCycles.filter(c => c.status === 'in_progress'),
    planned: filteredCycles.filter(c => c.status === 'planned'),
    completed: filteredCycles.filter(c => c.status === 'completed'),
    aborted: filteredCycles.filter(c => c.status === 'aborted')
  }), [filteredCycles]);

  // Stats
  const stats = useMemo(() => {
    const inProgress = cycles.filter(c => c.status === 'in_progress').length;
    const completed = cycles.filter(c => c.status === 'completed').length;
    
    const totalPassed = cycles.reduce((acc, c) => acc + c.passedTests, 0);
    const totalFailed = cycles.reduce((acc, c) => acc + c.failedTests, 0);
    const passRate = totalPassed + totalFailed > 0 
      ? Math.round((totalPassed / (totalPassed + totalFailed)) * 100) 
      : 0;
    
    return {
      total: cycles.length,
      inProgress,
      completed,
      passRate,
      avgDuration: '4.2 hrs'
    };
  }, [cycles]);
  
  // Clear filters
  const clearFilters = () => {
    setSearchQuery('');
    setReleaseFilter('all');
    setStatusFilter('all');
    setEnvFilter('all');
  };
  
  // Handlers
  const handleCreateCycle = (data: CreateCycleData) => {
    const releaseName = releaseOptions.find(r => r.value === data.releaseId)?.label.split(' - ')[1] || '';
    const newCycle: TestCycle = {
      id: `CY-${Date.now().toString().slice(-8)}`,
      name: data.name,
      releaseId: data.releaseId,
      releaseName,
      environment: data.environment,
      status: 'planned',
      progress: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      pendingTests: 0,
      totalTests: 0,
      duration: '-',
      assignee: data.assignee,
      createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      updatedAt: 'Just now',
      startDate: data.startDate,
      endDate: data.endDate
    };
    setCycles([newCycle, ...cycles]);
    setIsCreateModalOpen(false);
    toast.success('Test cycle created');
  };
  
  const handleEditCycle = (cycle: TestCycle) => {
    toast.info(`Editing cycle ${cycle.id}`);
  };
  
  const handleDeleteCycle = (cycleId: string) => {
    setCycles(cycles.filter(c => c.id !== cycleId));
    toast.success('Test cycle deleted');
  };
  
  const handleDuplicateCycle = (cycle: TestCycle) => {
    const newCycle: TestCycle = {
      ...cycle,
      id: `CY-${Date.now().toString().slice(-8)}`,
      name: `${cycle.name} (Copy)`,
      status: 'planned',
      progress: 0,
      passedTests: 0,
      failedTests: 0,
      pendingTests: cycle.totalTests,
      updatedAt: 'Just now'
    };
    setCycles([newCycle, ...cycles]);
    toast.success('Test cycle duplicated');
  };

  const handleCycleClick = (cycle: TestCycle) => {
    navigate(`/releases/test-cycles/${cycle.id}`);
  };

  const handleExport = () => {
    toast.success('Exporting test cycles...');
  };

  return (
    <div className="p-6">
      {/* Breadcrumb & Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500 uppercase tracking-wide">RELEASES</span>
            <span className="text-gray-400">/</span>
            <span className="font-semibold text-gray-900">Test Cycles</span>
          </div>
        </div>
            
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button variant="default" size="sm" onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Cycle
              </Button>
            </div>
          </div>
          
          {/* Stats Bar */}
          <CycleStatsBar 
            totalCycles={stats.total}
            inProgressCount={stats.inProgress}
            completedCount={stats.completed}
            passRate={stats.passRate}
            avgDuration={stats.avgDuration}
          />
          
          {/* Filters Bar */}
          <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg mb-4">
            {/* Left: Filters */}
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input 
                  placeholder="Search cycles..." 
                  className="pl-10 w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              {/* Release Filter */}
              <Select value={releaseFilter} onValueChange={setReleaseFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Releases" />
                </SelectTrigger>
                <SelectContent>
                  {releaseOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Environment Filter */}
              <Select value={envFilter} onValueChange={setEnvFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Environments" />
                </SelectTrigger>
                <SelectContent>
                  {environmentOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {(searchQuery || releaseFilter !== 'all' || statusFilter !== 'all' || envFilter !== 'all') && (
                <Button variant="ghost" size="sm" className="text-gray-500" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
            </div>
            
            {/* Right: View Toggle */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={cn(viewMode === 'card' && "bg-white shadow-sm")}
                  onClick={() => setViewMode('card')}
                >
                  <LayoutGrid className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className={cn(viewMode === 'list' && "bg-white shadow-sm")}
                  onClick={() => setViewMode('list')}
                >
                  <List className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className={cn(viewMode === 'calendar' && "bg-white shadow-sm")}
                  onClick={() => setViewMode('calendar')}
                >
                  <Calendar className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
          
          {/* Content */}
          {filteredCycles.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Layers className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">No test cycles found</h3>
              <p className="text-gray-500 mb-4 max-w-sm">
                {searchQuery || releaseFilter !== 'all' || statusFilter !== 'all' || envFilter !== 'all'
                  ? "No cycles match your filters. Try adjusting your search criteria."
                  : "Get started by creating your first test cycle."}
              </p>
              <div className="flex items-center gap-3">
                {(searchQuery || releaseFilter !== 'all' || statusFilter !== 'all' || envFilter !== 'all') && (
                  <Button variant="outline" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                )}
                <Button variant="default" onClick={() => setIsCreateModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Cycle
                </Button>
              </div>
            </div>
          ) : viewMode === 'card' ? (
            /* Card View */
            <div className="space-y-8">
              {/* In Progress Section */}
              {groupedCycles.in_progress.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <h2 className="font-semibold text-gray-900">In Progress</h2>
                    <Badge variant="secondary">{groupedCycles.in_progress.length}</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {groupedCycles.in_progress.map(cycle => (
                      <CycleCard 
                        key={cycle.id} 
                        cycle={cycle} 
                        onEdit={handleEditCycle}
                        onDuplicate={handleDuplicateCycle}
                        onDelete={handleDeleteCycle}
                      />
                    ))}
                  </div>
                </div>
              )}
              
              {/* Planned Section */}
              {groupedCycles.planned.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                    <h2 className="font-semibold text-gray-900">Planned</h2>
                    <Badge variant="secondary">{groupedCycles.planned.length}</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {groupedCycles.planned.map(cycle => (
                      <CycleCard 
                        key={cycle.id} 
                        cycle={cycle}
                        onEdit={handleEditCycle}
                        onDuplicate={handleDuplicateCycle}
                        onDelete={handleDeleteCycle}
                      />
                    ))}
                  </div>
                </div>
              )}
              
              {/* Completed Section */}
              {groupedCycles.completed.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <h2 className="font-semibold text-gray-900">Completed</h2>
                    <Badge variant="secondary">{groupedCycles.completed.length}</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {groupedCycles.completed.map(cycle => (
                      <CycleCard 
                        key={cycle.id} 
                        cycle={cycle}
                        onEdit={handleEditCycle}
                        onDuplicate={handleDuplicateCycle}
                        onDelete={handleDeleteCycle}
                      />
                    ))}
                  </div>
                </div>
              )}
              
              {/* Aborted Section */}
              {groupedCycles.aborted.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <h2 className="font-semibold text-gray-900">Aborted</h2>
                    <Badge variant="secondary">{groupedCycles.aborted.length}</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {groupedCycles.aborted.map(cycle => (
                      <CycleCard 
                        key={cycle.id} 
                        cycle={cycle}
                        onEdit={handleEditCycle}
                        onDuplicate={handleDuplicateCycle}
                        onDelete={handleDeleteCycle}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : viewMode === 'list' ? (
            /* List View */
            <CycleTableView 
              cycles={filteredCycles}
              onEdit={handleEditCycle}
              onDuplicate={handleDuplicateCycle}
              onDelete={handleDeleteCycle}
            />
          ) : (
            /* Calendar View */
            <CycleCalendarView 
              cycles={filteredCycles}
              onCycleClick={handleCycleClick}
            />
          )}
      
      {/* Create Cycle Modal */}
      <CreateCycleModal 
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onCreateCycle={handleCreateCycle}
      />
    </div>
  );
}
