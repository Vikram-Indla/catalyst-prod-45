import { useState } from 'react';
import { Download, FileText, FileJson, Copy, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResourceInventoryItem } from '@/hooks/useResourceInventory';
import { CapacityBooking } from '../hooks/useCapacityBookings';
import { format } from 'date-fns';

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  resources: ResourceInventoryItem[];
  bookings: CapacityBooking[];
}

export function ExportModal({
  open,
  onClose,
  resources,
  bookings,
}: ExportModalProps) {
  const [format_, setFormat] = useState<'csv' | 'json' | 'report'>('csv');
  const [copied, setCopied] = useState(false);

  const resourceMap = new Map(resources.map(r => [r.id, r]));

  const generateCSV = () => {
    const headers = ['ID', 'Type', 'Summary', 'Resource', 'Start', 'End', 'Status', 'Priority', 'Quarter'];
    const rows = bookings.map(b => [
      b.id.slice(0, 8),
      b.booking_type,
      b.booking_type === 'ticket' ? b.business_request?.title : b.summary || 'Leave',
      resourceMap.get(b.resource_id)?.name || '',
      b.start_date,
      b.end_date,
      b.status || '',
      b.priority || '',
      b.quarter || '',
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const generateJSON = () => {
    return JSON.stringify(bookings.map(b => ({
      id: b.id,
      type: b.booking_type,
      summary: b.booking_type === 'ticket' ? b.business_request?.title : b.summary,
      resource: resourceMap.get(b.resource_id)?.name,
      startDate: b.start_date,
      endDate: b.end_date,
      status: b.status,
      priority: b.priority,
      quarter: b.quarter,
    })), null, 2);
  };

  const generateReport = () => {
    const lines: string[] = [
      'CAPACITY PLANNING REPORT',
      `Generated: ${format(new Date(), 'MMM d, yyyy h:mm a')}`,
      '',
      `Total Resources: ${resources.length}`,
      `Total Bookings: ${bookings.length}`,
      '',
      '---',
      '',
    ];

    resources.forEach(resource => {
      const resourceBookings = bookings.filter(b => b.resource_id === resource.id);
      lines.push(`${resource.name} (${resource.role_code || 'No role'})`);
      if (resourceBookings.length === 0) {
        lines.push('  No bookings');
      } else {
        resourceBookings.forEach(b => {
          const summary = b.booking_type === 'ticket' 
            ? b.business_request?.request_key || b.business_request?.title
            : b.summary || 'Leave';
          lines.push(`  • ${summary}: ${b.start_date} to ${b.end_date}`);
        });
      }
      lines.push('');
    });

    return lines.join('\n');
  };

  const getContent = () => {
    switch (format_) {
      case 'csv': return generateCSV();
      case 'json': return generateJSON();
      case 'report': return generateReport();
    }
  };

  const handleDownload = () => {
    const content = getContent();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `capacity-planning-${format(new Date(), 'yyyy-MM-dd')}.${format_ === 'json' ? 'json' : format_ === 'csv' ? 'csv' : 'txt'}`;
    a.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getContent());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Export Capacity Data</DialogTitle>
        </DialogHeader>

        <Tabs value={format_} onValueChange={(v) => setFormat(v as typeof format_)}>
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="csv" className="gap-1">
              <FileText className="h-4 w-4" />
              CSV
            </TabsTrigger>
            <TabsTrigger value="json" className="gap-1">
              <FileJson className="h-4 w-4" />
              JSON
            </TabsTrigger>
            <TabsTrigger value="report" className="gap-1">
              <FileText className="h-4 w-4" />
              Report
            </TabsTrigger>
          </TabsList>

          <div className="mt-4">
            <div className="relative">
              <pre className="bg-muted/50 rounded-lg p-4 text-xs overflow-auto max-h-[300px] font-mono">
                {getContent()}
              </pre>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7"
                onClick={handleCopy}
              >
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleDownload}
            className="bg-brand-gold hover:bg-brand-gold-hover text-white gap-1"
          >
            <Download className="h-4 w-4" />
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
