import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Search, Pencil, Upload, SlidersHorizontal, Download } from 'lucide-react';
import { useBusinessRequests } from '@/hooks/useBusinessRequests';
import { CreateBusinessRequestModal } from '@/components/business-requests/CreateBusinessRequestModal';
import { BusinessRequestDrawer } from '@/components/business-requests/BusinessRequestDrawer';
import { PROCESS_STEPS } from '@/types/business-request';
import { exportToCSV } from '@/lib/exportUtils';
import { useToast } from '@/hooks/use-toast';
import { ColumnsDropdown, ColumnConfig } from '@/components/backlog/ColumnsDropdown';

// Default columns configuration
const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'request_key', label: 'Request ID', visible: true, default: true },
  { id: 'title', label: 'Name', visible: true, default: true },
  { id: 'process_step', label: 'Status', visible: true, default: true },
  { id: 'business_score', label: 'Business Score', visible: true, default: true },
  { id: 'start_date', label: 'Business Ask Date', visible: true, default: true },
  { id: 'impl_start_date', label: 'Initiation Date', visible: true, default: true },
  { id: 'end_date', label: 'Target Completion', visible: true, default: true },
];

export default function IndustryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [columns, setColumns] = useState<ColumnConfig[]>(DEFAULT_COLUMNS);
  const { toast } = useToast();

  const { data: requests, isLoading } = useBusinessRequests(searchQuery);

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
      exportToCSV(requests, 'industry-requests', ['request_key', 'title', 'process_step', 'start_date', 'impl_start_date', 'end_date']);
      toast({ title: 'Requests exported successfully' });
    }
  };

  const isColumnVisible = (columnId: string) => {
    return columns.find(c => c.id === columnId)?.visible ?? false;
  };

  const visibleColumnCount = columns.filter(c => c.visible).length + 1; // +1 for checkbox

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
          <Button variant="outline" size="sm" disabled={selectedRows.length === 0} className="border-border">
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

      {/* Table - no extra padding/space */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-12">
                <Checkbox />
              </TableHead>
              {isColumnVisible('request_key') && <TableHead className="font-medium">Request ID</TableHead>}
              {isColumnVisible('title') && <TableHead className="font-medium">Name</TableHead>}
              {isColumnVisible('process_step') && <TableHead className="font-medium">Status</TableHead>}
              {isColumnVisible('business_score') && <TableHead className="font-medium">Business Score</TableHead>}
              {isColumnVisible('start_date') && <TableHead className="font-medium">Business Ask Date</TableHead>}
              {isColumnVisible('impl_start_date') && <TableHead className="font-medium">Initiation Date</TableHead>}
              {isColumnVisible('end_date') && <TableHead className="font-medium">Target Completion</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={visibleColumnCount} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : requests && requests.length > 0 ? (
              requests.map((request: any) => (
                <TableRow 
                  key={request.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedRequestId(request.id)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox />
                  </TableCell>
                  {isColumnVisible('request_key') && (
                    <TableCell className="text-sm font-medium text-primary">{request.request_key || '-'}</TableCell>
                  )}
                  {isColumnVisible('title') && (
                    <TableCell className="font-medium text-foreground">{request.title}</TableCell>
                  )}
                  {isColumnVisible('process_step') && (
                    <TableCell>{getStatusBadge(request.process_step)}</TableCell>
                  )}
                  {isColumnVisible('business_score') && (
                    <TableCell>{getBusinessScoreBadge(request.business_score)}</TableCell>
                  )}
                  {isColumnVisible('start_date') && (
                    <TableCell className="text-sm text-muted-foreground">{formatDate(request.start_date)}</TableCell>
                  )}
                  {isColumnVisible('impl_start_date') && (
                    <TableCell className="text-sm text-muted-foreground">{formatDate(request.impl_start_date)}</TableCell>
                  )}
                  {isColumnVisible('end_date') && (
                    <TableCell className="text-sm text-muted-foreground">{formatDate(request.end_date)}</TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={visibleColumnCount} className="text-center py-8 text-muted-foreground">
                  No industry requests found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
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
