/**
 * Compare Header Component
 * Title, description, and action buttons with export dropdown
 */

import React from 'react';
import DownloadIcon from '@atlaskit/icon/core/download';
import FileIcon from '@atlaskit/icon/core/file';
import Spinner from '@atlaskit/spinner';
// No @atlaskit/icon equivalent — inline SVG
const BookmarkIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
  </svg>
);
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
                <Spinner size="small" label="Exporting" />
              ) : (
                <DownloadIcon label="" size="small" primaryColor="currentColor" />
              )}
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-white">
            <DropdownMenuItem onClick={() => onExport?.('pdf')}>
              <FileIcon label="" size="small" primaryColor="currentColor" />
              Export as PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport?.('excel')}>
              <FileIcon label="" size="small" primaryColor="currentColor" />
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
          <BookmarkIcon size={16} />
          Save View
        </Button>
      </div>
    </div>
  );
}
