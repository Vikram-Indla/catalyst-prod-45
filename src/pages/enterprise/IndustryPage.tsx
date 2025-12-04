import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Search, Pencil, Upload, Download, GripVertical, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { useBusinessRequests, useUpdateBusinessRequest } from '@/hooks/useBusinessRequests';
import { CreateBusinessRequestModal } from '@/components/business-requests/CreateBusinessRequestModal';
import { BusinessRequestDrawer } from '@/components/business-requests/BusinessRequestDrawer';
import { RankUpdateNotification } from '@/components/business-requests/RankUpdateNotification';
import { SimpleColumnHeader, SortDirection } from '@/components/business-requests/SimpleColumnHeader';
import { PROCESS_STEPS } from '@/types/business-request';
import { exportToCSV } from '@/lib/exportUtils';
import { useToast } from '@/hooks/use-toast';
import { ColumnsDropdown, ColumnConfig } from '@/components/backlog/ColumnsDropdown';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { supabase } from '@/integrations/supabase/client';
import { useCatalystContext } from '@/contexts/CatalystContext';
import { useQueryClient } from '@tanstack/react-query';

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'request_key', label: 'Request ID', visible: true, default: true },
  { id: 'rank', label: 'Rank', visible: true, default: true },
  { id: 'title', label: 'Summary', visible: true, default: true },
  { id: 'process_step', label: 'Process Step', visible: true, default: true },
  { id: 'business_score', label: 'Business Score', visible: true, default: true },
  { id: 'planned_quarter', label: 'Planned Quarter', visible: true, default: true },
  { id: 'end_date', label: 'Target Completion', visible: true, default: true },
  { id: 'created_at', label: 'Created Date', visible: true, default: true },
];

const ITEMS_PER_PAGE = 20;

interface ColumnSort {
  columnId: string;
  direction: SortDirection;
}

