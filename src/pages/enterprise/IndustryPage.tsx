import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Search, Pencil, Upload, Download, GripVertical, ChevronLeft, ChevronRight } from 'lucide-react';
import { useBusinessRequests, useUpdateBusinessRequest } from '@/hooks/useBusinessRequests';
import { CreateBusinessRequestModal } from '@/components/business-requests/CreateBusinessRequestModal';
import { BusinessRequestDrawer } from '@/components/business-requests/BusinessRequestDrawer';
import { PROCESS_STEPS } from '@/types/business-request';
import { exportToCSV } from '@/lib/exportUtils';
import { useToast } from '@/hooks/use-toast';
import { ColumnsDropdown, ColumnConfig } from '@/components/backlog/ColumnsDropdown';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

// Default columns configuration per screenshot
const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'request_key', label: 'Request ID', visible: true, default: true },
  { id: 'rank', label: 'Rank', visible: true, default: true },
  { id: 'title', label: 'Summary', visible: true, default: true },
  { id: 'process_step', label: 'Process Step', visible: true, default: true },
  { id: 'business_score', label: 'Business Score', visible: true, default: true },
  { id: 'planned_quarter', label: 'Planned Quarter', visible: true, default: true },
  { id: 'end_date', label: 'Target Completion', visible: true, default: true },
];

const ITEMS_PER_PAGE = 20;

