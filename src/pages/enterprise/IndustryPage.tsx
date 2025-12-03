import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Search, Pencil, Upload, Download, GripVertical } from 'lucide-react';
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

export default function IndustryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [columns, setColumns] = useState<ColumnConfig[]>(DEFAULT_COLUMNS);
  const [sortedRequests, setSortedRequests] = useState<any[]>([]);
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
      setSortedRequests(sorted);
    } else {
      setSortedRequests([]);
    }
  }, [requests]);

  const getStatusBadge = (status: string) => {
    const step = PROCESS_STEPS.find(s => s.value === status);
    if (!step) return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{status}</span>;
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${step.color}`}>
        {step.label}
      </span>
    );
  };

  const getBusinessScoreBadge = (score: number | null | undefined) => {
    if (score === null || score === undefined) return <span className="text-muted-foreground">-</span>;
    let colorClass = 'bg-red-100 text-red-600';
    if (score >= 90) colorClass = 'bg-green-100 text-green-600';
    else if (score >= 75) colorClass = 'bg-emerald-100 text-emerald-600';
    else if (score >= 60) colorClass = 'bg-amber-100 text-amber-600';
    else if (score >= 40) colorClass = 'bg-orange-100 text-orange-600';
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${colorClass}`}>
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

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;
    
    if (sourceIndex === destIndex) return;

    const reordered = Array.from(sortedRequests);
    const [removed] = reordered.splice(sourceIndex, 1);
    reordered.splice(destIndex, 0, removed);

    // Update ranks for all items
    const updatedRequests = reordered.map((req, index) => ({
      ...req,
      rank: index + 1
    }));

    setSortedRequests(updatedRequests);

    // Update the dragged item's rank in database
    const newRank = destIndex + 1;
    updateRequest.mutate({
      id: removed.id,
      data: { rank: newRank }
    });

    toast({
      title: 'Rank Forced Changed',
      description: `Request moved to rank ${newRank}. This overrides the business score ranking.`,
    });
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

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Industry</h1>
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

        {/* Toolbar - right aligned */}
        <div className="flex items-center gap-2">
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
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="requests">
              {(provided) => (
                <div 
                  {...provided.droppableProps} 
                  ref={provided.innerRef}
                  className="space-y-2"
                >
                  {sortedRequests.map((request: any, index: number) => (
                    <Draggable key={request.id} draggableId={request.id} index={index}>
                      {(provided, snapshot) => (
                        <Card
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`p-4 cursor-pointer hover:shadow-md transition-shadow ${
                            snapshot.isDragging ? 'shadow-lg ring-2 ring-brand-gold' : ''
                          } ${selectedRows.includes(request.id) ? 'ring-2 ring-primary' : ''}`}
                          onClick={() => setSelectedRequestId(request.id)}
                        >
                          <div className="flex items-center gap-4">
                            {/* Drag Handle */}
                            <div
                              {...provided.dragHandleProps}
                              className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <GripVertical className="h-5 w-5" />
                            </div>
                            
                            {/* Checkbox */}
                            <div onClick={(e) => e.stopPropagation()}>
                              <Checkbox 
                                checked={selectedRows.includes(request.id)}
                                onCheckedChange={() => toggleRowSelection(request.id)}
                              />
                            </div>

                            {/* Request ID */}
                            {isColumnVisible('request_key') && (
                              <div className="w-28 shrink-0">
                                <span className="text-sm font-medium text-primary">{request.request_key || '-'}</span>
                              </div>
                            )}

                            {/* Rank */}
                            {isColumnVisible('rank') && (
                              <div className="w-16 shrink-0 text-center">
                                <span className="text-sm font-bold">{request.rank || index + 1}</span>
                              </div>
                            )}

                            {/* Summary */}
                            {isColumnVisible('title') && (
                              <div className="flex-1 min-w-0">
                                <span className="font-medium text-foreground truncate block">{request.title}</span>
                              </div>
                            )}

                            {/* Process Step */}
                            {isColumnVisible('process_step') && (
                              <div className="w-40 shrink-0">
                                {getStatusBadge(request.process_step)}
                              </div>
                            )}

                            {/* Business Score */}
                            {isColumnVisible('business_score') && (
                              <div className="w-28 shrink-0 text-center">
                                {getBusinessScoreBadge(request.business_score)}
                              </div>
                            )}

                            {/* Planned Quarter */}
                            {isColumnVisible('planned_quarter') && (
                              <div className="w-24 shrink-0 text-sm text-muted-foreground">
                                {request.planned_quarter || '-'}
                              </div>
                            )}

                            {/* Target Completion */}
                            {isColumnVisible('end_date') && (
                              <div className="w-28 shrink-0 text-sm text-muted-foreground">
                                {formatDate(request.end_date)}
                              </div>
                            )}
                          </div>
                        </Card>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
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