export default function IndustryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [columns, setColumns] = useState<ColumnConfig[]>(DEFAULT_COLUMNS);
  const [sortedRequests, setSortedRequests] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [columnSort, setColumnSort] = useState<ColumnSort>({ columnId: 'rank', direction: 'asc' });
  const [notification, setNotification] = useState<{
    show: boolean;
    oldRank: number;
    newRank: number;
    score: number | null;
  }>({ show: false, oldRank: 0, newRank: 0, score: null });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Use context for filters with defensive defaults
  const { industryFilters } = useCatalystContext();
  const deliveryPlatforms = industryFilters?.deliveryPlatforms || [];
  const processSteps = industryFilters?.processSteps || [];
  const quarters = industryFilters?.quarters || [];

  const { data: requests, isLoading } = useBusinessRequests(searchQuery);
  const updateRequest = useUpdateBusinessRequest();

  // Apply sorting and filtering using context filters
  useEffect(() => {
    if (!requests || requests.length === 0) {
      setSortedRequests([]);
      return;
    }

    let filtered = [...requests];

    // Apply delivery platform filter from context
    if (deliveryPlatforms.length > 0) {
      filtered = filtered.filter((r: any) => deliveryPlatforms.includes(r.delivery_platform));
    }

    // Apply process steps filter from context
    if (processSteps.length > 0) {
      filtered = filtered.filter((r: any) => processSteps.includes(r.process_step));
    }

    // Apply quarters filter from context
    if (quarters.length > 0) {
      filtered = filtered.filter((r: any) => quarters.includes(r.planned_quarter));
    }

    // Apply sorting
    const sorted = [...filtered].sort((a: any, b: any) => {
      const { columnId, direction } = columnSort;
      if (!direction) return 0;

      let aVal: any, bVal: any;

      switch (columnId) {
        case 'rank':
          aVal = a.rank ?? 999;
          bVal = b.rank ?? 999;
          break;
        case 'business_score':
          aVal = a.business_score ?? 0;
          bVal = b.business_score ?? 0;
          break;
        case 'title':
          aVal = a.title?.toLowerCase() ?? '';
          bVal = b.title?.toLowerCase() ?? '';
          break;
        case 'request_key':
          aVal = a.request_key ?? '';
          bVal = b.request_key ?? '';
          break;
        case 'process_step':
          aVal = a.process_step ?? '';
          bVal = b.process_step ?? '';
          break;
        case 'planned_quarter':
          aVal = a.planned_quarter ?? '';
          bVal = b.planned_quarter ?? '';
          break;
        case 'end_date':
          aVal = a.end_date ? new Date(a.end_date).getTime() : 0;
          bVal = b.end_date ? new Date(b.end_date).getTime() : 0;
          break;
        case 'created_at':
          aVal = a.created_at ? new Date(a.created_at).getTime() : 0;
          bVal = b.created_at ? new Date(b.created_at).getTime() : 0;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    const withRanks = sorted.map((req, idx) => ({
      ...req,
      rank: req.rank ?? idx + 1
    }));

    setSortedRequests(withRanks);
  }, [requests, columnSort, deliveryPlatforms, processSteps, quarters]);

  // Pagination calculations
  const totalPages = Math.ceil(sortedRequests.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedRequests = sortedRequests.slice(startIndex, endIndex);

  const handleSort = (columnId: string) => {
    setColumnSort(prev => ({
      columnId,
      direction: prev.columnId === columnId
        ? prev.direction === 'asc' ? 'desc' : prev.direction === 'desc' ? null : 'asc'
        : 'asc'
    }));
  };

  const getStatusBadge = (status: string) => {
    const step = PROCESS_STEPS.find(s => s.value === status);
    if (!step) return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">{status}</span>;
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${step.color}`}>
        {step.label}
      </span>
    );
  };

  const getBusinessScoreBadge = (score: number | null | undefined) => {
    if (score === null || score === undefined) return <span className="text-muted-foreground text-xs">-</span>;
    let colorClass = 'bg-destructive/10 text-destructive';
    if (score >= 90) colorClass = 'bg-green-100 text-green-700';
    else if (score >= 75) colorClass = 'bg-emerald-100 text-emerald-700';
    else if (score >= 60) colorClass = 'bg-amber-100 text-amber-700';
    else if (score >= 40) colorClass = 'bg-orange-100 text-orange-700';
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
        {score}
      </span>
    );
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return `${date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const handleExport = () => {
    if (requests && requests.length > 0) {
      exportToCSV(requests, 'industry-requests', ['request_key', 'title', 'process_step', 'planned_quarter', 'end_date', 'created_at']);
      toast({ title: 'Requests exported successfully' });
    }
  };

  const isColumnVisible = (columnId: string) => {
    return columns.find(c => c.id === columnId)?.visible ?? false;
  };

  const getDeservedRank = (businessScore: number | null | undefined, allRequests: any[]) => {
    if (businessScore === null || businessScore === undefined) return allRequests.length;
    const sortedByScore = [...allRequests].sort((a, b) => (b.business_score || 0) - (a.business_score || 0));
    const position = sortedByScore.findIndex(r => (r.business_score || 0) <= businessScore);
    return position === -1 ? allRequests.length : position + 1;
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    
    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;
    
    if (sourceIndex === destIndex) return;

    const actualSourceIndex = startIndex + sourceIndex;
    const actualDestIndex = startIndex + destIndex;

    const reordered = Array.from(sortedRequests);
    const [movedItem] = reordered.splice(actualSourceIndex, 1);
    reordered.splice(actualDestIndex, 0, movedItem);

    const oldRank = movedItem.rank || actualSourceIndex + 1;
    const newRank = actualDestIndex + 1;
    const businessScore = movedItem.business_score;
    const deservedRank = getDeservedRank(businessScore, sortedRequests);

    const updatedRequests = reordered.map((req, index) => ({
      ...req,
      rank: index + 1
    }));

    setSortedRequests(updatedRequests);

    const affectedItems = updatedRequests.filter((req, idx) => {
      const original = sortedRequests.find(r => r.id === req.id);
      return original?.rank !== idx + 1;
    });

    try {
      await Promise.all(
        affectedItems.map(item =>
          supabase
            .from('business_requests')
            .update({ rank: item.rank })
            .eq('id', item.id)
        )
      );

      // Invalidate queries to refetch with persisted ranks
      await queryClient.invalidateQueries({ queryKey: ['business-requests'] });

      const isMovingAboveDeserved = newRank < deservedRank;
      
      if (isMovingAboveDeserved) {
        setNotification({
          show: true,
          oldRank,
          newRank,
          score: businessScore
        });
      }
    } catch (error) {
      console.error('Failed to update ranks:', error);
      // Revert local state on error by refetching
      queryClient.invalidateQueries({ queryKey: ['business-requests'] });
    }
  };

  const handleBulkEdit = () => {
    if (selectedRows.length === 0) {
      toast({ title: 'No items selected', description: 'Please select items to bulk edit', variant: 'destructive' });
      return;
    }
    toast({ title: 'Bulk Edit', description: `${selectedRows.length} items selected for editing` });
  };

  const toggleRowSelection = (id: string) => {
    setSelectedRows(prev => 
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const closeNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, show: false }));
  }, []);

  // Count active filters from context
  const activeFilterCount = 
    deliveryPlatforms.length +
    processSteps.length +
    quarters.length;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Industry</h1>
            <p className="text-sm text-muted-foreground">Industry-specific requests and initiatives</p>
          </div>
          <Button onClick={() => setCreateModalOpen(true)} className="bg-brand-gold text-white hover:bg-brand-gold-hover">
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </Button>
        </div>
      </div>

      {/* Search & Toolbar */}
      <div className="flex items-center justify-between gap-4 px-4 sm:px-6 py-3 border-b bg-card">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search industry requests..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="pl-9 bg-white border-border"
          />
        </div>

        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">
              {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} applied
            </span>
          )}

          {totalPages > 1 && (
            <div className="flex items-center gap-1 border-l border-r px-3 border-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-foreground px-2 whitespace-nowrap">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          <Button variant="outline" size="sm" onClick={handleBulkEdit} className="border-border">
            <Pencil className="h-4 w-4 mr-2" />
            Bulk Edit
          </Button>
          <Button variant="outline" size="sm" className="border-border">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <ColumnsDropdown columns={columns} onChange={setColumns} />
          <Button variant="outline" size="sm" onClick={handleExport} className="border-border">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Main Content with Side Panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Table Area */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 relative">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : sortedRequests.length > 0 ? (
            <Card className="overflow-hidden relative">
              <RankUpdateNotification
                show={notification.show}
                oldRank={notification.oldRank}
                newRank={notification.newRank}
                score={notification.score}
                onClose={closeNotification}
              />

              {/* Column Headers - Simple Sort Only */}
              <div className="flex items-center gap-4 px-4 py-2.5 bg-muted/50 border-b text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <div className="w-5" />
                <div className="w-5" />
                {isColumnVisible('request_key') && (
                  <div className="w-24 shrink-0">
                    <SimpleColumnHeader
                      label="Request ID"
                      columnId="request_key"
                      sortDirection={columnSort.columnId === 'request_key' ? columnSort.direction : null}
                      onSort={handleSort}
                    />
                  </div>
                )}
                {isColumnVisible('rank') && (
                  <div className="w-12 shrink-0 text-center">
                    <SimpleColumnHeader
                      label="Rank"
                      columnId="rank"
                      sortDirection={columnSort.columnId === 'rank' ? columnSort.direction : null}
                      onSort={handleSort}
                    />
                  </div>
                )}
                {isColumnVisible('title') && (
                  <div className="flex-1 min-w-0">
                    <SimpleColumnHeader
                      label="Summary"
                      columnId="title"
                      sortDirection={columnSort.columnId === 'title' ? columnSort.direction : null}
                      onSort={handleSort}
                    />
                  </div>
                )}
                {isColumnVisible('process_step') && (
                  <div className="w-36 shrink-0">
                    <SimpleColumnHeader
                      label="Process Step"
                      columnId="process_step"
                      sortDirection={columnSort.columnId === 'process_step' ? columnSort.direction : null}
                      onSort={handleSort}
                    />
                  </div>
                )}
                {isColumnVisible('business_score') && (
                  <div className="w-24 shrink-0 text-center">
                    <SimpleColumnHeader
                      label="Score"
                      columnId="business_score"
                      sortDirection={columnSort.columnId === 'business_score' ? columnSort.direction : null}
                      onSort={handleSort}
                    />
                  </div>
                )}
                {isColumnVisible('planned_quarter') && (
                  <div className="w-20 shrink-0">
                    <SimpleColumnHeader
                      label="Quarter"
                      columnId="planned_quarter"
                      sortDirection={columnSort.columnId === 'planned_quarter' ? columnSort.direction : null}
                      onSort={handleSort}
                    />
                  </div>
                )}
                {isColumnVisible('end_date') && (
                  <div className="w-24 shrink-0">
                    <SimpleColumnHeader
                      label="Target Date"
                      columnId="end_date"
                      sortDirection={columnSort.columnId === 'end_date' ? columnSort.direction : null}
                      onSort={handleSort}
                    />
                  </div>
                )}
                {isColumnVisible('created_at') && (
                  <div className="w-36 shrink-0">
                    <SimpleColumnHeader
                      label="Created Date"
                      columnId="created_at"
                      sortDirection={columnSort.columnId === 'created_at' ? columnSort.direction : null}
                      onSort={handleSort}
                    />
                  </div>
                )}
              </div>

              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="requests">
                  {(provided) => (
                    <div 
                      {...provided.droppableProps} 
                      ref={provided.innerRef}
                    >
                      {paginatedRequests.map((request: any, index: number) => {
                        return (
                          <Draggable key={request.id} draggableId={request.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`flex items-center gap-4 px-4 py-2.5 border-b last:border-b-0 cursor-pointer hover:bg-muted/30 transition-colors ${
                                  snapshot.isDragging ? 'bg-brand-gold/5 shadow-md ring-1 ring-brand-gold' : ''
                                } ${selectedRows.includes(request.id) ? 'bg-primary/5' : 'bg-card'}`}
                                onClick={() => setSelectedRequestId(request.id)}
                              >
                                <div
                                  {...provided.dragHandleProps}
                                  className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <GripVertical className="h-4 w-4" />
                                </div>
                                
                                <div onClick={(e) => e.stopPropagation()}>
                                  <Checkbox 
                                    checked={selectedRows.includes(request.id)}
                                    onCheckedChange={() => toggleRowSelection(request.id)}
                                    className="h-4 w-4"
                                  />
                                </div>

                                {isColumnVisible('request_key') && (
                                  <div className="w-24 shrink-0">
                                    <span className="text-sm text-brand-gold">{request.request_key || '-'}</span>
                                  </div>
                                )}

                                {isColumnVisible('rank') && (
                                  <div className="w-12 shrink-0 text-center">
                                    <span className="text-sm text-foreground inline-flex items-start gap-0.5">
                                      {(request.rank || startIndex + index + 1) <= 10 && (
                                        <Star 
                                          className="h-2 w-2 text-red-400 fill-red-400 -mt-0.5" 
                                          strokeWidth={1}
                                        />
                                      )}
                                      {request.rank || startIndex + index + 1}
                                    </span>
                                  </div>
                                )}

                                {isColumnVisible('title') && (
                                  <div className="flex-1 min-w-0">
                                    <span className="text-sm text-foreground truncate block">{request.title}</span>
                                  </div>
                                )}

                                {isColumnVisible('process_step') && (
                                  <div className="w-36 shrink-0">
                                    {getStatusBadge(request.process_step)}
                                  </div>
                                )}

                                {isColumnVisible('business_score') && (
                                  <div className="w-24 shrink-0 text-center">
                                    {getBusinessScoreBadge(request.business_score)}
                                  </div>
                                )}

                                {isColumnVisible('planned_quarter') && (
                                  <div className="w-20 shrink-0 text-sm text-muted-foreground">
                                    {request.planned_quarter || '-'}
                                  </div>
                                )}

                                {isColumnVisible('end_date') && (
                                  <div className="w-24 shrink-0 text-sm text-muted-foreground">
                                    {formatDate(request.end_date)}
                                  </div>
                                )}

                                {isColumnVisible('created_at') && (
                                  <div className="w-36 shrink-0 text-sm text-muted-foreground">
                                    {formatDateTime(request.created_at)}
                                  </div>
                                )}
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>

              {totalPages > 1 && (
                <div className="px-4 py-2 bg-muted/30 border-t text-xs text-muted-foreground">
                  Showing {startIndex + 1}-{Math.min(endIndex, sortedRequests.length)} of {sortedRequests.length} requests
                </div>
              )}
            </Card>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {activeFilterCount > 0 ? 'No requests match the current filters' : 'No industry requests found'}
            </div>
          )}
        </div>
      </div>

      <CreateBusinessRequestModal 
        isOpen={createModalOpen} 
        onClose={() => setCreateModalOpen(false)} 
      />

      <BusinessRequestDrawer
        isOpen={!!selectedRequestId}
        onClose={() => setSelectedRequestId(null)}
        requestId={selectedRequestId}
      />
    </div>
  );
}
