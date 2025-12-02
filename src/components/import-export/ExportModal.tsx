import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { exportTestCases, ExportFormat, ExportOptions } from '@/services/exportService';
import { Download } from 'lucide-react';

interface ExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programId: string;
  totalCases?: number;
  selectedCaseIds?: string[];
}

export function ExportModal({
  open,
  onOpenChange,
  programId,
  totalCases = 0,
  selectedCaseIds = [],
}: ExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>('excel');
  const [scopeType, setScopeType] = useState<'all' | 'folder' | 'selected'>('all');
  const [includeSteps, setIncludeSteps] = useState(true);
  const [includeParameters, setIncludeParameters] = useState(true);
  const [includeAttachments, setIncludeAttachments] = useState(true);
  const [includeVersionHistory, setIncludeVersionHistory] = useState(true);
  const [includeExecutionHistory, setIncludeExecutionHistory] = useState(false);
  const [featureGrouping, setFeatureGrouping] = useState<'per_case' | 'per_folder' | 'single'>('per_case');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    
    const options: ExportOptions = {
      format,
      scope: {
        type: scopeType,
        ids: scopeType === 'selected' ? selectedCaseIds : undefined,
      },
      include: {
        steps: includeSteps,
        parameters: includeParameters,
        attachments: includeAttachments,
        versionHistory: includeVersionHistory,
        executionHistory: includeExecutionHistory,
      },
      featureFileOptions: format === 'feature' ? { grouping: featureGrouping } : undefined,
    };
    
    await exportTestCases(programId, options);
    setIsExporting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export Test Cases</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-3">
            <Label>Format</Label>
            <RadioGroup value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="excel" id="excel" />
                <Label htmlFor="excel" className="font-normal">Excel (.xlsx)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv" className="font-normal">CSV (.csv)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pdf" id="pdf" />
                <Label htmlFor="pdf" className="font-normal">PDF (.pdf)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="feature" id="feature" />
                <Label htmlFor="feature" className="font-normal">Feature Files (.feature)</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label>Scope</Label>
            <Select value={scopeType} onValueChange={(v: any) => setScopeType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All cases in program ({totalCases})</SelectItem>
                {selectedCaseIds.length > 0 && (
                  <SelectItem value="selected">
                    Selected cases ({selectedCaseIds.length})
                  </SelectItem>
                )}
                <SelectItem value="folder">Selected folder</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {format !== 'feature' && (
            <div className="space-y-3">
              <Label>Include</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="steps"
                    checked={includeSteps}
                    onCheckedChange={(checked) => setIncludeSteps(checked as boolean)}
                  />
                  <Label htmlFor="steps" className="font-normal text-sm">
                    Steps and expected results
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="parameters"
                    checked={includeParameters}
                    onCheckedChange={(checked) => setIncludeParameters(checked as boolean)}
                  />
                  <Label htmlFor="parameters" className="font-normal text-sm">
                    Test data parameters
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="attachments"
                    checked={includeAttachments}
                    onCheckedChange={(checked) => setIncludeAttachments(checked as boolean)}
                  />
                  <Label htmlFor="attachments" className="font-normal text-sm">
                    Attachments list (URLs only)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="versionHistory"
                    checked={includeVersionHistory}
                    onCheckedChange={(checked) => setIncludeVersionHistory(checked as boolean)}
                  />
                  <Label htmlFor="versionHistory" className="font-normal text-sm">
                    Version history
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="executionHistory"
                    checked={includeExecutionHistory}
                    onCheckedChange={(checked) => setIncludeExecutionHistory(checked as boolean)}
                  />
                  <Label htmlFor="executionHistory" className="font-normal text-sm">
                    Execution history
                  </Label>
                </div>
              </div>
            </div>
          )}

          {format === 'feature' && (
            <div className="space-y-3">
              <Label>Feature File Options</Label>
              <Select value={featureGrouping} onValueChange={(v: any) => setFeatureGrouping(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="per_case">One file per case</SelectItem>
                  <SelectItem value="per_folder">By folder</SelectItem>
                  <SelectItem value="single">Single file for all</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="bg-[#c69c6d] text-[#1a1a1a] hover:bg-[#b8905f]"
            >
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? 'Exporting...' : 'Export'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