export default function IndustryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [columns, setColumns] = useState<ColumnConfig[]>(DEFAULT_COLUMNS);
  const [sortedRequests, setSortedRequests] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();

  const { data: requests, isLoading } = useBusinessRequests(searchQuery);
  const updateRequest = useUpdateBusinessRequest();

  // Sort requests by rank or business_score
  useEffect(() => {
    if (requests && requests.length > 0) {
      const sorted = [...requests].sort((a: any, b: any) => {
        // If both have explicit ranks, sort by rank
        if (a.rank !== null && b.rank !== null) {
          return a.rank - b.rank;
        }
        // Otherwise sort by business_score descending
        return (b.business_score || 0) - (a.business_score || 0);
      });
      // Assign sequential ranks to ensure no duplicates
      const withRanks = sorted.map((req, idx) => ({
        ...req,
        rank: req.rank ?? idx + 1
      }));
      setSortedRequests(withRanks);
    } else {
      setSortedRequests([]);
    }
  }, [requests]);

  // Pagination calculations
  const totalPages = Math.ceil(sortedRequests.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedRequests = sortedRequests.slice(startIndex, endIndex);

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

  const handleExport = () => {
    if (requests && requests.length > 0) {
      exportToCSV(requests, 'industry-requests', ['request_key', 'title', 'process_step', 'planned_quarter', 'end_date']);
      toast({ title: 'Requests exported successfully' });
    }
  };

  const isColumnVisible = (columnId: string) => {
    return columns.find(c => c.id === columnId)?.visible ?? false;
  };

  // Calculate deserved rank based on business score (higher score = lower rank number = better position)
  const getDeservedRank = (businessScore: number | null | undefined, allRequests: any[]) => {
    if (businessScore === null || businessScore === undefined) return allRequests.length;
    
    // Sort by business score descending to find position
    const sortedByScore = [...allRequests].sort((a, b) => 
      (b.business_score || 0) - (a.business_score || 0)
    );
    
    const position = sortedByScore.findIndex(r => (r.business_score || 0) <= businessScore);
    return position === -1 ? allRequests.length : position + 1;
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    
    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;
    
    if (sourceIndex === destIndex) return;

    // Calculate actual indices in the full list (accounting for pagination)
    const actualSourceIndex = startIndex + sourceIndex;
    const actualDestIndex = startIndex + destIndex;

    const reordered = Array.from(sortedRequests);
    const [movedItem] = reordered.splice(actualSourceIndex, 1);
    reordered.splice(actualDestIndex, 0, movedItem);

    const oldRank = movedItem.rank || actualSourceIndex + 1;
    const newRank = actualDestIndex + 1;
    const businessScore = movedItem.business_score;
    const deservedRank = getDeservedRank(businessScore, sortedRequests);

    // Update ALL ranks sequentially - no duplicates allowed
    const updatedRequests = reordered.map((req, index) => ({
      ...req,
      rank: index + 1
    }));

    setSortedRequests(updatedRequests);

    // Update all affected items in database
    const affectedItems = updatedRequests.filter((req, idx) => {
      const original = sortedRequests.find(r => r.id === req.id);
      return original?.rank !== idx + 1;
    });

    // Batch update ranks in database
    for (const item of affectedItems) {
      await updateRequest.mutateAsync({
        id: item.id,
        data: { rank: item.rank }
      });
    }

    // Only show warning if moving to a BETTER position than business score deserves
    // (newRank < deservedRank means moving UP to a better position than deserved)
    const isMovingAboveDeserved = newRank < deservedRank;
    
    if (isMovingAboveDeserved) {
      toast({
        title: '⚠️ Rank Override Warning',
        description: `Rank updated from ${oldRank} to ${newRank}. Business Score: ${businessScore ?? 'N/A'} (deserved position: ${deservedRank}). This manual adjustment overrides the automated prioritization.`,
        variant: 'destructive',
        duration: 4000,
      });
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

      {/* Search & Toolbar on same line */}
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

        {/* Toolbar - right aligned with pagination */}
        <div className="flex items-center gap-2">
          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1 border-r pr-3 border-border">
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

      {/* Card List with Drag & Drop */}
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : sortedRequests.length > 0 ? (
          <Card className="overflow-hidden">
            {/* Column Headers */}
            <div className="flex items-center gap-4 px-4 py-2 bg-muted/50 border-b text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <div className="w-5" /> {/* Drag handle space */}
              <div className="w-5" /> {/* Checkbox space */}
              {isColumnVisible('request_key') && <div className="w-24 shrink-0">Request ID</div>}
              {isColumnVisible('rank') && <div className="w-12 shrink-0 text-center">Rank</div>}
              {isColumnVisible('title') && <div className="flex-1 min-w-0">Summary</div>}
              {isColumnVisible('process_step') && <div className="w-36 shrink-0">Process Step</div>}
              {isColumnVisible('business_score') && <div className="w-24 shrink-0 text-center">Score</div>}
              {isColumnVisible('planned_quarter') && <div className="w-20 shrink-0">Quarter</div>}
              {isColumnVisible('end_date') && <div className="w-24 shrink-0">Target Date</div>}
            </div>

            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="requests">
                {(provided) => (
                  <div 
                    {...provided.droppableProps} 
                    ref={provided.innerRef}
                  >
                    {paginatedRequests.map((request: any, index: number) => (
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
                            {/* Drag Handle */}
                            <div
                              {...provided.dragHandleProps}
                              className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <GripVertical className="h-4 w-4" />
                            </div>
                            
                            {/* Checkbox */}
                            <div onClick={(e) => e.stopPropagation()}>
                              <Checkbox 
                                checked={selectedRows.includes(request.id)}
                                onCheckedChange={() => toggleRowSelection(request.id)}
                                className="h-4 w-4"
                              />
                            </div>

                            {/* Request ID */}
                            {isColumnVisible('request_key') && (
                              <div className="w-24 shrink-0">
                                <span className="text-sm text-brand-gold">{request.request_key || '-'}</span>
                              </div>
                            )}

                            {/* Rank */}
                            {isColumnVisible('rank') && (
                              <div className="w-12 shrink-0 text-center">
                                <span className="text-sm text-foreground">{request.rank || startIndex + index + 1}</span>
                              </div>
                            )}

                            {/* Summary */}
                            {isColumnVisible('title') && (
                              <div className="flex-1 min-w-0">
                                <span className="text-sm text-foreground truncate block">{request.title}</span>
                              </div>
                            )}

                            {/* Process Step */}
                            {isColumnVisible('process_step') && (
                              <div className="w-36 shrink-0">
                                {getStatusBadge(request.process_step)}
                              </div>
                            )}

                            {/* Business Score */}
                            {isColumnVisible('business_score') && (
                              <div className="w-24 shrink-0 text-center">
                                {getBusinessScoreBadge(request.business_score)}
                              </div>
                            )}

                            {/* Planned Quarter */}
                            {isColumnVisible('planned_quarter') && (
                              <div className="w-20 shrink-0 text-sm text-muted-foreground">
                                {request.planned_quarter || '-'}
                              </div>
                            )}

                            {/* Target Completion */}
                            {isColumnVisible('end_date') && (
                              <div className="w-24 shrink-0 text-sm text-muted-foreground">
                                {formatDate(request.end_date)}
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>

            {/* Bottom pagination info */}
            {totalPages > 1 && (
              <div className="px-4 py-2 bg-muted/30 border-t text-xs text-muted-foreground">
                Showing {startIndex + 1}-{Math.min(endIndex, sortedRequests.length)} of {sortedRequests.length} requests
              </div>
            )}
          </Card>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No industry requests found
          </div>
        )}
      </div>

      {/* Create Modal */}
      <CreateBusinessRequestModal 
        isOpen={createModalOpen} 
        onClose={() => setCreateModalOpen(false)} 
      />

      {/* View/Edit Drawer */}
      <BusinessRequestDrawer
        isOpen={!!selectedRequestId}
        onClose={() => setSelectedRequestId(null)}
        requestId={selectedRequestId}
      />
    </div>
  );
}
