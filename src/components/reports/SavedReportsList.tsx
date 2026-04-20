import { useState } from 'react';
import { Plus, Star, MoreVertical, Trash2, Edit, Play, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Lozenge } from '@/components/ads';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useReportDefinitions, useDeleteReport } from '@/hooks/useReportAnalytics';
import { ReportBuilder } from './ReportBuilder';
import { ReportDefinition } from '@/types/reports';
import { formatDistanceToNow } from 'date-fns';

export function SavedReportsList() {
  const { data: reports, isLoading } = useReportDefinitions();
  const deleteReport = useDeleteReport();
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingReport, setEditingReport] = useState<ReportDefinition | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Saved Reports</h3>
        <Button onClick={() => setShowBuilder(true)}><Plus className="h-4 w-4 mr-1" />Create Report</Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4">{[1,2,3,4].map(i => <Card key={i} className="animate-pulse"><CardContent className="p-4"><div className="h-5 bg-muted rounded w-3/4 mb-2" /><div className="h-4 bg-muted rounded w-1/2" /></CardContent></Card>)}</div>
      ) : reports?.length === 0 ? (
        <Card><CardContent className="p-8 text-center"><p className="text-muted-foreground mb-4">No saved reports yet.</p><Button onClick={() => setShowBuilder(true)}><Plus className="h-4 w-4 mr-1" />Create Report</Button></CardContent></Card>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {reports?.map(report => (
            <Card key={report.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {report.is_favorite && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                      <h4 className="font-medium truncate">{report.name}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground truncate mb-2">{report.description || 'No description'}</p>
                    <div className="flex items-center gap-2">
                      <Lozenge appearance="default">{report.report_type}</Lozenge>
                      <span className="text-xs text-muted-foreground">Updated {formatDistanceToNow(new Date(report.updated_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem><Play className="h-4 w-4 mr-2" />Run Report</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setEditingReport(report); setShowBuilder(true); }}><Edit className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                      <DropdownMenuItem><Calendar className="h-4 w-4 mr-2" />Schedule</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600" onClick={() => { if (confirm(`Delete "${report.name}"?`)) deleteReport.mutateAsync(report.id); }}>
                        <Trash2 className="h-4 w-4 mr-2" />Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showBuilder} onOpenChange={open => { setShowBuilder(open); if (!open) setEditingReport(null); }}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader><DialogTitle>{editingReport ? 'Edit Report' : 'Create Report'}</DialogTitle></DialogHeader>
          <ReportBuilder existingReport={editingReport} onClose={() => { setShowBuilder(false); setEditingReport(null); }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
