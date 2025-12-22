/**
 * Export Dialog for the Product Roadmap
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { FileText, FileSpreadsheet, Download, Loader2 } from 'lucide-react';
import type { RoadmapDemand, TimelineConfig } from '../types/roadmap';
import { 
  exportRoadmapToPDF, 
  exportRoadmapToCSV, 
  downloadBlob,
  type ExportOptions 
} from '../lib/pdf-export';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface RoadmapExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  items: RoadmapDemand[];
  timelineConfig: TimelineConfig;
}

export function RoadmapExportDialog({
  isOpen,
  onClose,
  items,
  timelineConfig,
}: RoadmapExportDialogProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [options, setOptions] = useState<ExportOptions>({
    format: 'pdf',
    orientation: 'landscape',
    paperSize: 'a4',
    includeMetadata: true,
    dateRange: 'visible',
  });

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      const timestamp = format(new Date(), 'yyyy-MM-dd');
      
      if (options.format === 'pdf') {
        const blob = await exportRoadmapToPDF({
          title: 'Product Roadmap',
          subtitle: 'Business Requests Timeline View',
          dateRange: {
            start: timelineConfig.startDate,
            end: timelineConfig.endDate,
          },
          items,
          includeMetadata: options.includeMetadata,
          orientation: options.orientation,
          paperSize: options.paperSize,
        });
        
        downloadBlob(blob, `roadmap-${timestamp}.pdf`);
        toast.success('PDF exported successfully');
      } else {
        const csv = exportRoadmapToCSV(items);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        downloadBlob(blob, `roadmap-${timestamp}.csv`);
        toast.success('CSV exported successfully');
      }
      
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export Roadmap
          </DialogTitle>
          <DialogDescription>
            Export {items.length} items to PDF or CSV
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Export Format</Label>
            <RadioGroup
              value={options.format}
              onValueChange={(value: 'pdf' | 'csv') => 
                setOptions(prev => ({ ...prev, format: value }))
              }
              className="grid grid-cols-2 gap-3"
            >
              <label
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  options.format === 'pdf' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:bg-accent'
                }`}
              >
                <RadioGroupItem value="pdf" />
                <FileText className="w-5 h-5 text-red-500" />
                <div>
                  <div className="font-medium text-sm">PDF</div>
                  <div className="text-xs text-muted-foreground">Formatted document</div>
                </div>
              </label>
              
              <label
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  options.format === 'csv' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:bg-accent'
                }`}
              >
                <RadioGroupItem value="csv" />
                <FileSpreadsheet className="w-5 h-5 text-green-500" />
                <div>
                  <div className="font-medium text-sm">CSV</div>
                  <div className="text-xs text-muted-foreground">Spreadsheet data</div>
                </div>
              </label>
            </RadioGroup>
          </div>

          {/* PDF Options */}
          {options.format === 'pdf' && (
            <>
              <Separator />
              
              {/* Orientation */}
              <div>
                <Label className="text-sm font-medium mb-3 block">Orientation</Label>
                <RadioGroup
                  value={options.orientation}
                  onValueChange={(value: 'portrait' | 'landscape') => 
                    setOptions(prev => ({ ...prev, orientation: value }))
                  }
                  className="flex gap-4"
                >
                  <label className="flex items-center gap-2 cursor-pointer">
                    <RadioGroupItem value="portrait" />
                    <span className="text-sm">Portrait</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <RadioGroupItem value="landscape" />
                    <span className="text-sm">Landscape</span>
                  </label>
                </RadioGroup>
              </div>

              {/* Paper Size */}
              <div>
                <Label className="text-sm font-medium mb-3 block">Paper Size</Label>
                <RadioGroup
                  value={options.paperSize}
                  onValueChange={(value: 'a4' | 'letter' | 'a3') => 
                    setOptions(prev => ({ ...prev, paperSize: value }))
                  }
                  className="flex gap-4"
                >
                  <label className="flex items-center gap-2 cursor-pointer">
                    <RadioGroupItem value="a4" />
                    <span className="text-sm">A4</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <RadioGroupItem value="letter" />
                    <span className="text-sm">Letter</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <RadioGroupItem value="a3" />
                    <span className="text-sm">A3</span>
                  </label>
                </RadioGroup>
              </div>

              {/* Options */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={options.includeMetadata}
                    onCheckedChange={(checked) => 
                      setOptions(prev => ({ ...prev, includeMetadata: !!checked }))
                    }
                  />
                  <span className="text-sm">Include summary statistics</span>
                </label>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isExporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
