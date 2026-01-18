/**
 * Compare Header Component
 * Title, description, and action buttons with export dropdown
 */

import React from 'react';
import { Download, Bookmark, FileText, FileSpreadsheet, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface CompareHeaderProps {
  onExport?: (format: 'pdf' | 'excel') => void;
  onSaveView?: () => void;
  isExporting?: boolean;
}

export function CompareHeader({ onExport, onSaveView, isExporting = false }: CompareHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Release Compare</h1>
        <p className="text-sm text-slate-500 mt-1">
          Compare metrics, progress, and readiness across releases
        </p>
      </div>
      
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="text-slate-600"
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-white">
            <DropdownMenuItem onClick={() => onExport?.('pdf')}>
              <FileText className="h-4 w-4 mr-2" />
              Export as PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport?.('excel')}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export as Excel
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onSaveView}
          className="text-slate-600"
        >
          <Bookmark className="w-4 h-4 mr-2" />
          Save View
        </Button>
      </div>
    </div>
  );
}
