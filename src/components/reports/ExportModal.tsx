import { useState } from 'react';
import { Download, FileText, FileSpreadsheet, File, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ExportData, ExportOptions, reportExportToPDF, reportExportToExcel, reportExportToCSV } from '@/lib/reportExportUtils';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ExportModalProps { open: boolean; onClose: () => void; data: ExportData; }

const FORMAT_OPTIONS = [
  { value: 'pdf', label: 'PDF Document', description: 'Best for sharing and printing', icon: FileText },
  { value: 'excel', label: 'Excel Spreadsheet', description: 'Includes raw data and formatting', icon: FileSpreadsheet },
  { value: 'csv', label: 'CSV File', description: 'Raw data only, best for analysis', icon: File },
];

export function ExportModal({ open, onClose, data }: ExportModalProps) {
  const [format, setFormat] = useState<'pdf' | 'excel' | 'csv'>('pdf');
  const [options, setOptions] = useState({ includeCharts: true, includeSummary: true, includeRawData: true, pageSize: 'a4' as const, orientation: 'portrait' as const });
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const exportOptions: ExportOptions = { format, ...options };
      switch (format) {
        case 'pdf': await reportExportToPDF(data, exportOptions); break;
        case 'excel': reportExportToExcel(data, exportOptions); break;
        case 'csv': reportExportToCSV(data); break;
      }
      toast.success(`Report exported as ${format.toUpperCase()}`);
      onClose();
    } catch { toast.error('Export failed. Please try again.'); }
    finally { setIsExporting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Download className="h-5 w-5" />Export Report</DialogTitle></DialogHeader>
        <div className="space-y-6">
          <div className="space-y-3">
            <Label>Format</Label>
            <div className="space-y-2">
              {FORMAT_OPTIONS.map(opt => (
                <div key={opt.value} onClick={() => setFormat(opt.value as typeof format)}
                  className={cn("flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors",
                    format === opt.value ? "border-primary bg-primary/5" : "hover:bg-muted/50")}>
                  <opt.icon className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1"><p className="font-medium text-sm">{opt.label}</p><p className="text-xs text-muted-foreground">{opt.description}</p></div>
                  <div className={cn("h-4 w-4 rounded-full border-2", format === opt.value ? "border-primary bg-primary" : "border-muted-foreground/30")}>
                    {format === opt.value && <div className="h-full w-full flex items-center justify-center"><div className="h-1.5 w-1.5 rounded-full bg-white" /></div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <Label>Options</Label>
            <div className="space-y-2">
              {format !== 'csv' && <div className="flex items-center gap-2"><Checkbox id="includeCharts" checked={options.includeCharts} onCheckedChange={c => setOptions({...options, includeCharts: !!c})} /><Label htmlFor="includeCharts" className="font-normal cursor-pointer">Include charts</Label></div>}
              <div className="flex items-center gap-2"><Checkbox id="includeSummary" checked={options.includeSummary} onCheckedChange={c => setOptions({...options, includeSummary: !!c})} disabled={format === 'csv'} /><Label htmlFor="includeSummary" className="font-normal cursor-pointer">Include summary</Label></div>
              <div className="flex items-center gap-2"><Checkbox id="includeRawData" checked={options.includeRawData} onCheckedChange={c => setOptions({...options, includeRawData: !!c})} /><Label htmlFor="includeRawData" className="font-normal cursor-pointer">Include raw data</Label></div>
            </div>
          </div>
          {format === 'pdf' && (
            <div className="space-y-3"><Label>Orientation</Label>
              <RadioGroup value={options.orientation} onValueChange={v => setOptions({...options, orientation: v as any})} className="flex gap-4">
                <div className="flex items-center gap-2"><RadioGroupItem value="portrait" id="portrait" /><Label htmlFor="portrait" className="font-normal">Portrait</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="landscape" id="landscape" /><Label htmlFor="landscape" className="font-normal">Landscape</Label></div>
              </RadioGroup>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleExport} disabled={isExporting}>
              {isExporting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Exporting...</> : <><Download className="h-4 w-4 mr-2" />Export</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
