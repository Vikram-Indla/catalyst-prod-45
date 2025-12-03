import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useMutation } from '@tanstack/react-query';
import { reportsService, ReportConfig } from '@/services/reportsService';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface ReportConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportType: string;
  programId: string;
}

export function ReportConfigModal({
  open,
  onOpenChange,
  reportType,
  programId,
}: ReportConfigModalProps) {
  const { toast } = useToast();
  const [config, setConfig] = useState<ReportConfig>({
    dateRange: '30',
    format: 'web',
  });

  const generateMutation = useMutation({
    mutationFn: () => reportsService.generateReport(reportType, programId, config),
    onSuccess: () => {
      toast({
        title: 'Report Generated',
        description: 'Your report has been generated successfully.',
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to generate report. Please try again.',
        variant: 'destructive',
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Report</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Date Range */}
          <div className="space-y-2">
            <Label>Date Range</Label>
            <Select
              value={config.dateRange}
              onValueChange={(value) =>
                setConfig({ ...config, dateRange: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Format */}
          <div className="space-y-2">
            <Label>Format</Label>
            <RadioGroup
              value={config.format}
              onValueChange={(value: any) =>
                setConfig({ ...config, format: value })
              }
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="web" id="web" />
                <Label htmlFor="web" className="font-normal cursor-pointer">
                  Web View
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pdf" id="pdf" />
                <Label htmlFor="pdf" className="font-normal cursor-pointer">
                  PDF Export
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="excel" id="excel" />
                <Label htmlFor="excel" className="font-normal cursor-pointer">
                  Excel Export
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="bg-brand-gold hover:bg-brand-gold-hover text-white"
          >
            {generateMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Generate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
