import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { parseFile, ImportPreview } from '@/services/importService';
import { downloadTemplate } from '@/services/exportService';
import { toast } from '@/hooks/use-toast';

interface ImportStep1UploadProps {
  onFileSelected: (file: File, preview: ImportPreview) => void;
  onCancel: () => void;
}

export function ImportStep1Upload({ onFileSelected, onCancel }: ImportStep1UploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFile = async (file: File) => {
    const maxSize = 50 * 1024 * 1024; // 50MB
    
    if (file.size > maxSize) {
      toast({
        title: 'File Too Large',
        description: 'File exceeds 50MB limit. Please split into smaller files.',
        variant: 'destructive',
      });
      return;
    }

    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv', 'feature'].includes(extension || '')) {
      toast({
        title: 'Invalid Format',
        description: 'Please upload .xlsx, .csv, or .feature file',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const preview = await parseFile(file);
      onFileSelected(file, preview);
    } catch (error) {
      toast({
        title: 'Parse Error',
        description: error instanceof Error ? error.message : 'Failed to parse file',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={downloadTemplate}
        >
          Download Excel Template
        </Button>
      </div>

      <div
        className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
          isDragging
            ? 'border-[#c69c6d] bg-[#c69c6d]/5'
            : 'border-border hover:border-[#c69c6d]/50'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-medium mb-2">
          {isProcessing ? 'Processing file...' : 'Drag & drop file here'}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          or click to browse
        </p>
        <input
          type="file"
          accept=".xlsx,.xls,.csv,.feature"
          onChange={handleFileInput}
          className="hidden"
          id="file-upload"
          disabled={isProcessing}
        />
        <Button
          variant="outline"
          onClick={() => document.getElementById('file-upload')?.click()}
          disabled={isProcessing}
        >
          Browse Files
        </Button>
      </div>

      <div className="text-sm text-muted-foreground space-y-1">
        <p>Supported formats: .xlsx, .xls, .csv, .feature</p>
        <p>Max file size: 50MB</p>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
