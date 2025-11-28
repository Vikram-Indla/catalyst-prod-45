import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Upload } from 'lucide-react';
import { toast } from 'sonner';

interface ImportThemesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportThemesDialog({ open, onOpenChange }: ImportThemesDialogProps) {
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDownloadTemplate = () => {
    // Create CSV template based on Jira Align spec
    const headers = ['Theme Name', 'Description', 'Strategic Initiative', 'State', 'Major Theme', 'Process Step', 'Owner Email'];
    const csvContent = headers.join(',') + '\n';
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'themes-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Template downloaded successfully');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      toast.info(`File selected: ${file.name}`);
    }
  };

  const handleImport = () => {
    if (!selectedPortfolio) {
      toast.error('Please select a portfolio');
      return;
    }
    
    if (!selectedFile) {
      toast.error('Please select a file to import');
      return;
    }

    // TODO: Implement actual import logic with backend
    toast.success(`Importing themes for portfolio ${selectedPortfolio}`);
    onOpenChange(false);
    
    // Reset state
    setSelectedPortfolio('');
    setSelectedFile(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import your backlog using Excel</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Download Template Section */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
            <div>
              <p className="font-medium">Step 1: Download Template</p>
              <p className="text-sm text-muted-foreground">
                Download the Excel template and fill in your theme data
              </p>
            </div>
            <Button onClick={handleDownloadTemplate} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>
          </div>

          {/* Portfolio Selection */}
          <div className="space-y-2">
            <Label>Portfolio *</Label>
            <Select value={selectedPortfolio} onValueChange={setSelectedPortfolio}>
              <SelectTrigger>
                <SelectValue placeholder="Select the portfolio to which your themes belong" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="digital-services">Digital Services Portfolio</SelectItem>
                <SelectItem value="cloud-platform">Cloud Platform Portfolio</SelectItem>
                <SelectItem value="mobile-apps">Mobile Apps Portfolio</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Select the portfolio to which your work items belong
            </p>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label>Upload File *</Label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="flex-1"
              />
            </div>
            {selectedFile && (
              <p className="text-sm text-muted-foreground">
                Selected: {selectedFile.name}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Note: If you have troubles finding your spreadsheet, change the Format selection to All Types
            </p>
          </div>

          {/* Import Button */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleImport}>
              <Upload className="mr-2 h-4 w-4" />
              Import Data
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
