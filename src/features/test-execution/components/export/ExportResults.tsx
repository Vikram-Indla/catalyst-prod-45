/**
 * Module 3C-2: Export Results Component
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Download, FileText, RotateCcw } from 'lucide-react';
import { formatFileSize } from '../../lib/file-download';
import type { ExportResult } from '../../types/batch-export';

interface ExportResultsProps {
  result: ExportResult;
  onDownload: () => void;
  onNewExport: () => void;
}

export function ExportResults({ result, onDownload, onNewExport }: ExportResultsProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 space-y-6">
      {/* Success Icon */}
      <div className="flex items-center justify-center w-20 h-20 rounded-full bg-green-500/10">
        <CheckCircle className="w-10 h-10 text-green-500" />
      </div>

      {/* Success Message */}
      <div className="text-center">
        <h3 className="text-xl font-semibold">Export Successful!</h3>
        <p className="text-muted-foreground mt-1">
          Your file has been generated and downloaded
        </p>
      </div>

      {/* File Details Card */}
      <Card className="w-full max-w-md">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{result.fileName}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                <span>{formatFileSize(result.fileSize)}</span>
                <span>{result.recordCount} records</span>
                <span>{result.fieldCount} fields</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onNewExport}>
          <RotateCcw className="w-4 h-4 mr-2" />
          New Export
        </Button>
        <Button onClick={onDownload}>
          <Download className="w-4 h-4 mr-2" />
          Download Again
        </Button>
      </div>
    </div>
  );
}
