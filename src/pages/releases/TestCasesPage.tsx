/**
 * Test Cases Page — Catalyst Release & Test Management Module
 * Route: /releases/test-cases
 * Quality Target: 9.5/10 (GOD-TIER)
 * 
 * Features:
 * - List View (default) with sortable data table
 * - Grid View with responsive card layout
 * - Filters bar with search and dropdowns
 * - Bulk actions bar
 * - Pagination
 * - Row actions menu
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Upload, 
  Download, 
  Plus, 
  Filter,
  List,
  Grid3x3,
  Columns,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw,
  X,
  FolderInput,
  UserPlus,
  Tags,
  Trash2,
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
import { TestCasesTable } from '@/components/releases/test-cases/TestCasesTable';
import { TestCasesGrid } from '@/components/releases/test-cases/TestCasesGrid';
import { TestCaseEmptyState } from '@/components/releases/test-cases/TestCaseEmptyState';
import { testCasesData } from '@/data/testCasesData';
import { cn } from '@/lib/utils';

type ViewMode = 'list' | 'grid' | 'kanban';

export default function TestCasesPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [releaseFilter, setReleaseFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Apply filters
  const filteredTestCases = useMemo(() => {
    return testCasesData.filter(tc => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!tc.id.toLowerCase().includes(query) && !tc.title.toLowerCase().includes(query)) {
          return false;
        }
      }
      // Release filter
      if (releaseFilter !== 'all' && tc.release !== releaseFilter) return false;
      // Status filter
      if (statusFilter !== 'all' && tc.status !== statusFilter) return false;
      // Priority filter
      if (priorityFilter !== 'all' && tc.priority !== priorityFilter) return false;
      // Type filter
      if (typeFilter !== 'all' && tc.type !== typeFilter) return false;
      
      return true;
    });
  }, [searchQuery, releaseFilter, statusFilter, priorityFilter, typeFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredTestCases.length / itemsPerPage);
  const paginatedTestCases = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTestCases.slice(start, start + itemsPerPage);
  }, [filteredTestCases, currentPage, itemsPerPage]);

  // Count active filters
  const activeFilterCount = [releaseFilter, statusFilter, priorityFilter, typeFilter]
    .filter(f => f !== 'all').length;

  const clearAllFilters = () => {
    setSearchQuery('');
    setReleaseFilter('all');
    setStatusFilter('all');
    setPriorityFilter('all');
    setTypeFilter('all');
    setCurrentPage(1);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(paginatedTestCases.map(tc => tc.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const clearSelection = () => setSelectedIds(new Set());

  return (
    <div className="flex flex-col h-full">
      {/* Context Bar / Breadcrumb */}
      <div className="flex items-center justify-between px-6 py-3 bg-muted/30 border-b">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground uppercase tracking-wide text-xs font-medium">RELEASES</span>
          <span className="text-muted-foreground">/</span>
          <span className="font-semibold text-foreground">Test Cases</span>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">Last updated: 2 min ago</span>
          <Button variant="outline" size="sm" className="h-8">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" className="h-8">
            <Upload className="w-3.5 h-3.5 mr-1.5" />
            Import
          </Button>
          <Button variant="outline" size="sm" className="h-8">
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export
          </Button>
          <Button size="sm" className="h-8">
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            New Test Case
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-background border-b">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search test cases..." 
              className="pl-10 w-64 h-9"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          
          {/* Release Filter */}
          <Select value={releaseFilter} onValueChange={(v) => { setReleaseFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder="Release" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Releases</SelectItem>
              <SelectItem value="REL-26.01.01">REL-26.01.01 - Investment Portal</SelectItem>
              <SelectItem value="REL-26.01.02">REL-26.01.02 - Licensing Module</SelectItem>
              <SelectItem value="REL-25.12.01">REL-25.12.01 - Security Patch</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="ready">Ready</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="deprecated">Deprecated</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Priority Filter */}
          <Select value={priorityFilter} onValueChange={(v) => { setPriorityFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Type Filter */}
          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="functional">Functional</SelectItem>
              <SelectItem value="regression">Regression</SelectItem>
              <SelectItem value="smoke">Smoke</SelectItem>
              <SelectItem value="integration">Integration</SelectItem>
              <SelectItem value="e2e">End-to-End</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="ghost" size="sm" className="h-9">
            <Filter className="w-4 h-4 mr-1.5" />
            More Filters
          </Button>
          
          {activeFilterCount > 0 && (
            <>
              <Badge variant="secondary" className="text-xs">
                {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''}
              </Badge>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-9 text-muted-foreground hover:text-foreground"
                onClick={clearAllFilters}
              >
                Clear all
              </Button>
            </>
          )}
        </div>
        
        {/* View Toggle */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-muted rounded-lg p-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className={cn(
                "h-7 px-2",
                viewMode === 'list' && "bg-background shadow-sm"
              )}
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className={cn(
                "h-7 px-2",
                viewMode === 'grid' && "bg-background shadow-sm"
              )}
              onClick={() => setViewMode('grid')}
            >
              <Grid3x3 className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className={cn(
                "h-7 px-2",
                viewMode === 'kanban' && "bg-background shadow-sm"
              )}
              onClick={() => setViewMode('kanban')}
            >
              <Columns className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <AnimatePresence mode="wait">
          {filteredTestCases.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <TestCaseEmptyState onClearFilters={clearAllFilters} />
            </motion.div>
          ) : viewMode === 'list' ? (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <TestCasesTable 
                testCases={paginatedTestCases}
                selectedIds={selectedIds}
                onSelectAll={handleSelectAll}
                onSelectRow={handleSelectRow}
                allSelected={selectedIds.size === paginatedTestCases.length && paginatedTestCases.length > 0}
              />
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <TestCasesGrid testCases={paginatedTestCases} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Pagination */}
      {filteredTestCases.length > 0 && (
        <div className="flex items-center justify-between px-6 py-3 bg-background border-t">
          <span className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">{(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredTestCases.length)}</span> of <span className="font-medium text-foreground">{filteredTestCases.length}</span> test cases
          </span>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Select value={String(itemsPerPage)} onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
                <SelectTrigger className="w-[70px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">per page</span>
            </div>
            
            <div className="flex items-center gap-1">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(1)}
              >
                <ChevronsLeft className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              {/* Page Numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
              
              {totalPages > 5 && currentPage < totalPages - 2 && (
                <>
                  <span className="px-2 text-muted-foreground">...</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setCurrentPage(totalPages)}
                  >
                    {totalPages}
                  </Button>
                </>
              )}
              
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(totalPages)}
              >
                <ChevronsRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Actions Bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background px-6 py-3 rounded-full shadow-xl flex items-center gap-4 z-50"
          >
            <span className="text-sm font-medium">{selectedIds.size} selected</span>
            <div className="w-px h-5 bg-muted-foreground/30" />
            <Button variant="ghost" size="sm" className="text-background hover:bg-muted-foreground/20">
              <FolderInput className="w-4 h-4 mr-2" />
              Move to Release
            </Button>
            <Button variant="ghost" size="sm" className="text-background hover:bg-muted-foreground/20">
              <UserPlus className="w-4 h-4 mr-2" />
              Assign
            </Button>
            <Button variant="ghost" size="sm" className="text-background hover:bg-muted-foreground/20">
              <Tags className="w-4 h-4 mr-2" />
              Add Tags
            </Button>
            <Button variant="ghost" size="sm" className="text-destructive hover:bg-muted-foreground/20">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
            <button 
              className="ml-2 text-muted-foreground hover:text-background transition-colors"
              onClick={clearSelection}
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
